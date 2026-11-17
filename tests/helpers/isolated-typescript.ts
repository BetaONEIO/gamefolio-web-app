import { readFile } from "node:fs/promises";
import * as nodeModule from "node:module";
import { SourceTextModule, SyntheticModule } from "node:vm";

// Exercise real service code while isolating the database and outbound pushes.
// Native stripping also lets these tests run in dependency-free Node 24;
// the project's Node 20 test runner uses its existing esbuild dependency.
export async function loadIsolatedService(file: URL, mocks: Record<string, Record<string, unknown>>) {
  const source = await readFile(file, "utf8");
  const nativeStrip = (nodeModule as any).stripTypeScriptTypes;
  const code = nativeStrip
    ? nativeStrip(source, { mode: "strip" })
    : (await (await import("esbuild")).transform(source, { loader: "ts", format: "esm" })).code;
  const module = new SourceTextModule(code, { identifier: file.href });
  await module.link(async specifier => {
    const exports = mocks[specifier];
    if (!exports) throw new Error(`Unexpected live dependency in test: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return module.namespace as any;
}
