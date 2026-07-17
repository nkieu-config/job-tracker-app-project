export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only rounded-lg bg-primary px-4 py-2 font-sans text-body font-bold text-on-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to content
    </a>
  );
}
