export function consultationStep(inputSource: string): string {
  if (inputSource === "subagent") {
    return `1. This request was delegated by another project agent. If it already
   contains an implementation brief or acceptance criteria, use that brief and do
   not consult the delegating agent back. A consultation cycle blocks the original
   conversation and eventually times out. Only ask a concise follow-up when a
   material requirement is actually missing.`;
  }

  return `1. Use the built-in consult tool to ask the linear-ticket-summarizer project
   member about the issue identifier or URL. Require its structured implementation
   brief before changing files.`;
}
