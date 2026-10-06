import { expect, test } from "claude-code/testing";

import {
  guessRequestOf,
  isGuessable,
  labelOfReply,
} from "../../hooks/model/guess.ts";
import { type Entry, guessed } from "../../hooks/model/journal.ts";

const question = {
  question: "Which store?",
  options: [{ label: "SQLite" }, { label: "Postgres", description: "server" }],
};

test("only a poll with no single star is guessed", () => {
  expect(isGuessable("no-recommended")).toBe(true);
  expect(isGuessable("many-recommended")).toBe(true);
  expect(isGuessable("irreversible")).toBe(false);
  expect(isGuessable("multi-select")).toBe(false);
  expect(isGuessable("several-questions")).toBe(false);
});

test("a reply is an option's number; anything else fails closed", () => {
  expect(labelOfReply("2", question)).toBe("Postgres");
  expect(labelOfReply(" 1. ", question)).toBe("SQLite");
  expect(labelOfReply("ask", question)).toBeUndefined();
  expect(labelOfReply("0", question)).toBeUndefined();
  expect(labelOfReply("3", question)).toBeUndefined();
  expect(labelOfReply("", question)).toBeUndefined();
});

test("the request is cheap and bounded; the poll sits between markers", () => {
  const request = guessRequestOf(question);
  expect(request).toMatchObject({
    model: "haiku",
    effort: "low",
    maxTokens: 8,
  });
  expect(request.prompt).toBe(
    "<<<QUESTION\nWhich store?\n1. SQLite\n2. Postgres - server\nQUESTION>>>",
  );
});

const entry = (over: Partial<Entry>): Entry => ({
  ts: 1,
  question: "Which store?",
  options: ["SQLite", "Postgres"],
  pick: null,
  reason: "no-recommended",
  mode: "shadow",
  acted: false,
  gate: null,
  ...over,
});

test("a guess lands on the unstarred entry, also after the user answered (it never saw the answer)", () => {
  expect(guessed([entry({})], "Which store?", "SQLite")).toMatchObject([
    { pick: "SQLite", source: "model" },
  ]);
  expect(
    guessed([entry({ chosen: "Postgres" })], "Which store?", "SQLite"),
  ).toMatchObject([{ pick: "SQLite", source: "model", chosen: "Postgres" }]);
  const starred = [entry({ pick: "SQLite", reason: "recommended" })];
  expect(guessed(starred, "Which store?", "Postgres")).toEqual(starred);
});
