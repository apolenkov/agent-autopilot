/**
 * The mod's `userConfig` values, checked and defaulted.
 */
import type { PluginOptions } from "claude-code";

import type { AutopilotMode } from "../../types";

const MODES: readonly AutopilotMode[] = ["off", "hint", "auto", "shadow"];
const DEFAULTS = { limit: 5, logSize: 100 } as const;

/** What the hooks read from the options. */
export interface Config {
  readonly mode: AutopilotMode;
  /** Most answers given for the user in one session, at least one. */
  readonly limit: number;
  /** Words that send a poll to the user, beside the built-in ones. */
  readonly extraDeny: readonly string[];
  /** Entries of the journal kept per session, at least one. */
  readonly logSize: number;
}

const whole = (options: PluginOptions, key: keyof typeof DEFAULTS): number => {
  const value = options[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : DEFAULTS[key];
};

const modeOf = (value: unknown): AutopilotMode =>
  MODES.find((mode) => mode === value) ?? "hint";

const wordsOf = (value: unknown): readonly string[] =>
  typeof value === "string"
    ? value
        .split(",")
        .map((word) => word.trim())
        .filter((word) => word !== "")
    : [];

/**
 * The config from the options `register` receives.
 * @param options the plugin's `userConfig` values
 * @returns the config: an unknown mode is hint, a bad number its default
 */
export const configOf = (options: PluginOptions): Config => ({
  mode: modeOf(options["mode"]),
  limit: whole(options, "limit"),
  extraDeny: wordsOf(options["extraDeny"]),
  logSize: whole(options, "logSize"),
});
