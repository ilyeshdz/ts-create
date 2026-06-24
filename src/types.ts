import type { PlateNode, VirtualFile } from "ts-treegen";

export interface TextPrompt<TId extends string> {
  readonly type: "text";
  readonly id: TId;
  readonly question: string;
  readonly placeholder?: string;
  readonly default?: string;
}

export interface ConfirmPrompt<TId extends string> {
  readonly type: "confirm";
  readonly id: TId;
  readonly question: string;
  readonly default?: boolean;
}

export interface SelectPrompt<TId extends string, TOption extends string> {
  readonly type: "select";
  readonly id: TId;
  readonly question: string;
  readonly options: readonly TOption[];
  readonly default?: TOption;
}

export type Prompt<TId extends string = string> =
  | TextPrompt<TId>
  | ConfirmPrompt<TId>
  | SelectPrompt<TId, string>;

export type ExtractAnswers<T extends readonly Prompt[]> = {
  [K in T[number] as K extends { readonly id: infer I }
    ? I extends string
      ? I
      : never
    : never]: K extends TextPrompt<any>
    ? string
    : K extends ConfirmPrompt<any>
      ? boolean
      : K extends SelectPrompt<any, infer O>
        ? O
        : never;
};

export interface GeneratorConfig<TPrompts extends readonly Prompt[]> {
  name: string;
  prompts: TPrompts;
  template: (ctx: { answers: ExtractAnswers<TPrompts> }) => any;
  onSuccess?: (ctx: { answers: ExtractAnswers<TPrompts> }) => void;
}

export type DepItem = string | { readonly name: string; readonly version?: string };

export interface PackageJsonConfig {
  name?: string;
  version?: string;
  description?: string;
  type?: string;
  private?: boolean;
  license?: string;
  author?: string;
  main?: string;
  dependencies?: DepItem[];
  devDependencies?: DepItem[];
  peerDependencies?: DepItem[];
  optionalDependencies?: DepItem[];
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

export type { PlateNode, VirtualFile };
