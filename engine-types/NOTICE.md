# engine-types/

`claude-code.d.ts` is the Claude Code function-hooks API declaration file, and
`claude-code-tools.d.ts` the declarations of its built-in tools' inputs and outputs
(AskUserQuestion's among them); Claude Code writes both itself (the first line of
`claude-code.d.ts` names the version). They are © Anthropic PBC and are
**not** covered by this repository's MIT license; they are kept here only so CI can
type-check this mod. Anthropic publishes the hooks API file in
[anthropics/claude-code/mods/types](https://github.com/anthropics/claude-code/tree/main/mods/types).

Refresh them after a Claude Code update with `npm run update-types`.
