/**
 * The gate for the irreversible: a poll whose text names a risky act is
 * never answered for the user, whichever option is starred.
 */

// ponytail: keyword gate, text not intent. It reads words, not meaning: a
// miss would answer for the user, so it errs wide (a false hit costs one
// question); upgrade path is a model that reads the act, none needed for v1.
const LATIN = [
  "delete",
  "rm",
  "drop",
  "purge",
  "wipe",
  "truncate",
  "push",
  "force",
  "overwrite",
  "reset",
  "revert",
  "rebase",
  "amend",
  "publish",
  "deploy",
  "release",
  "tag",
  "send",
  "post",
  "pay",
  "token",
  "secret",
  "access",
  "rotate",
  "merge",
  "kill",
  "remove",
  "discard",
  "erase",
  "destroy",
  "uninstall",
  "nuke",
] as const;
// Words that do not inflect, or whose forms are not regular.
const LATIN_EXACT = [
  "prod",
  "production",
  "payment",
  "overwritten",
  "sent",
  "deletion",
  "deployment",
  "payments",
  "paid",
] as const;
// Stems: Cyrillic words decline and take prefixes (поудалять), so a stem is
// matched anywhere in a word; a false hit ("недоступен") costs one question.
const CYRILLIC = [
  "удал",
  "публикац",
  "отправ",
  "релиз",
  "плат[её]ж",
  "доступ",
  "останов",
  "перезапис",
  "сброс",
  "откат",
  "депло",
  "токен",
  "секрет",
  "принудительн",
  "пуш",
  "мерж",
  "форс",
  "стер",
  "очист",
  "снес",
  "выкат",
] as const;
const PHRASES = [
  String.raw`chezmoi\s+apply`,
  String.raw`git\s+clean`,
  String.raw`backlog[^\n]*--delete`,
] as const;

// A letter, digit or underscore next to a match makes it part of a longer
// word: `prod` is not in `product`, `post` not in `postgres`.
const BEFORE = String.raw`(?<![\p{L}\p{N}_])`;
const AFTER = String.raw`(?![\p{L}\p{N}_])`;
// What a regular expression reads as its own syntax, escaped in a user's word.
const SYNTAX = /[$()*+.?[\\\]^{|}/]/gu;
const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;

// `push` also reads pushed, pushes, pushing; `drop` dropped; `delete` deleting.
const inflected = (word: string): string => {
  const isSilentE = word.endsWith("e");
  const stem = isSilentE ? word.slice(0, -1) : word;
  const last = word.slice(-1);
  return isSilentE
    ? `${stem}(?:e|es|ed|ing)`
    : `${stem}${last}?(?:s|es|ed|ing)?`;
};

const literal = (word: string): string => {
  const escaped = word.replaceAll(SYNTAX, String.raw`\$&`);
  return CYRILLIC_LETTER.test(word)
    ? `${BEFORE}${escaped}`
    : `${BEFORE}${escaped}${AFTER}`;
};

const sourceOf = (extraDeny: readonly string[]): string =>
  [
    ...LATIN.map((word) => `${BEFORE}${inflected(word)}${AFTER}`),
    ...LATIN_EXACT.map((word) => `${BEFORE}${word}${AFTER}`),
    ...CYRILLIC,
    ...PHRASES,
    ...extraDeny
      .filter((word) => word.trim() !== "")
      .map((word) => literal(word.trim())),
  ].join("|");

/**
 * Looks for a word that names an irreversible act.
 * @param texts everything the poll shows: question, labels, descriptions,
 *   previews
 * @param extraDeny the user's own words, matched whole (Cyrillic ones by
 *   their start); a word that is only spaces is ignored
 * @returns the text that matched, or undefined when none did
 */
export const irreversibleIn = (
  texts: readonly string[],
  extraDeny: readonly string[],
): string | undefined => {
  // No `g` flag: `exec` on a global pattern would carry its position over.
  const pattern = new RegExp(sourceOf(extraDeny), "iu");
  return texts
    .map((text) => pattern.exec(text)?.[0])
    .find((hit) => hit !== undefined);
};
