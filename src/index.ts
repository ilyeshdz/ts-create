import { emit, write } from "ts-treegen";
import type { VirtualFile } from "ts-treegen";
import { exec as execCallback } from "node:child_process";
import * as clack from "@clack/prompts";
import type {
  PromptAction,
  ExtractAnswers,
  TextAction,
  ConfirmAction,
  SelectAction,
  CmdEntry,
} from "./types.js";
export type {
  PromptAction,
  ExtractAnswers,
  TextAction,
  ConfirmAction,
  SelectAction,
  CmdEntry,
  DepItem,
  PackageJsonConfig,
} from "./types.js";

function execCommand(
  command: string,
  options?: { cwd?: string },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execCallback(command, options, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}
export { packageJson } from "./utils/package-json.js";
export type { PlateNode, VirtualFile } from "ts-treegen";

export function text<TId extends string>(
  id: TId,
  question: string,
  opts?: { placeholder?: string; default?: string },
): TextAction<TId> {
  return { type: "text", id, question, ...opts };
}

export function confirm<TId extends string>(
  id: TId,
  question: string,
  opts?: { default?: boolean },
): ConfirmAction<TId> {
  return { type: "confirm", id, question, ...opts };
}

export function select<TId extends string, TOption extends string>(
  id: TId,
  question: string,
  options: readonly TOption[],
  opts?: { default?: TOption },
): SelectAction<TId, TOption> {
  return { type: "select", id, question, options, ...opts };
}

interface PromptEntry {
  action: PromptAction;
  when?: (answers: Record<string, unknown>) => boolean;
}

type PromptResult =
  | { readonly kind: "value"; readonly value: unknown }
  | { readonly kind: "cancelled" };

async function runPrompt(p: PromptAction): Promise<PromptResult> {
  let result: unknown;

  switch (p.type) {
    case "text":
      result = await clack.text({
        message: p.question,
        placeholder: p.placeholder,
        defaultValue: p.default,
      });
      break;
    case "confirm":
      result = await clack.confirm({
        message: p.question,
        initialValue: p.default,
      });
      break;
    case "select": {
      const options = p.options.map((o) => ({ value: o, label: o }));
      result = await clack.select({
        message: p.question,
        options,
        initialValue: p.default,
      });
      break;
    }
  }

  if (clack.isCancel(result)) {
    return { kind: "cancelled" };
  }

  return { kind: "value", value: result };
}

export type RunResult<
  TPrompts extends readonly PromptAction[] = readonly PromptAction[],
  TCond extends readonly boolean[] = readonly boolean[],
> =
  | {
      readonly kind: "success";
      readonly files: VirtualFile[];
      readonly answers: ExtractAnswers<TPrompts, TCond>;
    }
  | { readonly kind: "cancelled" };

export function generator(config: { name: string }): GeneratorBuilder<[]> {
  return new GeneratorBuilder(config.name);
}

export class GeneratorBuilder<
  TPrompts extends readonly PromptAction[] = [],
  TCond extends readonly boolean[] = [],
> {
  constructor(
    private name: string,
    private entries: PromptEntry[] = [],
    private cmdEntries: CmdEntry[] = [],
    private renderFn?: (ctx: { answers: Record<string, unknown> }) => any,
  ) {}

  prompt<T extends PromptAction>(action: T): GeneratorBuilder<[...TPrompts, T], [...TCond, false]>;
  prompt<T extends PromptAction>(
    action: T,
    options: { when: (answers: ExtractAnswers<TPrompts, TCond>) => boolean },
  ): GeneratorBuilder<[...TPrompts, T], [...TCond, true]>;
  prompt<T extends PromptAction>(
    action: T,
    options?: { when?: (answers: ExtractAnswers<TPrompts, TCond>) => boolean },
  ): any {
    const whenFn = options?.when as ((answers: Record<string, unknown>) => boolean) | undefined;
    return new GeneratorBuilder(
      this.name,
      [...this.entries, { action, when: whenFn }],
      this.cmdEntries,
      this.renderFn,
    );
  }

  cmd(
    command:
      | string
      | ((ctx: { answers: ExtractAnswers<TPrompts, TCond> }) => string | Promise<string>),
    options?: {
      cwd?:
        | string
        | ((ctx: { answers: ExtractAnswers<TPrompts, TCond> }) => string | Promise<string>);
    },
  ): GeneratorBuilder<TPrompts, TCond> {
    return new GeneratorBuilder(
      this.name,
      this.entries,
      [
        ...this.cmdEntries,
        {
          command: command as CmdEntry["command"],
          cwd: options?.cwd as CmdEntry["cwd"],
        },
      ],
      this.renderFn,
    );
  }

  render(
    fn: (ctx: { answers: ExtractAnswers<TPrompts, TCond> }) => any,
  ): GeneratorBuilder<TPrompts, TCond> {
    return new GeneratorBuilder(
      this.name,
      this.entries,
      this.cmdEntries,
      fn as (ctx: { answers: Record<string, unknown> }) => any,
    );
  }

  async run(options?: {
    onSuccess?: (ctx: { answers: ExtractAnswers<TPrompts, TCond> }) => void;
    dryRun?: boolean;
  }): Promise<RunResult<TPrompts, TCond>> {
    if (!this.renderFn) {
      throw new Error("render() must be called before run()");
    }

    const answers: Record<string, unknown> = {};

    clack.intro(`ts-create: ${this.name}`);

    for (const entry of this.entries) {
      const show = entry.when ? entry.when(answers) : true;
      if (show) {
        const result = await runPrompt(entry.action);
        if (result.kind === "cancelled") {
          clack.cancel("Operation cancelled");
          return { kind: "cancelled" };
        }
        answers[entry.action.id] = result.value;
      }
    }

    const tree = this.renderFn({ answers: answers as ExtractAnswers<TPrompts, TCond> });
    const nodes = Array.isArray(tree) ? tree : [tree];

    const files = await emit(...nodes);

    if (!options?.dryRun) {
      await write(files);

      const ctx = { answers: answers as Record<string, unknown> };

      for (const entry of this.cmdEntries) {
        const cmdStr =
          typeof entry.command === "function" ? await entry.command(ctx) : entry.command;

        const cwdStr = entry.cwd
          ? typeof entry.cwd === "function"
            ? await entry.cwd(ctx)
            : entry.cwd
          : undefined;

        const spinner = clack.spinner();
        spinner.start(`Running: ${cmdStr}`);

        try {
          await execCommand(cmdStr, { cwd: cwdStr });
          spinner.stop(`Completed: ${cmdStr}`);
        } catch (err) {
          spinner.stop(`Failed: ${cmdStr}`);
          const message = err instanceof Error ? err.message : String(err);
          clack.log.error(message);
          throw err;
        }
      }
    }

    clack.outro(
      options?.dryRun
        ? `Dry run: would generate ${files.length} file${files.length === 1 ? "" : "s"} in ${this.name}`
        : `Done! Generated ${files.length} file${files.length === 1 ? "" : "s"} in ${this.name}`,
    );

    if (options?.onSuccess) {
      options.onSuccess({ answers: answers as ExtractAnswers<TPrompts, TCond> });
    }

    return {
      kind: "success",
      files,
      answers: answers as ExtractAnswers<TPrompts, TCond>,
    };
  }
}
