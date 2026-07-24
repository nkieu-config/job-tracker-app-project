import "dotenv/config";
import { prisma } from "@/server/prisma";
import { deleteResumeBlobsForUser } from "@/server/blob-cleanup";

const email = process.argv[2];

if (!email) {
  console.error("Usage: npm run delete-user -- <email>");
  process.exit(1);
}

const user = await prisma.user.findFirst({ where: { email } });
if (!user) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}

// Blobs first: if this fails, the user row survives and the operation can be
// retried. Deleting the row first would strand the blobs with nothing pointing
// at them. Where no blob store is configured at all — CI, or a local database
// with no uploads — there is nothing to strand, so say so and carry on rather
// than failing the delete on a vendor call that cannot succeed.
if (process.env.BLOB_READ_WRITE_TOKEN) {
  const deleted = await deleteResumeBlobsForUser(user.id);
  console.log(`Deleted ${deleted} resume blob(s) for ${email}`);
} else {
  console.log(
    "BLOB_READ_WRITE_TOKEN not set — skipped blob cleanup; deleting database rows only.",
  );
}

await prisma.user.delete({ where: { id: user.id } });
console.log(`Deleted user ${email} (${user.id}); related rows cascaded`);

await prisma.$disconnect();
