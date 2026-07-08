import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Sparkles,
  Target,
  MessagesSquare,
} from "lucide-react";
import { DemoButton } from "@/components/auth/demo-button";

const MOCK_COLUMNS = [
  {
    label: "Saved",
    dot: "bg-zinc-400",
    cards: [{ role: "Platform Engineer", company: "Initech" }],
  },
  {
    label: "Applied",
    dot: "bg-blue-500",
    cards: [
      { role: "Frontend Engineer", company: "Hooli" },
      { role: "Full-stack Developer", company: "Pied Piper" },
    ],
  },
  {
    label: "Interview",
    dot: "bg-amber-500",
    cards: [{ role: "Backend Engineer", company: "Aviato" }],
  },
  {
    label: "Offer",
    dot: "bg-green-500",
    cards: [{ role: "Software Engineer", company: "Raviga" }],
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI job-description analysis",
    body: "Paste a JD and Gemini extracts required skills, seniority, and a summary — then semantically matches every skill against your resume to reveal your gaps.",
  },
  {
    icon: Target,
    title: "Resume fit scoring",
    body: "Every resume version is embedded and ranked against the job with pgvector cosine similarity, labeled Strong / Moderate / Weak so you always send the right one.",
  },
  {
    icon: MessagesSquare,
    title: "Interview prep & tailored bullets",
    body: "Generate likely technical and behavioral questions from the JD, and rewrite your experience into tailored resume bullets — streamed live, saved to the application.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <header className="flex items-center justify-between px-4 py-4 md:px-12 lg:px-24 bg-canvas z-10 relative">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shrink-0">
            <span className="text-on-primary font-bold text-xl leading-none">J</span>
          </div>
          <span className="font-display-md text-primary text-2xl tracking-tight">Job Tracker</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-sans font-medium text-ink">
          <Link href="#features" className="hover:text-primary transition-colors">
            Features
          </Link>
          <a
            href="https://github.com/nkieu-config/job-tracker-app-project"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="hidden sm:inline-flex items-center justify-center font-sans font-bold text-[16px] text-ink hover:text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[14px] sm:text-[16px] tracking-[0.2px] py-2.5 px-5 sm:py-3.5 sm:px-7 rounded-pill transition-colors hover:bg-primary-press whitespace-nowrap"
          >
            Try For Free
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="flex flex-col items-center bg-pastel-mesh pt-16 pb-24 px-6 overflow-hidden relative">
          <div className="max-w-[1000px] w-full flex flex-col items-center text-center z-10">
            <h1 className="font-display-xxl text-ink mb-6 max-w-4xl">
              Track your applications.<br />Land your dream job.
            </h1>
            <p className="font-sans text-[18px] text-ink max-w-2xl leading-[1.55] mb-10">
              Drag your pipeline forward on a kanban board while AI analyzes job
              descriptions, scores your resumes, and preps you for the interview.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] sm:text-[18px] py-3.5 sm:py-4.5 px-6 sm:px-9 rounded-pill shadow-[0_5px_20px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 whitespace-nowrap"
              >
                Get started for free
              </Link>
              <DemoButton
                label="Try Live Demo"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-canvas-lavender text-primary border-2 border-primary font-sans font-bold text-[16px] sm:text-[18px] py-3 sm:py-4 px-6 sm:px-9 rounded-pill transition-transform hover:scale-105 whitespace-nowrap"
              />
            </div>
          </div>

          <div className="mt-16 w-full max-w-5xl bg-canvas rounded-2xl shadow-[0_20px_60px_rgba(74,21,75,0.1)] border border-hairline overflow-hidden z-10 flex flex-col">
            <div className="h-12 border-b border-hairline flex items-center px-4 gap-2 bg-canvas-lavender">
              <div className="w-3 h-3 rounded-full bg-semantic-error-tint border border-semantic-error"></div>
              <div className="w-3 h-3 rounded-full bg-semantic-warning-tint border border-semantic-warning"></div>
              <div className="w-3 h-3 rounded-full bg-semantic-success-tint border border-semantic-success"></div>
            </div>
            <div className="flex gap-6 bg-canvas p-4 text-left md:p-8">
              <div className="hidden md:flex w-44 shrink-0 flex-col gap-2 border-r border-hairline pr-6">
                <div className="flex items-center gap-3 px-3 py-2 rounded-md text-ink-mute text-[14px] font-medium">
                  <LayoutDashboard size={16} aria-hidden="true" /> Overview
                </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-canvas-lavender text-primary font-bold text-[14px]">
                  <Briefcase size={16} aria-hidden="true" /> Applications
                </div>
                <div className="flex items-center gap-3 px-3 py-2 text-ink-mute text-[14px] font-medium">
                  <FileText size={16} aria-hidden="true" /> Resumes
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <h2 className="font-display-md text-[24px] text-ink">Applications</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {MOCK_COLUMNS.map((column) => (
                    <div key={column.label} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-1">
                        <span
                          className={`h-2 w-2 rounded-full ${column.dot}`}
                          aria-hidden="true"
                        />
                        <span className="text-[12px] font-bold uppercase tracking-wider text-ink-mute">
                          {column.label}
                        </span>
                      </div>
                      <div className="flex min-h-28 flex-col gap-2 rounded-xl bg-canvas-cream/50 p-2">
                        {column.cards.map((card, i) => (
                          <div
                            key={card.role}
                            className={`rounded-lg border border-hairline bg-canvas px-3 py-2 shadow-sm ${
                              column.label === "Interview" && i === 0
                                ? "rotate-2 border-primary shadow-[0_8px_20px_rgba(74,21,75,0.15)]"
                                : ""
                            }`}
                          >
                            <p className="truncate text-[12px] font-bold text-ink">
                              {card.role}
                            </p>
                            <p className="truncate text-[11px] text-ink-mute">
                              {card.company}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 bg-canvas px-6 py-24 md:px-12">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12">
            <div className="max-w-2xl text-center">
              <h2 className="font-display-lg text-ink">
                Your job hunt, with an AI copilot
              </h2>
              <p className="mt-4 font-sans text-[18px] leading-[1.55] text-ink-mute">
                Four AI features built on Gemini and pgvector do the tedious
                parts, so you can focus on interviews.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="flex flex-col gap-4 rounded-2xl border border-hairline bg-canvas-lavender p-8"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary">
                    <feature.icon size={22} aria-hidden="true" />
                  </span>
                  <h3 className="font-sans text-[18px] font-bold text-ink">
                    {feature.title}
                  </h3>
                  <p className="font-sans text-[15px] leading-relaxed text-ink-mute">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-aubergine text-on-primary py-24 px-6 md:px-12 flex flex-col items-center text-center">
        <h2 className="font-display-lg mb-8 max-w-3xl">
          Ready to simplify your job search?
        </h2>
        <Link
            href="/sign-up"
            className="inline-flex items-center justify-center bg-canvas text-primary font-sans font-bold text-[16px] sm:text-[18px] py-3.5 sm:py-4.5 px-8 sm:px-12 rounded-pill shadow-lg transition-transform hover:scale-105 whitespace-nowrap"
          >
            Start tracking now
          </Link>
        <div className="mt-16 pt-8 border-t border-primary-tint w-full max-w-5xl flex flex-col md:flex-row justify-between items-center text-on-aubergine-mute text-sm font-sans">
          <p>© 2026 Job Tracker. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a
              href="https://github.com/nkieu-config/job-tracker-app-project"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-on-primary underline"
            >
              View source on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
