import type { PlateNode, VirtualFile } from "ts-treegen";

export interface CmdEntry {
  command: string | ((ctx: { answers: Record<string, unknown> }) => string | Promise<string>);
  cwd?: string | ((ctx: { answers: Record<string, unknown> }) => string | Promise<string>);
}

export interface TextAction<TId extends string> {
  readonly type: "text";
  readonly id: TId;
  readonly question: string;
  readonly placeholder?: string;
  readonly default?: string;
}

export interface ConfirmAction<TId extends string> {
  readonly type: "confirm";
  readonly id: TId;
  readonly question: string;
  readonly default?: boolean;
}

export interface SelectAction<TId extends string, TOption extends string> {
  readonly type: "select";
  readonly id: TId;
  readonly question: string;
  readonly options: readonly TOption[];
  readonly default?: TOption;
}

export interface MultiselectAction<TId extends string, TOption extends string> {
  readonly type: "multiselect";
  readonly id: TId;
  readonly question: string;
  readonly options: readonly TOption[];
  readonly required?: boolean;
  readonly default?: readonly TOption[];
}

export type PromptAction<TId extends string = string> =
  | TextAction<TId>
  | ConfirmAction<TId>
  | SelectAction<TId, string>
  | MultiselectAction<TId, string>;

type AnswerType<T> =
  T extends TextAction<any>
    ? string
    : T extends ConfirmAction<any>
      ? boolean
      : T extends SelectAction<any, infer O>
        ? O
        : T extends MultiselectAction<any, infer O>
          ? O[]
          : never;

export type ExtractAnswers<
  T extends readonly PromptAction[],
  TCond extends readonly boolean[] = [],
> = {
  [K in keyof T as T[K] extends { readonly id: infer I }
    ? I extends string
      ? I
      : never
    : never]: K extends keyof TCond
    ? TCond[K] extends true
      ? AnswerType<T[K]> | undefined
      : AnswerType<T[K]>
    : AnswerType<T[K]>;
};

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
