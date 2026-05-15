// window.__nativeReplaceState is set by an inline <script> in index.html that runs
// before any ES modules load — guaranteed to be the unpatched native function,
// even though wouter v3 wraps history.replaceState at module evaluation time.
// Using this lets us silently update the address bar (e.g. to show a shareable URL
// while a modal is open) without triggering wouter's router to re-render.

declare global {
  interface Window {
    __nativeReplaceState?: typeof history.replaceState;
  }
}

const _nativeReplaceState = (
  window.__nativeReplaceState ?? window.history.replaceState.bind(window.history)
);

export const silentReplaceState = (url: string) => {
  _nativeReplaceState(null, '', url);
};
