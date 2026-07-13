export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-48 animate-pulse rounded bg-hairline" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-hairline" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-hairline" />
      <div className="flex flex-col gap-3">
        <div className="h-6 w-36 animate-pulse rounded bg-hairline" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-hairline" />
        ))}
      </div>
    </div>
  );
}
