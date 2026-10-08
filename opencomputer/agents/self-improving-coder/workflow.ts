export function consultationStep(inputSource: string): string {
  if (inputSource === "subagent") {
    return `1. This request was delegated by another project agent. If it already
   contains an implementation brief or acceptance criteria, use that brief and do
   not consult the delegating agent back. A consultation cycle blocks the original
   conversation and eventually times out. Only ask a concise follow-up when a
   material requirement is actually missing.`;
  }

  return `1. Use the built-in consult tool once to ask the linear-ticket-summarizer
   project member about the issue identifier or URL. Ask for a brief under 700 words
   containing only verified evidence, acceptance criteria, risks, and open questions.
   Do not ask it to guess repository paths, SDK APIs, or implementation details.`;
}

const MAX_DELEGATED_REQUEST_CHARS = 12_000;

export function requestForPrompt(inputSource: string, request: string): string {
  if (inputSource !== "subagent" || request.length <= MAX_DELEGATED_REQUEST_CHARS) {
    return request;
  }

  const endingLength = 2_000;
  const beginningLength = MAX_DELEGATED_REQUEST_CHARS - endingLength;
  return `${request.slice(0, beginningLength)}\n\n[Delegated brief truncated to keep the coding loop bounded.]\n\n${request.slice(-endingLength)}`;
}
