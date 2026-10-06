/**
 * The rule: an AskUserQuestion poll is answered only when it is one plain
 * choice, exactly one option is starred "(Recommended)", and nothing in it
 * names an irreversible act. Everything else goes to the user.
 */
import type { Config } from "./config.ts";
import { irreversibleIn } from "./gate.ts";

/** One choice of a poll, as the tool shows it. */
interface Option {
  readonly label: string;
  readonly description?: string | undefined;
  readonly preview?: string | undefined;
}

/**
 * One question of a poll. `kind` and `description` are not in the tool's
 * input type, only in its output type: read them at run time.
 */
export interface Question {
  readonly question: string;
  readonly header?: string | undefined;
  /** Absent on a text or number question. */
  readonly options?: readonly Option[] | undefined;
  readonly multiSelect?: boolean | undefined;
  readonly kind?: unknown;
  readonly description?: unknown;
}

/** Why a poll goes to the user: the journal's closed list of reasons. */
export type AskReason =
  | "several-questions"
  | "multi-select"
  | "not-choice"
  | "few-options"
  | "no-recommended"
  | "many-recommended"
  | "other"
  | "irreversible";

/** What to do with a poll: leave it to the user, or answer with an option. */
export type Decision =
  | Readonly<{
      kind: "ask-human";
      reason: AskReason;
      /** The text that tripped the gate, when the reason is `irreversible`. */
      gate?: string;
    }>
  | Readonly<{ kind: "pick"; label: string }>;

const MIN_OPTIONS = 2;

/**
 * The options of a question.
 * @param question the question
 * @returns its options; a text or number question has none
 */
export const optionsOf = (question: Question): readonly Option[] =>
  question.options ?? [];
// Claude Code's own convention, not the API's: `(Recommended)`, `(рекомендую)`.
const RECOMMENDED = /recommend|рекоменд/iu;
// "(not recommended)", "не рекомендую": a warning, not a star.
const NEGATED = /\b(?:not|non|un)[\s-]*recommend|(?<!\p{L})не\s*рекоменд/iu;
// An option that stands for "something else": no label to answer with.
const OTHER = /^\s*(?:other|другое|иное|свой вариант)/iu;

const isStar = (label: string): boolean =>
  RECOMMENDED.test(label) && !NEGATED.test(label);

const starredOf = (question: Question): readonly number[] =>
  optionsOf(question)
    .map((option, index) => (isStar(option.label) ? index : -1))
    .filter((index) => index !== -1);

const labelOfStar = (question: Question): string =>
  optionsOf(question)[starredOf(question)[0] ?? -1]?.label ?? "";

// In order: the first that holds is the reason. `other` is last, as it reads
// the one starred option, which the two before it make sure there is.
const CHECKS: readonly (readonly [
  AskReason,
  (question: Question) => boolean,
])[] = [
  ["multi-select", (question) => question.multiSelect === true],
  [
    "not-choice",
    (question) => question.kind !== undefined && question.kind !== "choice",
  ],
  ["few-options", (question) => optionsOf(question).length < MIN_OPTIONS],
  ["no-recommended", (question) => starredOf(question).length === 0],
  ["many-recommended", (question) => starredOf(question).length > 1],
  ["other", (question) => OTHER.test(labelOfStar(question))],
];

// The whole poll is read: a star on a harmless label does not hide a
// `git push --force` in its description.
const textsOf = (question: Question): readonly string[] => [
  question.question,
  question.header ?? "",
  typeof question.description === "string" ? question.description : "",
  ...optionsOf(question).flatMap((option) => [
    option.label,
    option.description ?? "",
    option.preview ?? "",
  ]),
];

/**
 * The irreversible word a poll carries anywhere in its text.
 * @param question the poll's question
 * @param config the user's extra words
 * @returns the text that tripped the gate; undefined when none did
 */
export const gateOfPoll = (
  question: Question,
  config: Config,
): string | undefined => irreversibleIn(textsOf(question), config.extraDeny);

const pickOf = (question: Question, config: Config): Decision => {
  const gate = gateOfPoll(question, config);
  return gate === undefined
    ? { kind: "pick", label: labelOfStar(question) }
    : { kind: "ask-human", reason: "irreversible", gate };
};

const choiceOf = (question: Question, config: Config): Decision => {
  const refusal = CHECKS.find(([, holds]) => holds(question));
  return refusal === undefined
    ? pickOf(question, config)
    : { kind: "ask-human", reason: refusal[0] };
};

/**
 * Decides what to do with a poll.
 * @param questions the questions of one AskUserQuestion call
 * @param config the user's extra words for the gate
 * @returns `pick` with the starred option's own label and place, only for one
 *   plain single-choice question with exactly one `(Recommended)` option and
 *   no irreversible word anywhere in it; else `ask-human` with the reason
 */
export const decide = (
  questions: readonly Question[],
  config: Config,
): Decision => {
  const [question] = questions;
  return question !== undefined && questions.length === 1
    ? choiceOf(question, config)
    : { kind: "ask-human", reason: "several-questions" };
};
