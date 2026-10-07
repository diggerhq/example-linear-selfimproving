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
    const response = await callService({
      service: "linear",
      method: "POST",
      path: "/graphql",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: issueQuery, variables: { id: identifier } }),
      signal,
    });
    const payload = (await response.json()) as {
      data?: { issue?: DataValue | null };
      errors?: Array<{ message?: string; extensions?: { code?: string } }>;
    };

    if (!response.ok || payload.errors?.length) {
      return {
        ok: false,
        status: response.status,
        identifier,
        errors: (payload.errors ?? []).map((error) => ({
          message: error.message ?? "Unknown Linear GraphQL error",
          code: error.extensions?.code ?? null,
        })),
      };
    }
    if (!payload.data?.issue) {
      return { ok: false, status: response.status, identifier, error: "Issue not found" };
    }
    return { ok: true, status: response.status, issue: payload.data.issue };
  },
});
