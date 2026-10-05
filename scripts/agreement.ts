/**
 * Measures how often the star is what you picked, from the journals the
 * autopilot keeps in its store: `node scripts/agreement.ts [store.json ...]`.
 * Without arguments it reads every autopilot store under ~/.claude/plugins/store.
 */
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

import { linesOfReport, reportOf } from "../hooks/model/agreement.ts";
import { entriesOf } from "../hooks/model/journal.ts";

const ARGS_SKIPPED = 2;
const directory = path.join(homedir(), ".claude", "plugins", "store");
const given = process.argv.slice(ARGS_SKIPPED);
const stores =
  given.length > 0
    ? given
    : readdirSync(directory)
        .filter((name) => /^agent-autopilot_.*\.json$/u.test(name))
        .map((name) => path.join(directory, name));

const held = stores.flatMap((file) =>
  Object.entries(
    JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>,
  ).filter(([key]) => key.startsWith("log:")),
);
const entries = held.flatMap(([, raw]) => entriesOf(raw));
const lines = [
  `журналов: ${String(held.length)}`,
  ...linesOfReport(reportOf(entries)),
];
process.stdout.write(`${lines.join("\n")}\n`);
