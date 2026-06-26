import { vi } from "vitest";

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
