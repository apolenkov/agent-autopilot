import type { On } from "claude-code";
import { mock, type MockClock } from "claude-code/testing";

/** What the mocked world beneath the plugin saw, and what it answers. */
export interface World {
  /** The session's id; change it between two starts for a new session. */
  sessionId: string;
  /** What the user answers in the dialog (the bottom of the tool.call chain). */
  userAnswer: string;
  /** True: the dialog cannot be shown, as in a run with no one to ask. */
  isDialogShut: boolean;
  /** True: `$.session.id` throws, which breaks every hook of the plugin. */
  isBroken: boolean;
  /** True: the prompt box cannot take a note. */
  isPromptShut: boolean;
  /** True: the engine takes the suggestion but does not show it. */
  isSuggestHidden: boolean;
  /** True: the line under a dialog cannot be drawn. */
  isNoticeShut: boolean;
  /** The polls that reached the user: what the autopilot let through. */
  readonly polls: { questions: unknown; id: string }[];
  readonly registered: string[];
  readonly notices: (string | undefined)[];
  readonly statuses: (string | undefined)[];
  readonly suggested: string[];
  /** What the plugin's store holds, by key. */
  readonly store: Map<string, unknown>;
  /** The mocked clock: a guess runs on its timer. */
  readonly clock: MockClock;
  /** What haiku replies to a guess: a text, or "fail" for a rejection. */
  model: string;
  /** The prompts the model was asked, one per call. */
  readonly asked: string[];
}

/**
 * Answers every engine call the autopilot makes: the clock, the store, the
 * session, the line under a dialog, the status, the prompt box, and the
 * dialog itself, where "the user" answers with `userAnswer`.
 * @param on the test's registrar
 * @returns the world, to assert on and to steer
 */
export const world = (on: On): World => {
  const seen: World = {
    sessionId: "s1",
    userAnswer: "USER",
    isDialogShut: false,
    isBroken: false,
    isNoticeShut: false,
    isPromptShut: false,
    isSuggestHidden: false,
    polls: [],
    registered: [],
    notices: [],
    statuses: [],
    suggested: [],
    store: new Map<string, unknown>(),
    clock: mock.clock(on),
    model: "ask",
    asked: [],
  };
  on("store.get", (_$, e) => ({ value: seen.store.get(e.key) }));
  on("store.set", (_$, e) => {
    seen.store.set(e.key, e.value);
    return { value: undefined };
  });
  on("store.delete", (_$, e) => {
    seen.store.delete(e.key);
    return { value: undefined };
  });
  on("store.keys", () => ({
    value: Object.keys(Object.fromEntries(seen.store)),
  }));
  on("session.id", () => {
    if (seen.isBroken) {
      throw new Error("session.id is down");
    }
    return { value: seen.sessionId };
  });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("turn.start", (_$, e) => ({ turnId: e.turnId }));
  on("command.register", (_$, e) => {
    seen.registered.push(e.name);
    return { value: { command: e.name } };
  });
  on("ui.status", (_$, e) => {
    seen.statuses.push(e.text);
    return { value: undefined };
  });
  on("ui.notice", (_$, e) => {
    if (seen.isNoticeShut) {
      throw new Error("no dialog to draw under");
    }
    seen.notices.push(e.text);
    return { value: undefined };
  });
  on("prompt.suggest", (_$, e) => {
    if (seen.isPromptShut) {
      throw new Error("no prompt box");
    }
    seen.suggested.push(e.text);
    return { isShown: !seen.isSuggestHidden };
  });
  on("model.complete", (_$, e) => {
    seen.asked.push(e.prompt);
    const usage = {
      input_tokens: 300,
      output_tokens: 2,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    };
    return {
      value:
        seen.model === "fail"
          ? {
              isAnswered: false as const,
              reason: "api-error" as const,
              status: 529,
              error: "overloaded",
              usage,
            }
          : { isAnswered: true as const, text: seen.model, usage },
    };
  });
  on("tool.call", { tool: "AskUserQuestion" }, (_$, e) => {
    if (seen.isDialogShut) {
      throw new Error("nobody to ask");
    }
    seen.polls.push({ questions: e.questions, id: e.tool_use_id });
    return {
      result: {
        questions: e.questions,
        answers: Object.fromEntries(
          e.questions.map((one) => [one.question, seen.userAnswer]),
        ),
      },
      text: "the user answered",
    };
  });
  return seen;
};
