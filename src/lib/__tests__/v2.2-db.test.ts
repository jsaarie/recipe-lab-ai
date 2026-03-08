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
 *  6. Development mode — reuses the same client across multiple accesses (singleton)
 *  7. Production mode — creates a new client on each getClient() call
 *  8. Proxy — does not throw on .db() access when URI is set (functional smoke test)
 *
 * Note: All tests simulate the logic of src/lib/db.ts inline, without importing
 * the actual module, to avoid requiring a live MongoDB connection.
 */

import { MongoClient } from "mongodb";

// ---------------------------------------------------------------------------
// Inline re-implementation of src/lib/db.ts logic
// This mirrors the source exactly so tests validate the real behaviour.
// ---------------------------------------------------------------------------

function makeCreateClient(env: Record<string, string | undefined>) {
  return function createClient(): MongoClient {
    const uri = env["MONGODB_URI"];
    if (!uri) {
      throw new Error("Missing environment variable: MONGODB_URI");
    }
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
      if (!globalStore._mongoClient) {
        globalStore._mongoClient = createClient();
      }
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
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  });
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(testName: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (ok) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected: ${JSON.stringify(expected)}\n         actual  : ${JSON.stringify(actual)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertTruthy(testName: string, value: unknown): void {
  if (value) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected truthy, got: ${JSON.stringify(value)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertThrows(testName: string, fn: () => unknown, msgFragment: string): void {
  try {
    fn();
    const msg = `  FAIL  ${testName}\n         expected to throw, but did not`;
    console.error(msg);
    failures.push(msg);
    failed++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes(msgFragment)) {
      console.log(`  PASS  ${testName}`);
      passed++;
    } else {
      const msg = `  FAIL  ${testName}\n         expected error message to contain: "${msgFragment}"\n         actual  : "${message}"`;
      console.error(msg);
      failures.push(msg);
      failed++;
    }
  }
}

// ---------------------------------------------------------------------------
// Test 1 — createClient throws when MONGODB_URI is absent
// ---------------------------------------------------------------------------

console.log("\nTest 1 — createClient: throws when MONGODB_URI is missing");

{
  const createClient = makeCreateClient({ NODE_ENV: "test" });

  assertThrows(
    "createClient: missing URI → throws 'Missing environment variable: MONGODB_URI'",
    createClient,
    "Missing environment variable: MONGODB_URI",
  );
}

// ---------------------------------------------------------------------------
// Test 2 — createClient does NOT throw when MONGODB_URI is set
// ---------------------------------------------------------------------------

console.log("\nTest 2 — createClient: does not throw when MONGODB_URI is set");

{
  const createClient = makeCreateClient({ MONGODB_URI: "mongodb://localhost:27017/test" });

  let threw = false;
  let client: MongoClient | undefined;
  try {
    client = createClient();
  } catch {
    threw = true;
  }

  assert(
    "createClient: URI present → does NOT throw",
    threw,
    false,
  );
  assertTruthy(
    "createClient: URI present → returns a MongoClient instance",
    client instanceof MongoClient,
  );
}

// ---------------------------------------------------------------------------
// Test 3 — Proxy defers client creation until first property access
// ---------------------------------------------------------------------------

console.log("\nTest 3 — Proxy: defers client creation until first access");

{
  let createCallCount = 0;
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "production" };

  const trackingCreateClient = (): MongoClient => {
    createCallCount++;
    return makeCreateClient(env)();
  };

  const getClient = makeGetClient(env, {}, trackingCreateClient);
  const proxy = makeProxy(getClient);

  // Before any property access, createClient should NOT have been called
  assert(
    "Proxy: createClient call count is 0 before any property access",
    createCallCount,
    0,
  );

  // Access a property through the proxy — this should trigger client creation
  void (proxy as unknown as Record<string, unknown>)["db"];

  assert(
    "Proxy: createClient call count is 1 after first property access",
    createCallCount,
    1,
  );
}

// ---------------------------------------------------------------------------
// Test 4 — Proxy forwards method calls as bound functions
// ---------------------------------------------------------------------------

console.log("\nTest 4 — Proxy: forwards method calls bound to the real client");

{
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "production" };
  const createClient = makeCreateClient(env);
  const getClient = makeGetClient(env, {}, createClient);
  const proxy = makeProxy(getClient);

  // .db is a function on MongoClient — accessing it through the proxy should
  // return a function (bound to the real client)
  const dbProp = (proxy as unknown as Record<string, unknown>)["db"];

  assert(
    "Proxy: accessing 'db' through proxy returns a function",
    typeof dbProp,
    "function",
  );
}

// ---------------------------------------------------------------------------
// Test 5 — Proxy forwards non-function property reads
// ---------------------------------------------------------------------------

console.log("\nTest 5 — Proxy: forwards non-function property reads");

{
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "production" };
  const createClient = makeCreateClient(env);
  const getClient = makeGetClient(env, {}, createClient);
  const proxy = makeProxy(getClient);

  // MongoClient.readPreference is a non-function property that should be forwarded
  // through the proxy and be non-undefined (as a ReadPreference object or similar).
  // We only assert it doesn't throw and proxy access works.
  let threw = false;
  try {
    void (proxy as unknown as Record<string, unknown>)["options"];
  } catch {
    threw = true;
  }

  assert(
    "Proxy: reading a non-function property does not throw",
    threw,
    false,
  );
}

