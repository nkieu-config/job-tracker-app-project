import Link from "next/link";
import { DemoButton } from "@/app/components/demo-button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      {/* Navigation */}
      <header className="flex items-center justify-between px-4 py-4 md:px-12 lg:px-24 bg-canvas z-10 relative">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shrink-0">
            <span className="text-on-primary font-bold text-xl leading-none">J</span>
          </div>
          <span className="font-display-md text-primary text-2xl tracking-tight">Job Tracker</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-sans font-medium text-ink">
          <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
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
            className="inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[14px] sm:text-[16px] tracking-[0.2px] py-[10px] px-[20px] sm:py-[14px] sm:px-[28px] rounded-[90px] transition-colors hover:bg-primary-press whitespace-nowrap"
          >
            Try For Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center bg-pastel-mesh pt-16 pb-32 px-6 overflow-hidden relative">
        <div className="max-w-[1000px] w-full flex flex-col items-center text-center z-10">
          <h1 className="font-display-xxl text-ink mb-6 max-w-4xl">
            Track your applications.<br />Land your dream job.
          </h1>
          <p className="font-sans text-[18px] text-ink max-w-2xl leading-[1.55] mb-10">
            Smart job application tracker with AI-powered JD analysis and resume tailoring. Organize your pipeline and never miss an interview.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] sm:text-[18px] py-[14px] sm:py-[18px] px-[24px] sm:px-[36px] rounded-[90px] shadow-[0_5px_20px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 whitespace-nowrap"
            >
              Get started for free
            </Link>
            <DemoButton
              label="Try Live Demo"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-canvas-lavender text-primary border-2 border-primary font-sans font-bold text-[16px] sm:text-[18px] py-[12px] sm:py-[16px] px-[24px] sm:px-[36px] rounded-[90px] transition-transform hover:scale-105 whitespace-nowrap"
            />
          </div>
        </div>

        {/* Floating UI Mockup */}
        <div className="mt-16 w-full max-w-5xl aspect-[4/3] md:aspect-[16/9] bg-canvas rounded-[16px] shadow-[0_20px_60px_rgba(74,21,75,0.1)] border border-hairline overflow-hidden z-10 flex flex-col">
          {/* Fake Window Header */}
          <div className="h-12 border-b border-hairline flex items-center px-4 gap-2 bg-canvas-lavender">
            <div className="w-3 h-3 rounded-full bg-semantic-error-tint border border-semantic-error"></div>
            <div className="w-3 h-3 rounded-full bg-semantic-warning-tint border border-semantic-warning"></div>
            <div className="w-3 h-3 rounded-full bg-semantic-success-tint border border-semantic-success"></div>
          </div>
          {/* Mockup Body */}
          <div className="flex-1 p-4 md:p-8 flex gap-8 bg-canvas text-left">
            {/* Sidebar Mockup */}
            <div className="hidden md:flex w-48 flex-col gap-2 border-r border-hairline pr-6">
              <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-canvas-lavender text-primary font-bold text-[14px]">
                <span className="text-[16px]">📊</span> Overview
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-ink-mute text-[14px] font-medium">
                <span className="text-[16px]">💼</span> Applications
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-ink-mute text-[14px] font-medium">
                <span className="text-[16px]">📄</span> Resumes
              </div>
            </div>
            {/* Dashboard Content Mockup */}
            <div className="flex-1 flex flex-col gap-6">
              <h2 className="font-display-md text-[24px] text-ink">Overview</h2>
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2 rounded-[12px] border border-hairline p-4 shadow-sm bg-canvas">
                  <span className="text-[12px] font-bold text-ink-mute uppercase tracking-wider">Response Rate</span>
                  <span className="text-[28px] font-display-md text-ink">45%</span>
                  <div className="h-1.5 w-full bg-hairline rounded-full overflow-hidden mt-auto">
                    <div className="h-full bg-link-blue rounded-full w-[45%]"></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-[12px] border border-hairline p-4 shadow-sm bg-canvas">
                  <span className="text-[12px] font-bold text-ink-mute uppercase tracking-wider">Interview Rate</span>
                  <span className="text-[28px] font-display-md text-ink">20%</span>
                  <div className="h-1.5 w-full bg-hairline rounded-full overflow-hidden mt-auto">
                    <div className="h-full bg-semantic-error rounded-full w-[20%]"></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-[12px] border border-hairline p-4 shadow-sm bg-canvas">
                  <span className="text-[12px] font-bold text-ink-mute uppercase tracking-wider">Offer Rate</span>
                  <span className="text-[28px] font-display-md text-ink">5%</span>
                  <div className="h-1.5 w-full bg-hairline rounded-full overflow-hidden mt-auto">
                    <div className="h-full bg-semantic-success rounded-full w-[5%]"></div>
                  </div>
                </div>
              </div>
              {/* Pipeline Mockup */}
              <div className="hidden md:flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between rounded-[12px] border border-hairline px-4 py-3 bg-canvas shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-link-blue"></span>
                    <span className="text-[13px] font-bold uppercase tracking-wider text-ink-mute">Applied</span>
                  </div>
                  <span className="font-display-md text-[18px] text-ink">12</span>
                </div>
                <div className="flex items-center justify-between rounded-[12px] border border-hairline px-4 py-3 bg-canvas shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-semantic-error"></span>
                    <span className="text-[13px] font-bold uppercase tracking-wider text-ink-mute">Interview</span>
                  </div>
                  <span className="font-display-md text-[18px] text-ink">4</span>
                </div>
                <div className="flex items-center justify-between rounded-[12px] border border-hairline px-4 py-3 bg-canvas shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-semantic-success"></span>
                    <span className="text-[13px] font-bold uppercase tracking-wider text-ink-mute">Offer</span>
                  </div>
                  <span className="font-display-md text-[18px] text-ink">1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Band */}
      <footer className="bg-surface-aubergine text-on-primary py-24 px-6 md:px-12 flex flex-col items-center text-center">
        <h2 className="font-display-lg mb-8 max-w-3xl">
          Ready to simplify your job search?
        </h2>
        <Link
            href="/sign-up"
            className="inline-flex items-center justify-center bg-canvas text-primary font-sans font-bold text-[16px] sm:text-[18px] py-[14px] sm:py-[18px] px-[32px] sm:px-[48px] rounded-[90px] shadow-lg transition-transform hover:scale-105 whitespace-nowrap"
          >
            Start tracking now
          </Link>
        <div className="mt-16 pt-8 border-t border-primary-tint w-full max-w-5xl flex flex-col md:flex-row justify-between items-center text-on-aubergine-mute text-sm font-sans">
          <p>© 2026 Job Tracker. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-on-primary underline">Privacy Policy</Link>
            <Link href="#" className="hover:text-on-primary underline">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
