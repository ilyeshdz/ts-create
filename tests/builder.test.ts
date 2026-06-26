import { expect, test, vi } from "vitest";
import { text, confirm, generator, GeneratorBuilder } from "../src/index.js";
import type { ExtractAnswers } from "../src/index.js";

test("generator() returns a GeneratorBuilder with empty prompts", () => {
  const builder = generator({ name: "test" });
  expect(builder).toBeInstanceOf(GeneratorBuilder);
});

test("builder.prompt() accumulates prompts", () => {
  const builder = generator({ name: "test" })
    .prompt(text("name", "What is your name?"))
    .prompt(confirm("ts", "Use TypeScript?"));

  expect(builder).toBeInstanceOf(GeneratorBuilder);
});

test("builder.prompt() with when returns a GeneratorBuilder", () => {
  const builder = generator({ name: "test" })
    .prompt(confirm("ts", "Use TypeScript?"))
    .prompt(text("config", "Config path"), { when: (answers) => answers.ts });

  expect(builder).toBeInstanceOf(GeneratorBuilder);
});

test("builder.render() returns a GeneratorBuilder", () => {
  const runnable = generator({ name: "test" })
    .prompt(text("name", "What is your name?"))
    .render(({ answers: _answers }) => []);

  expect(runnable).toBeInstanceOf(GeneratorBuilder);
});

test("ExtractAnswers infers correct types without conditional prompts", () => {
  const actions = [text("name", "?"), confirm("ts", "?")] as const;

  type T = ExtractAnswers<typeof actions>;
  const _typeCheck: T extends { name: string; ts: boolean } ? true : false = true;
  expect(_typeCheck).toBe(true);
});

test("ExtractAnswers marks conditional prompts as undefined", () => {
  const actions = [confirm("ts", "?")] as const;

  type T = ExtractAnswers<typeof actions, [true]>;
  const _typeCheck: T extends { ts: boolean | undefined } ? true : false = true;
  expect(_typeCheck).toBe(true);
});

test("run() skips prompts when when returns false", async () => {
  const clack = await import("@clack/prompts");

  const runnable = generator({ name: "test" })
    .prompt(confirm("enabled", "Enable?", { default: false }))
    .prompt(text("secret", "Secret value"), { when: (answers) => answers.enabled })
    .render(({ answers }) => {
      expect(answers.enabled).toBe(false);
      expect(answers.secret).toBeUndefined();
      return [];
    });

  await runnable.run();
  expect(clack.text).not.toHaveBeenCalled();

  vi.clearAllMocks();
});
