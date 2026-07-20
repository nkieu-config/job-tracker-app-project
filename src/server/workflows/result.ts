import "server-only";

export type WorkflowResult = { ok: true } | { ok: false; message: string };

export function workflowFailed(message: string): WorkflowResult {
  return { ok: false, message };
}
