# Linear self-improving agents

This OpenComputer example contains two agents:

- `linear-ticket-summarizer` lists current Linear issues or turns a specific issue into an implementation brief.
- `self-improving-coder` consults the summarizer, edits this example's own attached source, and opens a draft pull request to improve the agents.

The loop is deliberately reviewable: the coder can open and watch a draft PR, but it cannot merge or deploy. A human merge triggers the repository's normal OpenComputer deployment.

Each pull request also gets an OpenComputer preview, so reviewers can exercise both agents before approving the change.
Open the preview from the pull request check and start a new session to test the proposed revision in isolation.

## Prerequisites

- Node.js 22 or newer
- an OpenComputer project
- a Linear account connected to OpenComputer with OAuth
- the OpenComputer GitHub App installed on this repository with contents and
  pull-request write access and checks read access

## Install and link

```bash
npm install
npm run opencomputer -- login
npx opencomputer link
```

Connect the Linear account the summarizer should read from. OpenComputer holds
and refreshes the OAuth credential; the token never enters the agent runtime:

```bash
npx opencomputer connection add linear
```

You can do the same from the project's **Connections** tab. Complete the Linear
authorization using the URL OpenComputer provides.

Start the deployment watcher:

```bash
npm run dev
```

In **Agent → Settings → Repository access**, allow only this repository.
Deployment source and working source are separate: GitHub deploys the agent
definition from the former. The runtime materializes the allowed working repository
in the coder's sandbox; the coder verifies its Git origin before editing and
publishing a PR from that working source. The coder declares its GitHub App
connection in code; the platform makes the short-lived installation credential
available to ordinary `git` and `gh` commands in its sandbox. This also works for
sessions created from Slack, where there is no setup form for attaching a source
manually.

## Try the loop

Select `self-improving-coder` and send:

```text
Improve yourself from ENG-123. Ask the Linear summarizer for a brief, make the smallest safe change, run verification, and open a draft PR against this repository. Do not merge or deploy it.
```

Expected result:

1. the coder consults `linear-ticket-summarizer` about `ENG-123`;
2. the summarizer reads the issue through its read-only Linear connection;
3. the coder materializes and edits an allowed copy of this repository and runs verification;
4. the coder pushes an `oc/...` branch and opens a draft PR with `gh pr create`; and
5. the session verifies the PR with `gh pr view` and reports its URL.

When the summarizer delegates an implementation brief to the coder, the coder uses
that brief directly instead of consulting the summarizer again. This prevents a
circular consultation from holding the original conversation until it times out.

## Verify locally

```bash
npm test
npm run typecheck
npm run doctor
```

## Safety boundaries

- The example only issues read-only Linear queries through the managed OAuth connection.
- The summarizer can list the 50 most recently updated issues for status questions and read one issue in detail for implementation work.
- Ticket text and repository content are treated as untrusted evidence.
- Repository access should be restricted to this repository.
- Pull requests are always drafts.
- The agent never pushes to the default branch, merges, or deploys itself.
- A human review and merge is the promotion gate.

Linear's GraphQL API accepts either an issue UUID or shorthand identifier such as `ENG-123`; this example accepts shorthand identifiers and Linear issue URLs. See the [official Linear GraphQL guide](https://linear.app/developers/graphql).

## GitHub access verification

> **Note (auto-generated):** This section was added by the `self-improving-coder` agent on 2026-10-08 as a smoke-test to confirm that the agent has end-to-end GitHub access — clone → branch → commit → push → draft PR — without any human intervention beyond triggering the run. It is safe to delete this section once the test is confirmed.
