import { expect, test } from "claude-code/testing";

import { MIN_MEASURED, reportOf, wilson } from "../../hooks/model/agreement.ts";
import type { Entry } from "../../hooks/model/journal.ts";

const entry = (over: Partial<Entry> = {}): Entry => ({
  ts: 1,
  question: "Which way?",
  options: ["A (Recommended)", "B"],
  pick: "A (Recommended)",
  reason: "recommended",
  mode: "hint",
  acted: false,
  gate: null,
  chosen: "A (Recommended)",
  ...over,
});

const unanswered: Entry = {
  ts: 1,
  question: "Which way?",
  options: ["A (Recommended)", "B"],
  pick: "A (Recommended)",
  reason: "recommended",
  mode: "hint",
  acted: false,
  gate: null,
};

const many = (count: number, over: Partial<Entry> = {}): readonly Entry[] =>
  Array.from({ length: count }, () => entry(over));

test("the interval is Wilson's, and empty with nothing measured", () => {
  expect(wilson({ hits: 0, total: 0 })).toBeNull();
  const [low, high] = wilson({ hits: 10, total: 10 }) ?? [0, 0];
  expect(Math.round(low * 1000)).toBe(722);
  expect(Math.round(high * 1000)).toBe(1000);
});

test("only polls the user answered with a star are measured", () => {
  const report = reportOf([
    entry(),
    entry({ chosen: "B" }),
    entry({ acted: true, chosen: "Y" }),
    entry({ pick: null, chosen: "B" }),
    unanswered,
  ]);
  expect(report.polls).toBe(5);
  expect(report.starred).toBe(4);
  expect(report.measured).toEqual({ hits: 1, total: 2 });
  expect(report.misses.map((one) => one.chosen)).toEqual(["B"]);
});

test("the splits: options, place of the star, reason", () => {
  const report = reportOf([
    entry(),
    entry({ options: ["B", "A (Recommended)"], chosen: "B" }),
    entry({ options: ["A (Recommended)", "B", "C"], reason: "limit" }),
  ]);
  expect(report.byOptions).toEqual({
    "2": { hits: 1, total: 2 },
    "3": { hits: 1, total: 1 },
  });
  expect(report.byPlace).toEqual({
    first: { hits: 2, total: 2 },
    later: { hits: 0, total: 1 },
  });
  expect(report.byReason["limit"]).toEqual({ hits: 1, total: 1 });
});

test("the verdict needs the count and the interval", () => {
  expect(reportOf(many(MIN_MEASURED - 1)).verdict).toBe("few");
  expect(reportOf(many(MIN_MEASURED)).verdict).toBe("enough");
  const mixed = [...many(5), ...many(MIN_MEASURED, { chosen: "B" })];
  expect(reportOf(mixed).verdict).toBe("below");
  const near = [...many(MIN_MEASURED - 4), ...many(4, { chosen: "B" })];
  expect(reportOf(near).verdict).toBe("open");
});
