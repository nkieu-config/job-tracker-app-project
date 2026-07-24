import { describe, it, expect } from "vitest";
import { buildAgenda, type AgendaRow } from "@/lib/agenda";

const NOW = new Date("2026-07-22T09:00:00.000Z");

function row(over: Partial<AgendaRow> = {}): AgendaRow {
  return {
    id: "a1",
    role: "Senior Frontend Engineer",
    company: "Acme",
    status: "SAVED",
    deadline: null,
    hasJd: true,
    analyzed: true,
    hasPrep: false,
    updatedAt: NOW,
    ...over,
  };
}

describe("buildAgenda", () => {
  it("says nothing when nothing needs doing", () => {
    expect(buildAgenda([row({ status: "SAVED" })], NOW)).toEqual([]);
  });

  it("raises a deadline inside the next week", () => {
    const [item] = buildAgenda(
      [row({ deadline: new Date("2026-07-25T00:00:00.000Z") })],
      NOW,
    );
    expect(item.when).toBe("in 3d");
    expect(item.urgent).toBe(true);
  });

  it("stops treating a deadline as urgent once it is a week out", () => {
    const [item] = buildAgenda(
      [row({ deadline: new Date("2026-07-28T00:00:00.000Z") })],
      NOW,
    );
    expect(item.when).toBe("in 6d");
    expect(item.urgent).toBe(false);
  });

  it("ignores a deadline further out than a week", () => {
    expect(
      buildAgenda([row({ deadline: new Date("2026-09-01T00:00:00.000Z") })], NOW),
    ).toEqual([]);
  });

  it("names an overdue deadline as overdue rather than as a countdown", () => {
    const [item] = buildAgenda(
      [row({ deadline: new Date("2026-07-20T00:00:00.000Z") })],
      NOW,
    );
    expect(item.when).toBe("2d overdue");
  });

  it("asks for a prep sheet when an interview has none", () => {
    const [item] = buildAgenda(
      [row({ status: "INTERVIEW", hasPrep: false })],
      NOW,
    );
    expect(item.what).toBe("Draft a prep sheet");
    expect(item.urgent).toBe(true);
  });

  it("leaves an interview alone once a sheet exists", () => {
    expect(
      buildAgenda([row({ status: "INTERVIEW", hasPrep: true })], NOW),
    ).toEqual([]);
  });

  it("raises a posting that was saved but never read", () => {
    const [item] = buildAgenda([row({ hasJd: true, analyzed: false })], NOW);
    expect(item.what).toBe("Read the posting");
  });

  it("does not invent work for an application with no posting", () => {
    expect(buildAgenda([row({ hasJd: false, analyzed: false })], NOW)).toEqual(
      [],
    );
  });

  it("chases an application that has been silent since it was sent", () => {
    const [item] = buildAgenda(
      [row({ status: "APPLIED", updatedAt: new Date("2026-07-01T00:00:00.000Z") })],
      NOW,
    );
    expect(item.what).toBe("Follow up");
    expect(item.when).toBe("21d quiet");
  });

  it("waits two weeks before calling an application silent", () => {
    expect(
      buildAgenda(
        [
          row({
            status: "APPLIED",
            updatedAt: new Date("2026-07-15T00:00:00.000Z"),
          }),
        ],
        NOW,
      ),
    ).toEqual([]);
  });

  // One application behind on several fronts must not crowd out the others.
  it("gives an application one line, its most urgent one", () => {
    const items = buildAgenda(
      [
        row({
          id: "busy",
          status: "INTERVIEW",
          hasPrep: false,
          analyzed: false,
          deadline: new Date("2026-07-23T00:00:00.000Z"),
        }),
      ],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].when).toBe("tomorrow");
  });

  it("puts the soonest deadline first and caps the list", () => {
    const items = buildAgenda(
      [
        row({ id: "c", deadline: new Date("2026-07-27T00:00:00.000Z") }),
        row({ id: "a", deadline: new Date("2026-07-22T00:00:00.000Z") }),
        row({ id: "b", deadline: new Date("2026-07-24T00:00:00.000Z") }),
        row({ id: "d", status: "INTERVIEW", hasPrep: false }),
        row({ id: "e", hasJd: true, analyzed: false }),
      ],
      NOW,
      3,
    );
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
