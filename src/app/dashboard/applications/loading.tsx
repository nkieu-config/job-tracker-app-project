const COLUMN_CARDS = [3, 2, 2, 1];

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-9 w-48 animate-pulse rounded bg-hairline" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-hairline" />
          <div className="h-11 w-40 animate-pulse rounded-lg bg-hairline" />
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_CARDS.map((count, col) => (
          <div key={col} className="flex w-64 shrink-0 flex-col gap-3">
            <div className="h-4 w-24 animate-pulse rounded bg-hairline" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-hairline"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
