/**
 * What the user typed after `/autopilot`.
 */
import type { AutopilotMode } from "../../types";

/** A reading of the command's arguments. */
export type Command =
  | Readonly<{ kind: "status" | "last" | "ask" | "usage" }>
  | Readonly<{ kind: "mode"; mode: AutopilotMode }>;

// A Map, not an object: a typed `constructor` is no command.
const WORDS = new Map<string, Command>([
  ["", { kind: "status" }],
  ["status", { kind: "status" }],
  ["last", { kind: "last" }],
  ["ask", { kind: "ask" }],
  ["off", { kind: "mode", mode: "off" }],
  ["hint", { kind: "mode", mode: "hint" }],
  ["auto", { kind: "mode", mode: "auto" }],
]);

/**
 * Reads the arguments of `/autopilot`.
 * @param args what was typed after the command
 * @returns the command; anything unknown is `usage`
 */
export const commandOf = (args: string): Command =>
  WORDS.get(args.trim().toLowerCase()) ?? { kind: "usage" };
