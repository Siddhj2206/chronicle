import assert from "node:assert/strict";
import { test } from "node:test";

import { safeCallbackUrl } from "@/lib/redirects";

test("preserves local paths, query strings and fragments", () => {
  for (const path of ["/", "/manuscripts", "/search?q=hello#results"]) {
    assert.equal(safeCallbackUrl(path), path);
  }
});

test("defaults missing or invalid callback destinations to home", () => {
  for (const value of [
    undefined,
    null,
    "",
    ["/manuscripts"],
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "javascript:alert(1)",
    "manuscripts",
    " /manuscripts",
    "/\n/example.com",
    "/a/..//example.com",
    "/%2e%2e//example.com",
  ]) {
    assert.equal(safeCallbackUrl(value), "/");
  }
});
