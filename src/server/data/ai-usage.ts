import "server-only";

import { prisma } from "@/server/prisma";
import { estimateCostUsd } from "@/server/observability";

export type FeatureStat = {
  feature: string;
  calls: number;
  totalTokens: number;
  avgLatencyMs: number;
  costUsd: number;
};

export type AiUsageStats = {
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  byFeature: FeatureStat[];
  recent: {
    id: string;
    feature: string;
    model: string;
    totalTokens: number;
    latencyMs: number;
    ok: boolean;
    createdAt: Date;
  }[];
};

export async function getAiUsageStats(): Promise<AiUsageStats> {
  const [overall, errorCount, grouped, recent, latency] = await Promise.all([
    prisma.aiUsage.aggregate({
      _count: true,
      _sum: { totalTokens: true },
    }),
    prisma.aiUsage.count({ where: { ok: false } }),
    prisma.aiUsage.groupBy({
      by: ["feature", "model"],
      _count: true,
      _sum: { promptTokens: true, outputTokens: true, totalTokens: true },
      _avg: { latencyMs: true },
    }),
    prisma.aiUsage.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        feature: true,
        model: true,
        totalTokens: true,
        latencyMs: true,
        ok: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<{ p50: number | null; p95: number | null }[]>`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "latencyMs") AS p50,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS p95
      FROM ai_usage
    `,
  ]);

  // Collapse (feature, model) groups into per-feature stats, summing cost across
  // whichever models a feature used.
  const byFeatureMap = new Map<string, FeatureStat>();
  for (const g of grouped) {
    const prev = byFeatureMap.get(g.feature) ?? {
      feature: g.feature,
      calls: 0,
      totalTokens: 0,
      avgLatencyMs: 0,
      costUsd: 0,
    };
    const calls = prev.calls + g._count;
    byFeatureMap.set(g.feature, {
      feature: g.feature,
      calls,
      totalTokens: prev.totalTokens + (g._sum.totalTokens ?? 0),
      // call-weighted average latency
      avgLatencyMs:
        (prev.avgLatencyMs * prev.calls + (g._avg.latencyMs ?? 0) * g._count) /
        calls,
      costUsd:
        prev.costUsd +
        estimateCostUsd(
          g.model,
          g._sum.promptTokens ?? 0,
          g._sum.outputTokens ?? 0,
        ),
    });
  }

  const byFeature = [...byFeatureMap.values()].sort((a, b) => b.calls - a.calls);
  const totalCalls = overall._count;

  return {
    totalCalls,
    totalTokens: overall._sum.totalTokens ?? 0,
    totalCostUsd: byFeature.reduce((sum, f) => sum + f.costUsd, 0),
    errorRate: totalCalls ? errorCount / totalCalls : 0,
    latencyP50: Number(latency[0]?.p50 ?? 0),
    latencyP95: Number(latency[0]?.p95 ?? 0),
    byFeature,
    recent,
  };
}
