<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40ilyeshdz%2Fts-create?logo=npm&label=%40ilyeshdz%2Fts-create&color=%234AE6A0">
    <img src="https://img.shields.io/npm/v/%40ilyeshdz%2Fts-create?logo=npm&label=%40ilyeshdz%2Fts-create&color=%23121212" height="28">
  </picture>
</p>

<p align="center">
  <a href="https://npmjs.org/package/@ilyeshdz/ts-create">
    <img src="https://img.shields.io/npm/v/@ilyeshdz/ts-create?logo=npm&label=version&color=%234AE6A0" alt="npm version">
  </a>
  <a href="https://npmjs.org/package/@ilyeshdz/ts-create">
    <img src="https://img.shields.io/npm/dm/@ilyeshdz/ts-create?logo=npm&label=downloads&color=%234AE6A0" alt="npm downloads">
  </a>
  <a href="https://github.com/ilyeshdz/ts-create/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/@ilyeshdz/ts-create?label=license&color=%234AE6A0" alt="license">
  </a>
  <a href="https://github.com/ilyeshdz/ts-create/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/ilyeshdz/ts-create/ci.yml?logo=github&label=ci&color=%234AE6A0" alt="CI">
  </a>
</p>

<p align="center">
  <b>Type-safe project scaffolding.</b> Define prompts, generate files, run commands — all with full type inference from end to end.
</p>

---

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
text("id", "Question?", { default: "value" })          // → string
confirm("id", "Question?", { default: true })            // → boolean
select("id", "Question?", ["a", "b"] as const)           // → "a" | "b"
```

### `.render(fn)`

Attach file generation. Receives `{ answers }` — return `file()`, `dir()`, or `packageJson()` nodes from `ts-treegen`.

### `.cmd(command, opts?)

Register a post-generation shell command.

```ts
.cmd("npm install")
.cmd(({ answers }) => `${answers.pkg} install`)
.cmd("npm install", { cwd: ({ answers }) => `./${answers.dir}` })
```

### `.run(opts?)`

Execute prompts → render → write files → run commands.

```ts
.run()                                   // default
.run({ dryRun: true })                   // preview without writing
.run({ onSuccess: ({ answers }) => {} }) // callback after success
```

### `packageJson(config)`

Declare `package.json` with auto-resolved dependency versions. String deps resolve to latest from the npm registry; use `{ name, version }` to pin.

```ts
packageJson({
  name: "my-app",
  dependencies: ["express"],       // resolves to latest
  devDependencies: [{ name: "typescript", version: "5.7" }],
})
```

## CLI

Reverse-engineer any project folder into a reusable generator.

```sh
npx ts-create <source-folder> [output-dir] [options]
```

```sh
ts-create ./my-project ./scaffolds
```

| Option | Description |
|--------|-------------|
| `--lockfiles <list>` | Comma-separated lockfiles to ignore (default: `pnpm-lock.yaml,yarn.lock,package-lock.json,bun.lock,bun.lockb,deno.lock`) |
| `--skip-hidden` | Skip dotfiles and dot-directories |

## License

MIT
