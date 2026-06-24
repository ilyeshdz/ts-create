#!/usr/bin/env node

import process from "node:process";

function showHelp(): void {
  console.log(`
ts-create — High-level scaffolding framework built on ts-treegen

USAGE
  $ ts-create --help
`);
}

async function main(): Promise<void> {
  const [, , command] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  showHelp();
  process.exit(1);
}

main();
