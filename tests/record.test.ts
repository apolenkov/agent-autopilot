import { describe, expect, test } from "claude-code/testing";

import { ask, poll, run, STARRED, START, turn } from "./fixtures/helpers.ts";
import { world } from "./fixtures/world.ts";

describe("it notes what the user answered", () => {
  test("hint: the user's pick lands on the poll's entry", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await turn($, "t1");
    seen.userAnswer = "Rethink";
    await ask($, [poll()]);
    expect(await run($, "last")).toContain(`★ «${STARRED}» → вы: «Rethink»`);
  });

  test("a poll of the user's alone is noted too", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await turn($, "t1");
    seen.userAnswer = "my own words";
    await ask($, [poll({ multiSelect: true })]);
    expect(await run($, "last")).toContain("→ вы: «my own words»");
  });

  test("auto: the autopilot's answer carries none", async ($, on) => {
    world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    await ask($, [poll()]);
    expect(await run($, "last")).not.toContain("→ вы");
  });
});

describe("shadow: records the star and the pick, shows nothing", () => {
  test("no notice, no answer, the entry gets star and pick", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "shadow");
    await turn($, "t1");
    seen.userAnswer = "Rethink";
    const result = await ask($, [poll()]);
    expect(result.text).toBe("the user answered");
    expect(seen.notices).toEqual([]);
    expect(seen.statuses.at(-1)).toBeUndefined();
    expect(seen.polls).toHaveLength(1);
    const shown = await run($, "last");
    expect(shown).toContain("записано [shadow]");
    expect(shown).not.toContain("★");
    expect(shown).not.toContain("Rethink");
  });

  test(
    "it never answers, past any limit",
    { options: { limit: 1 } },
    async ($, on) => {
      const seen = world(on);
      await $.session.start(START);
      await run($, "shadow");
      for (const id of ["a", "b", "c"]) {
        await turn($, id);
        await ask($, [poll({ question: `Q ${id}?` })]);
      }
      expect(seen.polls).toHaveLength(3);
      expect(seen.notices).toEqual([]);
    },
  );
});
