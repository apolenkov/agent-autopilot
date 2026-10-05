import type { ToolCallArgs } from "claude-code";
import type { Engine } from "claude-code/testing";

export const START = {
  cwd: "/w",
  surface: "terminal",
  isInteractive: true,
} as const;
export const COMMAND = "autopilot";
export const STARRED = "Continue by the plan (Recommended)";

export const run = async (
  $: Engine,
  args: string,
): Promise<string | undefined> => {
  const ran = await $.command.run({
    command: COMMAND,
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: true, columns: 160 },
  });
  return ran.text;
};

// A poll as the tool takes it; `over` adds what its type has no room for
// (`kind`) or changes what is plain.
export const poll = (
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  question: "How do we go on?",
  header: "Plan",
  multiSelect: false,
  options: [
    { label: STARRED, description: "Keep going" },
    { label: "Rethink", description: "Start over" },
  ],
  ...over,
});

export const ask = async (
  $: Engine,
  questions: readonly unknown[],
): ReturnType<Engine["tool"]["call"]> =>
  $.tool.call({ tool: "AskUserQuestion", questions } as ToolCallArgs);

export const turn = async ($: Engine, id: string): Promise<void> => {
  await $.turn.start({ text: "go", turnId: id });
};
