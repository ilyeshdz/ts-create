import type { PlateNode, VirtualFile } from "ts-treegen";

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

export type PromptAction<TId extends string = string> =
  | TextAction<TId>
  | ConfirmAction<TId>
  | SelectAction<TId, string>;

export type ExtractAnswers<T extends readonly PromptAction[]> = {
  [K in T[number] as K extends { readonly id: infer I }
    ? I extends string
      ? I
      : never
    : never]: K extends TextAction<any>
    ? string
    : K extends ConfirmAction<any>
      ? boolean
      : K extends SelectAction<any, infer O>
        ? O
        : never;
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
