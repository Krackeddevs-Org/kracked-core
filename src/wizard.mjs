// Interactive prompt flow for `npx kracked-core init`.
// Follows the wizard flow in CONTRACT.md exactly — question order matters.

import readline from 'node:readline/promises';
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
} from './detect.mjs';
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

  const rl = readline.createInterface({ input: stdin, output: stdout });

  let interrupted = false;
  const onSigint = () => {
    interrupted = true;
    stdout.write('\n\nCancelled. Nothing after this point was written.\n');
    rl.close();
    process.exit(130);
  };
  process.on('SIGINT', onSigint);

  try {
    await wizardFlow(rl);
  } catch (err) {
    // Ctrl+D (EOF) mid-question surfaces as readline's AbortError. Treat it
    // the same as Ctrl+C — a clean cancel, not a crash with a scary stack.
    if (err.code === 'ABORT_ERR' || /ctrl\+d/i.test(err.message || '')) {
      stdout.write('\n\nCancelled. Nothing after this point was written.\n');
      process.exitCode = 130;
      return;
    }
    throw err;
  } finally {
    process.off('SIGINT', onSigint);
    if (!interrupted) rl.close();
  }
}

/** Ask a question with a default; Enter alone accepts the default. */
async function ask(rl, question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = (await rl.question(`${question}${suffix} `)).trim();
  return answer === '' ? defaultValue : answer;
}

/** Ask a yes/no question. Returns boolean. Default shown as Y/n or y/N. */
async function askYesNo(rl, question, defaultYes) {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase();
  if (answer === '') return defaultYes;
  return answer === 'y' || answer === 'yes';
}

/** Prompt for how to resolve a file-already-exists conflict. */
async function askConflict(rl, destPath) {
  stdout.write(`\n  Already exists: ${destPath}\n`);
  const answer = (
    await rl.question('  skip / overwrite / write alongside as .kracked-new? [skip] ')
  ).trim().toLowerCase();

  if (answer === 'o' || answer === 'overwrite') return 'overwrite';
  if (answer === 'a' || answer === 'alongside' || answer === 'write alongside') return 'alongside';
  return 'skip';
}

async function wizardFlow(rl) {
  const created = [];
  const reporter = (entry) => created.push(entry);
  const conflictAsk = (destPath) => askConflict(rl, destPath);

  stdout.write('kracked-core — set up memory for your AI coding agent\n\n');

  // 1. Agent name
  const agentName = (await ask(rl, 'What should we call your agent?', 'KC')) || 'KC';

  // 2. User name
  const systemUser = os.userInfo().username || 'you';
  const userName = (await ask(rl, 'Your name?', systemUser)) || systemUser;

  // 3. Global memory
  const hasGlobal = globalMemoryExists();
  let setUpGlobal;
  if (!hasGlobal) {
    setUpGlobal = await askYesNo(rl, 'Set up global memory now?', true);
  } else {
    const reuse = await askYesNo(rl, 'Global memory found. Reuse it?', true);
    setUpGlobal = !reuse; // if not reusing, we still (re)write it below
  }

  // 4. Project setup
  const setUpProject = await askYesNo(rl, 'Set up this project?', true);

  let projectDir = process.cwd();
  let projectMode = null; // 'new' | 'existing'
  let stackLine = 'unknown — not auto-detected';
  let projectSummary = null;

  if (setUpProject) {
    const pathAnswer = await ask(rl, 'Project directory?', '.');
    const expanded = expandTilde(pathAnswer);
    projectDir = path.resolve(expanded === '' ? '.' : expanded);

    const classification = classifyProjectDir(projectDir);

    if (classification === 'existing') {
      const modeAnswer = (
        await ask(rl, 'New project or existing codebase? (new/existing)', 'existing')
      ).toLowerCase();
      projectMode = modeAnswer.startsWith('n') ? 'new' : 'existing';
    } else {
      const modeAnswer = (
        await ask(rl, 'New project or existing codebase? (new/existing)', 'new')
      ).toLowerCase();
      projectMode = modeAnswer.startsWith('e') ? 'existing' : 'new';
    }

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

        const confirmed = await askYesNo(rl, 'Does this look right?', true);
        if (!confirmed) {
          const manualStack = await ask(rl, 'Describe the stack yourself:', stackLine);
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

  // 5. Editors
  const editorAnswer = (
    await ask(rl, 'Which editor(s) do you use? (antigravity/claude/both/other)', 'both')
  ).toLowerCase();

  let editors;
  if (editorAnswer.startsWith('both')) {
    editors = ['antigravity', 'claude'];
  } else if (editorAnswer.startsWith('a')) {
    editors = ['antigravity'];
  } else if (editorAnswer.startsWith('c')) {
    editors = ['claude'];
  } else {
    // "other" or anything unrecognized — still write both loader formats,
    // since AGENTS.md/CLAUDE.md are cheap and cover most tools either way.
    editors = ['antigravity', 'claude'];
  }

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
