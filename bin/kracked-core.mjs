#!/usr/bin/env node

import { runInit } from '../src/wizard.mjs';

const USAGE = `kracked-core — memory & workflow installer for AI coding agents

Usage:
  npx kracked-core init     Set up global + project memory

Options:
  -h, --help                 Show this help
`;

async function main() {
  const [, , subcommand] = process.argv;

  if (subcommand === 'init') {
    await runInit();
    return;
  }

  if (subcommand === '--help' || subcommand === '-h' || !subcommand) {
    process.stdout.write(USAGE);
    process.exit(subcommand ? 0 : 1);
    return;
  }

  process.stderr.write(`Unknown command: ${subcommand}\n\n${USAGE}`);
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`\nkracked-core failed: ${err.message}\n`);
  process.exit(1);
});
