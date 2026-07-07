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

test("onError with 'continue' skips the failed command and proceeds", async () => {
  const childProcess = await import("node:child_process");
  const onError = vi.fn().mockReturnValue("continue");

  const runnable = generator({ name: "test" })
    .render(() => [])
    .cmd("will-fail")
    .cmd("will-run");

  vi.mocked(childProcess.exec).mockImplementationOnce((...args: any[]) => {
    const cb = args.find((a: any) => typeof a === "function");
    if (cb) cb(new Error("boom"), "", "");
  });

  await runnable.run({ onError });
  expect(onError).toHaveBeenCalledTimes(1);
  expect(childProcess.exec).toHaveBeenCalledTimes(2);
  expect(childProcess.exec).toHaveBeenNthCalledWith(
    2,
    "will-run",
    expect.any(Object),
    expect.any(Function),
  );

  vi.clearAllMocks();
});

test("onError default (void) re-throws and aborts", async () => {
  const childProcess = await import("node:child_process");
  const onError = vi.fn().mockReturnValue(undefined);

  const runnable = generator({ name: "test" })
    .render(() => [])
    .cmd("will-fail")
    .cmd("should-not-run");

  vi.mocked(childProcess.exec).mockImplementationOnce((...args: any[]) => {
    const cb = args.find((a: any) => typeof a === "function");
    if (cb) cb(new Error("boom"), "", "");
  });

  await expect(runnable.run({ onError })).rejects.toThrow("boom");
  expect(onError).toHaveBeenCalledTimes(1);
  expect(childProcess.exec).toHaveBeenCalledTimes(1);

  vi.clearAllMocks();
});

test("onError receives error, command, and answers context", async () => {
  const childProcess = await import("node:child_process");
  let captured: any;

  const runnable = generator({ name: "test" })
    .render(() => [])
    .cmd("will-fail");

  vi.mocked(childProcess.exec).mockImplementationOnce((...args: any[]) => {
    const cb = args.find((a: any) => typeof a === "function");
    if (cb) cb(new Error("boom"), "", "");
  });

  await runnable.run({
    onError: (ctx) => {
      captured = ctx;
      return "continue";
    },
  });

  expect(captured.error).toBeInstanceOf(Error);
  expect(captured.error.message).toBe("boom");
  expect(captured.command).toBe("will-fail");

  vi.clearAllMocks();
});
