import { describe, expect, test } from "claude-code/testing";

import {
  ask,
  COMMAND,
  poll,
  run,
  STARRED,
  START,
  turn,
} from "./fixtures/helpers.ts";
import { world } from "./fixtures/world.ts";

describe("/autopilot", () => {
  test("session start registers it", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    expect(seen.registered).toEqual([COMMAND]);
  });

  test("status, the modes, a wrong word", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    expect(await run($, "")).toContain("hint");
    expect(await run($, "status")).toContain("из настроек");
    expect(await run($, "off")).toContain("off");
    expect(await run($, "status")).toContain("на эту сессию");
    expect(await run($, "hint")).toContain("hint");
    expect(seen.statuses.at(-1)).toBeUndefined();
    expect(await run($, "auto")).toContain("только в этой сессии");
    expect(await run($, "turbo")).toContain("status | off | hint | auto");
    expect(await run($, "constructor")).toContain("status | off | hint | auto");
  });

  test("ask: a different pick becomes a note for the prompt box", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    await ask($, [poll()]);
    seen.userAnswer = "Rethink";
    expect(await run($, "ask")).toContain("поправка");
    expect(seen.suggested).toEqual([
      `Поправка: на «How do we go on?» выбери «Rethink», не «${STARRED}»`,
    ]);
  });

  test("ask: the same pick needs no correction", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    await ask($, [poll()]);
    seen.userAnswer = STARRED;
    expect(await run($, "ask")).toContain("поправки нет");
    expect(seen.suggested).toEqual([]);
  });

  test("ask: nothing answered yet, and a surface with no dialog", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    expect(await run($, "ask")).toContain("автоответов в этой сессии не было");
    await run($, "auto");
    await turn($, "t1");
    await ask($, [poll()]);
    seen.isDialogShut = true;
    expect(await run($, "ask")).toContain("недоступен");
    expect(seen.suggested).toEqual([]);
  });
});
