import { expect, test } from "claude-code/testing";

import { commandOf } from "../../hooks/model/command.ts";

test("the words of the command", () => {
  expect(commandOf("")).toEqual({ kind: "status" });
  expect(commandOf("  Status ")).toEqual({ kind: "status" });
  expect(commandOf("last")).toEqual({ kind: "last" });
  expect(commandOf("ask")).toEqual({ kind: "ask" });
  expect(commandOf("OFF")).toEqual({ kind: "mode", mode: "off" });
  expect(commandOf("hint")).toEqual({ kind: "mode", mode: "hint" });
  expect(commandOf("auto")).toEqual({ kind: "mode", mode: "auto" });
});

test("anything else is usage, an object's own names too", () => {
  expect(commandOf("turbo")).toEqual({ kind: "usage" });
  expect(commandOf("auto now")).toEqual({ kind: "usage" });
  expect(commandOf("constructor")).toEqual({ kind: "usage" });
  expect(commandOf("__proto__")).toEqual({ kind: "usage" });
});
