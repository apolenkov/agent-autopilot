/**
 * The plan for one poll of the model: what to answer, what to show under the
 * dialog, what to write in the journal. Pure: the hook does the doing.
 */
import type { AutopilotMode, AutopilotState } from "../../types";
import type { Config } from "./config.ts";
import type { Entry } from "./journal.ts";
import { decide, optionsOf, type Question } from "./rule.ts";
import { guardOf, type GuardReason, modeOf } from "./session.ts";

/** The tool's result, as the output schema has it: the polls shown and the answers. */
interface AnswerResult {
  readonly questions: readonly Question[];
  readonly answers: Readonly<Record<string, string>>;
}

/** An answer given in the user's place, with the note the model reads after it. */
interface Answer {
  readonly result: AnswerResult;
  readonly context: readonly string[];
}

/** What the autopilot does with a poll; an empty plan is "leave it alone". */
export interface Plan {
  readonly answer?: Answer;
  /** The line to draw under the dialog the user still answers. */
  readonly notice?: string;
  /** What the journal gets, less the time. */
  readonly entry?: Omit<Entry, "ts">;
}

/** What a plan is made from. */
export interface Poll {
  readonly state: AutopilotState;
  readonly config: Config;
  readonly questions: readonly Question[];
}

type Seen = Readonly<{ question: Question; mode: AutopilotMode }>;

const entryOf = (
  { question, mode }: Seen,
  rest: Pick<Entry, "pick" | "reason" | "acted" | "gate">,
): Omit<Entry, "ts"> => ({
  question: question.question,
  options: optionsOf(question).map((option) => option.label),
  mode,
  ...rest,
});

const answered = (poll: Poll, seen: Seen, label: string): Plan => ({
  answer: {
    result: {
      questions: poll.questions,
      answers: { [seen.question.question]: label },
    },
    context: [`autopilot: ответил по правилу (Recommended): ${label}`],
  },
  entry: entryOf(seen, {
    pick: label,
    reason: "recommended",
    acted: true,
    gate: null,
  }),
});

// A loop, or a second answer in a turn: nothing shown, the user's alone. The
// limit and the hint show the star the autopilot would have answered with;
// shadow shows nothing but still writes the star down.
const held = (
  seen: Seen,
  label: string,
  why: Readonly<{ guard: GuardReason | undefined; limit: number }>,
): Plan => {
  const { guard, limit } = why;
  const isSilent = guard === "repeat" || guard === "same-turn";
  const stated =
    guard === "limit" ? `лимит ${String(limit)}, ★ ${label}` : `★ ${label}`;
  return {
    ...(!isSilent && seen.mode !== "shadow" && { notice: stated }),
    entry: entryOf(seen, {
      pick: isSilent ? null : label,
      reason: guard ?? "recommended",
      acted: false,
      gate: null,
    }),
  };
};

const pickPlan = (poll: Poll, seen: Seen, label: string): Plan => {
  const guard =
    seen.mode === "auto"
      ? guardOf(poll.state, poll.config, seen.question.question)
      : undefined;
  return guard === undefined && seen.mode === "auto"
    ? answered(poll, seen, label)
    : held(seen, label, { guard, limit: poll.config.limit });
};

const planFor = (poll: Poll, seen: Seen): Plan => {
  const decision = decide(poll.questions, poll.config);
  return decision.kind === "ask-human"
    ? {
        entry: entryOf(seen, {
          pick: null,
          reason: decision.reason,
          acted: false,
          gate: decision.gate ?? null,
        }),
      }
    : pickPlan(poll, seen, decision.label);
};

/**
 * Plans what to do with one poll.
 * @param poll the session's state, the config, the poll's questions
 * @returns off: nothing. A poll the rule leaves to the user: only its journal
 *   entry. A pick in hint, or in auto held back by a limit: the star as a
 *   notice, and the entry. A pick in auto within the limits: the answer, and
 *   the entry
 */
export const planOf = (poll: Poll): Plan => {
  const mode = modeOf(poll.state, poll.config);
  const [question] = poll.questions;
  return question === undefined || mode === "off"
    ? {}
    : planFor(poll, { question, mode });
};
