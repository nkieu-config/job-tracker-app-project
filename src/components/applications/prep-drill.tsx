"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { PrepQuestion } from "@/lib/prep-sheet";

type Verdict = "knew" | "review";

// Keys are bound to this container rather than to the document: the Desk keeps
// every tab panel mounted and merely hidden, so a document listener would still
// fire while the drill is off-screen behind another tab.
export function PrepDrill({
  questions,
  onExit,
}: {
  questions: PrepQuestion[];
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stage.current?.focus();
  }, []);

  const done = index >= questions.length;
  const current = questions[index];

  function answer(verdict: Verdict) {
    setVerdicts((v) => ({ ...v, [index]: verdict }));
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function restart(only?: number[]) {
    setVerdicts({});
    setRevealed(false);
    setIndex(only && only.length ? only[0] : 0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (done) return;
    if (!revealed && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      setRevealed(true);
      return;
    }
    if (revealed && (event.key === "1" || event.key === "2")) {
      event.preventDefault();
      answer(event.key === "1" ? "knew" : "review");
    }
  }

  if (done) {
    const knew = Object.values(verdicts).filter((v) => v === "knew").length;
    const toReview = questions.filter((_, i) => verdicts[i] === "review");
    return (
      <div className="flex flex-col gap-5 rounded-xl border border-hairline bg-canvas p-6">
        <div>
          <p className="font-serif text-[1.6rem] font-semibold leading-tight text-ink">
            {knew} of {questions.length} answered
          </p>
          {toReview.length > 0 && (
            <p className="mt-1 font-sans text-caption text-ink-mute">
              These are the ones to come back to.
            </p>
          )}
        </div>

        {toReview.length > 0 && (
          <ul className="flex flex-col gap-2">
            {toReview.map((q) => (
              <li
                key={q.question}
                className="border-l-2 border-pen pl-3 font-serif text-body leading-relaxed text-ink"
              >
                {q.question}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => restart()}>Practise again</Button>
          <Button variant="ghost" onClick={onExit}>
            Back to the sheet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={stage}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-5 rounded-xl border border-hairline bg-canvas p-6 focus:outline-none"
    >
      <div className="flex items-center justify-between gap-3">
        <ul className="flex gap-1.5" aria-hidden="true">
          {questions.map((q, i) => (
            <li
              key={q.question}
              className={cn(
                "h-1 w-6 rounded-full",
                i < index
                  ? verdicts[i] === "knew"
                    ? "bg-semantic-success"
                    : "bg-pen"
                  : i === index
                    ? "bg-primary"
                    : "bg-hairline",
              )}
            />
          ))}
        </ul>
        <span className="font-mono text-fine tabular-nums text-ink-mute">
          {index + 1}/{questions.length}
        </span>
      </div>

      <p
        className="min-h-[4.5rem] font-serif text-[1.35rem] font-medium leading-snug text-ink"
        aria-live="polite"
      >
        {current.question}
      </p>

      {revealed ? (
        <>
          <div className="border-t border-dashed border-hairline pt-4">
            {current.answerKey ? (
              <p className="font-sans text-body leading-relaxed text-ink-mute">
                <span className="font-semibold text-ink">
                  A strong answer covers:{" "}
                </span>
                {current.answerKey}
              </p>
            ) : (
              <p className="font-sans text-body leading-relaxed text-ink-mute">
                No answer key for this one — score yourself on whether you could
                answer it out loud.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => answer("knew")}>I knew this</Button>
            <Button variant="outline" onClick={() => answer("review")}>
              Come back to it
            </Button>
            <span className="self-center font-mono text-fine text-ink-mute">
              1 / 2
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setRevealed(true)}>Show the answer</Button>
          <Button variant="ghost" onClick={onExit}>
            Stop
          </Button>
          <span className="self-center font-mono text-fine text-ink-mute">
            space
          </span>
        </div>
      )}
    </div>
  );
}
