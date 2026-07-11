import { notFound } from "next/navigation";
import { Activity, Sparkles } from "lucide-react";
import { requireSession } from "@/server/get-session";
import { isAdminEmail } from "@/server/admin";
import { getAiUsageStats, type FeatureStat } from "@/server/data/ai-usage";
import { AI_FEATURES, type AiFeature } from "@/server/observability";
import { isOneOf } from "@/lib/guards";

export const dynamic = "force-dynamic";

const FEATURE_LABELS: Record<AiFeature, string> = {
  analyze: "JD analysis",
  embed: "Embeddings",
  tailor: "Bullet tailoring",
  interview: "Interview prep",
};

function featureLabel(feature: string): string {
  return isOneOf(AI_FEATURES, feature) ? FEATURE_LABELS[feature] : feature;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-canvas p-6 shadow-sm">
      <p className="text-caption font-sans font-medium text-ink-mute">{label}</p>
      <p className="mt-2 font-display-md text-primary tabular-nums">{value}</p>
      <p className="mt-1 text-caption font-sans text-ink-mute">{hint}</p>
    </div>
  );
}

function FeatureRow({ stat, maxCalls }: { stat: FeatureStat; maxCalls: number }) {
  const pct = maxCalls ? Math.max(Math.round((stat.calls / maxCalls) * 100), 4) : 0;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-hairline bg-canvas px-5 py-4">
      <div className="w-40 shrink-0">
        <p className="font-sans text-body font-bold text-ink">
          {featureLabel(stat.feature)}
        </p>
        <p className="font-sans text-caption text-ink-mute tabular-nums">
          {stat.calls} call{stat.calls === 1 ? "" : "s"}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="w-24 shrink-0 text-right font-sans text-caption tabular-nums text-ink-mute">
        {fmtTokens(stat.totalTokens)} tok
      </div>
      <div className="w-20 shrink-0 text-right font-sans text-caption tabular-nums text-ink-mute">
        {Math.round(stat.avgLatencyMs)}ms
      </div>
      <div className="w-20 shrink-0 text-right font-sans text-caption font-bold tabular-nums text-ink">
        {fmtCost(stat.costUsd)}
      </div>
    </div>
  );
}

export default async function AiUsagePage() {
  const session = await requireSession();
  if (!isAdminEmail(session.user.email)) {
    notFound();
  }
  const stats = await getAiUsageStats();
  const maxCalls = Math.max(1, ...stats.byFeature.map((f) => f.calls));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="flex items-center gap-2 font-display-md tracking-tight text-ink">
          <Activity size={26} className="text-primary" aria-hidden="true" />
          AI usage
        </h1>
        <p className="mt-2 font-sans text-body-lg text-ink-mute">
          Token, latency, and estimated-cost observability across every Gemini
          call the app makes.
        </p>
      </div>

      {stats.totalCalls === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-canvas p-12 text-center shadow-sm">
          <Sparkles size={24} className="text-primary" aria-hidden="true" />
          <p className="font-sans text-body-lg font-bold text-ink">
            No AI calls recorded yet
          </p>
          <p className="font-sans text-body text-ink-mute">
            Analyze a job description, compute a resume fit, or tailor bullets —
            each call is metered and will appear here.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile
              label="Total AI calls"
              value={String(stats.totalCalls)}
              hint={`${(stats.errorRate * 100).toFixed(1)}% errored`}
            />
            <Tile
              label="Tokens"
              value={fmtTokens(stats.totalTokens)}
              hint="prompt + output"
            />
            <Tile
              label="Est. cost"
              value={fmtCost(stats.totalCostUsd)}
              hint="approx, at listed rates"
            />
            <Tile
              label="Latency p95"
              value={`${Math.round(stats.latencyP95)}ms`}
              hint={`p50 ${Math.round(stats.latencyP50)}ms`}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-sans text-caption font-bold uppercase tracking-wider text-ink-mute">
              By feature
            </h2>
            <div className="flex flex-col gap-2">
              {stats.byFeature.map((stat) => (
                <FeatureRow key={stat.feature} stat={stat} maxCalls={maxCalls} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-sans text-caption font-bold uppercase tracking-wider text-ink-mute">
              Recent calls
            </h2>
            <ul className="flex flex-col gap-2">
              {stats.recent.map((call) => (
                <li
                  key={call.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-canvas px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${call.ok ? "bg-semantic-success" : "bg-semantic-error"}`}
                      aria-hidden="true"
                    />
                    <span className="font-sans text-body font-bold text-ink">
                      {featureLabel(call.feature)}
                    </span>
                    <span className="font-sans text-caption text-ink-mute">
                      {call.model}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 font-sans text-caption tabular-nums text-ink-mute">
                    <span>{fmtTokens(call.totalTokens)} tok</span>
                    <span>{Math.round(call.latencyMs)}ms</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="font-sans text-caption text-ink-mute">
              Cost is estimated from token counts at the listed Gemini rates and
              is for observability only, not billing.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
