import { expect, test } from "claude-code/testing";

const START = { cwd: "/w", surface: "terminal", isInteractive: true } as const;
const RUN = {
  command: "autopilot",
  args: "",
  origin: { kind: "composer" },
  presentation: { isFullscreen: true, columns: 160 },
} as const;

test("session start registers /autopilot, which answers", async ($, on) => {
  const registered: string[] = [];
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("command.register", (_$, e) => {
    registered.push(e.name);
    return { value: { command: e.name } };
  });
  await $.session.start(START);
  expect(registered).toEqual(["autopilot"]);
  const ran = await $.command.run(RUN);
  expect(ran).toMatchObject({
    text: expect.stringContaining("agent-autopilot"),
  });
});
