export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-hairline" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-[12px] bg-hairline"
          />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-[16px] bg-hairline" />
    </div>
  );
}
