export type PrepSectionId = "technical" | "behavioral" | "interviewer";

export type PrepQuestion = { question: string; answerKey: string | null };

export type PrepSection = {
  id: PrepSectionId;
  title: string;
  // Questions you answer can be drilled; questions you ask the interviewer are
  // a list to bring with you, so there is nothing to test yourself on.
  drillable: boolean;
  questions: PrepQuestion[];
};

export type PrepSheet = {
  sections: PrepSection[];
  // The generator's output is plain text from a model, not a guaranteed shape.
  // When no section heading is recognised the original text is handed back so
  // the UI can show it verbatim — a parser that silently drops a sheet it did
  // not understand would lose the only copy the user has.
  raw: string | null;
};

const SECTIONS: { id: PrepSectionId; heading: string; drillable: boolean }[] = [
  { id: "technical", heading: "technical questions", drillable: true },
  { id: "behavioral", heading: "behavioral questions", drillable: true },
  {
    id: "interviewer",
    heading: "questions to ask the interviewer",
    drillable: false,
  },
];

const TITLES: Record<PrepSectionId, string> = {
  technical: "Technical",
  behavioral: "Behavioural",
  interviewer: "Ask them",
};

const BULLET = /^\s*[-*•]\s+/;
const ANSWER_KEY = /strong answers?\s+cover:?\s*/i;

export function parsePrepSheet(text: string): PrepSheet {
  if (!text.trim()) return { sections: [], raw: null };

  const lines = text.split("\n");
  const found = new Map<number, (typeof SECTIONS)[number]>();

  lines.forEach((line, i) => {
    const norm = line.trim().toLowerCase().replace(/[:.]+$/, "");
    const section = SECTIONS.find(
      (s) => s.heading === norm && ![...found.values()].includes(s),
    );
    if (section) found.set(i, section);
  });

  if (found.size === 0) return { sections: [], raw: text };

  const starts = [...found.keys()].sort((a, b) => a - b);
  const sections: PrepSection[] = [];

  starts.forEach((start, n) => {
    const meta = found.get(start)!;
    const stop = n + 1 < starts.length ? starts[n + 1] : lines.length;
    const questions: PrepQuestion[] = [];

    for (let i = start + 1; i < stop; i++) {
      const line = lines[i];
      if (BULLET.test(line)) {
        questions.push({
          question: line.replace(BULLET, "").trim(),
          answerKey: null,
        });
        continue;
      }
      if (!questions.length) continue;
      const current = questions[questions.length - 1];
      if (ANSWER_KEY.test(line)) {
        current.answerKey = line.replace(/^\s*/, "").replace(ANSWER_KEY, "");
        continue;
      }
      // A wrapped continuation of whichever part of the question came last.
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (current.answerKey !== null) current.answerKey += ` ${trimmed}`;
      else current.question += ` ${trimmed}`;
    }

    sections.push({
      id: meta.id,
      title: TITLES[meta.id],
      drillable: meta.drillable,
      questions,
    });
  });

  return { sections, raw: null };
}

export function drillableQuestions(sheet: PrepSheet): PrepQuestion[] {
  return sheet.sections
    .filter((s) => s.drillable)
    .flatMap((s) => s.questions)
    .filter((q) => q.question.length > 0);
}
