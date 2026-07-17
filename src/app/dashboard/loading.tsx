export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-9 w-64 animate-pulse rounded bg-hairline" />
          <div className="h-5 w-40 animate-pulse rounded bg-hairline" />
        </div>
        <div className="h-12 w-44 animate-pulse rounded-lg bg-hairline" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-hairline" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-6 w-24 animate-pulse rounded bg-hairline" />
        <div className="h-3 w-full animate-pulse rounded-full bg-hairline" />
        <div className="flex flex-col gap-2 md:flex-row md:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 flex-1 animate-pulse rounded-xl bg-hairline"
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-6 w-48 animate-pulse rounded bg-hairline" />
        <div className="h-16 animate-pulse rounded-xl bg-hairline" />
        <div className="h-16 animate-pulse rounded-xl bg-hairline" />
      </div>
    </div>
  );
}
