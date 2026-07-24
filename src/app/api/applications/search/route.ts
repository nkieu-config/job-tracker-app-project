import { getSession } from "@/server/get-session";
import { jsonError } from "@/lib/http";
import { getApplicationIndex } from "@/server/data/applications";

// The command palette's jump list. Fetched once, the first time the palette is
// opened, rather than shipped with every dashboard page — most visits never
// open it, and the whole point of the palette is that it costs nothing until
// someone reaches for it.
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Not signed in.", 401);

  const applications = await getApplicationIndex(session.user.id);
  return Response.json({ applications });
}
