import { emit, write } from "ts-treegen";
import * as clack from "@clack/prompts";
import type {
  PromptAction,
  ExtractAnswers,
  TextAction,
  ConfirmAction,
  SelectAction,
} from "./types.js";
export type {
  PromptAction,
  ExtractAnswers,
  TextAction,
  ConfirmAction,
  SelectAction,
  DepItem,
  PackageJsonConfig,
} from "./types.js";
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

async function runPrompt(p: PromptAction): Promise<unknown> {
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
    clack.cancel("Operation cancelled");
    process.exit(0);
  }

  return result;
}

export function generator(config: { name: string }): GeneratorBuilder<[]> {
  return new GeneratorBuilder(config.name);
}

export class GeneratorBuilder<TPrompts extends readonly PromptAction[] = []> {
  constructor(
    private name: string,
    private prompts: PromptAction[] = [],
  ) {}

  prompt<T extends PromptAction>(action: T): GeneratorBuilder<[...TPrompts, T]> {
    return new GeneratorBuilder<[...TPrompts, T]>(this.name, [...this.prompts, action]);
  }

  render(
    fn: (ctx: { answers: ExtractAnswers<TPrompts> }) => any,
  ): RunnableGenerator<TPrompts> {
    return new RunnableGenerator(this.name, this.prompts, fn);
  }
}

export class RunnableGenerator<TPrompts extends readonly PromptAction[] = []> {
  private renderFn: (ctx: { answers: Record<string, unknown> }) => any;

  constructor(
    private name: string,
    private prompts: PromptAction[],
    renderFn: (ctx: { answers: ExtractAnswers<TPrompts> }) => any,
  ) {
    this.renderFn = renderFn as (ctx: { answers: Record<string, unknown> }) => any;
  }

  async run(options?: {
    onSuccess?: (ctx: { answers: ExtractAnswers<TPrompts> }) => void;
  }): Promise<void> {
    const answers: Record<string, unknown> = {};

    clack.intro(`ts-create: ${this.name}`);

    for (const prompt of this.prompts) {
      answers[prompt.id] = await runPrompt(prompt);
    }

    const tree = this.renderFn({ answers: answers as ExtractAnswers<TPrompts> });
    const nodes = Array.isArray(tree) ? tree : [tree];

    const files = await emit(...nodes);
    await write(files);

    clack.outro(
      `Done! Generated ${files.length} file${files.length === 1 ? "" : "s"} in ${this.name}`,
    );

    if (options?.onSuccess) {
      options.onSuccess({ answers: answers as ExtractAnswers<TPrompts> });
    }
  }
}