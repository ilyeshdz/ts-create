import { expect, test, vi } from "vitest";
import { text, generator, GeneratorBuilder } from "../src/index.js";

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
