import { emit, write } from "ts-treegen";
import * as clack from "@clack/prompts";
import type {
  Prompt,
  GeneratorConfig,
  ExtractAnswers,
  TextPrompt,
  ConfirmPrompt,
  SelectPrompt,
} from "./types.js";
export type {
  Prompt,
  GeneratorConfig,
  ExtractAnswers,
  TextPrompt,
  ConfirmPrompt,
  SelectPrompt,
  DepItem,
  PackageJsonConfig,
} from "./types.js";
export { packageJson } from "./utils/package-json.js";
export type { PlateNode, VirtualFile } from "ts-treegen";

export function text<TId extends string>(
  id: TId,
  question: string,
  opts?: { placeholder?: string; default?: string },
): TextPrompt<TId> {
  return { type: "text", id, question, ...opts };
}

export function confirm<TId extends string>(
  id: TId,
  question: string,
  opts?: { default?: boolean },
): ConfirmPrompt<TId> {
  return { type: "confirm", id, question, ...opts };
}

export function select<TId extends string, TOption extends string>(
  id: TId,
  question: string,
  options: readonly TOption[],
  opts?: { default?: TOption },
): SelectPrompt<TId, TOption> {
  return { type: "select", id, question, options, ...opts };
}

async function runPrompt(p: Prompt): Promise<unknown> {
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

export async function generator<TPrompts extends readonly Prompt[]>(
  config: GeneratorConfig<TPrompts>,
): Promise<void> {
  const answers: Record<string, unknown> = {};

  clack.intro(`ts-create: ${config.name}`);

  for (const prompt of config.prompts) {
    answers[prompt.id] = await runPrompt(prompt);
  }

  const tree = config.template({ answers: answers as ExtractAnswers<TPrompts> });
  const nodes = Array.isArray(tree) ? tree : [tree];

  const files = await emit(...nodes);
  await write(files);

  clack.outro(
    `Done! Generated ${files.length} file${files.length === 1 ? "" : "s"} in ${config.name}`,
  );

  if (config.onSuccess) {
    config.onSuccess({ answers: answers as ExtractAnswers<TPrompts> });
  }
}
