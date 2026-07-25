// `kracked-core status` — what's installed here, and is it current?
//
// Answers the question a version number alone can't: the npm registry tells you
// what's available, package.json tells you what you just ran, but neither tells
// you which version actually wrote the files in this project.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stdout } from 'node:process';
import { createRequire } from 'node:module';

import { readVersionStamp, SKILL_NAMES } from './scaffold.mjs';

const require = createRequire(import.meta.url);
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

function runningVersion() {
  try {
    return require('../package.json').version;
  } catch {
    return 'unknown';
  }
}

/** Ask npm what the current published version is. Network-optional. */
async function latestPublished() {
  try {
    const res = await fetch('https://registry.npmjs.org/kracked-core', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body['dist-tags']?.latest ?? null;
  } catch {
    return null; // offline, or npm unreachable — not an error worth failing on
  }
}

/** Compare semver-ish strings. Returns -1, 0, or 1. */
function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export async function runStatus() {
  const projectDir = process.cwd();
  const globalDir = path.join(os.homedir(), '.kracked');
  const running = runningVersion();

  stdout.write(`${bold('kracked-core status')}\n\n`);

  // --- This project ---
  const installed = readVersionStamp(projectDir);
  const hasProject = fs.existsSync(path.join(projectDir, '.kracked'));

  stdout.write(`${bold('This project')} ${dim(projectDir)}\n`);
  if (!hasProject) {
    stdout.write('  not set up — run `npx kracked-core@latest init`\n');
  } else {
    stdout.write(`  installed version: ${installed || dim('unknown (installed before 1.5.0)')}\n`);

    const skillDirs = ['.claude/skills', '.agents/skills'].filter((d) =>
      fs.existsSync(path.join(projectDir, d))
    );
    for (const dir of skillDirs) {
      const present = SKILL_NAMES.filter((s) =>
        fs.existsSync(path.join(projectDir, dir, s, 'SKILL.md'))
      ).length;
      stdout.write(`  ${dir}: ${present}/${SKILL_NAMES.length} skills\n`);
    }
  }

  // --- Global memory ---
  stdout.write(`\n${bold('Global memory')} ${dim(globalDir)}\n`);
  if (!fs.existsSync(globalDir)) {
    stdout.write('  not set up\n');
  } else {
    const files = ['identity.md', 'preferences.md', 'lessons.md', 'projects.md'];
    const present = files.filter((f) => fs.existsSync(path.join(globalDir, f)));
    stdout.write(`  ${present.length}/${files.length} files present\n`);

    // Lesson count is the signal that memory is actually accumulating.
    try {
      const lessons = fs.readFileSync(path.join(globalDir, 'lessons.md'), 'utf8');
      const count = lessons.split('\n').filter((l) => /^- /.test(l)).length;
      stdout.write(`  lessons learned: ${count}\n`);
    } catch {
      // No lessons file — already reflected in the count above.
    }
  }

  // --- Version check ---
  stdout.write(`\n${bold('Version')}\n`);
  stdout.write(`  running now: ${running}\n`);

  const latest = await latestPublished();
  if (!latest) {
    stdout.write(`  latest on npm: ${dim("couldn't check (offline?)")}\n`);
    return;
  }

  stdout.write(`  latest on npm: ${latest}\n\n`);

  const compareTo = installed || running;
  const cmp = compareVersions(compareTo, latest);

  if (cmp >= 0) {
    stdout.write(`  ${green('Up to date.')}\n`);
  } else {
    stdout.write(
      `  ${yellow(`Update available: ${compareTo} → ${latest}`)}\n` +
      '  Run `npx kracked-core@latest update` to refresh skills and loaders.\n' +
      '  Your memory is never touched by an update.\n'
    );
  }
}
