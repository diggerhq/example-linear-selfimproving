import assert from "node:assert/strict";
import test from "node:test";
import { consultationStep, requestForPrompt } from "./workflow.js";

test("a delegated brief does not consult its delegating agent again", () => {
  const instruction = consultationStep("subagent");

  assert.match(instruction, /do\s+not consult the delegating agent back/);
  assert.match(instruction, /consultation cycle/);
});

test("a direct request still consults the Linear summarizer", () => {
  const instruction = consultationStep("user");

  assert.match(instruction, /consult tool/);
  assert.match(instruction, /linear-ticket-summarizer/);
  assert.match(instruction, /under 700 words/);
  assert.match(instruction, /Do not ask it to guess/);
});

test("a large delegated brief is bounded without losing its ending", () => {
  const request = `start-${"x".repeat(14_000)}-safety-boundary`;
  const formatted = requestForPrompt("subagent", request);

  assert.ok(formatted.length < request.length);
  assert.match(formatted, /^start-/);
  assert.match(formatted, /Delegated brief truncated/);
  assert.match(formatted, /-safety-boundary$/);
});

test("direct requests and compact delegated briefs are unchanged", () => {
  assert.equal(requestForPrompt("user", "x".repeat(14_000)).length, 14_000);
  assert.equal(requestForPrompt("subagent", "compact brief"), "compact brief");
});
