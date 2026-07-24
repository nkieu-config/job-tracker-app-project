import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/get-session";
import { isAdminEmail } from "@/server/admin";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SkipLink } from "@/components/ui/skip-link";
import { LogoMark } from "@/components/ui/logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guards rendering of every /dashboard page. Data queries are still
  // independently scoped by userId — this is defense in depth.
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const isAdmin = isAdminEmail(session.user.email);

  return (
    <div className="flex flex-1 bg-canvas-lavender font-sans">
      <SkipLink />
      <CommandPalette />
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r border-hairline bg-canvas px-4 py-6 lg:flex">
        <div className="flex flex-col gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <LogoMark size="md" />
            <span
              translate="no"
              className="font-display-sm tracking-tight text-primary"
            >
              Applywise
            </span>
          </Link>
          <nav aria-label="Main">
            <DashboardNav orientation="vertical" isAdmin={isAdmin} />
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <span className="px-2 font-mono text-fine text-ink-mute">
            ⌘K to jump anywhere
          </span>
          <span className="truncate px-2 text-caption text-ink-mute">
            {session.user.email}
          </span>
          <div className="flex items-center gap-2">
            <SignOutButton />
            <ThemeToggle className="ml-auto" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-hairline bg-canvas px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <LogoMark size="md" />
            <span
              translate="no"
              className="font-sans text-body-lg font-semibold tracking-tight text-ink"
            >
              Applywise
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-8 lg:py-12 lg:pb-12 focus:outline-none"
        >
          {children}
        </main>

        {/* Primary navigation sits within thumb reach on a phone; on the header
            it is the furthest point from where the hand actually is. */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <DashboardNav orientation="bottom" isAdmin={isAdmin} />
        </nav>
      </div>
    </div>
  );
}
