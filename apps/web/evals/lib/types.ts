export type ItemResult = {
  id: string;
  latencyMs: number;
  scores: Record<string, number>;
  detail?: string;
};

export type SuiteResult = {
  name: string;
  description: string;
  n: number;
  metrics: Record<string, number>; // headline aggregate metrics (0..1 or counts)
  timingMs: { mean: number; p50: number; p95: number };
  items: ItemResult[];
  notes?: string[];
};

export type RunOptions = { limit?: number };
