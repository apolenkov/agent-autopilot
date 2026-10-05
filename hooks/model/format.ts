/**
 * The words the user reads: the status line and the `/autopilot` answers.
 */
import type { AutopilotMode, AutopilotState } from "../../types";
import type { Config } from "./config.ts";
import { type Entry, lastOf, linesOf } from "./journal.ts";
import { modeOf } from "./session.ts";

/** How many journal lines `/autopilot status` shows. */
export const STATUS_LINES = 3;
/** How many journal lines `/autopilot last` shows. */
export const LAST_LINES = 10;

/** What `/autopilot` with a wrong word says. */
export const USAGE =
  "autopilot: /autopilot status | off | hint | auto | last | ask";

/**
 * The status line: only `auto` shows one, as it is the mode that acts.
 * @param mode the mode in force
 * @param state the session's state
 * @param config the limit
 * @returns `AP auto 2/5`, or undefined to take the line off
 */
export const statusLineOf = (
  mode: AutopilotMode,
  state: AutopilotState,
  config: Config,
): string | undefined =>
  mode === "auto"
    ? `AP auto ${String(state.answered)}/${String(config.limit)}`
    : undefined;

const MODE_TEXT: Readonly<Record<AutopilotMode, string>> = {
  off: "off: вопросы не трогает",
  hint: "hint: ★ у рекомендованного варианта, отвечаете вы",
  auto: "auto: отвечает за вас, только в этой сессии",
};

/**
 * What `/autopilot status` says.
 * @param state the session's state
 * @param config the config
 * @param entries the journal, oldest first
 * @returns the mode, the count against the limit, the newest entries
 */
export const statusTextOf = (
  state: AutopilotState,
  config: Config,
  entries: readonly Entry[],
): string => {
  const mode = modeOf(state, config);
  const source = state.mode === null ? "из настроек" : "на эту сессию";
  const recent = linesOf(lastOf(entries, STATUS_LINES));
  return [
    `autopilot ${MODE_TEXT[mode]} (${source})`,
    `автоответов в сессии: ${String(state.answered)} из ${String(config.limit)}`,
    ...(recent.length === 0 ? ["вопросов пока не было"] : recent),
  ].join("\n");
};

/**
 * What `/autopilot last` says.
 * @param entries the journal, oldest first
 * @returns the newest entries, one a line
 */
export const lastTextOf = (entries: readonly Entry[]): string =>
  entries.length === 0
    ? "autopilot: вопросов пока не было"
    : linesOf(lastOf(entries, LAST_LINES)).join("\n");

/**
 * What `/autopilot <mode>` says once the mode is set.
 * @param mode the mode just set
 * @returns the new mode; for `auto` the plain truth that nothing is undone
 */
export const modeSetTextOf = (mode: AutopilotMode): string =>
  mode === "auto"
    ? "autopilot: auto только в этой сессии. Отвечает на вопрос, где ровно один вариант помечен (Recommended) и нет признаков необратимого. Данный ответ не откатить: /autopilot last покажет их, /autopilot ask поправит последний, /autopilot hint остановит."
    : `autopilot: ${MODE_TEXT[mode]}`;

/**
 * The note `/autopilot ask` puts in the prompt after a correction.
 * @param question the poll's question
 * @param chosen the option the user now picks
 * @param picked the option the autopilot had answered
 * @returns the line to suggest
 */
export const correctionOf = (
  question: string,
  chosen: string,
  picked: string,
): string => `Поправка: на «${question}» выбери «${chosen}», не «${picked}»`;
