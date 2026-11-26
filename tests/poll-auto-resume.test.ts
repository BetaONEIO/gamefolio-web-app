import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { transform } from "esbuild";
import * as jsxRuntime from "react/jsx-runtime";
import * as pollState from "../client/src/components/home/poll-state";

const poll = (id = 1): pollState.ActivePoll => ({
  id,
  title: "How do you play?",
  description: "Choose one answer.",
  startsAt: "2026-11-20T00:00:00Z",
  endsAt: "2026-12-20T00:00:00Z",
  myVoteOptionId: null,
  options: [{ id: 5, label: "Local", voteCount: 2 }, { id: 6, label: "Cloud", voteCount: 1 }],
});

function clock() {
  let now = 0;
  let nextId = 0;
  const timers = new Map<number, { due: number; callback: () => void }>();
  return {
    setTimeout(callback: () => void, delay: number) {
      const id = ++nextId;
      timers.set(id, { due: now + delay, callback });
      return id;
    },
    clearTimeout(id: number) { timers.delete(id); },
    advance(milliseconds: number) {
      const target = now + milliseconds;
      while (true) {
        const due = [...timers.entries()].sort((left, right) => left[1].due - right[1].due)[0];
        if (!due || due[1].due > target) break;
        now = due[1].due;
        timers.delete(due[0]);
        due[1].callback();
      }
      now = target;
    },
    pending: () => timers.size,
  };
}

type Props = {
  poll: pollState.ActivePoll;
  isActive: boolean;
  autoResumePaused: boolean;
  onResume: () => void;
  onDismiss: () => void;
};

