# @ilyeshdz/ts-create

High-level scaffolding framework built on ts-treegen.

[![Open on npmx.dev](https://npmx.dev/api/registry/badge/version/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/size/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/license/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)

`@ilyeshdz/ts-create` is a thin layer on top of [ts-treegen](https://github.com/ilyeshdz/ts-treegen) that adds interactive prompts and type-safe answer inference. define prompts as data, wire them to a file tree, and generate files — all in typescript.

## features

- **builder chain API:** type-safe composition — prompts accumulate types, render receives them.
- **prompt-driven generation:** `text()`, `confirm()`, and `select()` prompts, fully typed.
- **type-safe answers:** the render callback knows the exact shape of user input.
- **`packageJson()` helper:** declare dependencies as names (latest auto-resolved) or pin versions.
- **folder compiler:** `ts-create <folder>` — reverse-engineer any existing project into a reusable `generator.ts` scaffold.

## quick start

### as a library

````ts
import { generator, text, confirm, select, packageJson } from "@ilyeshdz/ts-create";
import { file, dir } from "ts-treegen";

await generator({ name: "my-app" })
  .prompt(text("name", "Project name", { default: "my-app" }))
  .prompt(confirm("typescript", "Use TypeScript?", { default: true }))
  .prompt(select("pkgManager", "Package manager", ["pnpm", "npm", "yarn"] as const))
  .render(({ answers }) =>
    dir(".", [
      answers.typescript && file("tsconfig.json", "{ /* ... */ }"),
      file(
        "package.json",
        packageJson({
          name: answers.name,
          devDependencies: ["typescript"],
        }),
      ),
      file("README.md", `# ${answers.name}`),
    ]),
  )
  .run({ onSuccess: ({ answers }) => console.log("done", answers) });
````

`answers` is **fully typed** — TypeScript infers `{ name: string; typescript: boolean; pkgManager: "pnpm" | "npm" | "yarn" }` from the prompts.

### as a CLI

```sh
ts-create <source-folder> [output-dir]
```

Compile any existing folder into a `generator.ts` scaffold, with file contents split into `_contents/` modules. Respects `.gitignore`, skips hidden files and lockfiles.

```sh
$ ts-create ./my-project ./scaffolds
# → generator.ts written to scaffolds/generator.ts
```

## api reference

### `generator()`

```ts
generator(config: { name: string }): GeneratorBuilder<[]>
```

Starts a builder chain. `name` is used for the intro/outro messages during prompt execution.

### `GeneratorBuilder<TPrompts>`

#### `.prompt(action)`

```ts
builder.prompt<T extends PromptAction>(action: T): GeneratorBuilder<[...TPrompts, T]>
```

Accumulates a prompt. Each call returns a new builder with the prompt added to the type-level tuple.

**`text(id, question, opts?)`** — text input prompt.
```ts
text("name", "Project name")
text("email", "Enter email", { placeholder: "user@example.com", default: "admin@test.com" })
```
Answer type: `string`.

**`confirm(id, question, opts?)`** — yes/no prompt.
```ts
confirm("typescript", "Use TypeScript?")
confirm("lint", "Use linter?", { default: true })
```
Answer type: `boolean`.

**`select(id, question, options, opts?)`** — pick-one prompt.
```ts
select("pkg", "Package manager", ["pnpm", "npm", "yarn"] as const)
select("theme", "Theme", ["light", "dark"] as const, { default: "dark" })
```
Answer type: the literal union of `options`.

#### `.render(fn)`

```ts
builder.render(
  fn: (ctx: { answers: ExtractAnswers<TPrompts> }) => any,
): RunnableGenerator<TPrompts>
```

Attaches the file-generation callback. The `answers` parameter is **fully inferred** from all accumulated prompts. The return value is passed to `emit()` from ts-treegen — return `PlateNode` trees or arrays of them.

### `RunnableGenerator<TPrompts>`

#### `.run(options?)`

```ts
runnable.run(options?: {
  onSuccess?: (ctx: { answers: ExtractAnswers<TPrompts> }) => void;
}): Promise<void>
```

Executes the generator:
1. Runs all prompts interactively via `@clack/prompts`
2. Calls the render callback with collected answers
3. Flattens the tree to `VirtualFile[]` via `emit()`
4. Writes all files to disk via `write()`
5. Calls `onSuccess` if provided

### `packageJson(config)`

```ts
packageJson(config: PackageJsonConfig): PlateNode
```

Declare `package.json` with auto-resolved dependency versions. See [`PackageJsonConfig`](#types) for the full config shape.

String dependencies (e.g. `"typescript"`) resolve to the latest version via npm registry. Pin versions with `{ name: "typescript", version: "5.7.0" }`.

### types

```ts
interface TextAction<TId extends string> {
  readonly type: "text";
  readonly id: TId;
  readonly question: string;
  readonly placeholder?: string;
  readonly default?: string;
}

interface ConfirmAction<TId extends string> {
  readonly type: "confirm";
  readonly id: TId;
  readonly question: string;
  readonly default?: boolean;
}

interface SelectAction<TId extends string, TOption extends string> {
  readonly type: "select";
  readonly id: TId;
  readonly question: string;
  readonly options: readonly TOption[];
  readonly default?: TOption;
}

type PromptAction<TId extends string = string> =
  | TextAction<TId>
  | ConfirmAction<TId>
  | SelectAction<TId, string>;

type ExtractAnswers<T extends readonly PromptAction[]> = {
  [K in T[number] as K extends { readonly id: infer I }
    ? I extends string ? I : never
    : never]:
      K extends TextAction<any>    ? string
    : K extends ConfirmAction<any> ? boolean
    : K extends SelectAction<any, infer O> ? O
    : never;
};

interface PackageJsonConfig {
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

type DepItem = string | { readonly name: string; readonly version?: string };
```

Also re-exports `PlateNode` and `VirtualFile` from `ts-treegen`.

## generated scaffold

When you run `ts-create ./my-project`, the output `generator.ts` looks like:

```ts
import { generator, packageJson } from "@ilyeshdz/ts-create";
import { file, dir } from "ts-treegen";
import _package_json from "./_contents/package_json.js";
// ... more content imports

export default generator({ name: "my-project" })
  .render(({ answers }) => [
    dir("my-project", [
      file("package.json", packageJson({
        name: "my-project",
        // ...
      })),
      file("README.md", _package_json),
      // ...
    ]),
  ]);
```

Add your own prompts with `.prompt()`, then use `answers` in the render callback.

## license

MIT
