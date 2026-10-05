# Security policy

## Supported versions

Only the latest release of agent-autopilot is supported.

## Reporting a vulnerability

Please report privately through
[GitHub Security Advisories](https://github.com/apolenkov/agent-autopilot/security/advisories/new).
Do not open a public issue. You will get an answer within 7 days.

## What agent-autopilot does on your machine

It sees every `AskUserQuestion` poll the assistant raises in an interactive
session: the question, the options, their descriptions and previews. In `auto`
mode it can answer a poll for you, so the assistant continues as if you had
picked that option; there is no undo for what the assistant then does. It
answers only when the rule holds (see the README) and never more than `limit`
times per session.

It keeps a counter in the session state and a ring journal of its answers
(`logSize` entries per session) in the plugin store on your machine. No
network call, no model, no key, no telemetry; nothing leaves the machine.
