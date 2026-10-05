/** What the autopilot has done in this session, kept across a hot reload. */
export interface AutopilotState {
  /** Answers given for the user so far in this session. */
  readonly answered: number;
}

declare module "claude-code" {
  interface PluginState {
    "agent-autopilot": {
      session: AutopilotState;
    };
  }
}
