import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCSVKeys } from "../client/src/pages/indie-dashboard/campaign-key-csv";

describe("parseCSVKeys", () => {
  it("handles BOMs, quoted cells, CRLF rows, and a key column after other columns", () => {
    const csv = '\uFEFF"Campaign","Game Key","Platform"\r\n"Launch, one","ABCD-1234","Steam"\r\n';
    assert.deepEqual(parseCSVKeys(csv), ["ABCD-1234"]);
  });

  it("supports escaped quotes and commas in standard quoted values", () => {
    const csv = 'access_key,notes\n"AB""CD,123","creator key"\n';
    assert.deepEqual(parseCSVKeys(csv), ['AB"CD,123']);
  });

  it("rejects malformed quoted CSV instead of importing a partial value", () => {
    assert.throws(() => parseCSVKeys('key,notes\n"unfinished key,creator\n'), /quoted value was not closed/);
    assert.throws(() => parseCSVKeys("key,notes\nABC\"123,creator\n"), /quote appeared inside an unquoted value/);
  });

  it("rejects ambiguous multi-column rows without a key header", () => {
    assert.throws(() => parseCSVKeys("ABCD-1234,Steam\nEFGH-5678,Steam\n"), /must include a key/);
  });
});