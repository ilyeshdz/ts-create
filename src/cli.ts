#!/usr/bin/env node

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import process from "node:process";
import * as clack from "@clack/prompts";
import { compileFolder, type CompiledFile } from "./cli/folder-compiler.js";

function showHelp(): void {
  console.log(`
ts-create — High-level scaffolding framework built on ts-treegen

USAGE
  $ ts-create <source-folder> [output-dir]
  $ ts-create --help

Compile an existing project folder into a reusable generator.ts scaffold.

ARGUMENTS
  source-folder   Path to the folder to compile (required)
  output-dir      Output directory (default: current directory)

OPTIONS
  --lockfiles     Comma-separated list of lockfile names to ignore (default: pnpm-lock.yaml,yarn.lock,package-lock.json,bun.lock,bun.lockb,deno.lock)
  --skip-hidden   Skip hidden files and directories (those starting with a dot)

EXAMPLE
  $ ts-create ./my-project
  $ ts-create ./my-project ./output
  $ ts-create .
  $ ts-create ./my-project --lockfiles pnpm-lock.yaml,deno.lock
  $ ts-create ./my-project --skip-hidden
`);
}

async function writeFiles(files: CompiledFile[], baseDir: string): Promise<void> {
  for (const file of files) {
    const fullPath = resolve(baseDir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");
  }
}

async function run(sourcePath: string, outputDir: string, lockfiles?: string[], skipHidden?: boolean): Promise<void> {
  clack.intro("ts-create");

  const spinner = clack.spinner();
  spinner.start(`Compiling ${sourcePath}`);

  try {
    const result = await compileFolder(sourcePath, { lockfiles, skipHidden });

    spinner.stop(`Found ${result.totalFiles} source file${result.totalFiles === 1 ? "" : "s"}`);

    await writeFiles(result.files, resolve(outputDir));

    const genPath = resolve(outputDir, "generator.ts");
    const contentsPath = resolve(outputDir, "_contents");
    const externalCount = result.files.length - 1;

    if (externalCount > 0) {
      clack.outro(
        `Generator written to ${genPath} (${externalCount} content ${externalCount === 1 ? "module" : "modules"} in ${contentsPath})`,
      );
    } else {
      clack.outro(`Generator written to ${genPath}`);
    }
  } catch (err) {
    spinner.stop("Compilation failed");
    clack.log.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    showHelp();
    return;
  }

  let lockfiles: string[] | undefined;
  let skipHidden: boolean | undefined;
  const positional = args.filter((a) => {
    if (a.startsWith("--lockfiles=")) {
      lockfiles = a.slice("--lockfiles=".length).split(",");
      return false;
    }
    if (a === "--skip-hidden") {
      skipHidden = true;
      return false;
    }
    return true;
  });

  const [sourcePath, outputDir = "."] = positional;
  await run(sourcePath!, outputDir, lockfiles, skipHidden);
}

main();
