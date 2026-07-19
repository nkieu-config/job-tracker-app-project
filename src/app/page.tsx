import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Target,
  MessagesSquare,
  PenLine,
  Compass,
  Wand2,
} from "lucide-react";
import { DemoButton } from "@/components/auth/demo-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SkipLink } from "@/components/ui/skip-link";
import { Reveal } from "@/components/ui/reveal";
import { buttonClass } from "@/components/ui/button";
import { Badge, Dot, type BadgeTone } from "@/components/ui/badge";

const FIT_ROWS: {
  label: string;
  pct: number;
  tone: BadgeTone;
  best?: boolean;
}[] = [
  { label: "resume_backend_v3.pdf", pct: 82, tone: "success", best: true },
  { label: "resume_fullstack.pdf", pct: 71, tone: "warning" },
  { label: "resume_general.pdf", pct: 54, tone: "error" },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Job-description analysis",
    body: "Paste a JD and AI pulls out the required skills, seniority, and a summary — then flags the gaps against your resume.",
  },
  {
    icon: Target,
    title: "Résumé fit scoring",
    body: "Every resume version is ranked against the job with pgvector cosine similarity — labelled Strong, Moderate, or Weak.",
  },
  {
    icon: PenLine,
    title: "Tailored bullets",
    body: "Rewrites an experience into resume bullets tuned to the job, streamed live and saved to the application.",
  },
  {
    icon: MessagesSquare,
    title: "Interview prep",
    body: "Generates likely technical and behavioral questions from the JD, with pointers on what a strong answer covers.",
  },
  {
    icon: Compass,
    title: "Pipeline coach",
    body: "Reads your whole pipeline — response and interview rates, the skills missing most across roles — for on-demand strategic advice.",
  },
  {
    icon: Wand2,
    title: "Form autofill",
    body: "Paste a job description on the new-application form and AI fills in the company, role, and deadline for you.",
  },
];

