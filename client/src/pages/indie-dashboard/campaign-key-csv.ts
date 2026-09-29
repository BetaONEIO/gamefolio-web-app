export function parseCSVKeys(csv: string): string[] {
  const text = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let quoteClosed = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (quoteClosed && character !== "," && character !== "\r" && character !== "\n" && !/\s/.test(character)) {
      throw new Error("Malformed CSV: unexpected text after a quoted value.");
    }
    if (character === '"' && field.trim().length === 0 && !quoteClosed) {
      field = "";
      quoted = true;
    } else if (character === '"') {
      throw new Error("Malformed CSV: a quote appeared inside an unquoted value.");
    } else if (character === "," || character === "\n" || character === "\r") {
      row.push(field.trim());
      field = "";
      quoteClosed = false;
      if (character === ",") continue;
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
    } else if (!(quoteClosed && /\s/.test(character))) {
      field += character;
    }
  }
  if (quoted) throw new Error("Malformed CSV: a quoted value was not closed.");
  row.push(field.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  if (rows.length === 0) return [];

  const keyHeaders = new Set(["key", "keys", "gamekey", "gamekeys", "gameaccesskey", "accesskey", "accesskeys",
    "keycode", "keycodes", "accesscode", "accesscodes", "keyvalue", "licensekey", "licensecode",
    "productkey", "productcode", "activationkey", "activationcode", "serialkey", "cdkey", "code"]);
  const normalizeHeader = (cell: string) => cell.toLowerCase().replace(/[^a-z0-9]/g, "");
  const headerIndex = rows[0].findIndex(cell => keyHeaders.has(normalizeHeader(cell)));
  if (headerIndex >= 0) {
    const values: string[] = [];
    for (const dataRow of rows.slice(1)) {
      if (dataRow.length <= headerIndex || !dataRow[headerIndex]) {
        throw new Error("Malformed CSV: a data row is missing its key value.");
      }
      values.push(dataRow[headerIndex]);
    }
    return values;
  }
  if (rows[0].some(cell => /(?:^|[^a-z])(key|code|access|license|serial|activation)(?:[^a-z]|$)/i.test(cell.trim())) ||
      rows.some(dataRow => dataRow.length !== 1)) {
    throw new Error("CSV must include a key, code, or access-key column header.");
  }
  return rows.map(dataRow => dataRow[0]);
}