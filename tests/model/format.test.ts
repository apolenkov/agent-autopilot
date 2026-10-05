import { expect, test } from "claude-code/testing";

import { configOf } from "../../hooks/model/config.ts";
import {
  correctionOf,
  lastTextOf,
  modeSetTextOf,
  statusLineOf,
  statusTextOf,
} from "../../hooks/model/format.ts";
import type { Entry } from "../../hooks/model/journal.ts";
import { answered, initialOf, withMode } from "../../hooks/model/session.ts";

const CONFIG = configOf({});
const entry = (ts: number): Entry => ({
  ts,
  question: `q${String(ts)}?`,
  options: ["A (Recommended)", "B"],
  pick: "A (Recommended)",
  reason: "recommended",
  mode: "auto",
  acted: true,
  gate: null,
});

test("only auto has a status line", () => {
  const state = answered(initialOf("s1"), "a?");
  expect(statusLineOf("auto", state, CONFIG)).toBe("AP auto 1/5");
  expect(statusLineOf("hint", state, CONFIG)).toBeUndefined();
  expect(statusLineOf("off", state, CONFIG)).toBeUndefined();
});

test("status names the mode, the count and the last three", () => {
  const state = withMode(answered(initialOf("s1"), "a?"), "auto");
  const text = statusTextOf(
    state,
    CONFIG,
    [1, 2, 3, 4].map((ts) => entry(ts)),
  );
  expect(text).toContain("auto: отвечает за вас");
  expect(text).toContain("на эту сессию");
  expect(text).toContain("1 из 5");
  expect(text).not.toContain("q1?");
  expect(text).toContain("q4?");
  expect(statusTextOf(initialOf("s1"), CONFIG, [])).toContain(
    "вопросов пока не было",
  );
});

test("last lists up to ten, or says there is nothing", () => {
  const eleven = Array.from({ length: 11 }, (_, index) => entry(index + 1));
  expect(lastTextOf(eleven).split("\n")).toHaveLength(10);
  expect(lastTextOf([])).toContain("вопросов пока не было");
});

test("auto says honestly that nothing is undone", () => {
  expect(modeSetTextOf("auto")).toContain("не откатить");
  expect(modeSetTextOf("hint")).toContain("hint");
});

test("the correction names the question, the new choice and the old", () => {
  expect(correctionOf("Какой путь?", "Б", "А")).toBe(
    "Поправка: на «Какой путь?» выбери «Б», не «А»",
  );
});
