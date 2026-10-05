import { describe, expect, test } from "claude-code/testing";

import { ask, poll, run, STARRED, START, turn } from "./fixtures/helpers.ts";
import { world } from "./fixtures/world.ts";

describe("what it leaves alone", () => {
  test("mode off: nothing is drawn, nothing is written", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "off");
    const result = await ask($, [poll()]);
    expect(result.text).toBe("the user answered");
    expect(seen.notices).toEqual([]);
    expect(await run($, "last")).toContain("вопросов пока не было");
  });

  test(
    "another plugin's own ask is not the model's poll",
    {
      plugins: [
        {
          name: "other",
          register(on) {
            on("command.run", { command: "other-ask" }, async ($) => ({
              text: await $.ui.ask("Which?", ["A (Recommended)", "B"]),
            }));
          },
        },
      ],
    },
    async ($, on) => {
      const seen = world(on);
      await $.session.start(START);
      await run($, "auto");
      await turn($, "t1");
      const answer = await $.command.run({
        command: "other-ask",
        args: "",
        origin: { kind: "composer" },
        presentation: { isFullscreen: true, columns: 160 },
      });
      expect(answer.text).toBe("USER");
      expect(seen.polls).toHaveLength(1);
      expect(seen.notices).toEqual([]);
      expect(await run($, "last")).toContain("вопросов пока не было");
    },
  );

  test("a hook that breaks lets the poll through", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    seen.isBroken = true;
    const result = await ask($, [poll()]);
    expect(result.text).toBe("the user answered");
    expect(seen.polls).toHaveLength(1);
  });
});

describe("a session of its own", () => {
  test("auto does not outlive the session: a new one is back on the config", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    expect(seen.statuses.at(-1)).toBe("AP auto 0/5");
    seen.sessionId = "s2";
    await $.session.start(START);
    expect(seen.statuses.at(-1)).toBeUndefined();
    await turn($, "t1");
    await ask($, [poll()]);
    expect(seen.polls).toHaveLength(1);
    expect(seen.notices).toEqual([`autopilot: ★ ${STARRED}`]);
    expect(await run($, "status")).toContain("hint");
  });

  test("a hot reload (the same session starts again) keeps the mode and the count", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    await ask($, [poll()]);
    await $.session.start(START);
    expect(seen.statuses.at(-1)).toBe("AP auto 1/5");
  });

  test(
    "the journal is a ring of the session",
    { options: { logSize: 2 } },
    async ($, on) => {
      world(on);
      await $.session.start(START);
      for (const index of [1, 2, 3]) {
        await ask($, [poll({ question: `Poll ${String(index)}?` })]);
      }
      const last = await run($, "last");
      const lines = last?.split("\n") ?? [];
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain("Poll 2?");
      expect(lines[1]).toContain("Poll 3?");
    },
  );
});
