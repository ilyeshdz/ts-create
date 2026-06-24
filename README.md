# @ilyeshdz/ts-create

High-level scaffolding framework and blueprint compiler built on ts-treegen.

[![Open on npmx.dev](https://npmx.dev/api/registry/badge/version/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/size/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/license/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)

`@ilyeshdz/ts-create` is a thin layer on top of [ts-treegen](https://github.com/ilyeshdz/ts-treegen) that adds interactive prompts and type-safe answer inference. define prompts as data, wire them to a file tree, and generate files — all in typescript.

it also ships with a **blueprint compiler** that turns an existing folder into a reusable `generator.ts`, so you can snapshot any project structure as a scaffold.

## features

- **prompt-driven generation:** `text()`, `confirm()`, and `select()` prompts, fully typed.
- **type-safe answers:** your template function knows the exact shape of user input.
- **blueprint compiler:** `ts-create blueprint <folder>` — reverse-engineer any folder into a generator.
- **`packageJson()` helper:** declare dependencies as names (latest auto-resolved) or pin versions.

## quick start

```ts
import { generator, text, confirm, select, packageJson } from "@ilyeshdz/ts-create";
import { file, dir } from "ts-treegen";

await generator({
  name: "my-app",
  prompts: [
    text("name", "Project name", { default: "my-app" }),
    confirm("typescript", "Use TypeScript?", { default: true }),
    select("pkgManager", "Package manager", ["pnpm", "npm", "yarn"] as const),
  ],
  template: ({ answers }) =>
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
});
```

## blueprint compiler

```sh
ts-create blueprint <source-folder> [output-dir]
```

compiles a folder into a `generator.ts` blueprint with content split into `_contents/` modules. respects `.gitignore`, skips lockfiles.

## license

MIT
