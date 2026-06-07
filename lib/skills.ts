// Phase 4 gap analysis: simple case-insensitive keyword matching of required
// skills against the resume text. Phase 5 will upgrade this to semantic
// (embedding-based) matching.
export function matchSkills(
  requiredSkills: string[],
  resumeText: string,
): { matched: string[]; missing: string[] } {
  const haystack = resumeText.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of requiredSkills) {
    const needle = skill.trim().toLowerCase();
    if (needle && haystack.includes(needle)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }
  return { matched, missing };
}
