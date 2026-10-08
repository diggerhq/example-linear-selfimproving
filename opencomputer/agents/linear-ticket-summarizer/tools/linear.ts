import {
  callService,
  defineTool,
} from "@opencomputer/agent";
import type { DataValue } from "@opencomputer/agent";

export function parseLinearIssueReference(value: string): string {
  const reference = value.trim();
  const identifier = reference.match(/^[A-Za-z][A-Za-z0-9]*-[0-9]+$/)?.[0] ??
    reference.match(/\/issue\/([A-Za-z][A-Za-z0-9]*-[0-9]+)(?:\/|$)/i)?.[1];
  if (!identifier) {
    throw new Error("issue must be a Linear identifier such as ENG-123 or a Linear issue URL");
  }
  return identifier.toUpperCase();
}

const issueQuery = `
  query SelfImprovementIssue($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      description
      url
      priority
      estimate
      createdAt
      updatedAt
      state { name type }
      team { key name }
      assignee { name }
      project { name }
      cycle { name number }
      labels { nodes { name } }
      comments(first: 20) {
        nodes {
          body
          createdAt
          user { name }
        }
      }
    }
  }
`;

const issuesQuery = `
  query SelfImprovementIssues {
    issues(first: 50, orderBy: updatedAt) {
      nodes {
        id
        identifier
        title
        url
        priority
        createdAt
        updatedAt
        state { name type }
        team { key name }
        assignee { name }
        project { name }
        cycle { name number }
        labels { nodes { name } }
      }
    }
  }
`;

type LinearQueryResult =
  | {
      ok: false;
      status: number;
      errors: Array<{ message: string; code: string | null }>;
    }
  | {
      ok: true;
      status: number;
      data: Record<string, DataValue>;
    };

async function queryLinear(
  query: string,
  variables?: Record<string, DataValue>,
  signal?: AbortSignal,
): Promise<LinearQueryResult> {
  const response = await callService({
    service: "linear",
    method: "POST",
    path: "/graphql",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, ...(variables ? { variables } : {}) }),
    signal,
  });
  const payload = (await response.json()) as {
    data?: Record<string, DataValue>;
    errors?: Array<{ message?: string; extensions?: { code?: string } }>;
  };
  if (!response.ok || payload.errors?.length) {
    return {
      ok: false,
      status: response.status,
      errors: (payload.errors ?? []).map((error) => ({
        message: error.message ?? "Unknown Linear GraphQL error",
        code: error.extensions?.code ?? null,
      })),
    };
  }
  return { ok: true, status: response.status, data: payload.data ?? {} };
}

export const linearListIssues = defineTool({
  name: "linear_list_issues",
  description:
    "List up to 50 recently updated Linear issues with their current state, priority, assignee, project, cycle, and labels. This tool is read-only.",
  input: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async run({ signal }): Promise<DataValue> {
    const result = await queryLinear(issuesQuery, undefined, signal);
    if (!result.ok) return result;
    return {
      ok: true,
      status: result.status,
      limit: 50,
      issues: (result.data.issues as { nodes?: DataValue[] } | undefined)?.nodes ?? [],
    };
  },
});

export const linearGetIssue = defineTool({
  name: "linear_get_issue",
  description:
    "Read one Linear issue and up to 20 comments by shorthand identifier or issue URL. This tool is read-only.",
  input: {
    type: "object",
    properties: {
      issue: {
        type: "string",
        minLength: 3,
        description: "A Linear issue identifier such as ENG-123, or its full Linear URL.",
      },
    },
    required: ["issue"],
    additionalProperties: false,
  },
  async run({ input, signal }): Promise<DataValue> {
    const identifier = parseLinearIssueReference(String(input.issue ?? ""));
    const result = await queryLinear(issueQuery, { id: identifier }, signal);
    if (!result.ok) return { ...result, identifier };
    const issue = result.data.issue;
    if (!issue) return { ok: false, status: result.status, identifier, error: "Issue not found" };
    return { ok: true, status: result.status, issue };
  },
});

const createIssueMutation = `
  mutation SelfImprovementCreateIssue(
    $teamId: String!
    $title: String!
    $description: String
    $priority: Int
    $stateId: String
    $labelIds: [String!]
  ) {
    issueCreate(
      input: {
        teamId: $teamId
        title: $title
        description: $description
        priority: $priority
        stateId: $stateId
        labelIds: $labelIds
      }
    ) {
      success
      issue {
        id
        identifier
        title
        url
        priority
        createdAt
        state { name type }
        team { key name }
        labels { nodes { name } }
      }
    }
  }
`;

export const linearCreateIssue = defineTool({
  name: "linear_create_issue",
  description:
    "Create a new Linear issue and return its identifier (e.g. OPE-112) and URL. " +
    "Requires at minimum a teamId and title. Description, priority (0=none,1=urgent,2=high,3=medium,4=low), " +
    "stateId, and labelIds are optional.",
  input: {
    type: "object",
    properties: {
      teamId: {
        type: "string",
        minLength: 1,
        description: "The Linear team ID (UUID) or team key (e.g. OPE) to create the issue under.",
      },
      title: {
        type: "string",
        minLength: 1,
        description: "The issue title.",
      },
      description: {
        type: "string",
        description: "Optional markdown description for the issue.",
      },
      priority: {
        type: "number",
        description: "Optional priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low.",
        enum: [0, 1, 2, 3, 4],
      },
      stateId: {
        type: "string",
        description: "Optional Linear workflow state UUID to set on creation.",
      },
      labelIds: {
        type: "array",
        items: { type: "string" },
        description: "Optional array of Linear label UUIDs to attach.",
      },
    },
    required: ["teamId", "title"],
    additionalProperties: false,
  },
  async run({ input, signal }): Promise<DataValue> {
    const variables: Record<string, DataValue> = {
      teamId: String(input.teamId ?? ""),
      title: String(input.title ?? ""),
    };
    if (input.description != null) variables.description = String(input.description);
    if (input.priority != null) variables.priority = Number(input.priority);
    if (input.stateId != null) variables.stateId = String(input.stateId);
    if (input.labelIds != null) variables.labelIds = input.labelIds as DataValue;

    const result = await queryLinear(createIssueMutation, variables, signal);
    if (!result.ok) return result;

    const issueCreate = result.data.issueCreate as
      | { success?: boolean; issue?: DataValue }
      | undefined;
    if (!issueCreate?.success) {
      return {
        ok: false,
        status: result.status,
        error: "Linear reported issueCreate.success = false",
      };
    }
    return { ok: true, status: result.status, issue: issueCreate.issue ?? null };
  },
});

const listTeamsQuery = `
  query SelfImprovementListTeams {
    teams {
      nodes {
        id
        key
        name
      }
    }
  }
`;

export const linearListTeams = defineTool({
  name: "linear_list_teams",
  description:
    "List all Linear teams the token has access to, returning each team's UUID (id), " +
    "short key (e.g. OPE), and display name. Use this to resolve a team key or name " +
    "to the UUID required by linear_create_issue. This tool is read-only.",
  input: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async run({ signal }): Promise<DataValue> {
    const result = await queryLinear(listTeamsQuery, undefined, signal);
    if (!result.ok) return result;
    return {
      ok: true,
      status: result.status,
      teams: (result.data.teams as { nodes?: DataValue[] } | undefined)?.nodes ?? [],
    };
  },
});
