#!/bin/sh
# Live smoke of what a headless run cannot show: a real interactive session in
# tmux, checked on the captured screen: in hint a poll shows the star under its
# dialog, in shadow it shows none and the journal only says "записано". Needs
# tmux and a Claude login; costs a few cents (haiku, two small turns).
# Run: npm run smoke:live
set -eu
repo=$(cd "$(dirname "$0")/.." && pwd)
session=apsmoke$$
project=/tmp/ap-smoke
home=/tmp/ap-smoke-home

screen() { tmux capture-pane -t "$session" -p -J; }

# wait_for <pattern> <seconds>: poll the screen until the pattern shows.
wait_for() {
  i=0
  while [ "$i" -lt "$2" ]; do
    screen | grep -q -- "$1" && return 0
    sleep 1
    i=$((i + 1))
  done
  echo "FAIL: '$1' did not show in $2 s. Screen:" >&2
  screen >&2
  exit 1
}

send() {
  tmux send-keys -t "$session" "$1"
  sleep 1
  tmux send-keys -t "$session" C-m
}

cleanup() {
  tmux kill-session -t "$session" 2>/dev/null || true
  rm -rf "$project" "$home"
}
trap cleanup EXIT

# A throwaway project and HOME; the only link to the real home is the login
# keychain, so the session can reach Claude.
rm -rf "$project" "$home"
mkdir -p "$project" "$home/Library"
ln -s "$HOME/Library/Keychains" "$home/Library/Keychains"
printf '%s\n' "{\"hasCompletedOnboarding\":true,\"theme\":\"dark\",\"projects\":{\"$project\":{\"hasTrustDialogAccepted\":true},\"/private$project\":{\"hasTrustDialogAccepted\":true}}}" > "$home/.claude.json"

tmux new-session -d -s "$session" -x 150 -y 45 \
  "unset CLAUDE_CODE_CHILD_SESSION CLAUDECODE; export HOME=$home; cd $project; claude --model haiku --plugin-dir '$repo' --setting-sources project,local --settings '{\"pluginConfigs\":{\"agents-md@builtin\":{\"options\":{\"instructionFiles\":\"managed-only\"}}}}'"

wait_for '❯' 60

# hint (the default): the star is under the dialog
send 'Use the AskUserQuestion tool once: question "Which color for the badge?" with options "Blue (Recommended)", "Green", "Gray", the labels exactly as written, the text (Recommended) inside the first label. Then reply with only the answer.'
wait_for '★ Blue (Recommended)' 120
echo "ok: hint shows the star under the dialog"
tmux send-keys -t "$session" C-m
wait_for 'User answered' 60

# shadow: the poll is the same, nothing is shown
send '/autopilot shadow'
wait_for 'shadow: ничего не показывает' 30
send 'Use the AskUserQuestion tool once: question "Which size for the badge?" with options "Small (Recommended)", "Large", "Medium", the labels exactly as written, the text (Recommended) inside the first label. Then reply with only the answer.'
wait_for 'Which size for the badge?' 120
wait_for 'Small (Recommended)' 30
sleep 3
if screen | grep -q '★ Small (Recommended)'; then
  echo "FAIL: shadow shows a star. Screen:" >&2
  screen >&2
  exit 1
fi
echo "ok: shadow shows no star"
tmux send-keys -t "$session" C-m
wait_for 'User answered' 60

# the journal in shadow hides the star and the pick
send '/autopilot last'
wait_for 'записано \[shadow\]' 30
echo "ok: the journal in shadow only says it was written down"
