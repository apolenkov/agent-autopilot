/**
 * agent-autopilot: answers AskUserQuestion polls for you only when the
 * assistant starred exactly one option "(Recommended)" and nothing in the
 * poll names an irreversible act. By default it only shows a star (hint).
 * Any error in a hook lets the poll through to you.
 */
import type {
  EngineInterface,
  Register,
  ToolCallInput,
  ToolCallResult,
} from "claude-code";
import { atom, read, update } from "claude-code";

import type { AutopilotMode, AutopilotState } from "../types";
import { commandOf } from "./model/command.ts";
import { type Config, configOf } from "./model/config.ts";
import {
  correctionOf,
  DIALOG_SHUT,
  lastTextOf,
  modeSetTextOf,
  statusLineOf,
  statusTextOf,
  USAGE,
} from "./model/format.ts";
import { appended, entriesOf, type Entry, keyOf } from "./model/journal.ts";
import { planOf } from "./model/plan.ts";
import {
  answered,
  forSession,
  initialOf,
  modeOf,
  withMode,
  withTurn,
} from "./model/session.ts";

type Engine = Readonly<EngineInterface>;
type PollInput = Extract<ToolCallInput, { tool: "AskUserQuestion" }>;

const COMMAND = "autopilot";
const HEADER = "Поправка";
// The initial names no session, so the first read in any session starts it fresh.
const sessionAtom = atom(
  { plugin: "agent-autopilot", key: "session" } as const,
  initialOf(""),
);

const stateOf = async ($: Engine): Promise<AutopilotState> =>
  forSession(await read($, sessionAtom), await $.session.id());

const change = async (
  $: Engine,
  step: (state: AutopilotState) => AutopilotState,
): Promise<AutopilotState> => {
  const sessionId = await $.session.id();
  const apply = (held: AutopilotState): AutopilotState =>
    step(forSession(held, sessionId));
  return update($, sessionAtom, apply);
};

const journalOf = async ($: Engine): Promise<readonly Entry[]> => {
  const key = keyOf(await $.session.id());
  return entriesOf(await $.store.get(key));
};

const record = async (
  $: Engine,
  config: Config,
  entry: Omit<Entry, "ts">,
): Promise<void> => {
  const key = keyOf(await $.session.id());
  const held = await $.store.get(key);
  const full = { ...entry, ts: await $.clock.now() };
  await $.store.set(key, appended(held, full, config.logSize));
};

// The line under the dialog is a courtesy: the poll goes on without it.
const noticed = ($: Engine, id: string, text: string | undefined): void => {
  try {
    if (text !== undefined) {
      $.ui.notice(id, text);
    }
  } catch {
    // Nothing to tell: the dialog is gone or the surface draws no notices.
  }
};

// What the poll is answered with, when the autopilot answers it: the tool's
// result, and the note the model reads after it.
const pollResult = async (
  $: Engine,
  config: Config,
  e: Readonly<PollInput>,
): Promise<ToolCallResult | undefined> => {
  const plan = planOf({
    state: await stateOf($),
    config,
    questions: e.questions,
  });
  noticed($, e.tool_use_id, plan.notice);
  const asked = plan.entry?.question;
  if (asked !== undefined && plan.answer !== undefined) {
    const after = await change($, (held) => answered(held, asked));
    $.ui.status(statusLineOf("auto", after, config));
  }
  if (plan.entry !== undefined) {
    await record($, config, plan.entry);
  }
  return plan.answer;
};

// Any error means the user sees the poll: the one `next(e)` is the caller's.
const answerOf = async (
  $: Engine,
  config: Config,
  e: Readonly<PollInput>,
): Promise<ToolCallResult | undefined> => {
  try {
    return await pollResult($, config, e);
  } catch {
    return undefined;
  }
};

// A hook that cannot do its bookkeeping must still let the work go on.
const quietly = async (work: Promise<unknown>): Promise<void> => {
  try {
    await work;
  } catch {
    // Nothing to tell: the user sees the poll and the session goes on.
  }
};

const start = async ($: Engine, config: Config): Promise<void> => {
  await $.command.register({
    name: COMMAND,
    description:
      "Autopilot for AskUserQuestion polls: status, off|hint|auto, last, ask",
    immediate: true,
  });
  const state = await stateOf($);
  $.ui.status(statusLineOf(modeOf(state, config), state, config));
};

const setMode = async (
  $: Engine,
  config: Config,
  mode: AutopilotMode,
): Promise<string> => {
  const state = await change($, (held) => withMode(held, mode));
  $.ui.status(statusLineOf(mode, state, config));
  return modeSetTextOf(mode);
};

// The poll is put to the user once more, in the engine's own dialog, over the
// options the autopilot chose from; a different pick becomes a note in the
// prompt box, for the user to send.
const correct = async ($: Engine): Promise<string> => {
  const entries = await journalOf($);
  const last = entries.findLast((entry) => entry.acted);
  const picked = last?.pick;
  if (last === undefined || picked === null || picked === undefined) {
    return "autopilot: автоответов в этой сессии не было";
  }
  try {
    const chosen = await $.ui.ask(last.question, {
      options: last.options,
      header: HEADER,
    });
    if (chosen === picked) {
      return `autopilot: «${chosen}», как и ответил автопилот, поправки нет`;
    }
    const note = correctionOf(last.question, chosen, picked);
    const { isShown } = await $.prompt.suggest({ text: note });
    // The engine shows no suggestion while a turn runs or headless.
    return isShown
      ? "autopilot: поправка лежит в строке ввода, отправьте её"
      : `autopilot: строка ввода занята, отправьте поправку сами: ${note}`;
  } catch {
    return DIALOG_SHUT;
  }
};

const commandText = async (
  $: Engine,
  config: Config,
  args: string,
): Promise<string> => {
  const command = commandOf(args);
  switch (command.kind) {
    case "status": {
      return statusTextOf(await stateOf($), config, await journalOf($));
    }
    case "last": {
      return lastTextOf(await journalOf($));
    }
    case "ask": {
      return correct($);
    }
    case "mode": {
      return setMode($, config, command.mode);
    }
    case "usage": {
      return USAGE;
    }
  }
};

/**
 * Wires agent-autopilot's hooks.
 * @param on the registrar
 * @param options the `userConfig` values
 */
export const register: Register = (on, options) => {
  const config = configOf(options);
  on("session.start", async ($, e, next) => {
    const started = await next(e);
    await quietly(start($, config));
    return started;
  });
  // ponytail: `turn.start` may also fire for a subagent's loop, which lets the
  // one-per-turn guard through; check live, no fix in v1.
  on("turn.start", async ($, e, next) => {
    await quietly(change($, (state) => withTurn(state, e.turnId)));
    return next(e);
  });
  on("tool.call", { tool: "AskUserQuestion" }, async ($, e, next) => {
    // Another plugin's `$.ui.ask` is its own business, not the model's poll.
    const isModel =
      next.origin.plugin === "engine" && next.origin.tier === "core";
    const answer = isModel ? await answerOf($, config, e) : undefined;
    return answer ?? next(e);
  });
  on("command.run", { command: COMMAND }, async ($, e) => ({
    text: await commandText($, config, e.args),
  }));
};
