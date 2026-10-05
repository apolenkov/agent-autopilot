/**
 * agent-autopilot: answers AskUserQuestion polls for you only when the
 * assistant marked one option (Recommended) and nothing looks irreversible.
 * Scaffold: it registers `/autopilot` and does nothing else yet.
 */
import type { Register } from "claude-code";

const COMMAND = "autopilot";

/**
 * Wires agent-autopilot's hooks.
 * @param on the registrar
 */
export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    const started = await next(e);
    await $.command.register({
      name: COMMAND,
      description: "Show what agent-autopilot does with AskUserQuestion polls",
      immediate: true,
    });
    return started;
  });
  on("command.run", { command: COMMAND }, () => ({
    text: "agent-autopilot: scaffold, no rules yet",
  }));
};
