# @ilyeshdz/ts-create

High-level scaffolding framework built on ts-treegen.

[![Open on npmx.dev](https://npmx.dev/api/registry/badge/version/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/size/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/license/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)

`@ilyeshdz/ts-create` is a thin layer on top of [ts-treegen](https://github.com/ilyeshdz/ts-treegen) that adds interactive prompts and type-safe answer inference. define prompts as data, wire them to a file tree, and generate files — all in typescript.

## features

- **prompt-driven generation:** `text()`, `confirm()`, and `select()` prompts, fully typed.
- **type-safe answers:** your template function knows the exact shape of user input.
- **`packageJson()` helper:** declare dependencies as names (latest auto-resolved) or pin versions.
- **folder compiler:** `ts-create <folder>` — reverse-engineer any existing project into a reusable `generator.ts` scaffold.

## quick start

### as a library

````ts
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

### as a CLI

```sh
ts-create <source-folder> [output-dir]
````

Compile any existing folder into a `generator.ts` scaffold, with file contents split into `_contents/` modules. Respects `.gitignore`, skips hidden files and lockfiles.

```sh
$ ts-create ./my-project ./scaffolds
# → generator.ts written to scaffolds/generator.ts
```

## license

MIT
