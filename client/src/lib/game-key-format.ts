export type GameKeyFormat = "steam" | "other";
export const gameKeyMaxLength = (format: GameKeyFormat) => format === "steam" ? 29 : 256;
export function matchesGameKeyFormat(value: string, format: GameKeyFormat): boolean {
  const key = value.trim();
  if (format === "steam") return /^(?:[A-Z0-9]{5}(?:-[A-Z0-9]{5}){2}|[A-Z0-9]{5}(?:-[A-Z0-9]{5}){4}|[A-Z0-9]{15} [A-Z0-9]{2})$/i.test(key);
  return key.length >= 4 && key.length <= 256 && /[A-Za-z0-9]/.test(key) && !/[\u0000-\u001f\u007f]/.test(key);
}
export function gameKeyLineFeedback(text: string, format: GameKeyFormat) {
  const seen = new Set<string>();
  return text.split(/\r?\n/).map((value, index) => ({ value: value.trim(), line: index + 1 })).filter(row => row.value).map(row => {
    const normalized = row.value.toLowerCase();
    const duplicate = seen.has(normalized);
    seen.add(normalized);
    return { ...row, status: duplicate ? "duplicate" : matchesGameKeyFormat(row.value, format) ? "matches" : "invalid" };
  });
}

/** Group only a newly typed alphanumeric character; never rewrite pasted keys. */
export function formatTypedSteamKey(text: string, caret: number) {
  const start = text.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
  const nextBreak = text.indexOf("\n", caret);
  const end = nextBreak === -1 ? text.length : nextBreak;
  const line = text.slice(start, end);
  if (!/^[A-Za-z0-9-]+$/.test(line) || line.replace(/-/g, "").length > 25) return { text, caret };
  const raw = line.replace(/-/g, "");
  const grouped = raw.match(/.{1,5}/g)?.join("-") ?? "";
  const charsBefore = text.slice(start, caret).replace(/-/g, "").length;
  const newCaret = start + charsBefore + Math.floor(Math.max(0, charsBefore - 1) / 5);
  return { text: text.slice(0, start) + grouped + text.slice(end), caret: newCaret };
}
