// Shared test assertion helpers for Recipe Lab AI plain-TypeScript test scripts.
// Import with: import { makeAssertions, readSource, PROJECT_ROOT } from "./test-helpers";

import { readFileSync } from "fs";
import { resolve } from "path";

export const PROJECT_ROOT = resolve(__dirname, "../../..");

export function readSource(relPath: string): string {
  return readFileSync(resolve(PROJECT_ROOT, relPath), "utf8");
}

export function makeAssertions() {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function pass(testName: string) {
    console.log(`  PASS  ${testName}`);
    passed++;
  }
  function fail(testName: string, msg: string) {
    console.error(msg);
    failures.push(msg);
    failed++;
  }

  function assert(testName: string, actual: unknown, expected: unknown): void {
    const ok =
      typeof actual === "number" && typeof expected === "number"
        ? Math.abs(actual - expected) < 0.01
        : actual === expected;
    if (ok) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected: ${JSON.stringify(expected)}\n         actual  : ${JSON.stringify(actual)}`);
  }

  function assertTruthy(testName: string, value: unknown): void {
    if (value) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected truthy, got: ${JSON.stringify(value)}`);
  }

  function assertFalsy(testName: string, value: unknown): void {
    if (!value) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected falsy, got: ${JSON.stringify(value)}`);
  }

  function assertUndefined(testName: string, value: unknown): void {
    if (value === undefined) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected undefined, got: ${JSON.stringify(value)}`);
  }

  function assertContains(testName: string, source: string, needle: string): void {
    if (source.includes(needle)) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected source to contain: ${JSON.stringify(needle)}`);
  }

  function assertNotContains(testName: string, source: string, needle: string): void {
    if (!source.includes(needle)) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected source to NOT contain: ${JSON.stringify(needle)}`);
  }

  function assertMatches(testName: string, value: string, pattern: RegExp): void {
    if (pattern.test(value)) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected to match: ${pattern}\n         actual  : ${value.slice(0, 80)}`);
  }

  function assertMatchesRegex(testName: string, source: string, pattern: RegExp): void {
    if (pattern.test(source)) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected source to match: ${pattern}`);
  }

  function assertThrows(testName: string, fn: () => unknown, msgFragment: string): void {
    try {
      fn();
      fail(testName, `  FAIL  ${testName}\n         expected to throw, but did not`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes(msgFragment)) pass(testName);
      else fail(testName, `  FAIL  ${testName}\n         expected error message to contain: "${msgFragment}"\n         actual  : "${message}"`);
    }
  }

  function assertClose(testName: string, actual: number, expected: number, tolerance = 1): void {
    if (Math.abs(actual - expected) <= tolerance) pass(testName);
    else fail(testName, `  FAIL  ${testName}\n         expected: ~${expected} (±${tolerance})\n         actual  : ${actual}`);
  }

  function todo(testName: string, reason: string): void {
    console.log(`  TODO  ${testName}\n         Reason: ${reason}`);
  }

  function summary(): void {
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
  }

  return {
    assert, assertTruthy, assertFalsy, assertUndefined,
    assertContains, assertNotContains, assertMatches, assertMatchesRegex,
    assertThrows, assertClose, todo, summary,
    get passed() { return passed; },
    get failed() { return failed; },
    get failures() { return failures; },
  };
}
