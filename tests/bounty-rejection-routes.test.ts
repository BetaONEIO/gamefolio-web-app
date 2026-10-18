import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Execute the production route callbacks with an isolated transaction double.
// No development campaign or user rows are created by this regression test.
const source = readFileSync("server/routes/bounty-marketplace.ts", "utf8");
const file = ts.createSourceFile("bounty-marketplace.ts", source, ts.ScriptTarget.Latest, true);

function routeHandler(path: string, deps: Record<string, unknown>) {
  const statement = file.statements.find(node => {
    if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression)) return false;
    const call = node.expression;
    return call.expression.getText(file) === "router.post" && call.arguments[0].getText(file).includes(`'${path}'`);
  });
  assert.ok(statement && ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression), `Missing POST ${path}`);
  const callback = statement.expression.arguments.at(-1);
  assert.ok(callback && ts.isArrowFunction(callback), `Missing POST handler ${path}`);
  const compiled = ts.transpileModule(`const handler = ${callback.getText(file)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return new Function(...Object.keys(deps), `${compiled}\nreturn handler;`)(...Object.values(deps)) as
    (req: any, res: any) => Promise<void>;
}

function response() {
  return {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
}

test("rejected participation cannot reveal a key or reopen staging and package submission", async () => {
  let status = "rejected";
  let writes = 0;
  let initialStatus: string | null = null;
  const participant = () => ({
    id: 72, user_id: 81, status, access_key_id: 91, key_id: 91,
    key_status: "available", access_revealed_at: null, deadline_days: 10,
    deadline: "2030-01-01T00:00:00.000Z",
  });
  const execute = async (query: { text: string }) => {
    const text = query.text.replace(/\s+/g, " ");
    if (text.includes("SELECT cp.id, cp.status, cp.access_key_id")) return [{ ...participant(), status: initialStatus ?? status }];
    if (text.includes("SELECT access_revealed_at, status FROM campaign_participants")) return [participant()];
    if (text.includes("SELECT status, access_revealed_at FROM campaign_participants")) return [participant()];
    if (text.includes("SELECT cp.id, cp.status, cp.deadline")) return [participant()];
    if (text.includes("SELECT cp.id, cp.user_id, cp.status, cp.deadline")) return [participant()];
    if (/UPDATE|INSERT|DELETE/.test(text)) { writes++; throw new Error(`Unexpected mutation: ${text}`); }
    throw new Error(`Unexpected query: ${text}`);
  };
  const deps = {
    db: { execute, transaction: async (fn: (tx: { execute: typeof execute }) => Promise<unknown>) => fn({ execute }) },
    sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
      ({ text: strings.reduce((result, part, index) => result + part + (index < values.length ? "?" : ""), "") }),
    toRows: (rows: unknown) => rows,
    rejectIndieDeveloperParticipation: () => false,
  };
  const reveal = routeHandler("/:instanceId/reveal-access-key", deps);
  const stage = routeHandler("/my/:instanceId/stage/:bountyId", deps);
  const submit = routeHandler("/my/:instanceId/submit-package", deps);
  const req = { user: { id: 81 }, params: { instanceId: "71", bountyId: "73" }, body: { contentType: "feedback", contentData: { text: "Reopen" } } };

  const deniedReveal = response();
  await reveal(req, deniedReveal);
  assert.equal(deniedReveal.statusCode, 409);
  assert.equal(status, "rejected");

  // A previous read can race with the owner's rejection: the locked row wins.
  initialStatus = "access_reserved";
  const racedReveal = response();
  await reveal(req, racedReveal);
  assert.equal(racedReveal.statusCode, 409);
  initialStatus = null;

  const deniedStage = response();
  await stage(req, deniedStage);
  assert.equal(deniedStage.statusCode, 409);

  const deniedPackage = response();
  await submit(req, deniedPackage);
  assert.equal(deniedPackage.statusCode, 409);
  assert.equal(writes, 0);

  // No-key campaigns must apply the same locked-row check.
  initialStatus = "access_accepted";
  const keylessDeps = {
    ...deps,
    db: {
      execute: async (query: { text: string }) => {
        if (query.text.includes("SELECT cp.id, cp.status, cp.access_key_id")) {
          return [{ ...participant(), status: initialStatus, access_key_id: null, key_id: null }];
        }
        return execute(query);
      },
      transaction: deps.db.transaction,
    },
  };
  const keylessReveal = routeHandler("/:instanceId/reveal-access-key", keylessDeps);
  const deniedKeyless = response();
  await keylessReveal(req, deniedKeyless);
  assert.equal(deniedKeyless.statusCode, 409);
  assert.equal(writes, 0);
});