export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-5 w-28 animate-pulse rounded bg-hairline" />
        <div className="h-9 w-72 animate-pulse rounded bg-hairline" />
        <div className="h-5 w-40 animate-pulse rounded bg-hairline" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-hairline" />
      <div className="h-32 animate-pulse rounded-2xl bg-hairline" />
      <div className="h-32 animate-pulse rounded-2xl bg-hairline" />
    </div>
  );
}
