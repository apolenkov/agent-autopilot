import { describe, expect, test } from "claude-code/testing";

import { configOf } from "../../hooks/model/config.ts";
import { decide, type Question } from "../../hooks/model/rule.ts";

const CONFIG = configOf({});
const question = (over: Partial<Question> = {}): Question => ({
  question: "How do we go on?",
  header: "Plan",
  multiSelect: false,
  options: [
    { label: "Continue by the plan (Recommended)", description: "Keep going" },
    { label: "Rethink", description: "Start over" },
  ],
  ...over,
});
const human = (reason: string): unknown => ({ kind: "ask-human", reason });
const asked = (over?: Partial<Question>): unknown =>
  decide([question(over)], CONFIG);

test("one plain starred question is answered with the option's own label", () => {
  expect(asked()).toEqual({
    kind: "pick",
    label: "Continue by the plan (Recommended)",
    index: 0,
  });
});

test("the star may stand anywhere and in Russian", () => {
  expect(
    asked({
      options: [
        { label: "Первый" },
        { label: "Второй (рекомендую)" },
        { label: "Третий" },
      ],
    }),
  ).toEqual({ kind: "pick", label: "Второй (рекомендую)", index: 1 });
});

test("the star is read in the label, not in the description", () => {
  expect(
    asked({
      options: [
        { label: "A", description: "(Recommended)" },
        { label: "B", description: "" },
      ],
    }),
  ).toEqual({ kind: "ask-human", reason: "no-recommended" });
});

describe("what goes to the user", () => {
  test("two questions", () => {
    expect(decide([question(), question()], CONFIG)).toEqual(
      human("several-questions"),
    );
  });
  test("no question", () => {
    expect(decide([], CONFIG)).toEqual(human("several-questions"));
  });
  test("multi-select", () => {
    expect(asked({ multiSelect: true })).toEqual(human("multi-select"));
  });
  test("kind text and number", () => {
    expect(asked({ kind: "text" })).toEqual(human("not-choice"));
    expect(asked({ kind: "number" })).toEqual(human("not-choice"));
  });
  test("kind choice is a plain choice", () => {
    expect(asked({ kind: "choice" })).toMatchObject({ kind: "pick" });
  });
  test("one option", () => {
    expect(asked({ options: [{ label: "Only (Recommended)" }] })).toEqual(
      human("few-options"),
    );
  });
  test("no star", () => {
    expect(asked({ options: [{ label: "A" }, { label: "B" }] })).toEqual(
      human("no-recommended"),
    );
  });
  test("two stars", () => {
    expect(
      asked({
        options: [{ label: "A (recommended)" }, { label: "B (Recommended)" }],
      }),
    ).toEqual(human("many-recommended"));
  });
  test("the star on an Other option", () => {
    expect(
      asked({ options: [{ label: "A" }, { label: "Other (Recommended)" }] }),
    ).toEqual(human("other"));
    expect(
      asked({ options: [{ label: "A" }, { label: "Другое (рекомендую)" }] }),
    ).toEqual(human("other"));
  });
});

describe("the gate beats the star", () => {
  test("git push --force in the starred option's description", () => {
    const decision = asked({
      options: [
        {
          label: "Continue by the plan (Recommended)",
          description: "git push --force to origin",
        },
        { label: "Rethink" },
      ],
    });
    expect(decision).toEqual({
      kind: "ask-human",
      reason: "irreversible",
      gate: "push",
    });
  });
  test("a word in the question, in another option, in a preview", () => {
    expect(asked({ question: "Delete the old branch?" })).toMatchObject({
      reason: "irreversible",
    });
    expect(
      asked({
        options: [
          { label: "A (Recommended)" },
          { label: "B", description: "drop table users" },
        ],
      }),
    ).toMatchObject({ reason: "irreversible" });
    expect(
      asked({
        options: [
          { label: "A (Recommended)", preview: "rm -rf build" },
          { label: "B" },
        ],
      }),
    ).toMatchObject({ reason: "irreversible" });
  });
  test("a question-level description at run time", () => {
    expect(asked({ description: "this will deploy to prod" })).toMatchObject({
      reason: "irreversible",
    });
  });
  test("the user's extra words", () => {
    expect(
      decide([question({ question: "Touch billing?" })], {
        ...CONFIG,
        extraDeny: ["billing"],
      }),
    ).toMatchObject({ reason: "irreversible" });
  });
  test("a clean question is a pick", () => {
    expect(asked({ question: "Which colour for the header?" })).toMatchObject({
      kind: "pick",
    });
  });
});
