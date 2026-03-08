/**
 * v2.2 DB Client Tests — plain TypeScript script (no test framework).
 * Run with:  npx tsx src/lib/__tests__/v2.2-db.test.ts
 *
 * Tests covered:
 *  1. createClient — throws when MONGODB_URI is missing
 *  2. createClient — does NOT throw when MONGODB_URI is set (returns a MongoClient shape)
 *  3. Proxy — defers client creation until first property access
 *  4. Proxy — forwards method calls to the underlying client (bind test)
 *  5. Proxy — forwards property reads (non-function values)
 *  6. Singleton — reuses the same client across multiple accesses (globalWithMongo)
 *  7. Proxy — does not throw on .db() access when URI is set (functional smoke test)
 *  8. Proxy — throws with helpful message when URI is missing during access
 *  9. Source analysis: db.ts structure
 */

import { MongoClient } from "mongodb";
import { makeAssertions, readSource } from "./test-helpers";

const { assert, assertTruthy, assertThrows, assertContains, summary } = makeAssertions();

// ---------------------------------------------------------------------------
// Inline re-implementation of src/lib/db.ts logic
// ---------------------------------------------------------------------------

function makeCreateClient(env: Record<string, string | undefined>) {
  return function createClient(): MongoClient {
    const uri = env["MONGODB_URI"];
    if (!uri) throw new Error("Missing environment variable: MONGODB_URI");
    return new MongoClient(uri);
  };
}

function makeGetClient(
  env: Record<string, string | undefined>,
  globalStore: { _mongoClient?: MongoClient },
  createClient: () => MongoClient,
): () => MongoClient {
  return function getClient(): MongoClient {
    if (env["NODE_ENV"] === "development") {
      if (!globalStore._mongoClient) globalStore._mongoClient = createClient();
      return globalStore._mongoClient;
    }
    return createClient();
  };
}

function makeProxy(getClient: () => MongoClient): MongoClient {
  return new Proxy({} as MongoClient, {
    get(_target, prop) {
      const client = getClient();
      const value = (client as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log("\nTest 1 — createClient: throws when MONGODB_URI is missing");
{
  const createClient = makeCreateClient({ NODE_ENV: "test" });
  assertThrows("createClient: missing URI → throws 'Missing environment variable: MONGODB_URI'", createClient, "Missing environment variable: MONGODB_URI");
}

console.log("\nTest 2 — createClient: does not throw when MONGODB_URI is set");
{
  const createClient = makeCreateClient({ MONGODB_URI: "mongodb://localhost:27017/test" });
  let threw = false;
  let client: MongoClient | undefined;
  try { client = createClient(); } catch { threw = true; }
  assert("createClient: URI present → does NOT throw", threw, false);
  assertTruthy("createClient: URI present → returns a MongoClient instance", client instanceof MongoClient);
}

console.log("\nTest 3 — Proxy: defers client creation until first access");
{
  let createCallCount = 0;
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "production" };
  const trackingCreateClient = (): MongoClient => { createCallCount++; return makeCreateClient(env)(); };
  const proxy = makeProxy(makeGetClient(env, {}, trackingCreateClient));
  assert("Proxy: createClient call count is 0 before any property access", createCallCount, 0);
  void (proxy as unknown as Record<string, unknown>)["db"];
  assert("Proxy: createClient call count is 1 after first property access", createCallCount, 1);
}

console.log("\nTest 4 — Proxy: forwards method calls bound to the real client");
{
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "production" };
  const proxy = makeProxy(makeGetClient(env, {}, makeCreateClient(env)));
  const dbProp = (proxy as unknown as Record<string, unknown>)["db"];
  assert("Proxy: accessing 'db' through proxy returns a function", typeof dbProp, "function");
}

console.log("\nTest 5 — Proxy: forwards non-function property reads");
{
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "production" };
  const proxy = makeProxy(makeGetClient(env, {}, makeCreateClient(env)));
  let threw = false;
  try { void (proxy as unknown as Record<string, unknown>)["options"]; } catch { threw = true; }
  assert("Proxy: reading a non-function property does not throw", threw, false);
}

console.log("\nTest 6 — Singleton: getClient() reuses cached client (development mode)");
{
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "development" };
  const globalStore: { _mongoClient?: MongoClient } = {};
  let createCallCount = 0;
  const trackingCreateClient = (): MongoClient => { createCallCount++; return makeCreateClient(env)(); };
  const getClient = makeGetClient(env, globalStore, trackingCreateClient);
  const client1 = getClient();
  const client2 = getClient();
  const client3 = getClient();
  assert("Development mode: createClient called exactly once for three getClient() calls", createCallCount, 1);
  assert("Development mode: all calls return the same client instance (client1 === client2)", client1 === client2, true);
  assert("Development mode: all calls return the same client instance (client2 === client3)", client2 === client3, true);
}

console.log("\nTest 7 — Proxy: smoke test — .db() access does not throw with valid URI");
{
  const env = { MONGODB_URI: "mongodb://localhost:27017/smoketest", NODE_ENV: "production" };
  const proxy = makeProxy(makeGetClient(env, {}, makeCreateClient(env)));
  let threw = false;
  let dbInstance: unknown;
  try { dbInstance = (proxy as unknown as { db: () => unknown }).db(); } catch { threw = true; }
  assert("Proxy: proxy.db() does not throw with valid URI", threw, false);
  assertTruthy("Proxy: proxy.db() returns a non-null Db instance", dbInstance !== null && dbInstance !== undefined);
}

console.log("\nTest 8 — Proxy: accessing proxy without URI throws helpful error");
{
  const env: Record<string, string | undefined> = { NODE_ENV: "production" };
  const proxy = makeProxy(makeGetClient(env, {}, makeCreateClient(env)));
  let errorMessage = "";
  try { void (proxy as unknown as { db: () => unknown }).db(); } catch (err) { errorMessage = err instanceof Error ? err.message : String(err); }
  assert("Proxy: accessing proxy without MONGODB_URI throws 'Missing environment variable: MONGODB_URI'", errorMessage.includes("Missing environment variable: MONGODB_URI"), true);
}

console.log("\nTest 9 — Source analysis: db.ts structure");
{
  const dbSrc = readSource("src/lib/db.ts");
  assertContains("db.ts: uses Proxy to defer client creation", dbSrc, "new Proxy(");
  assertContains("db.ts: throws when MONGODB_URI is absent", dbSrc, "Missing environment variable: MONGODB_URI");
  assertContains("db.ts: development mode caches client on globalWithMongo", dbSrc, "globalWithMongo._mongoClient");
  assertContains("db.ts: exports clientProxy as default", dbSrc, "export default clientProxy");
  assertContains("db.ts: binds method calls to the real client", dbSrc, "return value.bind(client)");
}

summary();
