import assert from "node:assert/strict";
import test from "node:test";
import { parseLinearIssueReference } from "./linear.js";

test("accepts and normalizes a Linear identifier", () => {
  assert.equal(parseLinearIssueReference("eng-123"), "ENG-123");
});

test("extracts an identifier from a Linear issue URL", () => {
  assert.equal(
    parseLinearIssueReference("https://linear.app/acme/issue/ENG-123/improve-the-agent"),
    "ENG-123",
  );
});

test("rejects arbitrary text", () => {
  assert.throws(() => parseLinearIssueReference("fix the agent"), /ENG-123/);
});
