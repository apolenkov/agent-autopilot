import { describe, expect, test } from "claude-code/testing";

import { irreversibleIn } from "../../hooks/model/gate.ts";

const isHit = (text: string, extraDeny: readonly string[] = []): boolean =>
  irreversibleIn([text], extraDeny) !== undefined;

describe("irreversible acts are caught, in every form", () => {
  for (const text of [
    "git push --force",
    "force-push the branch",
    "Pushed to origin",
    "pushing now",
    "delete the file",
    "files deleted",
    "deleting everything",
    "tables dropped",
    "drop the table",
    "commit reverted",
    "branch merged",
    "rebase onto main",
    "amend the commit",
    "overwritten data",
    "overwrite it",
    "wipe the disk",
    "purge the cache",
    "truncate logs",
    "reset --hard",
    "publish to npm",
    "deploy to prod",
    "the production database",
    "create a release",
    "tag v1.0",
    "tagged and pushed",
    "send the email",
    "post a comment",
    "pay the invoice",
    "rotate the token",
    "share the secret",
    "grant access",
    "kill the process",
    "rm -rf build",
    "chezmoi apply",
    "backlog task edit 3 --delete",
    "Удалить файл",
    "удаление ветки",
    "публикация пакета",
    "отправить письмо",
    "выпустить релиз",
    "платёж и платеж",
    "выдать доступ",
    "остановить сервис",
    "принудительный пуш",
  ]) {
    test(text, () => {
      expect(isHit(text)).toBe(true);
    });
  }
});

describe("words inside other words are not hits", () => {
  for (const text of [
    "Which product should we build?",
    "the prodigy",
    "postgres or sqlite",
    "a dropdown menu",
    "the payload size",
    "tokenizer choice",
    "accessible colours",
    "a tagline",
    "the sender field",
    "forceful tone",
    "Continue with the plan",
    "Use TypeScript",
    "Какой формат выбрать?",
    "Продолжить по плану",
  ]) {
    test(text, () => {
      expect(isHit(text)).toBe(false);
    });
  }
});

describe("prod counts as a whole word only", () => {
  test("prod and production are hits", () => {
    expect(isHit("ship to prod")).toBe(true);
    expect(isHit("PRODUCTION")).toBe(true);
  });
  test("product, productive, reproduce are not", () => {
    expect(isHit("product")).toBe(false);
    expect(isHit("productive")).toBe(false);
    expect(isHit("reproduce")).toBe(false);
  });
});

describe("the user's own words", () => {
  test("a word is matched whole", () => {
    expect(isHit("touch the billing tables", ["billing"])).toBe(true);
    expect(isHit("a rebilling plan", ["billing"])).toBe(false);
  });
  test("hyphens and dots are plain characters, not syntax", () => {
    expect(isHit("run force-push now", ["force-push", "a.b"])).toBe(true);
    expect(isHit("see a.b here", ["a.b"])).toBe(true);
    expect(isHit("see axb here", ["a.b"])).toBe(false);
  });
  test("a Cyrillic word is matched by its start", () => {
    expect(isHit("списание средств", ["списан"])).toBe(true);
  });
  test("an empty or blank word never matches everything", () => {
    expect(isHit("a calm question", ["", "  "])).toBe(false);
  });
  test("regular expression syntax in a word does not throw", () => {
    expect(isHit("fine", ["(", "[", "*", "\\"])).toBe(false);
  });
});

test("the matched text is returned, whichever text holds it", () => {
  expect(irreversibleIn(["calm", "then git push now"], [])).toBe("push");
  expect(irreversibleIn(["calm", "still calm"], [])).toBeUndefined();
});

test("the same pattern answers twice alike (no sticky state)", () => {
  expect(isHit("push")).toBe(true);
  expect(isHit("push")).toBe(true);
});
