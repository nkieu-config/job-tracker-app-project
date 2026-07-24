import { skillVariants } from "@/lib/skills";

export type PostingSegment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; skill: string; matched: boolean };

export type MarkedPosting = {
  segments: PostingSegment[];
  // Skills the model named that no wording in the posting supports as a quote —
  // usually because it summarised a phrase ("deploying models as services") into
  // a noun ("Model Deployment"). Reporting them separately keeps the highlight
  // honest: a mark means "the posting says this", not "the model thinks this".
  inferred: SkillMatch[];
};

export type SkillMatch = { skill: string; matched: boolean };

type Hit = { start: number; end: number; skill: string; matched: boolean };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAll(text: string, term: string): { start: number; end: number }[] {
  // The same word-boundary rule matchSkills uses, so a skill counts as present
  // in the posting under exactly the conditions it counts as present in a
  // resume. Digits are excluded from the boundary too, or "Go" would match
  // inside "Go2" and "React" inside "React18".
  const pattern = new RegExp(
    `(?<![a-z0-9])${escapeRegExp(term)}(?![a-z0-9])`,
    "gi",
  );
  const out: { start: number; end: number }[] = [];
  for (const m of text.matchAll(pattern)) {
    out.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function markPosting(
  text: string,
  skills: SkillMatch[],
): MarkedPosting {
  if (!text) return { segments: [], inferred: [] };

  const hits: Hit[] = [];
  const inferred: SkillMatch[] = [];

  for (const entry of skills) {
    let found = false;
    for (const variant of skillVariants(entry.skill)) {
      const spans = findAll(text, variant);
      if (spans.length === 0) continue;
      found = true;
      for (const span of spans) {
        hits.push({ ...span, skill: entry.skill, matched: entry.matched });
      }
      // Longest variant wins; once one spelling is found, shorter spellings of
      // the same skill would only produce overlapping marks inside it.
      break;
    }
    if (!found) inferred.push(entry);
  }

  // Two skills can claim overlapping text ("REST" inside "REST APIs"). Take the
  // earliest, and on a tie the longest, then skip anything it swallows.
  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const segments: PostingSegment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    if (hit.start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, hit.start) });
    }
    segments.push({
      kind: "mark",
      text: text.slice(hit.start, hit.end),
      skill: hit.skill,
      matched: hit.matched,
    });
    cursor = hit.end;
  }
  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }

  return { segments, inferred };
}
