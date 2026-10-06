import {
  describe,
  type Engine,
  expect,
  type MockClock,
  test,
} from "claude-code/testing";

import type { Entry } from "../hooks/model/journal.ts";
import { ask, poll, run, STARRED, START, turn } from "./fixtures/helpers.ts";
import { type World, world } from "./fixtures/world.ts";

// The guess runs on a timer after the poll: move the clock, let it finish.
const settle = async (clock: MockClock): Promise<void> => {
  await clock.advance(0);
  await clock.settle();
  await clock.settle();
};

const PLAIN = poll({
  options: [
    { label: "Use SQLite", description: "one file" },
    { label: "Use Postgres", description: "a server" },
  ],
});

const journal = (seen: World): readonly Entry[] =>
  (seen.store.get("log:s1") ?? []) as readonly Entry[];

const open = async ($: Engine, mode: string): Promise<void> => {
  await $.session.start(START);
  await run($, mode);
  await turn($, "t1");
};

describe("shadow: the model guesses a poll with no star, writing it down only", () => {
  test("the guess is journaled apart; the poll still reaches the user alone", async ($, on) => {
    const seen = world(on);
    seen.model = "2";
    await open($, "shadow");
    seen.userAnswer = "Use Postgres";
    await ask($, [PLAIN]);
    await settle(seen.clock);
    const [entry] = journal(seen);
    expect(entry).toMatchObject({
      pick: "Use Postgres",
      source: "model",
      chosen: "Use Postgres",
      acted: false,
    });
    expect(seen.polls).toHaveLength(1);
    expect(seen.notices.filter((one) => one !== undefined)).toEqual([]);
  });

  test("ask, a word, a number out of range, a failure: no guess", async ($, on) => {
    const seen = world(on);
    await open($, "shadow");
    for (const reply of ["ask", "maybe", "7", "fail"]) {
      seen.model = reply;
      await ask($, [PLAIN]);
      await settle(seen.clock);
    }
    expect(seen.asked).toHaveLength(4);
    for (const entry of journal(seen)) {
      expect(entry.pick).toBeNull();
      expect(entry.source).toBeUndefined();
    }
    expect(seen.polls).toHaveLength(4);
  });

  test("a starred poll, a multi-select, an irreversible one: the model is not asked", async ($, on) => {
    const seen = world(on);
    seen.model = "1";
    await open($, "shadow");
    await ask($, [poll()]);
    await ask($, [poll({ ...PLAIN, multiSelect: true })]);
    await ask($, [
      poll({
        options: [
          { label: "Push", description: "git push --force to main" },
          { label: "Wait", description: "later" },
        ],
      }),
    ]);
    await settle(seen.clock);
    expect(seen.asked).toEqual([]);
    expect(journal(seen).every((entry) => entry.source === undefined)).toBe(
      true,
    );
    expect(STARRED).toContain("Recommended");
  });

  test("hint mode and the guess switched off: the model is not asked", async ($, on) => {
    const seen = world(on);
    await open($, "hint");
    await ask($, [PLAIN]);
    await settle(seen.clock);
    expect(seen.asked).toEqual([]);
  });
});

describe("the guess switched off", () => {
  test(
    "guess: false never asks",
    { options: { guess: false } },
    async ($, on) => {
      const seen = world(on);
      await open($, "shadow");
      await ask($, [PLAIN]);
      await settle(seen.clock);
      expect(seen.asked).toEqual([]);
    },
  );
});
