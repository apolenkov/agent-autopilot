/**
 * What the autopilot remembers of one session: the mode `/autopilot` set, how
 * many answers it gave, which questions, in which turn. Pure steps over the
 * state the hooks keep in `$.state`.
 */
import type { AutopilotMode, AutopilotState } from "../../types";
import type { Config } from "./config.ts";

/** Why an answer the rule would give is held back: the session's limits. */
export type GuardReason = "limit" | "repeat" | "same-turn";

const WHITESPACE = /\s+/gu;

// The loop guard compares questions as the eye does: not by spacing or case.
const normalized = (question: string): string =>
  question.trim().replaceAll(WHITESPACE, " ").toLowerCase();

/**
 * The state of a session that has just begun.
 * @param sessionId the session's id
 * @returns no mode of its own, nothing answered, no turn known
 */
export const initialOf = (sessionId: string): AutopilotState => ({
  sessionId,
  mode: null,
  answered: 0,
  asked: [],
  turn: null,
  answeredTurn: null,
});

/**
 * The state for the session that is running: a state kept by another session
 * (a `/clear`, a new run) is dropped, one of this session (a hot reload) stays.
 * @param state what `$.state` held
 * @param sessionId the running session's id
 * @returns the state to go on with
 */
export const forSession = (
  state: AutopilotState,
  sessionId: string,
): AutopilotState =>
  state.sessionId === sessionId ? state : initialOf(sessionId);

/**
 * The mode in force: the one `/autopilot` set for this session, else the config's.
 * @param state the session's state
 * @param config the user's config
 * @returns the mode
 */
export const modeOf = (state: AutopilotState, config: Config): AutopilotMode =>
  state.mode ?? config.mode;

/**
 * Whether the session's limits hold an answer back, the limit first.
 * @param state the session's state
 * @param config the limit
 * @param question the poll's question text
 * @returns `limit` when the answers are used up, `repeat` when this question
 *   was already answered here (a loop), `same-turn` when this turn was
 *   already answered (one a turn); undefined when it may be answered
 */
export const guardOf = (
  state: AutopilotState,
  config: Config,
  question: string,
): GuardReason | undefined => {
  const holds: readonly (readonly [GuardReason, boolean])[] = [
    ["limit", state.answered >= config.limit],
    ["repeat", state.asked.includes(normalized(question))],
    ["same-turn", state.turn !== null && state.answeredTurn === state.turn],
  ];
  return holds.find(([, isHeld]) => isHeld)?.[0];
};

/**
 * The state after an answer was given.
 * @param state the session's state
 * @param question the question that was answered
 * @returns the count up by one, the question and the turn remembered
 */
export const answered = (
  state: AutopilotState,
  question: string,
): AutopilotState => ({
  ...state,
  answered: state.answered + 1,
  asked: [...state.asked, normalized(question)],
  answeredTurn: state.turn,
});

/**
 * The state with a mode for this session.
 * @param state the session's state
 * @param mode the mode `/autopilot` set
 * @returns the state
 */
export const withMode = (
  state: AutopilotState,
  mode: AutopilotMode,
): AutopilotState => ({ ...state, mode });

/**
 * The state with the turn now running.
 * @param state the session's state
 * @param turn the id `turn.start` carried
 * @returns the state
 */
export const withTurn = (
  state: AutopilotState,
  turn: string,
): AutopilotState => ({ ...state, turn });
