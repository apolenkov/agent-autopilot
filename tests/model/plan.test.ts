import { expect, test } from "claude-code/testing";

import { configOf } from "../../hooks/model/config.ts";
import { planOf } from "../../hooks/model/plan.ts";
import type { Question } from "../../hooks/model/rule.ts";
import {
  answered,
  initialOf,
  withMode,
  withTurn,
} from "../../hooks/model/session.ts";

const STARRED = "Go on (Recommended)";
const CONFIG = configOf({ limit: 2 });
const poll = (over: Partial<Question> = {}): Question => ({
  question: "Which way?",
  options: [{ label: STARRED }, { label: "Stop" }],
  multiSelect: false,
  ...over,
});
const plan = (
  mode: "off" | "hint" | "auto",
  questions: readonly Question[] = [poll()],
  state = initialOf("s1"),
): ReturnType<typeof planOf> =>
  planOf({ state: withMode(state, mode), config: CONFIG, questions });

test("off plans nothing", () => {
  expect(plan("off")).toEqual({});
});

test("hint stars the option and journals it unacted", () => {
  expect(plan("hint")).toEqual({
    notice: `autopilot: ★ ${STARRED}`,
    entry: {
      question: "Which way?",
      options: [STARRED, "Stop"],
      mode: "hint",
      pick: STARRED,
      reason: "recommended",
      acted: false,
      gate: null,
    },
  });
});

test("auto answers with the option's own label, the questions as shown, a note", () => {
  const questions = [poll()];
  const planned = plan("auto", questions);
  expect(planned.notice).toBeUndefined();
  expect(planned.answer?.result.questions).toBe(questions);
  expect(planned.answer?.result.answers).toEqual({ "Which way?": STARRED });
  expect(planned.answer?.context).toEqual([
    `autopilot: ответил по правилу (Recommended): ${STARRED}`,
  ]);
  expect(planned.entry).toMatchObject({ acted: true, pick: STARRED });
});

test("a poll the rule leaves to the user is only journaled, with the gate's word", () => {
  const risky = poll({
    options: [
      { label: STARRED, description: "git push --force" },
      { label: "Stop" },
    ],
  });
  for (const mode of ["hint", "auto"] as const) {
    expect(plan(mode, [risky])).toEqual({
      entry: expect.objectContaining({
        pick: null,
        reason: "irreversible",
        gate: "push",
        acted: false,
      }),
    });
  }
});

test("the limit turns auto into a starred hint with a word on the limit", () => {
  const spent = answered(answered(initialOf("s1"), "a?"), "b?");
  const planned = plan("auto", [poll()], spent);
  expect(planned.answer).toBeUndefined();
  expect(planned.notice).toBe(`autopilot: лимит 2, ★ ${STARRED}`);
  expect(planned.entry).toMatchObject({ reason: "limit", pick: STARRED });
});

test("a loop and a second answer in a turn are silent and the user's alone", () => {
  const first = answered(withTurn(initialOf("s1"), "t1"), "Which way?");
  const again = plan("auto", [poll()], withTurn(first, "t2"));
  expect(again.answer).toBeUndefined();
  expect(again.notice).toBeUndefined();
  expect(again.entry).toMatchObject({ reason: "repeat", pick: null });
  const second = plan("auto", [poll({ question: "Other?" })], first);
  expect(second.notice).toBeUndefined();
  expect(second.entry).toMatchObject({ reason: "same-turn", pick: null });
});

test("hint ignores the session's guards", () => {
  const spent = answered(answered(initialOf("s1"), "Which way?"), "b?");
  expect(plan("hint", [poll()], spent).notice).toBe(`autopilot: ★ ${STARRED}`);
});
