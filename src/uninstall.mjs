// `kracked-core uninstall` — remove what the installer wrote.
//
// Deleting a user's memory is unrecoverable, so this is deliberately cautious:
// it shows exactly what it will remove, asks per layer, defaults to No on the
// global layer, and never deletes a file it didn't recognise as its own.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stdout } from 'node:process';

import { select, confirm } from './prompt.mjs';

const SKILL_NAMES = [
  'kracked-boot',
  'kracked-sdd',
  'kracked-wrap',
  'kracked-explain',
  'kracked-identity',
];

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

/** Files/dirs the installer writes into a project. */
function projectTargets(projectDir) {
  const targets = [
    { path: path.join(projectDir, '.kracked'), label: '.kracked/', kind: 'dir' },
    { path: path.join(projectDir, 'AGENTS.md'), label: 'AGENTS.md', kind: 'file' },
    { path: path.join(projectDir, 'CLAUDE.md'), label: 'CLAUDE.md', kind: 'file' },
    {
      path: path.join(projectDir, '.agents', 'rules', 'kracked.md'),
      label: '.agents/rules/kracked.md',
      kind: 'file',
    },
  ];

  for (const skill of SKILL_NAMES) {
    targets.push({
      path: path.join(projectDir, '.claude', 'skills', skill),
      label: `.claude/skills/${skill}/`,
      kind: 'dir',
    });
    targets.push({
      path: path.join(projectDir, '.agents', 'skills', skill),
      label: `.agents/skills/${skill}/`,
      kind: 'dir',
    });
  }

  return targets.filter((t) => fs.existsSync(t.path));
}

/**
 * Only the two SHARED loader filenames can belong to another system —
 * AGENTS.md and CLAUDE.md are conventions other tools use too, so their
 * contents decide ownership. Everything else lives at a kracked-core-specific
 * path (.kracked/, kracked.md, skills/kracked-*) and is ours by definition.
 *
 * Checking content for OUR files was wrong: the Antigravity pointer never
 * names kracked-core in its body, so it read as foreign and survived uninstall.
 */
function isOurs(filePath) {
  const base = path.basename(filePath);
  if (base !== 'AGENTS.md' && base !== 'CLAUDE.md') return true;

  try {
    const body = fs.readFileSync(filePath, 'utf8');
    return /@AGENTS\.md|kracked-core|\.kracked\/|kracked-boot/.test(body);
  } catch {
    return false; // unreadable — leave it alone rather than risk deleting someone else's
  }
}

function remove(target) {
  if (target.kind === 'dir') {
    fs.rmSync(target.path, { recursive: true, force: true });
  } else {
    fs.rmSync(target.path, { force: true });
  }
}

/** Drop now-empty .claude/.agents shells so uninstall leaves no litter. */
function pruneEmptyParents(projectDir) {
  const candidates = [
    path.join(projectDir, '.claude', 'skills'),
    path.join(projectDir, '.claude'),
    path.join(projectDir, '.agents', 'rules'),
    path.join(projectDir, '.agents', 'skills'),
    path.join(projectDir, '.agents'),
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    } catch {
      // Non-empty or not ours to remove — leaving it is the safe outcome.
    }
  }
}

export async function runUninstall() {
  if (!process.stdin.isTTY) {
    process.stderr.write(
      'kracked-core uninstall needs an interactive terminal.\n' +
      'Run it directly in a terminal, or delete the files manually — see\n' +
      'https://github.com/Krackeddevs-Org/kracked-core/blob/main/docs/UNINSTALL.md\n'
    );
    process.exitCode = 1;
    return;
  }

  const projectDir = process.cwd();
  const globalDir = path.join(os.homedir(), '.kracked');

  stdout.write(`${bold('kracked-core uninstall')}\n\n`);

  // ---- Project layer ----
  const found = projectTargets(projectDir);

  if (found.length === 0) {
    stdout.write(`No kracked-core files found in ${projectDir}\n`);
  } else {
    // Loaders another system owns must never be deleted.
    const foreign = found.filter((t) => t.kind === 'file' && !isOurs(t.path));
    const ours = found.filter((t) => !foreign.includes(t));

    stdout.write(`Found in ${dim(projectDir)}:\n`);
    for (const t of ours) stdout.write(`  ${t.label}\n`);
    if (foreign.length) {
      stdout.write('\n  Not ours — will NOT be touched:\n');
      for (const t of foreign) stdout.write(`    ${t.label} ${dim('(another system wrote this)')}\n`);
    }
    stdout.write('\n');

    const choice = await select('Remove these project files?', [
      { label: 'No, keep everything', value: 'no' },
      { label: 'Yes, remove them', value: 'yes', hint: 'this cannot be undone' },
    ], 0);

    if (choice === 'yes') {
      for (const t of ours) remove(t);
      pruneEmptyParents(projectDir);
      stdout.write(`\n  Removed ${ours.length} item(s) from this project.\n`);
    } else {
      stdout.write('\n  Kept project files.\n');
    }
  }

  // ---- Global layer ----
  stdout.write('\n');
  if (!fs.existsSync(globalDir)) {
    stdout.write(`No global memory at ${globalDir}\n`);
  } else {
    stdout.write(`${bold('Global memory')} — ${dim(globalDir)}\n`);
    stdout.write(
      '  This holds your agent\'s identity, your preferences, and every lesson it has\n' +
      '  learned across ALL projects. Removing it cannot be undone, and it is not\n' +
      '  recreated by reinstalling — the content is yours, not the package\'s.\n\n'
    );

    const wipe = await confirm('Remove global memory too?', false);
    if (wipe) {
      // Deleting months of accumulated lessons deserves a second, explicit yes.
      const sure = await confirm('Are you sure? Your lessons and preferences will be gone.', false);
      if (sure) {
        fs.rmSync(globalDir, { recursive: true, force: true });
        stdout.write('\n  Removed global memory.\n');
      } else {
        stdout.write('\n  Kept global memory.\n');
      }
    } else {
      stdout.write('\n  Kept global memory.\n');
    }
  }

  stdout.write('\nDone.\n');
}
