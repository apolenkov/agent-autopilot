import type { BuiltinToolResults } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { ask, poll, run, STARRED, START, turn } from "./fixtures/helpers.ts";
import { world } from "./fixtures/world.ts";

describe("it answers only the plain, starred, harmless poll", () => {
  test("irreversible: never answered, in any mode", async ($, on) => {
    const seen = world(on);
    const risky = poll({
      options: [
        { label: STARRED, description: "git push --force to origin" },
        { label: "Rethink" },
      ],
    });
    await $.session.start(START);
    for (const mode of ["off", "hint", "auto"]) {
      await run($, mode);
      await turn($, `t-${mode}`);
      const result = await ask($, [risky]);
      expect(result.text).toBe("the user answered");
    }
    expect(seen.polls).toHaveLength(3);
    expect(seen.notices).toEqual([]);
  });

  test("multi-select, kind text, kind number, two questions, Other: the user answers", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    const odd = [
      [poll({ multiSelect: true })],
      [poll({ kind: "text" })],
      [poll({ kind: "number" })],
      [poll(), poll({ question: "And then?" })],
      [
        poll({
          options: [{ label: "Fine" }, { label: "Other (Recommended)" }],
        }),
      ],
    ];
    for (const [index, questions] of odd.entries()) {
      await turn($, `t${String(index)}`);
      const result = await ask($, questions);
      expect(result.text).toBe("the user answered");
    }
    expect(seen.polls).toHaveLength(odd.length);
    expect(seen.notices).toEqual([]);
  });

  test("a text question has no options at all: the user answers, the journal says why", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    const bare = {
      question: "What name?",
      header: "Name",
      multiSelect: false,
      kind: "text",
    };
    const result = await ask($, [bare]);
    expect(result.text).toBe("the user answered");
    expect(seen.polls).toHaveLength(1);
    expect(await run($, "last")).toContain("вам: not-choice");
  });

  test("no (Recommended): the user answers; two of them: the user answers", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    const none = poll({ options: [{ label: "A" }, { label: "B" }] });
    const two = poll({
      question: "Another?",
      options: [{ label: "A (recommended)" }, { label: "B (Recommended)" }],
    });
    const first = await ask($, [none]);
    const second = await ask($, [two]);
    expect(first.text).toBe("the user answered");
    expect(second.text).toBe("the user answered");
    expect(seen.polls).toHaveLength(2);
  });
});

describe("hint", () => {
  test("a star under the dialog, the poll goes on unchanged", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    const result = await ask($, [poll()]);
    expect(seen.notices).toEqual([`★ ${STARRED}`]);
    expect(seen.polls).toHaveLength(1);
    expect(result.text).toBe("the user answered");
    expect(result).toMatchObject({
      result: { answers: { "How do we go on?": "USER" } },
    });
  });

  test("a notice that cannot be drawn does not stop the poll", async ($, on) => {
    const seen = world(on);
    seen.isNoticeShut = true;
    await $.session.start(START);
    const result = await ask($, [poll()]);
    expect(result.text).toBe("the user answered");
    expect(seen.polls).toHaveLength(1);
  });
});

describe("auto", () => {
  test("answers with result and context, never asks, counts, journals", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    expect(await run($, "auto")).toContain("не откатить");
    await turn($, "t1");
    const result = await ask($, [poll()]);
    expect(seen.polls).toEqual([]);
    expect(result).toMatchObject({
      result: { answers: { "How do we go on?": STARRED } },
      context: [`autopilot: ответил по правилу (Recommended): ${STARRED}`],
    });
    expect(seen.statuses.at(-1)).toBe("AP auto 1/5");
    expect(await run($, "last")).toContain(`ответил «${STARRED}»`);
    expect(await run($, "status")).toContain("1 из 5");
  });

  test("the answer is an option's own label and the result fits the output schema", async ($, on) => {
    world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    const shown = [poll()];
    const { result } = await ask($, shown);
    const output = result as BuiltinToolResults["AskUserQuestion"];
    expect(output.questions).toEqual(shown);
    const labels = [STARRED, "Rethink"];
    const answers = Object.entries(output.answers);
    expect(answers).toHaveLength(1);
    for (const [question, label] of answers) {
      expect(question).toBe("How do we go on?");
      expect(typeof label).toBe("string");
      expect(labels).toContain(label);
    }
  });

  test("the limit is five: the sixth poll is a hint, with a word on the limit", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    for (const index of [1, 2, 3, 4, 5]) {
      await turn($, `t${String(index)}`);
      await ask($, [poll({ question: `Poll ${String(index)}?` })]);
    }
    expect(seen.polls).toEqual([]);
    expect(seen.statuses.at(-1)).toBe("AP auto 5/5");
    await turn($, "t6");
    const result = await ask($, [poll({ question: "Poll 6?" })]);
    expect(result.text).toBe("the user answered");
    expect(seen.polls).toHaveLength(1);
    expect(seen.notices.at(-1)).toBe(`лимит 5, ★ ${STARRED}`);
  });

  test(
    "the limit is the user's to set",
    { options: { limit: 1 } },
    async ($, on) => {
      const seen = world(on);
      await $.session.start(START);
      await run($, "auto");
      await turn($, "t1");
      await ask($, [poll()]);
      await turn($, "t2");
      await ask($, [poll({ question: "Next?" })]);
      expect(seen.polls).toHaveLength(1);
    },
  );

  test("the same question again goes to the user, in silence", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    await ask($, [poll()]);
    await turn($, "t2");
    const again = await ask($, [poll({ question: "  how do we GO on?" })]);
    expect(again.text).toBe("the user answered");
    expect(seen.polls).toHaveLength(1);
    expect(seen.notices).toEqual([]);
    expect(await run($, "last")).toContain("вам: repeat");
  });

  test("a second poll in the same turn goes to the user; the next turn is free", async ($, on) => {
    const seen = world(on);
    await $.session.start(START);
    await run($, "auto");
    await turn($, "t1");
    await ask($, [poll()]);
    const second = await ask($, [poll({ question: "Second?" })]);
    expect(second.text).toBe("the user answered");
    expect(seen.polls).toHaveLength(1);
    await turn($, "t2");
    const third = await ask($, [poll({ question: "Third?" })]);
    expect(third.text).not.toBe("the user answered");
    expect(seen.polls).toHaveLength(1);
  });

  test(
    "the config can start a session in auto",
    { options: { mode: "auto" } },
    async ($, on) => {
      const seen = world(on);
      await $.session.start(START);
      expect(seen.statuses.at(-1)).toBe("AP auto 0/5");
      await turn($, "t1");
      await ask($, [poll()]);
      expect(seen.polls).toEqual([]);
    },
  );

  test(
    "the user's extra words keep a poll from being answered",
    { options: { mode: "auto", extraDeny: "billing" } },
    async ($, on) => {
      const seen = world(on);
      await $.session.start(START);
      await turn($, "t1");
      await ask($, [poll({ question: "Touch the billing tables?" })]);
      expect(seen.polls).toHaveLength(1);
    },
  );
});
