import type { PrepSheet } from "@/lib/prep-sheet";

// Answer keys are collapsed by default. A prep sheet that shows the question
// and its answer together is something to read; one that makes you try first is
// something to practise with, and that is the whole point of the sheet.
export function PrepSheetView({ sheet }: { sheet: PrepSheet }) {
  if (sheet.raw !== null) {
    return (
      <div className="whitespace-pre-wrap rounded-xl border border-hairline bg-canvas p-6 font-serif text-body-lg leading-relaxed text-ink">
        {sheet.raw}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sheet.sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
              {section.title}
            </h3>
            <span className="font-mono text-fine tabular-nums text-ink-mute">
              {section.questions.length}
            </span>
          </div>

          <ol className="flex flex-col gap-1.5">
            {section.questions.map((q, i) => (
              <li key={`${section.id}-${i}`}>
                {q.answerKey ? (
                  <details className="group rounded-lg border border-hairline bg-canvas px-3 py-2">
                    <summary className="cursor-pointer list-none font-serif text-body leading-relaxed text-ink marker:content-none">
                      <span className="mr-1.5 font-mono text-fine text-ink-mute group-open:text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {q.question}
                    </summary>
                    <p className="mt-2 border-t border-dashed border-hairline pt-2 font-sans text-caption leading-relaxed text-ink-mute">
                      <span className="font-semibold text-ink">
                        A strong answer covers:{" "}
                      </span>
                      {q.answerKey}
                    </p>
                  </details>
                ) : (
                  <p className="rounded-lg border border-hairline bg-canvas px-3 py-2 font-serif text-body leading-relaxed text-ink">
                    <span className="mr-1.5 font-mono text-fine text-ink-mute">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {q.question}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
