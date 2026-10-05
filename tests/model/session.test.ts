import { expect, test } from "claude-code/testing";

import { configOf } from "../../hooks/model/config.ts";
import {
  answered,
  forSession,
  guardOf,
  initialOf,
  modeOf,
  withMode,
  withTurn,
} from "../../hooks/model/session.ts";

const CONFIG = configOf({ limit: 2 });

test("a new session starts with nothing", () => {
  expect(initialOf("s1")).toEqual({
    sessionId: "s1",
    mode: null,
    answered: 0,
    asked: [],
    turn: null,
    answeredTurn: null,
  });
});

test("the mode of a session wins over the config, and a new session drops it", () => {
  const set = withMode(initialOf("s1"), "auto");
  expect(modeOf(initialOf("s1"), CONFIG)).toBe("hint");
  expect(modeOf(set, CONFIG)).toBe("auto");
  expect(forSession(set, "s1")).toBe(set);
  expect(forSession(set, "s2")).toEqual(initialOf("s2"));
  expect(modeOf(forSession(set, "s2"), CONFIG)).toBe("hint");
});

test("an answer counts, remembers the question and the turn", () => {
  const state = answered(withTurn(initialOf("s1"), "t1"), "  Which  Way? ");
  expect(state).toMatchObject({
    answered: 1,
    asked: ["which way?"],
    answeredTurn: "t1",
  });
});

test("the limit holds the answers back", () => {
  const one = answered(initialOf("s1"), "a?");
  const two = answered(withTurn(one, "t2"), "b?");
  expect(guardOf(one, CONFIG, "c?")).toBeUndefined();
  expect(guardOf(two, CONFIG, "c?")).toBe("limit");
});

test("the same question again is a loop, however it is spaced or cased", () => {
  const state = answered(initialOf("s1"), "Which way?");
  expect(guardOf(withTurn(state, "t2"), CONFIG, "which   WAY?")).toBe("repeat");
  expect(guardOf(withTurn(state, "t2"), CONFIG, "Another?")).toBeUndefined();
});

test("a second answer in one turn is held back, the next turn is free", () => {
  const state = answered(withTurn(initialOf("s1"), "t1"), "a?");
  expect(guardOf(state, CONFIG, "b?")).toBe("same-turn");
  expect(guardOf(withTurn(state, "t2"), CONFIG, "b?")).toBeUndefined();
});

test("an unknown turn does not hold an answer back", () => {
  const state = answered(initialOf("s1"), "a?");
  expect(guardOf(state, CONFIG, "b?")).toBeUndefined();
});
