import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SourceTextModule, SyntheticModule } from "node:vm";
import { transform } from "esbuild";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as wouter from "wouter";
import { memoryLocation } from "wouter/memory-location";
import TestRenderer from "react-test-renderer";

const AuthModalContext = React.createContext<{ isOpen: boolean; openModal: () => void } | null>(null);

function AuthModalProvider({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const openModal = React.useCallback(() => setIsOpen(true), []);
  const value = React.useMemo(() => ({ isOpen, openModal }), [isOpen, openModal]);
  return React.createElement(AuthModalContext.Provider, { value }, children);
}

function useAuthModal() {
  const context = React.useContext(AuthModalContext);
  if (!context) throw new Error("useAuthModal must be used within an AuthModalProvider");
  return context;
}

// wouter invokes function children inside Route's own render, after an early
// return when the path does not match. A hook in that callback becomes a hook
// of Route and disappears when auth leaves the signed-out branch — React's
// "Rendered fewer hooks than expected".
type AuthSnapshot = {
  user: { id: number; username: string; userType?: string; role?: string } | null;
  isLoading: boolean;
  authResolved: boolean;
};

async function loadProtectedRoute(auth: AuthSnapshot) {
  const source = await readFile(new URL("../client/src/components/auth/protected-route.tsx", import.meta.url), "utf8");
  const { code } = await transform(source, { loader: "tsx", format: "esm", jsx: "automatic", target: "es2022" });
  const mocks: Record<string, Record<string, unknown>> = {
    react: { ...React },
    "react/jsx-runtime": { ...jsxRuntime },
    wouter: { ...wouter },
    "@/hooks/use-auth-modal": { useAuthModal, AuthModalProvider },
    "@/hooks/use-auth": {
      useAuth: () => ({
        ...auth,
        error: null,
        loginMutation: {},
        logoutMutation: {},
        registerMutation: {},
        refreshUser: async () => {},
      }),
    },
    "@/components/ui/game-loader": {
      FullScreenLoader: () => React.createElement("div", null, "Loading account"),
    },
  };
  const module = new SourceTextModule(code);
  await module.link(async (specifier) => {
    const values = mocks[specifier];
    assert.ok(values, `Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value);
    });
  });
  await module.evaluate();
  return module.namespace.ProtectedRoute as React.ComponentType<{
    path: string;
    component: React.ComponentType<any>;
  }>;
}

function textOf(node: TestRenderer.ReactTestRendererJSON | string | null | Array<TestRenderer.ReactTestRendererJSON | string>): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map((child) => textOf(child)).join("");
  return textOf(node.children);
}

function treeText(renderer: TestRenderer.ReactTestRenderer) {
  return textOf(renderer.toJSON());
}

function renderRoute(ProtectedRoute: React.ComponentType<any>, auth: AuthSnapshot) {
  const { hook } = memoryLocation({ path: "/upload" });
  const Page = () => React.createElement("h1", null, "Upload ready");
  let renderer: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      React.createElement(
        AuthModalProvider,
        null,
        React.createElement(
          wouter.Router,
          { hook },
          React.createElement(ProtectedRoute, { path: "/upload", component: Page }),
          React.createElement(ModalProbe),
        ),
      ),
    );
  });
  return {
    renderer: renderer!,
    update(next: AuthSnapshot) {
      auth.user = next.user;
      auth.isLoading = next.isLoading;
      auth.authResolved = next.authResolved;
      TestRenderer.act(() => {
        renderer.update(
          React.createElement(
            AuthModalProvider,
            null,
            React.createElement(
              wouter.Router,
              { hook },
              React.createElement(ProtectedRoute, { path: "/upload", component: Page }),
              React.createElement(ModalProbe),
            ),
          ),
        );
      });
    },
  };
}

function ModalProbe() {
  const { isOpen } = useAuthModal();
  return React.createElement("span", null, isOpen ? "modal-open" : "modal-closed");
}

test("signing in on /upload does not change the route's hook count", async () => {
  const auth: AuthSnapshot = { user: null, isLoading: false, authResolved: true };
  const ProtectedRoute = await loadProtectedRoute(auth);
  const view = renderRoute(ProtectedRoute, auth);

  assert.match(treeText(view.renderer), /Authentication Required/);
  assert.match(treeText(view.renderer), /modal-open/);

  assert.doesNotThrow(() => {
    view.update({ user: { id: 7, username: "player", userType: "gamer", role: "user" }, isLoading: false, authResolved: true });
  });
  const signedIn = treeText(view.renderer);
  assert.match(signedIn, /Upload ready/);
  assert.doesNotMatch(signedIn, /Authentication Required/);
});

test("a resolved account dropping to signed-out on /upload still opens the auth modal", async () => {
  const auth: AuthSnapshot = {
    user: { id: 7, username: "player", userType: "gamer", role: "user" },
    isLoading: false,
    authResolved: true,
  };
  const ProtectedRoute = await loadProtectedRoute(auth);
  const view = renderRoute(ProtectedRoute, auth);

  assert.match(treeText(view.renderer), /Upload ready/);
  assert.match(treeText(view.renderer), /modal-closed/);

  assert.doesNotThrow(() => {
    view.update({ user: null, isLoading: false, authResolved: true });
  });
  const signedOut = treeText(view.renderer);
  assert.match(signedOut, /Authentication Required/);
  assert.match(signedOut, /modal-open/);
  assert.doesNotMatch(signedOut, /Upload ready/);
});

test("auth resolving from the loading state into signed-out /upload keeps hook order stable", async () => {
  const auth: AuthSnapshot = { user: null, isLoading: true, authResolved: false };
  const ProtectedRoute = await loadProtectedRoute(auth);
  const view = renderRoute(ProtectedRoute, auth);

  assert.match(treeText(view.renderer), /Loading account/);

  assert.doesNotThrow(() => {
    view.update({ user: null, isLoading: false, authResolved: true });
  });
  assert.match(treeText(view.renderer), /Authentication Required/);
  assert.match(treeText(view.renderer), /modal-open/);

  assert.doesNotThrow(() => {
    view.update({ user: { id: 7, username: "player", userType: "gamer", role: "user" }, isLoading: false, authResolved: true });
  });
  assert.match(treeText(view.renderer), /Upload ready/);
});
