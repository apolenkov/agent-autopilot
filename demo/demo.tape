# Records demo/demo.gif: `vhs demo/demo.tape` from the repository root.
# Needs Claude Code 2.1.289+. Loads this checkout with --plugin-dir. Runs in an
# empty project at /tmp/demo-ap without user settings (no personal hooks, status
# line or other mods) or personal instructions (agents-md managed-only). Two
# Haiku calls: a poll with one "(Recommended)" option, answered for you, and
# one that looks irreversible, which stays yours.

Output demo/demo.gif

Require claude

Set Shell "zsh"
Set FontSize 15
Set Width 1280
Set Height 560
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 20ms

Hide
Type `unset CLAUDE_CODE_CHILD_SESSION CLAUDECODE; P="$PWD"; mkdir -p /tmp/demo-ap; cd /tmp/demo-ap; clear`
Enter
Type `claude --model haiku --plugin-dir "$P" --setting-sources project,local --settings '{"statusLine":{"type":"command","command":"true"},"pluginConfigs":{"agents-md@builtin":{"options":{"instructionFiles":"managed-only"}}}}'`
Enter
Sleep 6s
# Trusts the folder on a first run; an empty prompt box ignores both keys.
Down
Enter
Sleep 3s
Ctrl+L
Sleep 1s
Show

Sleep 1s
Type "/autopilot auto"
Sleep 300ms
Enter
Sleep 3s
Type `Call AskUserQuestion once with ONE single-choice question "Which test runner?" and options "Jest", "Vitest (Recommended)", "node:test". No other tools. Then name the chosen option in one sentence.`
Sleep 500ms
Enter
Hide
Wait+Screen@60s /Brewed|Cooked|Baked|Churned|Worked|Sautéed|Crunched/
Show
Sleep 3s
Type "/autopilot last"
Sleep 300ms
Enter
Sleep 4s

# An irreversible-looking poll is not answered: the dialog comes to you.
Type `Call AskUserQuestion once with ONE single-choice question "Force-push to main and delete the old branch?" and options "Yes (Recommended)", "No". No other tools.`
Sleep 500ms
Enter
Sleep 12s
