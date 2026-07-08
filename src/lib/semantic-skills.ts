import { chunkText, cosineSimilarity, matchSkills } from "@/lib/skills";
import { embedTexts } from "@/lib/ai-client";

const SEMANTIC_MATCH_THRESHOLD = 0.83;

export async function matchSkillsSemantic(
  requiredSkills: string[],
  resumeText: string,
): Promise<{ matched: string[]; missing: string[] }> {
  const textual = matchSkills(requiredSkills, resumeText);
  if (!resumeText.trim() || textual.missing.length === 0) {
    return textual;
  }

  const chunks = chunkText(resumeText);
  if (chunks.length === 0) {
    return textual;
  }

  try {
    const [skillVectors, chunkVectors] = await Promise.all([
      embedTexts(textual.missing, "SEMANTIC_SIMILARITY"),
      embedTexts(chunks, "SEMANTIC_SIMILARITY"),
    ]);

    const matched = [...textual.matched];
    const missing: string[] = [];
    textual.missing.forEach((skill, i) => {
      const best = Math.max(
        ...chunkVectors.map((chunk) => cosineSimilarity(skillVectors[i], chunk)),
      );
      if (best >= SEMANTIC_MATCH_THRESHOLD) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    });
    return { matched, missing };
  } catch {
    return textual;
  }
}
