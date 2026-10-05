import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (message: string): boolean =>
      message.includes("Signed-off-by: dependabot[bot]"),
  ],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["agent-autopilot", "repo", "deps", "ci", "main"],
    ],
  },
};

export default config;