async function fixture() {
  const source = await readFile(new URL("../client/src/components/home/PollTakeover.tsx", import.meta.url), "utf8");
  const { code } = await transform(source, { loader: "tsx", format: "esm", jsx: "automatic" });
  const time = clock();
  const document = { cookie: "" };
  const context = createContext({ window: time, setTimeout: time.setTimeout, clearTimeout: time.clearTimeout, document });
  const noop = () => {};
  let resumeCount = 0;
  let dismissCount = 0;
  let mutation: { data?: pollState.PollVoteResult; isPending: boolean; error?: Error } = { isPending: false };
  let props: Props = {
    poll: poll(), isActive: true, autoResumePaused: false,
    onResume: () => { resumeCount += 1; },
    onDismiss: () => { dismissCount += 1; },
  };
  const refs: Array<{ current: unknown }> = [];
  const effects: Array<{ dependencies?: unknown[]; cleanup?: () => void }> = [];
  let refIndex = 0;
  let effectIndex = 0;
  let layoutWork: Array<() => void> = [];
  let passiveWork: Array<() => void> = [];
  function registerEffect(effect: () => void | (() => void), dependencies: unknown[] | undefined, layout: boolean) {
    const index = effectIndex++;
    const previous = effects[index];
    if (dependencies && previous?.dependencies
      && dependencies.length === previous.dependencies.length
      && dependencies.every((dependency, position) => Object.is(dependency, previous.dependencies![position]))) return;
    const run = () => {
      previous?.cleanup?.();
      effects[index] = { dependencies: dependencies?.slice(), cleanup: effect() || undefined };
    };
    (layout ? layoutWork : passiveWork).push(run);
  }
  const mocks: Record<string, Record<string, unknown>> = {
    react: {
      useRef: (current: unknown) => refs[refIndex++] ??= { current },
      useEffect: (effect: () => void, dependencies?: unknown[]) => registerEffect(effect, dependencies, false),
      useLayoutEffect: (effect: () => void, dependencies?: unknown[]) => registerEffect(effect, dependencies, true),
    },
    "react/jsx-runtime": jsxRuntime,
    "@tanstack/react-query": {
      useMutation: () => ({ ...mutation, mutate: noop }),
      useQueryClient: () => ({ setQueryData: noop, invalidateQueries: noop, getQueryData: noop }),
    },
    "@sentry/capacitor": { captureException: noop, captureMessage: noop },
    "lucide-react": { BarChart3: noop, Check: noop, X: noop },
    "@/hooks/use-auth": { useAuth: () => ({ user: { id: 42 } }) },
    "@/hooks/use-toast": { useToast: () => ({ toast: noop }) },
    "@/lib/queryClient": { authedFetch: () => { throw new Error("Unexpected network request"); } },
    "./poll-state": pollState,
  };
  const module = new SourceTextModule(code, { context });
  await module.link(async (specifier) => {
    const values = mocks[specifier];
    assert.ok(values, `Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  const text = (node: any): string => {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node !== "object") return String(node);
    if (Array.isArray(node)) return node.map(text).join("");
    return text(node.props?.children);
  };
  return {
    time,
    document,
    resumed: () => resumeCount,
    dismissed: () => dismissCount,
    mutation(value: typeof mutation) { mutation = value; },
    render(overrides: Partial<Props> = {}) {
      props = { ...props, ...overrides };
      refIndex = effectIndex = 0;
      layoutWork = [];
      passiveWork = [];
      const tree = (module.namespace as any).PollTakeover(props);
      for (const run of layoutWork) run();
      for (const run of passiveWork) run();
      return text(tree);
    },
    unmount() {
      for (const effect of effects) effect?.cleanup?.();
    },
  };
}

test("results remain visible for six seconds before resuming once", async () => {
  const view = await fixture();
  view.render();
  view.time.advance(10_000);
  assert.equal(view.resumed(), 0);
  // A slow reconciliation can keep the mutation pending after results are visible.
  view.mutation({ data: { optionId: 6, alreadyVoted: false }, isPending: true });
  assert.match(view.render(), /4 votes so far/);
  view.time.advance(5_999);
  assert.equal(view.resumed(), 0);
  view.time.advance(1);
  assert.equal(view.resumed(), 1);
  view.time.advance(6_000);
  assert.equal(view.resumed(), 1);
  assert.equal(view.dismissed(), 0);
  assert.equal(view.document.cookie, "", "advancing must not permanently dismiss the poll");
});

test("pending and failed votes do not start an automatic resume", async () => {
  const view = await fixture();
  view.mutation({ isPending: true });
  view.render();
  view.time.advance(10_000);
  view.mutation({ isPending: false, error: new Error("Vote failed") });
  assert.match(view.render(), /Choose one answer · one vote per account/);
  view.time.advance(10_000);
  assert.equal(view.resumed(), 0);
  assert.equal(view.time.pending(), 0);
});

test("already-recorded votes receive the same six-second results window", async () => {
  const view = await fixture();
  view.render({ poll: { ...poll(), myVoteOptionId: 5 } });
  view.time.advance(5_999);
  assert.equal(view.resumed(), 0);
  view.time.advance(1);
  assert.equal(view.resumed(), 1);
});

for (const pause of [{ isActive: false }, { autoResumePaused: true }]) {
  test(`${"isActive" in pause ? "hidden results" : "manual pause"} cancel the countdown until viewing resumes`, async () => {
    const view = await fixture();
    view.mutation({ data: { optionId: 6, alreadyVoted: false }, isPending: false });
    view.render(pause);
    view.time.advance(10_000);
    assert.equal(view.resumed(), 0);
    view.render({ isActive: true, autoResumePaused: false });
    view.time.advance(3_000);
    view.render(pause);
    view.time.advance(10_000);
    assert.equal(view.resumed(), 0);
    assert.equal(view.time.pending(), 0);
    view.render({ isActive: true, autoResumePaused: false });
    view.time.advance(6_000);
    assert.equal(view.resumed(), 1);
  });
}

test("a refetch and new resume callback do not reset the results countdown", async () => {
  const view = await fixture();
  let first = 0;
  let latest = 0;
  const voted = { ...poll(), myVoteOptionId: 5 };
  view.render({ poll: voted, onResume: () => { first += 1; } });
  view.time.advance(4_000);
  view.render({ poll: { ...voted, options: voted.options.map((option) => ({ ...option, voteCount: 10 })) }, onResume: () => { latest += 1; } });
  view.time.advance(1_999);
  assert.equal(first + latest, 0);
  view.time.advance(1);
  assert.equal(first, 0);
  assert.equal(latest, 1);
});

test("unmount clears a pending resume", async () => {
  const view = await fixture();
  view.render({ poll: { ...poll(), myVoteOptionId: 5 } });
  view.time.advance(3_000);
  view.unmount();
  view.time.advance(10_000);
  assert.equal(view.resumed(), 0);
  assert.equal(view.time.pending(), 0);
});

test("a replacement poll gets a fresh six-second results window", async () => {
  const view = await fixture();
  view.render({ poll: { ...poll(1), myVoteOptionId: 5 } });
  view.time.advance(4_000);
  view.render({ poll: { ...poll(2), myVoteOptionId: 5 } });
  view.time.advance(5_999);
  assert.equal(view.resumed(), 0);
  view.time.advance(1);
  assert.equal(view.resumed(), 1);
});
