import { expect, test } from "claude-code/testing";

import {
  lineOfReport,
  MIN_MEASURED,
  MIN_SESSIONS,
  reportOf,
  sessionsOf,
  wilson,
} from "../../hooks/model/agreement.ts";
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

const unansweredEntry: Entry = {
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
    unansweredEntry,
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

test("a session counts when it gave at least one measured poll", () => {
  const answered = [entry()];
  const unanswered = [unansweredEntry];
  expect(sessionsOf([answered, unanswered, []])).toBe(1);
  expect(sessionsOf([answered, answered])).toBe(2);
});

test("the daily line carries the count, the sessions, the agreement and the call", () => {
  const few = lineOfReport(reportOf(many(3)), 1);
  expect(few).toBe(
    "замер 276.5: измерено 3 из 1 сессий, совпало 3/3 100%, 95%: 44%..100%, вывод: мало данных",
  );
  const enough = reportOf(many(MIN_MEASURED));
  expect(lineOfReport(enough, MIN_SESSIONS)).toContain("включаем auto");
  expect(lineOfReport(enough, MIN_SESSIONS - 1)).toContain("мало данных");
  const poor = reportOf(many(MIN_MEASURED, { chosen: "B" }));
  expect(lineOfReport(poor, 1)).toContain("держим hint");
  expect(lineOfReport(reportOf([]), 0)).toBe(
    "замер 276.5: измерено 0 из 0 сессий, совпало -, вывод: мало данных",
  );
});
