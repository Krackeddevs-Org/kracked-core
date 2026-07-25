#!/usr/bin/env node

import { runInit } from '../src/wizard.mjs';
import { runUninstall } from '../src/uninstall.mjs';
import { runUpdate } from '../src/update.mjs';
import { runStatus } from '../src/status.mjs';
import { beginTypeAhead } from '../src/prompt.mjs';

const USAGE = `kracked-core — memory & workflow installer for AI coding agents

Usage:
  npx kracked-core init        Set up global + project memory
  npx kracked-core status      Show what's installed and whether it's current
  npx kracked-core update      Refresh skills + loaders, keeping your memory
  npx kracked-core uninstall   Remove kracked-core files (asks before deleting)

Options:
  -h, --help                    Show this help
  -v, --version                 Show the installed version
`;

async function main() {
  const [, , subcommand] = process.argv;

  // Capture keystrokes from the very first millisecond — a student holding
  // Enter starts before Node has finished booting.
  if (['init', 'update', 'uninstall'].includes(subcommand)) beginTypeAhead();

  if (subcommand === 'init') {
    await runInit();
    return;
  }

  if (subcommand === 'status') {
    await runStatus();
    return;
  }

  if (subcommand === 'update') {
    await runUpdate();
    return;
  }

  if (subcommand === 'uninstall') {
    await runUninstall();
    return;
  }

  if (subcommand === '--version' || subcommand === '-v') {
    const { createRequire } = await import('node:module');
    const pkg = createRequire(import.meta.url)('../package.json');
    process.stdout.write(`${pkg.version}\n`);
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
