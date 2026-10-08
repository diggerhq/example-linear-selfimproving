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

// ---------------------------------------------------------------------------
// linearCreateIssue input validation
// ---------------------------------------------------------------------------
import { linearCreateIssue } from "./linear.js";

test("linearCreateIssue tool is named linear_create_issue", () => {
  assert.equal(linearCreateIssue.name, "linear_create_issue");
});

test("linearCreateIssue input schema requires teamId and title", () => {
  const schema = linearCreateIssue.input as {
    required?: string[];
    properties: Record<string, unknown>;
  };
  assert.ok(schema.required?.includes("teamId"), "teamId should be required");
  assert.ok(schema.required?.includes("title"), "title should be required");
});

test("linearCreateIssue input schema exposes optional priority enum", () => {
  const schema = linearCreateIssue.input as {
    properties: Record<string, { enum?: number[] }>;
  };
  assert.deepEqual(schema.properties.priority?.enum, [0, 1, 2, 3, 4]);
});

test("linearCreateIssue input schema exposes optional description and stateId", () => {
  const schema = linearCreateIssue.input as {
    properties: Record<string, unknown>;
  };
  assert.ok("description" in schema.properties, "description property should exist");
  assert.ok("stateId" in schema.properties, "stateId property should exist");
  assert.ok("labelIds" in schema.properties, "labelIds property should exist");
});

// ---------------------------------------------------------------------------
// linearListTeams tool definition
// ---------------------------------------------------------------------------
import { linearListTeams } from "./linear.js";

test("linearListTeams tool is named linear_list_teams", () => {
  assert.equal(linearListTeams.name, "linear_list_teams");
});

test("linearListTeams input schema accepts no properties", () => {
  const schema = linearListTeams.input as {
    properties: Record<string, unknown>;
    additionalProperties: boolean;
  };
  assert.deepEqual(Object.keys(schema.properties), []);
  assert.equal(schema.additionalProperties, false);
});

test("linearListTeams description mentions id, key, and name", () => {
  const desc = linearListTeams.description ?? "";
  assert.ok(desc.includes("id"), "description should mention id");
  assert.ok(desc.includes("key"), "description should mention key");
  assert.ok(desc.includes("name"), "description should mention name");
});
