/** What the autopilot does with a poll: nothing, show a star, answer, or only record. */
export type AutopilotMode = "off" | "hint" | "auto" | "shadow";

/** What the autopilot has done in this session, kept across a hot reload. */
export interface AutopilotState {
  /** The session this belongs to; another id means a new session. */
  readonly sessionId: string;
  /** The mode `/autopilot` set for this session; null follows the config. */
  readonly mode: AutopilotMode | null;
  /** Answers given for the user so far in this session. */
  readonly answered: number;
  /** The texts of the questions answered so far, as the loop guard reads them. */
  readonly asked: readonly string[];
  /** The turn now running, from `turn.start`; null before the first one. */
  readonly turn: string | null;
  /** The turn of the last answer given, one answer a turn at most. */
  readonly answeredTurn: string | null;
}

declare module "claude-code" {
  interface PluginState {
    "agent-autopilot": {
      session: AutopilotState;
    };
  }
}
