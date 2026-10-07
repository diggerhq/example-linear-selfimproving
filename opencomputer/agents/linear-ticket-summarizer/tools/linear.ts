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
