import { canonicalSkill } from "@/lib/skills";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { SENIORITY_LEVELS } from "@/lib/schemas/jd-analysis";
import type { StoredJdAnalysis } from "@/lib/schemas/jd-analysis";
import { zeroRecord } from "@/lib/records";

export type Seniority = (typeof SENIORITY_LEVELS)[number];

export type SkillGap = { skill: string; count: number };

export type WeeklyActivity = {
  weekStart: string;
  label: string;
  counts: Record<ApplicationStatus, number>;
  total: number;
};

export type ApplicationFit = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  score: number;
};

export type PipelineRates = {
  applied: number;
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
};

export type AnalyzedApplication = {
  status: ApplicationStatus;
  analysis: StoredJdAnalysis | null;
};

export type PipelineSnapshot = {
  total: number;
  analyzedCount: number;
  statusCounts: Record<ApplicationStatus, number>;
  rates: PipelineRates;
  topMissingSkills: SkillGap[];
  seniorityMix: Record<Seniority, number>;
};

export const DEFAULT_TOP_SKILLS = 6;

// A required skill counts as a gap only when the analysis actually compared the
// JD against a resume (`skillMatches` present) and the skill wasn't among the
// matches. Analyses done before any resume existed carry no `skillMatches`, so
// their skills are unknown, not missing — counting them would invent gaps.
export function aggregateSkillGaps(
  analyses: Array<Pick<StoredJdAnalysis, "requiredSkills" | "skillMatches">>,
  topN = DEFAULT_TOP_SKILLS,
): SkillGap[] {
  const tally = new Map<string, { count: number; label: string }>();

  for (const analysis of analyses) {
    if (!analysis.skillMatches) continue;
    const matched = new Set(analysis.skillMatches);
    const seen = new Set<string>();
    for (const skill of analysis.requiredSkills) {
      if (matched.has(skill)) continue;
      const key = canonicalSkill(skill);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const entry = tally.get(key);
      if (entry) entry.count += 1;
      else tally.set(key, { count: 1, label: skill.trim() });
    }
  }

  return [...tally.values()]
    .map(({ count, label }) => ({ skill: label, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, topN);
}

// Mirrors the rate definitions on the dashboard: the denominator is everything
// that left the "Saved" stage, and each rate is null (not zero) until there is
// at least one such application, so an empty pipeline reads as "no data" rather
// than a damning 0%.
export function computeRates(
  counts: Record<ApplicationStatus, number>,
): PipelineRates {
  const applied =
    counts.APPLIED + counts.INTERVIEW + counts.OFFER + counts.REJECTED;
  const responded = counts.INTERVIEW + counts.OFFER + counts.REJECTED;
  const interviews = counts.INTERVIEW + counts.OFFER;
  const rate = (n: number) => (applied ? n / applied : null);
  return {
    applied,
    responseRate: rate(responded),
    interviewRate: rate(interviews),
    offerRate: rate(counts.OFFER),
  };
}

// A stable, human-inspectable string over exactly the fields the coach reads.
// Hashed by the caller to fingerprint the snapshot: an unchanged pipeline
// produces the same fingerprint, so regenerating advice can no-op instead of
// spending a slice of the hourly AI budget. Keyed on the constant status and
// seniority orders so it never depends on object key iteration order.
export function snapshotFingerprint(snapshot: PipelineSnapshot): string {
  const status = APPLICATION_STATUSES.map(
    (k) => `${k}:${snapshot.statusCounts[k]}`,
  ).join(",");
  const seniority = SENIORITY_LEVELS.map(
    (k) => `${k}:${snapshot.seniorityMix[k]}`,
  ).join(",");
  const gaps = snapshot.topMissingSkills
    .map((g) => `${g.skill}:${g.count}`)
    .join(",");
  const rates = [
    snapshot.rates.applied,
    snapshot.rates.responseRate,
    snapshot.rates.interviewRate,
    snapshot.rates.offerRate,
  ].join(",");
  return [
    `t=${snapshot.total}`,
    `a=${snapshot.analyzedCount}`,
    `status=${status}`,
    `rates=${rates}`,
    `gaps=${gaps}`,
    `sen=${seniority}`,
  ].join("|");
}

export function buildPipelineSnapshot(
  applications: AnalyzedApplication[],
  topN = DEFAULT_TOP_SKILLS,
): PipelineSnapshot {
  const statusCounts = zeroRecord(APPLICATION_STATUSES);
  const seniorityMix = zeroRecord(SENIORITY_LEVELS);
  const analyses: StoredJdAnalysis[] = [];

  for (const app of applications) {
    statusCounts[app.status] += 1;
    if (app.analysis) {
      analyses.push(app.analysis);
      seniorityMix[app.analysis.seniority] += 1;
    }
  }

  return {
    total: applications.length,
    analyzedCount: analyses.length,
    statusCounts,
    rates: computeRates(statusCounts),
    topMissingSkills: aggregateSkillGaps(analyses, topN),
    seniorityMix,
  };
}
