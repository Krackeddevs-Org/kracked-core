// `kracked-core update` — refresh the package-owned files without touching
// anything the user has written.
//
// The distinction that makes this safe: SKILLS and LOADERS are package files
// (we wrote them, we can replace them). MEMORY is the user's (identity,
// preferences, lessons, project docs) — never overwritten here, ever.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stdout } from 'node:process';
import { createRequire } from 'node:module';

import { select } from './prompt.mjs';
import { writeLoaders, writeSkills, writeVersionStamp, SKILL_NAMES } from './scaffold.mjs';

const require = createRequire(import.meta.url);
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

function installedVersion() {
  try {
    return require('../package.json').version;
  } catch {
    return 'unknown';
  }
}

/** Which harnesses this project already uses, so update doesn't add new ones. */
function detectInstalledHarnesses(projectDir) {
  const editors = [];
  if (fs.existsSync(path.join(projectDir, '.claude', 'skills'))) editors.push('claude');
  if (fs.existsSync(path.join(projectDir, '.agents', 'skills'))) editors.push('antigravity');
  // A CLAUDE.md with no skills dir still means Claude Code is in play.
  if (!editors.includes('claude') && fs.existsSync(path.join(projectDir, 'CLAUDE.md'))) {
    editors.push('claude');
  }
  return editors;
}

/** Read the agent + user name back out of an installed AGENTS.md. */
function recoverTokens(projectDir) {
  const agentsPath = path.join(projectDir, 'AGENTS.md');
  const tokens = { AGENT_NAME: 'KC', USER_NAME: os.userInfo().username || 'you' };

  try {
    const body = fs.readFileSync(agentsPath, 'utf8');
    const agent = body.match(/You are \*\*([^*]+)\*\*/);
    if (agent) tokens.AGENT_NAME = agent[1].trim();
    const user = body.match(/how ([^\s]+) likes to work/);
    if (user) tokens.USER_NAME = user[1].trim();
  } catch {
    // No AGENTS.md to read — fall back to defaults above.
  }

  return tokens;
}

/** Which skills exist here but aren't in this version — i.e. new ones to add. */
function missingSkills(projectDir, editors) {
  const missing = [];
  for (const skill of SKILL_NAMES) {
    const inClaude = editors.includes('claude')
      && fs.existsSync(path.join(projectDir, '.claude', 'skills', skill, 'SKILL.md'));
    const inAgents = editors.includes('antigravity')
      && fs.existsSync(path.join(projectDir, '.agents', 'skills', skill, 'SKILL.md'));
    const expected = (editors.includes('claude') ? 1 : 0) + (editors.includes('antigravity') ? 1 : 0);
    const present = (inClaude ? 1 : 0) + (inAgents ? 1 : 0);
    if (present < expected) missing.push(skill);
  }
  return missing;
}

export async function runUpdate() {
  if (!process.stdin.isTTY) {
    process.stderr.write(
      'kracked-core update needs an interactive terminal.\n' +
      'Run it directly in a terminal, not piped or in a script.\n'
    );
    process.exitCode = 1;
    return;
  }

  const projectDir = process.cwd();
  const version = installedVersion();

  stdout.write(`${bold('kracked-core update')} ${dim(`v${version}`)}\n\n`);

  if (!fs.existsSync(path.join(projectDir, '.kracked'))) {
    stdout.write(
      `No kracked-core install found in ${projectDir}\n\n` +
      'Run `npx kracked-core init` to set it up first.\n'
    );
    process.exitCode = 1;
    return;
  }

  const editors = detectInstalledHarnesses(projectDir);
  if (editors.length === 0) {
    stdout.write('Found .kracked/ but no editor files. Run `npx kracked-core init` instead.\n');
    process.exitCode = 1;
    return;
  }

  const tokens = {
    ...recoverTokens(projectDir),
    PROJECT_NAME: path.basename(projectDir),
    PROJECT_PATH: projectDir,
    DATE: new Date().toISOString().slice(0, 10),
    STACK: '',
    RUN_COMMANDS: '',
  };

  const newSkills = missingSkills(projectDir, editors);

  stdout.write(`Agent:   ${tokens.AGENT_NAME}\n`);
  stdout.write(`Editors: ${editors.join(', ')}\n`);
  if (newSkills.length) {
    stdout.write(`New in this version: ${newSkills.join(', ')}\n`);
  }

  stdout.write(`\n${bold('Will be refreshed')} ${dim('(package files — safe to replace)')}\n`);
  stdout.write('  the 5 skills, AGENTS.md, CLAUDE.md, .agents/rules/kracked.md\n');
  stdout.write(`\n${bold('Will NOT be touched')} ${dim('(yours)')}\n`);
  stdout.write('  ~/.kracked/  — identity, preferences, lessons\n');
  stdout.write('  .kracked/    — project memory, specs, epics, stories, architecture\n\n');

  const choice = await select('Refresh package files to this version?', [
    { label: 'Yes, update', value: 'yes' },
    { label: 'No, cancel', value: 'no' },
  ], 0);

  if (choice === 'no') {
    stdout.write('\nCancelled — nothing changed.\n');
    return;
  }

  // Package files are ours, so overwrite silently rather than prompting per
  // file. User memory is never in this set.
  const created = [];
  const report = (entry) => created.push(entry);
  const overwrite = async () => 'overwrite';

  stdout.write('\nUpdating...\n');
  await writeLoaders({ projectDir, tokens, ask: overwrite, report, editors });
  await writeSkills({ projectDir, tokens, editors, ask: overwrite, report });
  writeVersionStamp({ projectDir, version, report });

  stdout.write(`\n  Refreshed ${created.length} file(s).\n`);
  stdout.write('\nRestart your editor so it picks up the updated skills.\n');
}
