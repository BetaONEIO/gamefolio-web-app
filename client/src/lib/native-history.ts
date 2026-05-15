// Capture the native history.replaceState BEFORE wouter's use-browser-location.js
// patches it. Wouter v3 wraps replaceState to dispatch a DOM "replaceState" event,
// which triggers its router to re-render. Using this captured original lets us silently
// update the address bar (e.g. to show a shareable URL while a modal is open) without
// causing any route change.
const _nativeReplaceState = window.history.replaceState.bind(window.history);

export const silentReplaceState = (url: string) => {
  _nativeReplaceState(null, '', url);
};
