#!/bin/sh
# Copies the API declarations the local Claude Code engine wrote into engine-types/:
# claude-code.d.ts (the hooks API) and claude-code-tools.d.ts (the built-in tools'
# inputs and outputs, e.g. AskUserQuestion's). The engine writes both beside a mod
# loaded with --plugin-dir (.claude-plugin/types/); the hooks API is also written
# when the plugin-authoring skill loads. Load the mod once first:
#   claude -p hi --plugin-dir .
set -eu
cd "$(dirname "$0")/.."
# /tmp is shared: take the newest candidate that is a regular file, not a symlink,
# and really lives where the engine writes (/private/tmp resolves to /tmp on macOS).
api=
candidates=$(ls -t /private/tmp/claude-*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts \
  /tmp/claude-*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts \
  .claude-plugin/types/claude-code/index.d.ts 2>/dev/null || true)
IFS='
'
for f in $candidates; do
  r=$(realpath "$f" 2>/dev/null) || continue
  case $r in
    /private/tmp/claude-*/bundled-skills/*/plugin-authoring/types/claude-code.d.ts | /tmp/claude-*/bundled-skills/*/plugin-authoring/types/claude-code.d.ts | "$PWD"/.claude-plugin/types/claude-code/index.d.ts) ;;
    *) continue ;;
  esac
  [ -f "$f" ] && [ ! -L "$f" ] && { api=$f; break; }
done
unset IFS
tools=.claude-plugin/types/claude-code-tools/index.d.ts
[ -n "$api" ] || { echo "no API declarations found: run /plugin-authoring in a Claude Code session first" >&2; exit 1; }
{ [ -f "$tools" ] && [ ! -L "$tools" ]; } || { echo "no tool declarations found: run 'claude -p hi --plugin-dir .' first" >&2; exit 1; }
for dst in engine-types/claude-code.d.ts engine-types/claude-code-tools.d.ts; do
  if [ -n "$(git status --porcelain -- "$dst" 2>/dev/null)" ]; then
    echo "warning: $dst has uncommitted changes, overwriting" >&2
  fi
done
cp "$api" engine-types/claude-code.d.ts
cp "$tools" engine-types/claude-code-tools.d.ts
echo "copied $api -> engine-types/claude-code.d.ts"
echo "copied $tools -> engine-types/claude-code-tools.d.ts"
head -n 1 engine-types/claude-code.d.ts engine-types/claude-code-tools.d.ts
