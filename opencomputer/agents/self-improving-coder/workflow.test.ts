import assert from "node:assert/strict";
import test from "node:test";
import { consultationStep } from "./workflow.js";

test("a delegated brief does not consult its delegating agent again", () => {
  const instruction = consultationStep("subagent");

  assert.match(instruction, /do\s+not consult the delegating agent back/);
  assert.match(instruction, /consultation cycle/);
});

test("a direct request still consults the Linear summarizer", () => {
  const instruction = consultationStep("user");

  assert.match(instruction, /consult tool/);
  assert.match(instruction, /linear-ticket-summarizer/);
});
