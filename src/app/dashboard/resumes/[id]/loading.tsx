export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-24 animate-pulse rounded bg-hairline" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-9 w-64 animate-pulse rounded bg-hairline" />
            <div className="h-5 w-40 animate-pulse rounded bg-hairline" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 animate-pulse rounded-lg bg-hairline" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-hairline" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-6 w-40 animate-pulse rounded bg-hairline" />
        <div className="h-96 animate-pulse rounded-xl bg-hairline" />
      </div>
    </div>
  );
}
