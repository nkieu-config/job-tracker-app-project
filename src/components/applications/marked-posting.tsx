import { markPosting, type SkillMatch } from "@/lib/posting-marks";

const PROSE =
  "whitespace-pre-wrap font-serif text-body-lg leading-loose text-ink";

// Marks are located at render time against the posting as it stands, never
// stored as offsets — editing the description can only ever change which skills
// are stale (already flagged elsewhere), never move a highlight onto the wrong
// words.
export function MarkedPosting({
  text,
  skills,
}: {
  text: string;
  skills: SkillMatch[];
}) {
  if (skills.length === 0) {
    return <p className={PROSE}>{text}</p>;
  }

  const { segments, inferred } = markPosting(text, skills);

  return (
    <>
      <p className={PROSE}>
        {segments.map((segment, i) =>
          segment.kind === "text" ? (
            <span key={i}>{segment.text}</span>
          ) : (
            <mark
              key={i}
              className={
                segment.matched
                  ? "rounded-[2px] bg-marker px-0.5 text-marker-ink"
                  : "bg-transparent text-ink underline decoration-pen decoration-2 underline-offset-4"
              }
            >
              {segment.text}
              <span className="sr-only">
                {segment.matched ? " (in your resume)" : " (missing)"}
              </span>
            </mark>
          ),
        )}
      </p>

      {inferred.length > 0 && (
        <p className="mt-4 border-l-2 border-hairline pl-3 font-sans text-caption leading-relaxed text-ink-mute">
          Read from the posting but not quoted from it:{" "}
          <span className="text-ink">
            {inferred.map((s) => s.skill).join(", ")}
          </span>
          . The posting implies these rather than naming them, so there is
          nothing to highlight.
        </p>
      )}
    </>
  );
}
