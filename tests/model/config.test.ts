import { expect, test } from "claude-code/testing";

import { configOf } from "../../hooks/model/config.ts";

test("no options give the defaults: hint, five answers, a hundred entries", () => {
  expect(configOf({})).toEqual({
    mode: "hint",
    limit: 5,
    extraDeny: [],
    logSize: 100,
  });
});

test("options are read, words split on commas and trimmed", () => {
  expect(
    configOf({
      mode: "auto",
      limit: 3.7,
      extraDeny: " billing, force-push ,, a.b ",
      logSize: 20,
    }),
  ).toEqual({
    mode: "auto",
    limit: 3,
    extraDeny: ["billing", "force-push", "a.b"],
    logSize: 20,
  });
});

test("bad values fall back: unknown mode, limit under one, text for a number", () => {
  expect(
    configOf({ mode: "turbo", limit: 0, logSize: "many", extraDeny: 7 }),
  ).toEqual({ mode: "hint", limit: 5, extraDeny: [], logSize: 100 });
  expect(configOf({ limit: -2, logSize: NaN }).limit).toBe(5);
});

test("off is kept", () => {
  expect(configOf({ mode: "off" }).mode).toBe("off");
});
