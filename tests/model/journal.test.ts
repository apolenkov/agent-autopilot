import { expect, test } from "claude-code/testing";

import {
  appended,
  chosenOf,
  entriesOf,
  type Entry,
  keyOf,
  lastOf,
  linesOf,
  settled,
} from "../../hooks/model/journal.ts";

const entry = (over: Partial<Entry> = {}): Entry => ({
  ts: Date.UTC(2026, 9, 5, 12, 3, 11),
  question: "Which way?",
  options: ["A (Recommended)", "B"],
  pick: "A (Recommended)",
  reason: "recommended",
  mode: "auto",
  acted: true,
  gate: null,
  ...over,
});

test("the key names the session", () => {
  expect(keyOf("s1")).toBe("log:s1");
});

test("the ring keeps the newest entries", () => {
  const first = appended([], entry({ ts: 1 }), 3);
  const second = appended(first, entry({ ts: 2 }), 3);
  const third = appended(second, entry({ ts: 3 }), 3);
  const ring = appended(third, entry({ ts: 4 }), 3);
  expect(ring.map((one) => one.ts)).toEqual([2, 3, 4]);
});

test("long texts are cut", () => {
  const [one] = appended([], entry({ question: "q".repeat(500) }), 5);
  expect(one?.question).toHaveLength(200);
});

test("what the store holds is read with care", () => {
  expect(entriesOf(undefined)).toEqual([]);
  expect(entriesOf("junk")).toEqual([]);
  expect(entriesOf([entry(), { nope: 1 }, null, 3])).toEqual([entry()]);
});

test("the last entries, oldest first", () => {
  const all = [1, 2, 3].map((ts) => entry({ ts }));
  expect(lastOf(all, 2).map((one) => one.ts)).toEqual([2, 3]);
  expect(lastOf(all, 9)).toHaveLength(3);
});

const lineOf = (one: Entry): string => linesOf([one]).join("");

test("a line says what was done", () => {
  expect(lineOf(entry())).toBe(
    "12:03:11 «Which way?» ответил «A (Recommended)» [auto]",
  );
  expect(lineOf(entry({ acted: false, mode: "hint" }))).toBe(
    "12:03:11 «Which way?» ★ «A (Recommended)» [hint]",
  );
  expect(lineOf(entry({ acted: false, reason: "limit" }))).toContain(
    "★ «A (Recommended)» (limit)",
  );
  expect(
    lineOf(
      entry({ pick: null, acted: false, reason: "irreversible", gate: "push" }),
    ),
  ).toContain("вам: irreversible (push)");
  expect(
    lineOf(entry({ pick: null, acted: false, reason: "multi-select" })),
  ).toContain("вам: multi-select [");
});

test("the user's answer goes on the newest open entry of that poll", () => {
  const open = entry({ acted: false, ts: 1 });
  const later = entry({ acted: false, ts: 2 });
  const done = settled([open, later], "Which way?", "B");
  expect(done.map((one) => one.chosen)).toEqual([undefined, "B"]);
  expect(settled(done, "Which way?", "A")[0]?.chosen).toBe("A");
});

test("an answer finds no entry that was answered by the autopilot or by another poll", () => {
  const all = [
    entry({ acted: true }),
    entry({ acted: false, question: "Other?" }),
  ];
  expect(settled(all, "Which way?", "B")).toEqual(all);
});

test("the answer is read from the tool's result, whatever its shape", () => {
  const outcome = { result: { answers: { "Which way?": "B" } } };
  expect(chosenOf(outcome, "Which way?")).toBe("B");
  expect(chosenOf(outcome, "Nope?")).toBeUndefined();
  expect(chosenOf({ deny: "no" }, "Which way?")).toBeUndefined();
  expect(
    chosenOf({ result: { answers: { "Which way?": 3 } } }, "Which way?"),
  ).toBeUndefined();
});

test("a line says what the user answered", () => {
  expect(lineOf(entry({ acted: false, chosen: "B" }))).toContain(
    "★ «A (Recommended)» → вы: «B»",
  );
});
