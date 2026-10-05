/**
 * The journal: one entry for every poll the autopilot looked at, kept as a
 * ring per session so `/autopilot last` can show what it did and why.
 */
import type { AutopilotMode } from "../../types";
import type { AskReason } from "./rule.ts";
import type { GuardReason } from "./session.ts";

/** The reason of an entry: the rule's pick, or why a poll went to the user. */
type Reason = "recommended" | AskReason | GuardReason;

/** One poll the autopilot looked at. */
export interface Entry {
  readonly ts: number;
  readonly question: string;
  /** The labels of the options, as shown. */
  readonly options: readonly string[];
  /** The label the rule chose or starred; null when the poll went to the user. */
  readonly pick: string | null;
  readonly reason: Reason;
  readonly mode: AutopilotMode;
  /** True when the autopilot answered, false when the user still did. */
  readonly acted: boolean;
  /** The text that tripped the irreversible gate; null when none did. */
  readonly gate: string | null;
}

const TEXT_MAX = 200;
const SHOWN_MAX = 60;
const TIME_FROM = 11;
const TIME_TO = 19;

/**
 * The store key of a session's journal.
 * @param sessionId the session's id
 * @returns `log:<sessionId>`
 */
export const keyOf = (sessionId: string): string => `log:${sessionId}`;

const cut = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const isEntry = (value: unknown): value is Entry =>
  typeof value === "object" &&
  value !== null &&
  "ts" in value &&
  typeof value.ts === "number" &&
  "question" in value &&
  typeof value.question === "string" &&
  "acted" in value &&
  typeof value.acted === "boolean";

/**
 * Reads a journal back from the store.
 * @param raw what `$.store.get` gave: anything, as the store holds JSON
 * @returns the entries that look like entries, oldest first
 */
export const entriesOf = (raw: unknown): readonly Entry[] =>
  Array.isArray(raw) ? (raw as readonly unknown[]).filter(isEntry) : [];

/**
 * Adds an entry to a journal, dropping the oldest past the size.
 * @param raw the journal as the store holds it
 * @param entry the new entry; its texts are cut to a sane length
 * @param size the most entries kept
 * @returns the journal to store
 */
export const appended = (
  raw: unknown,
  entry: Entry,
  size: number,
): readonly Entry[] =>
  [
    ...entriesOf(raw),
    {
      ...entry,
      question: cut(entry.question, TEXT_MAX),
      options: entry.options.map((label) => cut(label, TEXT_MAX)),
    },
  ].slice(-size);

/**
 * The newest entries.
 * @param entries a journal, oldest first
 * @param count how many
 * @returns at most `count`, oldest first
 */
export const lastOf = (
  entries: readonly Entry[],
  count: number,
): readonly Entry[] => entries.slice(-count);

const gateNote = (entry: Entry): string =>
  entry.gate === null ? "" : ` (${entry.gate})`;

const reasonNote = (entry: Entry): string =>
  entry.reason === "recommended" ? "" : ` (${entry.reason})`;

const outcomeOf = (entry: Entry): string => {
  const { pick } = entry;
  const kept = entry.acted
    ? `ответил «${String(pick)}»`
    : `★ «${String(pick)}»${reasonNote(entry)}`;
  return pick === null ? `вам: ${entry.reason}${gateNote(entry)}` : kept;
};

/**
 * Entries as lines for the user.
 * @param entries the entries to show
 * @returns for each: time (UTC), the question, what was done with it, the mode
 */
export const linesOf = (entries: readonly Entry[]): readonly string[] =>
  entries.map(
    (entry) =>
      `${new Date(entry.ts).toISOString().slice(TIME_FROM, TIME_TO)} «${cut(entry.question, SHOWN_MAX)}» ${outcomeOf(entry)} [${entry.mode}]`,
  );