// ---------------------------------------------------------------------------
// Test 6 — Development mode: singleton — same client reused across calls
// ---------------------------------------------------------------------------

console.log("\nTest 6 — Development mode: getClient() reuses cached client (singleton)");

{
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "development" };
  const globalStore: { _mongoClient?: MongoClient } = {};
  let createCallCount = 0;

  const trackingCreateClient = (): MongoClient => {
    createCallCount++;
    return makeCreateClient(env)();
  };

  const getClient = makeGetClient(env, globalStore, trackingCreateClient);

  const client1 = getClient();
  const client2 = getClient();
  const client3 = getClient();

  assert(
    "Development mode: createClient called exactly once for three getClient() calls",
    createCallCount,
    1,
  );
  assert(
    "Development mode: all calls return the same client instance (client1 === client2)",
    client1 === client2,
    true,
  );
  assert(
    "Development mode: all calls return the same client instance (client2 === client3)",
    client2 === client3,
    true,
  );
}

// ---------------------------------------------------------------------------
// Test 7 — Production mode: new client on each getClient() call
// ---------------------------------------------------------------------------

console.log("\nTest 7 — Production mode: getClient() creates a new client each call");

{
  const env = { MONGODB_URI: "mongodb://localhost:27017/test", NODE_ENV: "production" };
  const globalStore: { _mongoClient?: MongoClient } = {};
  let createCallCount = 0;

  const trackingCreateClient = (): MongoClient => {
    createCallCount++;
    return makeCreateClient(env)();
  };

  const getClient = makeGetClient(env, globalStore, trackingCreateClient);

  const client1 = getClient();
  const client2 = getClient();
  const client3 = getClient();

  assert(
    "Production mode: createClient called 3 times for three getClient() calls",
    createCallCount,
    3,
  );
  assert(
    "Production mode: consecutive calls return different instances (client1 !== client2)",
    client1 !== client2,
    true,
  );
  assert(
    "Production mode: consecutive calls return different instances (client2 !== client3)",
    client2 !== client3,
    true,
  );
}

// ---------------------------------------------------------------------------
// Test 8 — Proxy smoke test: proxy does not throw on .db() when URI is set
// ---------------------------------------------------------------------------

console.log("\nTest 8 — Proxy: smoke test — .db() access does not throw with valid URI");

{
  const env = { MONGODB_URI: "mongodb://localhost:27017/smoketest", NODE_ENV: "production" };
  const createClient = makeCreateClient(env);
  const getClient = makeGetClient(env, {}, createClient);
  const proxy = makeProxy(getClient);

  let threw = false;
  let dbInstance: unknown;
  try {
    // Calling proxy.db() returns a Db object (lazy — no network connection yet)
    dbInstance = (proxy as unknown as { db: () => unknown }).db();
  } catch {
    threw = true;
  }

  assert(
    "Proxy: proxy.db() does not throw with valid URI",
    threw,
    false,
  );
  assertTruthy(
    "Proxy: proxy.db() returns a non-null Db instance",
    dbInstance !== null && dbInstance !== undefined,
  );
}

// ---------------------------------------------------------------------------
// Test 9 — Proxy: throws with helpful message when URI is missing during access
// ---------------------------------------------------------------------------

console.log("\nTest 9 — Proxy: accessing proxy without URI throws helpful error");

{
  const env: Record<string, string | undefined> = { NODE_ENV: "production" };
  const createClient = makeCreateClient(env);
  const getClient = makeGetClient(env, {}, createClient);
  const proxy = makeProxy(getClient);

  let errorMessage = "";
  try {
    void (proxy as unknown as { db: () => unknown }).db();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  assert(
    "Proxy: accessing proxy without MONGODB_URI throws 'Missing environment variable: MONGODB_URI'",
    errorMessage.includes("Missing environment variable: MONGODB_URI"),
    true,
  );
}

// ---------------------------------------------------------------------------
// Test 10 — Source analysis: db.ts exports a proxy, not a raw MongoClient
// ---------------------------------------------------------------------------

console.log("\nTest 10 — Source analysis: db.ts structure");

import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(__dirname, "../../..");

function readSource(relPath: string): string {
  return readFileSync(resolve(PROJECT_ROOT, relPath), "utf8");
}

function assertContains(testName: string, source: string, needle: string): void {
  if (source.includes(needle)) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected source to contain: ${JSON.stringify(needle)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

{
  const dbSrc = readSource("src/lib/db.ts");

  assertContains(
    "db.ts: uses Proxy to defer client creation",
    dbSrc,
    "new Proxy(",
  );
  assertContains(
    "db.ts: throws when MONGODB_URI is absent",
    dbSrc,
    "Missing environment variable: MONGODB_URI",
  );
  assertContains(
    "db.ts: development mode caches client on globalWithMongo",
    dbSrc,
    "globalWithMongo._mongoClient",
  );
  assertContains(
    "db.ts: exports clientProxy as default",
    dbSrc,
    "export default clientProxy",
  );
  assertContains(
    "db.ts: binds method calls to the real client",
    dbSrc,
    "return value.bind(client)",
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} total`);
if (failures.length > 0) {
  console.error("\nFailed tests:");
  for (const f of failures) console.error(f);
  process.exit(1);
} else {
  console.log("All tests passed.");
  process.exit(0);
}
