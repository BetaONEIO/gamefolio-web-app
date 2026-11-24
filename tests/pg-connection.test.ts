import { after, test } from "node:test";
import assert from "node:assert/strict";
import { pgConnectionString } from "../server/pg-connection";

const originalNodeEnv = process.env.NODE_ENV;
after(() => { process.env.NODE_ENV = originalNodeEnv; });

const supabaseUrl = "postgres://user:password@aws-0.pooler.supabase.com:6543/postgres?sslmode=require";

test("development Supabase pg connections stay encrypted when its certificate chain is untrusted", () => {
  process.env.NODE_ENV = "development";
  const url = new URL(pgConnectionString(supabaseUrl));
  assert.equal(url.searchParams.get("sslmode"), "no-verify");
  assert.equal(url.hostname, "aws-0.pooler.supabase.com");
});

test("production and unrelated database URLs keep their original TLS settings", () => {
  process.env.NODE_ENV = "production";
  assert.equal(pgConnectionString(supabaseUrl), supabaseUrl);

  process.env.NODE_ENV = "development";
  const other = "postgres://user:password@db.example.com:5432/app?sslmode=require";
  assert.equal(pgConnectionString(other), other);
});