# @ilyeshdz/ts-create

type safe project scaffolding

[![Open on npmx.dev](https://npmx.dev/api/registry/badge/version/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/size/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/license/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)

## example

```ts
import { generator, text, confirm, select, packageJson } from "@ilyeshdz/ts-create";
import { file, dir } from "ts-treegen";

await generator({ name: "my-app" })
  .prompt(text("name", "Project name", { default: "my-app" }))
  .prompt(confirm("typescript", "Use TypeScript?", { default: true }))
  .prompt(select("pkg", "Package manager", ["pnpm", "npm", "yarn"] as const))
  .render(({ answers }) =>
    dir(".", [
      answers.typescript && file("tsconfig.json", "{ /* ... */ }"),
      file("package.json", packageJson({
        name: answers.name,
        devDependencies: ["typescript"],
      })),
      file("README.md", `# ${answers.name}`),
    ]),
  )
  .cmd(({ answers }) => `${answers.pkg} install`)
  .cmd("git init")
  .run();
```

`answers` is fully inferred: `{ name: string; typescript: boolean; pkg: "pnpm" | "npm" | "yarn" }`.

## install

```sh
npm install @ilyeshdz/ts-create ts-treegen
```

## api

### `generator({ name })`

Starts a builder chain.

### `.prompt(action, opts?)`

Accumulates a prompt. `opts.when` makes it conditional — skipped prompts become `T | undefined` in the answer type.

```ts
text(id, question, opts?)         // → string
confirm(id, question, opts?)      // → boolean
select(id, question, options, opts?) // → literal union of options
```

### `.render(fn)`

Attaches file generation. Receives fully typed `{ answers }`. Return `PlateNode` trees from `ts-treegen` (`file()`, `dir()`, etc.).

### `.cmd(command, opts?)`

Registers a post-generation shell command. `command` can be a string or a function receiving `{ answers }`. Accepts `opts.cwd` as string or function.

```ts
.cmd("npm install")
.cmd(({ answers }) => `${answers.pkg} install`)
.cmd("npm install", { cwd: "./packages/app" })
```

Chainable before or after `.render()`.

### `.run(opts?)`

Executes everything: prompts → render → write files → run commands. Accepts `opts.onSuccess`.

### `packageJson(config)`

Declares `package.json` with auto-resolved dependency versions. String deps resolve to latest via npm registry; pin with `{ name, version }`.

---

## cli

```sh
npx ts-create <source-folder> [output-dir]
```

Reverse-engineer any project folder into a reusable `generator.ts` scaffold. Respects `.gitignore`, skips hidden files and lockfiles.

```sh
$ ts-create ./my-project ./scaffolds
# → scaffolds/generator.ts + scaffolds/_contents/*.ts
```

Add prompts with `.prompt()`, then reference `answers` in the render callback.

## license

MIT
