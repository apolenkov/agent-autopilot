# Agent guidance

This repository contains the Claude Code autopilot mod. Read [README.md](README.md)
for the decision rule, modes and limitations, [CONTRIBUTING.md](CONTRIBUTING.md)
for development, and [SECURITY.md](SECURITY.md) before changing a trust boundary.

- Keep automatic answers deterministic: the documented eligibility and deny gates
  all apply. Hint mode is the default; automatic answering is session opt-in.
  A recommendation label is a text signal, not permission for an irreversible action.
- `hooks/model/` is pure; preserve its separate strict lint pass. Implementation is
  in `hooks/`, behavior tests in `tests/`, engine declarations in `engine-types/`.
- Use `npm ci` and `npm run check`. Read the pinned runtime from `.nvmrc` and
  `package.json`. After a Claude Code update, use `npm run update-types`; preserve
  the declaration provenance and license in `engine-types/NOTICE.md`.
- Unit tests use no network or model. Live `eval` and `smoke:live` checks use the
  owner's Claude login; follow the manual recipes in CONTRIBUTING and distinguish
  plugin validation, headless execution and interactive UI evidence.
- Commit with an allowed scope from CONTRIBUTING, for example `docs(repo): ...`.
  Follow the existing hooks and release-please workflow.
