# Linear self-improving agents

This OpenComputer example contains two agents:

- `linear-ticket-summarizer` lists current Linear issues or turns a specific issue into an implementation brief.
- `self-improving-coder` consults the summarizer, edits this example's own attached source, and opens a draft pull request to improve the agents.

The loop is deliberately reviewable: the coder can open and watch a draft PR, but it cannot merge or deploy. A human merge triggers the repository's normal OpenComputer deployment.

## Prerequisites

- Node.js 22 or newer
- an OpenComputer project
- a Linear account connected to OpenComputer with OAuth
- the OpenComputer GitHub App installed on this repository with pull-request access

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
definition from the former. When work starts, the coder resolves the allowed
repository with `list_working_repos`, materializes it with `add_source`, then edits
and publishes a PR from that working source. This also works for sessions created
from Slack, where there is no setup form for attaching a source manually.

## Try the loop

Select `self-improving-coder` and send:

```text
Improve yourself from ENG-123. Ask the Linear summarizer for a brief, make the smallest safe change, run verification, and open a draft PR against this repository. Do not merge or deploy it.
```

Expected result:

1. the coder consults `linear-ticket-summarizer` about `ENG-123`;
2. the summarizer reads the issue through its read-only Linear connection;
3. the coder materializes and edits an allowed copy of this repository and runs verification;
4. OpenComputer publishes an `oc/...` branch and draft PR without exposing a GitHub token to the agent; and
5. the session watches the PR checks and reports its URL.

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
