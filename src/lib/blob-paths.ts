const PATH_SEPARATORS = /[/\\]/;
const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9._-]/g;
const LEADING_DOTS = /^\.+/;
const HAS_ALPHANUMERIC = /[a-zA-Z0-9]/;

export function resumeBlobPrefix(userId: string): string {
  return `resumes/${userId}/`;
}

// The uploaded filename is attacker-controlled. Anything that could escape the
// per-user prefix (separators, `..`) would both write outside the user's folder
// and hide the blob from prefix-scoped deletion on account removal.
export function safeBlobFilename(filename: string): string {
  const segments = filename.split(PATH_SEPARATORS);
  const basename = segments[segments.length - 1];
  const cleaned = basename
    .replace(UNSAFE_FILENAME_CHARS, "-")
    .replace(LEADING_DOTS, "")
    .slice(0, 120);
  return HAS_ALPHANUMERIC.test(cleaned) ? cleaned : "resume.pdf";
}

export function resumeBlobPath(userId: string, filename: string): string {
  return resumeBlobPrefix(userId) + safeBlobFilename(filename);
}
