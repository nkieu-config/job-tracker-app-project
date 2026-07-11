import "server-only";

import { list, del } from "@vercel/blob";
import { resumeBlobPrefix } from "@/lib/blob-paths";

// Deleting a user cascades their resume_version rows away, but the Blob objects
// those rows pointed at survive and keep costing money. Enumerating by the
// per-user prefix is the only way to reach blobs whose URLs are already gone.
export async function deleteResumeBlobsForUser(
  userId: string,
): Promise<number> {
  const prefix = resumeBlobPrefix(userId);
  let cursor: string | undefined;
  let deleted = 0;

  do {
    const page = await list({ prefix, cursor, mode: "expanded" });
    const urls = page.blobs.map((blob) => blob.url);
    if (urls.length > 0) {
      await del(urls);
      deleted += urls.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return deleted;
}
