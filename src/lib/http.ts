// One shape for every error this app's API returns: `{ "error": "..." }` with a
// status. The streaming routes answer 2xx with a plain-text token stream, so a
// caller can't infer the body format from the route — it infers it from the
// status, and every non-2xx body parses the same way.
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

// The other half of the contract, for clients. A failed response should carry a
// message worth showing, but a 502 from a proxy that never reached us won't —
// hence the fallback rather than rendering "[object Object]" at the user.
export async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  } catch {
    // Not JSON — an infrastructure error page, or an empty body.
  }
  return fallback;
}
