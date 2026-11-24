import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SourceTextModule, SyntheticModule } from "node:vm";
import { transform } from "esbuild";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as likeState from "../client/src/components/engagement/like-state";

async function fixture() {
  const source = await readFile(new URL("../client/src/components/engagement/LikeButton.tsx", import.meta.url), "utf8");
  const { code } = await transform(source, { loader: "tsx", format: "esm", jsx: "automatic" });
  const noop = () => {};
  const Heart = () => null;
  const states: any[] = [];
  const refs: any[] = [];
  let stateIndex = 0;
  let refIndex = 0;
  let changed = false;
  let layoutEffects: Array<() => void> = [];
  let mutationOptions: any;
  const mocks: Record<string, Record<string, any>> = {
    react: {
      ...React,
      useState: (initial: any) => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], (update: any) => {
          states[index] = typeof update === "function" ? update(states[index]) : update;
          changed = true;
        }];
      },
      useRef: (current: any) => {
        const index = refIndex++;
        return refs[index] ??= { current };
      },
      useEffect: noop,
      useLayoutEffect: (effect: () => void) => layoutEffects.push(effect),
    },
    "react/jsx-runtime": jsxRuntime,
    "@sentry/capacitor": { captureException: noop },
    "@/components/ui/PixelHeartReaction": { PixelHeartReaction: Heart },
    "@/components/ui/button": { Button: () => null },
    "@/hooks/use-toast": { useToast: () => ({ toast: noop }) },
    "@/hooks/use-auth": { useAuth: () => ({ user: { id: 1 } }) },
    "@tanstack/react-query": {
      useQueryClient: () => ({ invalidateQueries: noop }),
      useQuery: () => ({ data: undefined }),
      useMutation: (options: any) => {
        mutationOptions = options;
        return { mutate: noop, isPending: false };
      },
    },
    "@/lib/queryClient": { authedFetch: noop },
    "@/lib/utils": { cn: (...values: any[]) => values.filter(Boolean).join(" ") },
    "@/hooks/use-join-dialog": { useJoinDialog: () => ({ openDialog: noop }) },
    "@/lib/email-verification": { requireEmailVerified: () => true, isEmailVerificationError: () => false },
    "./like-state": likeState,
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

  const render = (contentId: number, initialLiked = false, initialCount = 7) => {
    let tree: any;
    do {
      changed = false;
      stateIndex = refIndex = 0;
      layoutEffects = [];
      tree = (module.namespace as any).LikeButton({ contentId, contentType: "clip", initialLiked, initialCount });
    } while (changed);
    // Commit layout effects, but deliberately leave passive effects unflushed.
    // TanStack's observer can still hold the previous render's options here.
    for (const effect of layoutEffects) effect();
    const nodes: any[] = [];
    const visit = (node: any) => {
      if (!node || typeof node !== "object") return;
      nodes.push(node);
      for (const child of React.Children.toArray(node.props?.children)) visit(child);
    };
    visit(tree);
    return {
      liked: nodes.find(node => node.type === Heart)?.props.active,
      count: nodes.find(node => node.type === "span")?.props.children,
      options: mutationOptions,
    };
  };
  return { render };
}

for (const outcome of ["success", "error"] as const) {
  test(`an old like ${outcome} cannot overwrite a newly committed clip`, async () => {
    const { render } = await fixture();
    const old = render(11, true, 20).options;
    const target = { contentId: 11, contentType: "clip" };
    const context = await old.onMutate(target);
    render(22);
    if (outcome === "success") old.onSuccess({ liked: true, count: 99 }, target, context);
    else old.onError(new Error("network failure"), target, context);
    const displayed = render(22);
    assert.equal(displayed.liked, false);
    assert.equal(displayed.count, 7);
  });
}
