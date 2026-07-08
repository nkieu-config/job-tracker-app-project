export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-9 w-64 animate-pulse rounded bg-hairline" />
          <div className="h-5 w-40 animate-pulse rounded bg-hairline" />
        </div>
        <div className="h-11 w-40 animate-pulse rounded-pill bg-hairline" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-xl bg-hairline"
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-6 w-24 animate-pulse rounded bg-hairline" />
        <div className="h-3 w-full animate-pulse rounded-full bg-hairline" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-hairline"
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-6 w-48 animate-pulse rounded bg-hairline" />
        <div className="h-16 animate-pulse rounded-xl bg-hairline" />
        <div className="h-16 animate-pulse rounded-xl bg-hairline" />
      </div>
    </div>
  );
}
