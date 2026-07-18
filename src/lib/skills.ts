const ALIAS_GROUPS: string[][] = [
  ["javascript", "js"],
  ["typescript", "ts"],
  ["postgresql", "postgres"],
  ["kubernetes", "k8s"],
  ["amazon web services", "aws"],
  ["google cloud platform", "google cloud", "gcp"],
  ["node.js", "nodejs", "node"],
  ["react.js", "reactjs", "react"],
  ["next.js", "nextjs"],
  ["vue.js", "vuejs", "vue"],
  ["express.js", "expressjs", "express"],
  ["nest.js", "nestjs"],
  ["golang", "go"],
  ["c#", "csharp", "c sharp"],
  [".net", "dotnet"],
  ["mongodb", "mongo"],
  ["rest api", "rest apis", "restful"],
  ["tailwind css", "tailwindcss", "tailwind"],
  ["ci/cd", "continuous integration", "continuous delivery"],
];

const aliasIndex = new Map<string, string[]>();
for (const group of ALIAS_GROUPS) {
  for (const term of group) {
    aliasIndex.set(term, group);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(haystack: string, term: string): boolean {
  const pattern = new RegExp(
    `(?<![a-z0-9])${escapeRegExp(term)}(?![a-z0-9])`,
  );
  return pattern.test(haystack);
}

export function canonicalSkill(skill: string): string {
  const needle = skill.trim().toLowerCase();
  const group = aliasIndex.get(needle);
  return group ? group[0] : needle;
}

export function matchSkills(
  requiredSkills: string[],
  resumeText: string,
): { matched: string[]; missing: string[] } {
  const haystack = resumeText.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of requiredSkills) {
    const needle = skill.trim().toLowerCase();
    const variants = aliasIndex.get(needle) ?? [needle];
    if (needle && variants.some((v) => containsTerm(haystack, v))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }
  return { matched, missing };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

export function chunkText(
  text: string,
  maxChars = 300,
  maxChunks = 24,
): string[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + line.length + 1 > maxChars) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current} ${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks.slice(0, maxChunks);
}
