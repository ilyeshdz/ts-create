# @ilyeshdz/ts-create

[![Open on npmx.dev](https://npmx.dev/api/registry/badge/version/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/size/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)
[![Open on npmx.dev](https://npmx.dev/api/registry/badge/license/@ilyeshdz/ts-create)](https://npmx.dev/package/@ilyeshdz/ts-create)

Type safe project scaffolding. Define prompts, generate files, run commands, all with full type inference from end to end. Built on [ts-treegen](https://github.com/ilyeshdz/ts-treegen) v1.

## Install

```sh
npm install @ilyeshdz/ts-create
```

## Quick start

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
      file("package.json", packageJson({ name: answers.name, devDependencies: ["typescript"] })),
      file("README.md", `# ${answers.name}`),
    ]),
  )
  .cmd(({ answers }) => `${answers.pkg} install`)
  .cmd("git init")
  .run();
```

`answers` is fully inferred: `{ name: string; typescript: boolean; pkg: "pnpm" | "npm" | "yarn" }`. Conditional prompts become `T | undefined`.

## API

### `generator({ name })`

Start a builder chain.

### `.prompt(action, opts?)`

Accumulate a prompt. Pass `{ when: (answers) => boolean }` to make it conditional.

```ts
text("id", "Question?", { default: "value" })          // -> string
confirm("id", "Question?", { default: true })            // -> boolean
select("id", "Question?", ["a", "b"] as const)           // -> "a" | "b"
```

### `.render(fn)`

Attach file generation. Receives `{ answers }`. Return `file()`, `dir()`, or `packageJson()` nodes from `ts-treegen`.

### `.cmd(command, opts?)`

Register a post generation shell command.

```ts
.cmd("npm install")
.cmd(({ answers }) => `${answers.pkg} install`)
.cmd("npm install", { cwd: ({ answers }) => `./${answers.dir}` })
```

### `.run(opts?)`

Execute prompts, render, write files, and run commands. After completion, prints a summary with write and skip counts.

```ts
.run()
.run({ dryRun: true })
.run({ targetDir: "./output" })
.run({ onSuccess: ({ answers }) => {} })
```

### `packageJson(config)`

Declare `package.json` with auto resolved dependency versions. String deps resolve to latest from the npm registry. Use `{ name, version }` to pin.

```ts
packageJson({
  name: "my-app",
  dependencies: ["express"],
  devDependencies: [{ name: "typescript", version: "5.7" }],
})
```

## CLI

Reverse engineer any project folder into a reusable generator.

```sh
npx ts-create <source-folder> [output-dir] [options]
```

```sh
ts-create ./my-project ./scaffolds
```

| Option | Description |
|--------|-------------|
| `--lockfiles <list>` | Comma separated lockfiles to ignore (default: pnpm-lock.yaml,yarn.lock,package-lock.json,bun.lock,bun.lockb,deno.lock) |
| `--skip-hidden` | Skip dotfiles and dot directories |

## License

MIT
