# Linear self-improving agents

This OpenComputer example contains two agents:

- `linear-ticket-summarizer` reads one Linear issue and turns it into an implementation brief.
- `self-improving-coder` delegates to the summarizer, edits this example's own attached source, and opens a draft pull request to improve the agents.

The loop is deliberately reviewable: the coder can open and watch a draft PR, but it cannot merge or deploy. A human merge triggers the repository's normal OpenComputer deployment.

## Prerequisites

- Node.js 22 or newer
- an OpenComputer project
- a Linear personal API key with access to the example workspace
- the OpenComputer GitHub App installed on this repository with pull-request access

## Install and link

```bash
npm install
npm run opencomputer -- login
npx opencomputer link
```

Store the Linear key for the summarizer. It is injected only into requests to `https://api.linear.app/graphql`:

```bash
npx opencomputer secrets set LINEAR_API_KEY \
  --environment development \
  --agent linear-ticket-summarizer
```

Start the development deployment watcher:

```bash
npm run dev
```

In **Agent → Settings → Repository access**, allow only this repository. When starting a coder session, attach this repository's default branch as a working source. Deployment source and working source are separate: GitHub deploys the agent definition from the former, while the session edits and publishes a PR from the latter.

## Try the loop

Select `self-improving-coder` and send:

```text
Improve yourself from ENG-123. Ask the Linear summarizer for a brief, make the smallest safe change, run verification, and open a draft PR against this repository. Do not merge or deploy it.
```

Expected result:

1. the coder delegates `ENG-123` to `linear-ticket-summarizer`;
2. the summarizer reads the issue through its read-only Linear connection;
3. the coder edits the attached copy of this repository and runs verification;
4. OpenComputer publishes an `oc/...` branch and draft PR without exposing a GitHub token to the agent; and
5. the session watches the PR checks and reports its URL.

## Verify locally

```bash
npm test
npm run typecheck
npm run doctor
```

## Safety boundaries

- Linear access is read-only.
- Ticket text and repository content are treated as untrusted evidence.
- Repository access should be restricted to this repository.
- Pull requests are always drafts.
- The agent never pushes to the default branch, merges, or deploys itself.
- A human review and merge is the promotion gate.

Linear's GraphQL API accepts either an issue UUID or shorthand identifier such as `ENG-123`; this example accepts shorthand identifiers and Linear issue URLs. See the [official Linear GraphQL guide](https://linear.app/developers/graphql).
