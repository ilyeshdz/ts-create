import { vi, expect, test, afterEach } from "vitest";

const { mockEmit, mockPlan, mockRun } = vi.hoisted(() => {
  const mockRun = vi.fn().mockResolvedValue(undefined);
  return {
    mockEmit: vi.fn().mockResolvedValue([]),
    mockPlan: vi.fn().mockResolvedValue({ files: [], run: mockRun }),
    mockRun,
  };
});

vi.mock("ts-treegen/node", () => ({
  emit: mockEmit,
  plan: mockPlan,
}));

import { generator, confirm } from "../src/index.js";

afterEach(() => {
  mockEmit.mockClear();
  mockPlan.mockClear();
  mockRun.mockClear();
  vi.clearAllMocks();
});

test("dryRun calls emit but not plan", async () => {
  await generator({ name: "test" })
    .render(() => [])
    .run({ dryRun: true });

  expect(mockEmit).toHaveBeenCalled();
  expect(mockPlan).not.toHaveBeenCalled();
});

test("non-dryRun calls both emit and plan", async () => {
  await generator({ name: "test" })
    .render(() => [])
    .run();

  expect(mockEmit).toHaveBeenCalled();
  expect(mockPlan).toHaveBeenCalled();
});

test("plan receives files from emit", async () => {
  const virtualFiles = [{ path: "a.txt", content: "hello" }];
  mockEmit.mockResolvedValueOnce(virtualFiles);

  await generator({ name: "test" })
    .render(() => [])
    .run();

  expect(mockPlan).toHaveBeenCalledWith(
    virtualFiles,
    expect.objectContaining({ targetDir: expect.any(String) }),
  );
});

test("plan receives targetDir option", async () => {
  await generator({ name: "test" })
    .render(() => [])
    .run({ targetDir: "/my/output" });

  expect(mockPlan).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({ targetDir: "/my/output" }),
  );
});

test("plan receives overwrite option", async () => {
  await generator({ name: "test" })
    .render(() => [])
    .run({ overwrite: false });

  expect(mockPlan).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({ overwrite: false }),
  );
});

test("plan uses process.cwd() when targetDir is not set", async () => {
  const cwd = process.cwd();

  await generator({ name: "test" })
    .render(() => [])
    .run();

  expect(mockPlan).toHaveBeenCalledWith(
    expect.any(Array),
    expect.objectContaining({ targetDir: cwd }),
  );
});

test("plan().run is called after plan creation", async () => {
  await generator({ name: "test" })
    .render(() => [])
    .run();

  expect(mockRun).toHaveBeenCalled();
});

test("render output array is spread into emit", async () => {
  const nodeA = Symbol("node");
  const nodeB = Symbol("node");
  const renderFn = vi.fn().mockReturnValue([nodeA, nodeB]);

  await generator({ name: "test" }).render(renderFn).run({ dryRun: true });

  expect(renderFn).toHaveBeenCalled();
  expect(mockEmit).toHaveBeenCalledWith(nodeA, nodeB);
});

test("single non-array render output is wrapped in array", async () => {
  const node = Symbol("node");
  const renderFn = vi.fn().mockReturnValue(node);

  await generator({ name: "test" }).render(renderFn).run({ dryRun: true });

  expect(mockEmit).toHaveBeenCalledWith(node);
});

test("cancelled prompt does not call emit or plan", async () => {
  const clack = await import("@clack/prompts");
  vi.mocked(clack.confirm).mockResolvedValueOnce(Symbol("cancel"));
  vi.mocked(clack.isCancel).mockReturnValueOnce(true);

  const result = await generator({ name: "test" })
    .prompt(confirm("ok", "Proceed?"))
    .render(() => [])
    .run();

  expect(result).toEqual({ kind: "cancelled" });
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockPlan).not.toHaveBeenCalled();
});

test("run result includes files from emit", async () => {
  const virtualFiles = [{ path: "a.txt", content: "hi" }];
  mockEmit.mockResolvedValueOnce(virtualFiles);

  const result = await generator({ name: "test" })
    .render(() => [])
    .run({ dryRun: true });

  expect(result).toEqual({
    kind: "success",
    files: virtualFiles,
    answers: {},
  });
});

test("empty render array produces no files", async () => {
  mockEmit.mockResolvedValueOnce([]);

  await generator({ name: "test" })
    .render(() => [])
    .run({ dryRun: true });

  expect(mockEmit).toHaveReturnedWith(Promise.resolve([]));
});

test("overwrite defaults to true in plan options", async () => {
  await generator({ name: "test" })
    .render(() => [])
    .run();

  expect(mockPlan).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({}));
  const args = mockPlan.mock.calls[0];
  const options = args[1];
  expect(options.overwrite).toBeUndefined();
});
