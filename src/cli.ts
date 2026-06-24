#!/usr/bin/env node

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import process from "node:process";
import * as clack from "@clack/prompts";
import { compileBlueprint } from "./cli/blueprint-compiler.js";
import type { BlueprintFile } from "./cli/blueprint-compiler.js";

function showHelp(): void {
  console.log(`
ts-create — High-level scaffolding framework and blueprint compiler

USAGE
  $ ts-create blueprint <source-folder> [output-dir]
  $ ts-create <command> --help

COMMANDS
  blueprint   Compile a folder structure into a ts-create generator blueprint

EXAMPLES
  $ ts-create blueprint ./my-project
  $ ts-create blueprint ./my-project ./output
  $ ts-create blueprint .
`);
}

async function writeFiles(files: BlueprintFile[], baseDir: string): Promise<void> {
  for (const file of files) {
    const fullPath = resolve(baseDir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");
  }
}

async function handleBlueprint(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
USAGE
  $ ts-create blueprint <source-folder> [output-dir]

Compile an existing folder into a ts-create generator blueprint.

ARGUMENTS
  source-folder   Path to the folder to compile (required)
  output-dir      Output directory (default: current directory)

EXAMPLE
  $ ts-create blueprint ./my-project
  $ ts-create blueprint ./my-project ./output
`);
    return;
  }

  const sourcePath = args[0]!;
  const outputDir = args[1] || ".";

  clack.intro("ts-create blueprint");

  const spinner = clack.spinner();
  spinner.start(`Compiling ${sourcePath}`);

  try {
    const result = await compileBlueprint(sourcePath);

    spinner.stop(`Found ${result.totalFiles} source file${result.totalFiles === 1 ? "" : "s"}`);

    await writeFiles(result.files, resolve(outputDir));

    const genPath = resolve(outputDir, "generator.ts");
    const contentsPath = resolve(outputDir, "_contents");
    const externalCount = result.files.length - 1;

    if (externalCount > 0) {
      clack.outro(
        `Blueprint written to ${genPath} (${externalCount} content ${externalCount === 1 ? "module" : "modules"} in ${contentsPath})`,
      );
    } else {
      clack.outro(`Blueprint written to ${genPath}`);
    }
  } catch (err) {
    spinner.stop("Compilation failed");
    clack.log.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  if (command === "blueprint") {
    await handleBlueprint(rest);
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  showHelp();
  process.exit(1);
}

main();
