export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-9 w-52 animate-pulse rounded bg-hairline" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-hairline" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-hairline" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 animate-pulse rounded bg-hairline" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-hairline" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-4 w-28 animate-pulse rounded bg-hairline" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-hairline" />
        ))}
      </div>
    </div>
  );
}
