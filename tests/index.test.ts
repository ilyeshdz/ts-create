import { expect, test, vi } from "vitest";
import { text, confirm, select, generator, GeneratorBuilder } from "../src/index.js";
import type { ExtractAnswers } from "../src/index.js";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  text: vi.fn().mockResolvedValue("some-value"),
  confirm: vi.fn().mockResolvedValue(false),
  select: vi.fn().mockResolvedValue("opt"),
  isCancel: vi.fn().mockReturnValue(false),
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("node:child_process", () => ({
  exec: vi.fn((...args: any[]) => {
    const cb = args.find((a: any) => typeof a === "function");
    if (cb) cb(null, "", "");
  }),
}));

test("text() creates a text action with correct shape", () => {
  const action = text("name", "What is your name?");
  expect(action).toEqual({
    type: "text",
    id: "name",
    question: "What is your name?",
  });
});

test("text() with options", () => {
  const action = text("email", "Enter email", {
    placeholder: "user@example.com",
    default: "admin@test.com",
  });
  expect(action).toEqual({
    type: "text",
    id: "email",
    question: "Enter email",
    placeholder: "user@example.com",
    default: "admin@test.com",
  });
});

test("confirm() creates a confirm action", () => {
  const action = confirm("ts", "Use TypeScript?");
  expect(action).toEqual({
    type: "confirm",
    id: "ts",
    question: "Use TypeScript?",
  });
});

test("confirm() with default", () => {
  const action = confirm("lint", "Use linter?", { default: true });
  expect(action).toEqual({
    type: "confirm",
    id: "lint",
    question: "Use linter?",
    default: true,
  });
});

test("select() creates a select action", () => {
  const action = select("framework", "Choose framework", ["react", "vue", "svelte"]);
  expect(action).toEqual({
    type: "select",
    id: "framework",
    question: "Choose framework",
    options: ["react", "vue", "svelte"],
  });
});

test("select() with default", () => {
  const action = select("style", "Choose style", ["light", "dark"] as const, { default: "dark" });
  expect(action).toEqual({
    type: "select",
    id: "style",
    question: "Choose style",
    options: ["light", "dark"],
    default: "dark",
  });
});

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

test(".cmd() returns a GeneratorBuilder for chaining", () => {
  const runnable = generator({ name: "test" })
    .render(() => [])
    .cmd("echo hello");

  expect(runnable).toBeInstanceOf(GeneratorBuilder);
});

test(".cmd() with string executes the command on run()", async () => {
  const childProcess = await import("node:child_process");

  const runnable = generator({ name: "test" })
    .render(() => [])
    .cmd("echo hello");

  await runnable.run();
  expect(childProcess.exec).toHaveBeenCalledWith(
    "echo hello",
    expect.any(Object),
    expect.any(Function),
  );

  vi.clearAllMocks();
});

test(".cmd() with function receives answers and resolves command", async () => {
  const childProcess = await import("node:child_process");

  const runnable = generator({ name: "test" })
    .prompt(text("name", "Name?"))
    .render(() => [])
    .cmd(({ answers }) => `echo ${answers.name}`);

  await runnable.run();
  expect(childProcess.exec).toHaveBeenCalledWith(
    "echo some-value",
    expect.any(Object),
    expect.any(Function),
  );

  vi.clearAllMocks();
});

test(".cmd() chains multiple commands", async () => {
  const childProcess = await import("node:child_process");

  const runnable = generator({ name: "test" })
    .render(() => [])
    .cmd("npm install")
    .cmd("git init");

  await runnable.run();
  expect(childProcess.exec).toHaveBeenNthCalledWith(
    1,
    "npm install",
    expect.any(Object),
    expect.any(Function),
  );
  expect(childProcess.exec).toHaveBeenNthCalledWith(
    2,
    "git init",
    expect.any(Object),
    expect.any(Function),
  );

  vi.clearAllMocks();
});

test(".cmd() with cwd option", async () => {
  const childProcess = await import("node:child_process");

  const runnable = generator({ name: "test" })
    .render(() => [])
    .cmd("npm install", { cwd: "./packages/app" });

  await runnable.run();
  expect(childProcess.exec).toHaveBeenCalledWith(
    "npm install",
    { cwd: "./packages/app" },
    expect.any(Function),
  );

  vi.clearAllMocks();
});

test(".cmd() with cwd as function", async () => {
  const childProcess = await import("node:child_process");

  const runnable = generator({ name: "test" })
    .prompt(text("dir", "Directory?"))
    .render(() => [])
    .cmd("npm install", { cwd: ({ answers }) => `./${answers.dir}` });

  await runnable.run();
  expect(childProcess.exec).toHaveBeenCalledWith(
    "npm install",
    { cwd: "./some-value" },
    expect.any(Function),
  );

  vi.clearAllMocks();
});
