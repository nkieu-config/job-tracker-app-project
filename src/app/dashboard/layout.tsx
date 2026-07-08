import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/get-session";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

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

  return (
    <div className="flex flex-1 bg-canvas-lavender font-sans">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r border-hairline bg-canvas px-4 py-6 lg:flex">
        <div className="flex flex-col gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
              <span className="text-xl font-bold leading-none text-on-primary">
                J
              </span>
            </div>
            <span className="font-display-md text-2xl tracking-tight text-primary">
              Job Tracker
            </span>
          </Link>
          <nav aria-label="Main">
            <DashboardNav orientation="vertical" />
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <span className="truncate px-2 text-[13px] text-ink-mute">
            {session.user.email}
          </span>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-hairline bg-canvas px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <span className="text-xl font-bold leading-none text-on-primary">
                J
              </span>
            </div>
          </Link>
          <nav aria-label="Main" className="min-w-0">
            <DashboardNav orientation="horizontal" />
          </nav>
          <SignOutButton />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
