import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-canvas">
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
