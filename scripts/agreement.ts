/**
 * Measures how often the star is what you picked, from the journals the
 * autopilot keeps in its store: `node scripts/agreement.ts [--line] [--exclude=<id>] [store.json ...]`.
 * `--line` prints only the one-line summary of the blind (shadow) measure
 * (`--line --model`: the model's guesses instead, kept apart from the rule's);
 * `--exclude=<id>` leaves out the sessions whose id starts with it (repeatable),
 * for polls that would taint the measure, e.g. a session that always starred the first option.
 * Without arguments it reads every autopilot store under ~/.claude/plugins/store.
 */
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

import {
  lineOfReport,
  linesOfReport,
  reportOf,
  sessionsOf,
} from "../hooks/model/agreement.ts";
import { entriesOf, type Entry } from "../hooks/model/journal.ts";

const ARGS_SKIPPED = 2;
const directory = path.join(homedir(), ".claude", "plugins", "store");
const args = process.argv.slice(ARGS_SKIPPED);
const isLine = args.includes("--line");
const isModelLine = args.includes("--model");
const EXCLUDE = "--exclude=";
const excluded = args
  .filter((argument) => argument.startsWith(EXCLUDE))
  .map((argument) => `log:${argument.slice(EXCLUDE.length)}`);
const given = args.filter(
  (argument) =>
    argument !== "--line" &&
    argument !== "--model" &&
    !argument.startsWith(EXCLUDE),
);
const stores =
  given.length > 0
    ? given
    : readdirSync(directory)
        .filter((name) => /^agent-autopilot_.*\.json$/u.test(name))
        .map((name) => path.join(directory, name));

const held = stores.flatMap((file) =>
  Object.entries(
    JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>,
  ).filter(
    ([key]) =>
      key.startsWith("log:") &&
      excluded.every((prefix) => !key.startsWith(prefix)),
  ),
);
const entries = held.flatMap(([, raw]) => entriesOf(raw));
// The model's guesses (TASK-330) are kept apart: the rule's measure stays clean.
const isModel = (entry: Entry): boolean => entry.source === "model";
const isBlind = (entry: Entry): boolean =>
  entry.mode === "shadow" && !isModel(entry);
const blind = entries.filter((entry) => isBlind(entry));
const sessions = sessionsOf(
  held.map(([, raw]) => entriesOf(raw).filter((entry) => isBlind(entry))),
);
const line = lineOfReport(reportOf(blind), sessions);
const guesses = entries.filter((entry) => isModel(entry));
const guessLine = lineOfReport(
  reportOf(guesses),
  sessionsOf(
    held.map(([, raw]) => entriesOf(raw).filter((entry) => isModel(entry))),
  ),
  "замер модели 330",
);
const lines = isLine
  ? [isModelLine ? guessLine : line]
  : [
      `журналов: ${String(held.length)}`,
      "== ЗАМЕР (shadow: ★ человеку не показан) ==",
      line,
      ...linesOfReport(reportOf(blind)),
      "== МОДЕЛЬ (haiku угадывает опросы без ★, тоже вслепую) ==",
      guessLine,
      ...linesOfReport(reportOf(guesses)),
      "== ПОТОЛОК (hint и auto: ★ был на экране, вывода не даёт) ==",
      ...linesOfReport(reportOf(entries.filter((entry) => !isBlind(entry)))),
    ];
process.stdout.write(`${lines.join("\n")}\n`);
