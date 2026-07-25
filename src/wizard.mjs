// Interactive prompt flow for `npx kracked-core init`.
// Follows the wizard flow in CONTRACT.md exactly — question order matters.

import { stdin, stdout } from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  globalMemoryExists,
  globalMemoryDir,
  classifyProjectDir,
  scanExistingProject,
  stackSummaryLine,
  detectExistingAgentSetup,
} from './detect.mjs';
import { select, checkbox, confirm, input } from './prompt.mjs';
import {
  writeGlobalMemory,
  registerProject,
  writeProjectMemory,
  writeLoaders,
  writeSkills,
} from './scaffold.mjs';

/** Expand a leading ~ to the home directory. Leaves other paths untouched. */
function expandTilde(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

/** Format today's date as YYYY-MM-DD. */
function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Turn detected package.json scripts into a ready-to-read "how to run it" block.
 * The scan already knows these commands — writing them into project.md is the
 * difference between a drafted memory and an empty one full of TODOs.
 */
function runCommandsBlock(summary) {
  const scripts = summary?.scripts ? Object.keys(summary.scripts) : [];
  if (!scripts.length) return '- _(not set yet)_';

  // Surface the commands people actually reach for first, then the rest.
  const priority = ['dev', 'start', 'build', 'test', 'lint', 'typecheck'];
  const ordered = [
    ...priority.filter((s) => scripts.includes(s)),
    ...scripts.filter((s) => !priority.includes(s)),
  ];

  return ordered.map((s) => `- \`${s}\` — \`npm run ${s}\``).join('\n');
}

export async function runInit() {
  // Non-interactive stdin (e.g. piped input, CI) can't drive a wizard —
  // fail clearly instead of hanging on a prompt that will never resolve.
  if (!stdin.isTTY) {
    process.stderr.write(
      'kracked-core init needs an interactive terminal to ask setup questions.\n' +
      'Run it directly in a terminal (not piped or in a non-interactive script).\n'
    );
    process.exitCode = 1;
    return;
  }

  // Ctrl+C / Ctrl+D are handled inside prompt.mjs, which owns stdin in raw
  // mode. Keep a SIGINT guard for interrupts arriving between prompts.
  const onSigint = () => {
    stdout.write('\n\nCancelled. Nothing after this point was written.\n');
    process.exit(130);
  };
  process.on('SIGINT', onSigint);

  try {
    await wizardFlow();
  } finally {
    process.off('SIGINT', onSigint);
    stdin.pause();
  }
}

/** Prompt for how to resolve a file-already-exists conflict. */
async function askConflict(destPath) {
  stdout.write(`\n  Already exists: ${destPath}\n`);
  return select(
    '  What should we do?',
    [
      { label: 'Skip', value: 'skip', hint: 'keep the existing file' },
      { label: 'Overwrite', value: 'overwrite', hint: 'replace it' },
      { label: 'Write alongside', value: 'alongside', hint: 'save as .kracked-new' },
    ],
    0
  );
}

/**
 * Warn before writing into a directory another agent system already governs.
 * A CLAUDE.md we didn't write belongs to someone else's setup — overwriting it
 * silently replaces that agent's identity. Ask first, every time.
 */
async function warnOnExistingSetup(projectDir) {
  const found = detectExistingAgentSetup(projectDir).filter((f) => !f.ours);
  if (found.length === 0) return true;

  stdout.write('\n  Heads up — this looks like it already has an agent setup:\n');
  for (const f of found) {
    const where = f.scope === 'global' ? 'global' : 'this project';
    stdout.write(`    • ${f.file}  ${c_dim(`(${where})`)}\n`);
  }
  stdout.write(
    '\n  Installing here would overwrite those loaders and change who your\n' +
    '  agent is in this directory. Existing files are never replaced without\n' +
    '  asking, but it is easy to end up with two systems giving different\n' +
    '  instructions.\n\n'
  );

  return confirm('Continue installing here?', false);
}

/** Minimal dim helper for wizard-level notices. */
function c_dim(s) {
  return `[2m${s}[0m`;
}

async function wizardFlow() {
  const created = [];
  const reporter = (entry) => created.push(entry);
  const conflictAsk = (destPath) => askConflict(destPath);

  stdout.write('kracked-core — set up memory for your AI coding agent\n\n');

  // 1. Agent name
  const agentName = (await input('What should we call your agent?', 'KC')) || 'KC';

  // 2. User name
  const systemUser = os.userInfo().username || 'you';
  const userName = (await input('Your name?', systemUser)) || systemUser;

  // 3. Global memory — always installed. It holds identity, preferences and
  // cross-project lessons, and boot depends on it; making it optional only
  // created a way to end up with a half-installed system that can't boot.
  // Existing files are still never overwritten without asking.
  const hasGlobal = globalMemoryExists();
  const setUpGlobal = true;
  if (hasGlobal) {
    stdout.write(`\n  Global memory found at ${globalMemoryDir()} — reusing it.\n`);
  }

  // 4. Project setup
  const setUpProject = await confirm('Set up this project?', true);

  let projectDir = process.cwd();
  let projectMode = null; // 'new' | 'existing'
  let stackLine = 'unknown — not auto-detected';
  let projectSummary = null;

  if (setUpProject) {
    const pathAnswer = await input('Project directory?', '.');
    const expanded = expandTilde(pathAnswer);
    projectDir = path.resolve(expanded === '' ? '.' : expanded);

    // Another agent system already here? Ask before touching its loaders.
    if (fs.existsSync(projectDir)) {
      const proceed = await warnOnExistingSetup(projectDir);
      if (!proceed) {
        stdout.write('\nStopped — nothing was written to this project.\n');
        return;
      }
    }

    const classification = classifyProjectDir(projectDir);
    projectMode = await select(
      'Is this a new project or an existing codebase?',
      [
        { label: 'Existing codebase', value: 'existing', hint: 'scan it and draft the memory' },
        { label: 'New project', value: 'new', hint: 'start with a blank scaffold' },
      ],
      classification === 'existing' ? 0 : 1
    );

    if (projectMode === 'existing') {
      if (!fs.existsSync(projectDir)) {
        stdout.write(`\n  ${projectDir} doesn't exist yet — nothing to scan. Treating as new.\n`);
        projectMode = 'new';
      } else {
        projectSummary = scanExistingProject(projectDir);
        stackLine = stackSummaryLine(projectSummary);

        stdout.write('\n  Scanned project:\n');
        stdout.write(`    Name:   ${projectSummary.name}\n`);
        stdout.write(`    Stack:  ${stackLine}\n`);
        stdout.write(`    Git:    ${projectSummary.isGitRepo ? 'yes' : 'no'}\n`);
        const scriptNames = Object.keys(projectSummary.scripts);
        if (scriptNames.length) {
          stdout.write(`    Scripts: ${scriptNames.join(', ')}\n`);
        }
        stdout.write('\n');

        const confirmed = await confirm('Does this look right?', true);
        if (!confirmed) {
          const manualStack = await input('Describe the stack yourself:', stackLine);
          stackLine = manualStack;
        }
      }
    }

    // Ensure the target directory exists before we try to write into it.
    try {
      fs.mkdirSync(projectDir, { recursive: true });
    } catch (err) {
      throw new Error(`Can't create or write to ${projectDir}: ${err.message}`);
    }
  }

  // 5. Editors — a checkbox, so anyone already running another agent system in
  // one harness can install for the other and leave that one alone.
  const existing = setUpProject ? detectExistingAgentSetup(projectDir) : [];
  const claudeTaken = existing.some((f) => f.file === 'CLAUDE.md' && !f.ours);

  const editors = await checkbox('Which editor(s) do you use?', [
    {
      label: 'Antigravity',
      value: 'antigravity',
      checked: true,
      hint: 'writes .agents/',
    },
    {
      label: 'Claude Code',
      value: 'claude',
      checked: !claudeTaken,
      hint: claudeTaken ? 'CLAUDE.md already in use here' : 'writes CLAUDE.md + .claude/',
    },
  ]);

  // 6. Write files
  const projectName = projectSummary?.name || (setUpProject ? path.basename(projectDir) : 'unnamed-project');

  const tokens = {
    AGENT_NAME: agentName,
    USER_NAME: userName,
    PROJECT_NAME: projectName,
    PROJECT_PATH: projectDir,
    DATE: isoDate(),
    STACK: stackLine,
    RUN_COMMANDS: runCommandsBlock(projectSummary),
  };

  stdout.write('\nWriting files...\n');

  if (setUpGlobal) {
    await writeGlobalMemory({ tokens, ask: conflictAsk, report: reporter });
  }
  // Registering the project in the global registry is independent of whether
  // global memory was just (re)written — it should happen whenever global
  // memory exists at all, so kracked knows about every project touched.
  if (setUpProject && (hasGlobal || setUpGlobal)) {
    registerProject({ tokens });
    created.push({ path: path.join(globalMemoryDir(), 'projects.md'), action: 'updated (registry)' });
  }

  if (setUpProject) {
    await writeProjectMemory({ projectDir, tokens, ask: conflictAsk, report: reporter });
    await writeLoaders({ projectDir, tokens, ask: conflictAsk, report: reporter });
    await writeSkills({ projectDir, tokens, editors, ask: conflictAsk, report: reporter });
  }

  printSummary(created, agentName, setUpProject);
}

function printSummary(created, agentName, setUpProject) {
  stdout.write('\nDone. Files:\n');
  for (const entry of created) {
    stdout.write(`  ${entry.action.padEnd(32)} ${entry.path}\n`);
  }

  stdout.write('\nNext step:\n');
  if (setUpProject) {
    stdout.write(`  Open this project in your editor and run /kracked-boot to load ${agentName}'s memory.\n`);
  } else {
    stdout.write('  Run kracked-core init again inside a project directory to wire it up.\n');
  }
}
