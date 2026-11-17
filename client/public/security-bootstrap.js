// Keep bootstrap logic in a same-origin file so the production CSP does not
// need to allow arbitrary inline scripts.
window.__nativeReplaceState = window.history.replaceState.bind(window.history);

window.addEventListener('unhandledrejection', function (event) {
  var error = event.reason;
  var errorMessage = (error && error.message) || error || '';
  if (
    typeof errorMessage === 'string' &&
    (
      errorMessage.includes("Failed to construct 'WebSocket'") ||
      (errorMessage.includes('WebSocket') && errorMessage.includes('is invalid'))
    )
  ) {
    event.preventDefault();
  }
});