const STATS = [
  { value: "6", label: "AI features" },
  { value: "300+", label: "automated tests" },
  { value: "5", label: "AI eval suites" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <header className="relative z-10 flex items-center justify-between border-b border-hairline px-4 py-3 md:px-10">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <span className="font-bold leading-none text-on-primary">J</span>
          </div>
          <span className="font-sans text-body-lg font-semibold tracking-tight text-ink">
            Job Tracker
          </span>
        </div>
        <nav className="hidden items-center gap-7 font-sans text-body font-medium text-ink-mute md:flex">
          <Link href="#features" className="transition-colors hover:text-ink">
            Features
          </Link>
          <a
            href="https://github.com/nkieu-config/job-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            Source
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="hidden font-sans text-body font-medium text-ink-mute transition-colors hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <DemoButton label="Live demo" className={buttonClass({ size: "sm" })} />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="border-b border-hairline px-4 py-16 md:px-10 md:py-24">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col items-start">
              <h1 className="font-display-lg text-balance text-ink">
                Track every application. Send the résumé that{" "}
                <span className="text-primary">fits</span>.
              </h1>
              <p className="mt-6 max-w-xl font-sans text-title leading-relaxed text-ink-mute">
                A job-application tracker with AI built in. Paste a job
                description — it extracts the required skills, scores every
                resume version against them, and drafts your interview prep.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <DemoButton
                  label="Try the live demo"
                  className={buttonClass({ size: "lg" })}
                />
                <a
                  href="https://github.com/nkieu-config/job-tracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({ variant: "ghost", size: "lg" })}
                >
                  View source
                </a>
              </div>
              <p className="mt-6 font-sans text-caption text-ink-mute">
                No signup for the demo · every AI feature is measured, not
                assumed · open source
              </p>
            </div>

            <FitPanel />
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-16 border-b border-hairline px-4 py-16 md:px-10 md:py-24"
        >
          <div className="mx-auto w-full max-w-6xl">
            <Reveal className="max-w-2xl">
              <h2 className="font-display-md text-balance text-ink">
                The tedious parts, handled
              </h2>
              <p className="mt-3 font-sans text-body-lg leading-relaxed text-ink-mute">
                AI features on Gemini and pgvector do the reading, ranking and
                writing, so you spend your time on the interview.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {FEATURES.map((feature, i) => (
                <Reveal key={feature.title} delay={i * 70}>
                  <div className="flex gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <feature.icon size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-sans text-body-lg font-semibold text-ink">
                        {feature.title}
                      </h3>
                      <p className="mt-1.5 font-sans text-body leading-relaxed text-ink-mute">
                        {feature.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-hairline px-4 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-6xl">
            <Reveal className="max-w-2xl">
              <h2 className="font-display-md text-balance text-ink">
                Your whole pipeline on one board
              </h2>
              <p className="mt-3 font-sans text-body-lg leading-relaxed text-ink-mute">
                Drag a role from Saved to Offer. Deadlines surface as they
                approach; rejected roles fold away.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-10">
              <div className="overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_20px_60px_rgba(74,21,75,0.10)]">
                <div className="flex h-9 items-center gap-1.5 border-b border-hairline px-4">
                  <span className="size-2.5 rounded-full bg-hairline" />
                  <span className="size-2.5 rounded-full bg-hairline" />
                  <span className="size-2.5 rounded-full bg-hairline" />
                </div>
                <Image
                  src="/landing/board-light.png"
                  alt="The Job Tracker board, with roles grouped into Saved, Applied, Interview and Offer columns"
                  width={2560}
                  height={1600}
                  className="block h-auto w-full dark:hidden"
                />
                <Image
                  src="/landing/board-dark.png"
                  alt=""
                  aria-hidden="true"
                  width={2560}
                  height={1600}
                  className="hidden h-auto w-full dark:block"
                />
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-4 py-16 md:px-10 md:py-24">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <Reveal className="max-w-md">
              <h2 className="font-display-md text-balance text-ink">
                AI you can trust, because it&rsquo;s measured
              </h2>
              <p className="mt-3 font-sans text-body-lg leading-relaxed text-ink-mute">
                Every model call runs through its own eval harness. The rule
                this project held to: an AI feature that isn&rsquo;t measured
                doesn&rsquo;t ship.
              </p>
            </Reveal>
            <Reveal delay={80}>
              <dl className="flex gap-10">
                {STATS.map((stat) => (
                  <div key={stat.label} className="max-w-32">
                    <dt className="font-display-sm font-mono tabular-nums text-primary">
                      {stat.value}
                    </dt>
                    <dd className="mt-1 font-sans text-caption leading-snug text-ink-mute">
                      {stat.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline bg-canvas-lavender px-4 py-16 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="flex flex-col gap-5">
            <h2 className="max-w-xl font-display-md text-balance text-ink">
              Start tracking — no signup required
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <DemoButton
                label="Try the live demo"
                className={buttonClass({ size: "lg" })}
              />
              <Link
                href="/sign-up"
                className={buttonClass({ variant: "ghost", size: "lg" })}
              >
                Create an account
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 border-t border-hairline pt-6 font-sans text-caption text-ink-mute sm:flex-row">
            <p>© 2026 Job Tracker</p>
            <a
              href="https://github.com/nkieu-config/job-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              View source on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FitPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_24px_70px_rgba(74,21,75,0.14)]">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <span className="font-mono text-fine text-ink-mute">resume-fit</span>
        <span className="flex items-center gap-1.5 font-sans text-fine text-ink-mute">
          <Sparkles size={12} className="text-primary" aria-hidden="true" />
          pgvector · cosine
        </span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
            Résumé fit
          </h3>
          <span className="font-mono text-fine text-ink-mute">
            Senior Backend Engineer
          </span>
        </div>
        {FIT_ROWS.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Dot tone={row.tone} />
              <span className="truncate font-mono text-caption text-ink">
                {row.label}
              </span>
              {row.best && (
                <Badge tone="primary" size="sm">
                  Best fit
                </Badge>
              )}
            </div>
            <span className="font-mono text-body font-semibold tabular-nums text-ink">
              {row.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
