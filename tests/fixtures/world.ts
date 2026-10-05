import type { On } from "claude-code";
import { mock } from "claude-code/testing";

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
  /** True: the line under a dialog cannot be drawn. */
  isNoticeShut: boolean;
  /** The polls that reached the user: what the autopilot let through. */
  readonly polls: { questions: unknown; id: string }[];
  readonly registered: string[];
  readonly notices: (string | undefined)[];
  readonly statuses: (string | undefined)[];
  readonly suggested: string[];
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
    polls: [],
    registered: [],
    notices: [],
    statuses: [],
    suggested: [],
  };
  mock.clock(on);
  mock.store(on);
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
    return { isShown: true };
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
