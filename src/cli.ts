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

EXAMPLE
  $ ts-create ./my-project
  $ ts-create ./my-project ./output
  $ ts-create .
`);
}

async function writeFiles(files: CompiledFile[], baseDir: string): Promise<void> {
  for (const file of files) {
    const fullPath = resolve(baseDir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");
  }
}

async function run(sourcePath: string, outputDir: string): Promise<void> {
  clack.intro("ts-create");

  const spinner = clack.spinner();
  spinner.start(`Compiling ${sourcePath}`);

  try {
    const result = await compileFolder(sourcePath);

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

  const [sourcePath, outputDir = "."] = args;
  await run(sourcePath!, outputDir);
}

main();
