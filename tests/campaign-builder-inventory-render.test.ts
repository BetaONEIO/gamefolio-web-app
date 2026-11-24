import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SourceTextModule, SyntheticModule } from "node:vm";
import { transform } from "esbuild";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as icons from "lucide-react";
import * as commercial from "../shared/campaign-commercial-model";
import * as rewards from "../shared/bounty-rewards";
import * as constants from "../client/src/pages/indie-dashboard/constants";
import * as personalise from "../client/src/pages/indie-dashboard/preset-personalise-model";
import * as availability from "../client/src/lib/campaign-key-availability";
import * as timeline from "../client/src/lib/campaign-timeline";
import * as keyFormat from "../client/src/lib/game-key-format";

async function fixture(loaded = true) {
  const source = await readFile(new URL("../client/src/pages/indie-dashboard/CreateCampaignFlow.tsx", import.meta.url), "utf8");
  const { code } = await transform(source, { loader: "tsx", format: "esm", jsx: "automatic" });
  const component = () => null;
  const Accordion = () => null;
  const noop = () => {};
  const states: any[] = [];
  let stateIndex = 0;
  const queries: any[] = [];
  const mocks: Record<string, Record<string, any>> = {
    react: {
      ...React,
      useState: (initial: any) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [states[index], (update: any) => { states[index] = typeof update === "function" ? update(states[index]) : update; }];
      },
      useEffect: noop,
      useRef: (current: any) => ({ current }),
      useCallback: (callback: any) => callback,
    },
    "react/jsx-runtime": jsxRuntime,
    "lucide-react": icons,
    "@shared/campaign-commercial-model": commercial,
    "@shared/bounty-rewards": rewards,
    "./constants": constants,
    "./preset-personalise-model": personalise,
    "@/lib/campaign-key-availability": availability,
    "@/lib/campaign-timeline": timeline,
    "@/lib/game-key-format": keyFormat,
    "./campaign-key-csv": { parseCSVKeys: noop },
    "@/components/icons/CampaignMark": { default: component },
    "./useCampaignCurrency": { useCampaignCurrency: () => ({ money: String }) },
    "./developer-objective-labels": { getDeveloperObjectiveLabel: String },
    "./CampaignSetupRecovery": { DiscardCampaignSetup: component },
    "@/hooks/use-toast": { useToast: () => ({ toast: noop }) },
    "@/hooks/use-signed-url": { useSignedUrl: () => ({}) },
    "wouter": { useLocation: () => ["", noop] },
    "@/lib/queryClient": { apiRequest: noop, queryClient: {}, getQueryFn: () => noop },
    "./CampaignPriceBreakdown": { default: component, campaignMoney: String, CampaignRewardExplanation: component },
    "./CommercialCampaignAccordion": { default: Accordion },
    "./StreamSpotlightAccess": { default: component },
    "@/components/ui/dialog": Object.fromEntries(["Dialog", "DialogContent", "DialogTitle", "DialogDescription", "DialogTrigger"].map(name => [name, component])),
    "@tanstack/react-query": {
      useQuery: (options: any) => {
        queries.push(options);
        let data: any;
        if (options.queryKey[0] === "/api/indie/profile") data = { profile: { catalogGameId: 42, gameName: "Fixture game" } };
        if (loaded && options.queryKey[2] === "key-inventory") data = { gameId: 42, byType: { demo: { available: 3 }, full: { available: 7 } } };
        return { data, isLoading: !loaded && options.queryKey[2] === "key-inventory", isError: false };
      },
    },
  };
  const module = new SourceTextModule(code);
  await module.link(async specifier => {
    const values = mocks[specifier];
    assert.ok(values, `Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    });
  });
  await module.evaluate();
  const render = () => {
    stateIndex = 0;
    queries.length = 0;
    const tree = (module.namespace as any).default({ onComplete: noop });
    const find = (node: any): any => {
      if (!node || typeof node !== "object") return;
      if (node.type === Accordion) return node;
      for (const child of React.Children.toArray(node.props?.children)) {
        const found = find(child);
        if (found) return found;
      }
    };
    const accordion = find(tree);
    assert.ok(accordion, "Step 1 must render the campaign picker");
    return accordion.props;
  };
  return { render, queries };
}

test("the initial campaign picker renders the selected game's unallocated keys", async () => {
  const { render } = await fixture();
  const picker = render();
  assert.equal(picker.inventory.demo, 3);
  assert.equal(picker.inventory.full, 7);
  assert.equal(picker.inventoryLoading, false);
});

test("choosing custom keeps profile inventory before a game is personalised", async () => {
  const { render, queries } = await fixture();
  const initial = render();
  initial.onSelect(initial.campaignTypes.find((type: any) => type.custom));
  const picker = render();
  const inventoryQuery = queries.find(query => query.queryKey[2] === "key-inventory");
  assert.equal(inventoryQuery.queryKey[1], 42);
  assert.equal(inventoryQuery.enabled, true);
  assert.equal(picker.inventory.full, 7);
  assert.equal(picker.inventoryLoading, false);
});

test("the campaign picker distinguishes unloaded inventory from zero keys", async () => {
  const { render } = await fixture(false);
  const picker = render();
  assert.equal(picker.inventory.demo, undefined);
  assert.equal(picker.inventory.full, undefined);
  assert.equal(picker.inventoryLoading, true);
});
