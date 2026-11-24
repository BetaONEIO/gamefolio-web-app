/** Open the browser calendar from anywhere in a date input, with native fallback. */
export function openDatePicker(input: HTMLInputElement) {
  if (input.type !== "date" || input.disabled || input.readOnly) return;
  try { input.showPicker?.(); } catch { /* Native calendar icon remains available. */ }
}
