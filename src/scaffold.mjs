// File writer: copies templates to their destinations, replacing {{TOKEN}}
// placeholders, and never overwrites an existing file without asking first.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.join(__dirname, '..', 'templates');

const SKILL_NAMES = ['kracked-boot', 'kracked-sdd', 'kracked-wrap', 'kracked-explain'];

/** Read a template file, throwing a clear error if Track A hasn't shipped it yet. */
function readTemplate(relPath) {
  const fullPath = path.join(TEMPLATES_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Missing template: templates/${relPath}\n` +
      `This file is expected by the build contract but isn't in the package yet.`
    );
  }
  return fs.readFileSync(fullPath, 'utf8');
}

/** Replace every {{TOKEN}} in content with its value from the tokens map. */
function applyTokens(content, tokens) {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match;
  });
}

/**
 * Decide what to do about a file that may already exist.
 * Returns 'skip' | 'overwrite' | 'alongside'. Delegates the actual
 * question to `ask` (injected so this module has no direct readline dependency).
 */
async function resolveConflict(destPath, ask) {
  if (!fs.existsSync(destPath)) return 'write';
  const choice = await ask(destPath);
  return choice; // 'skip' | 'overwrite' | 'alongside'
}

/** Write content to destPath, honoring the conflict resolution. */
async function writeFileWithConflictCheck(destPath, content, ask, report) {
  const action = await resolveConflict(destPath, ask);

  if (action === 'skip') {
    report({ path: destPath, action: 'skipped (already existed)' });
    return;
  }

  let finalPath = destPath;
  if (action === 'alongside') {
    finalPath = `${destPath}.kracked-new`;
  }

  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(finalPath, content, 'utf8');
  report({
    path: finalPath,
    action: action === 'alongside' ? 'written alongside existing file' : 'written',
  });
}

/**
 * Write global memory files to ~/.kracked/.
 * `ask(destPath)` is called only when a file already exists; must resolve to
 * 'skip' | 'overwrite' | 'alongside'.
 * `report(entry)` is called once per file, for the wizard's final summary.
 */
export async function writeGlobalMemory({ tokens, ask, report }) {
  const globalDir = path.join(os.homedir(), '.kracked');
  // projects.md is excluded here — it's a running registry appended to by
  // every install, never treated as a skip/overwrite conflict. See registerProject().
  const files = ['identity.md', 'preferences.md', 'lessons.md', 'lessons-archive.md'];

  for (const file of files) {
    const destPath = path.join(globalDir, file);
    const content = applyTokens(readTemplate(`global/${file}`), tokens);
    await writeFileWithConflictCheck(destPath, content, ask, report);
  }
}

/**
 * Register this project in ~/.kracked/projects.md — create the file from its
 * template on first use, then append one registry line per project.
 */
export function registerProject({ tokens }) {
  const globalDir = path.join(os.homedir(), '.kracked');
  const projectsPath = path.join(globalDir, 'projects.md');
  const stack = tokens.STACK && tokens.STACK.trim() ? tokens.STACK : '—';
  const row = `| ${tokens.PROJECT_NAME} | ${tokens.PROJECT_PATH} | ${stack} | active |`;

  fs.mkdirSync(globalDir, { recursive: true });

  let content;
  if (fs.existsSync(projectsPath)) {
    content = fs.readFileSync(projectsPath, 'utf8');
  } else {
    // First install: start from the template, minus its illustrative example rows.
    content = applyTokens(readTemplate('global/projects.md'), tokens)
      .split('\n')
      .filter((line) => !/^\|\s*(todo-app|my-blog)\s*\|/.test(line))
      .join('\n');
  }

  // Already registered? Leave it alone — re-running init must not duplicate rows.
  if (content.includes(`| ${tokens.PROJECT_PATH} |`)) return;

  const lines = content.split('\n');
  const isDivider = (l) => /^\|[\s|:-]+\|?\s*$/.test(l);

  // Find the table's divider row (|---|---|), then insert after the last data
  // row that follows it. Anchoring on the divider matters: without it, a table
  // whose only row is the header inserts ABOVE the divider and breaks the table.
  const dividerIdx = lines.findIndex(isDivider);

  if (dividerIdx >= 0) {
    let insertAt = dividerIdx;
    for (let i = dividerIdx + 1; i < lines.length; i++) {
      if (/^\|/.test(lines[i])) insertAt = i;
      else if (lines[i].trim() !== '') break;
    }
    lines.splice(insertAt + 1, 0, row);
    content = lines.join('\n');
  } else {
    content = `${content.replace(/\s*$/, '\n')}${row}\n`;
  }

  fs.writeFileSync(projectsPath, content.replace(/\s*$/, '\n'), 'utf8');
}

/** Write project memory files to <project>/.kracked/. */
export async function writeProjectMemory({ projectDir, tokens, ask, report }) {
  const krackedDir = path.join(projectDir, '.kracked');
  const files = ['project.md', 'session.md', 'decisions.md'];

  for (const file of files) {
    const destPath = path.join(krackedDir, file);
    const content = applyTokens(readTemplate(`project/${file}`), tokens);
    await writeFileWithConflictCheck(destPath, content, ask, report);
  }

  // sdd/tracker.md + sdd/specs/.gitkeep
  const trackerDest = path.join(krackedDir, 'sdd', 'tracker.md');
  const trackerContent = applyTokens(readTemplate('project/sdd/tracker.md'), tokens);
  await writeFileWithConflictCheck(trackerDest, trackerContent, ask, report);

  const gitkeepDest = path.join(krackedDir, 'sdd', 'specs', '.gitkeep');
  if (!fs.existsSync(gitkeepDest)) {
    fs.mkdirSync(path.dirname(gitkeepDest), { recursive: true });
    fs.writeFileSync(gitkeepDest, '', 'utf8');
    report({ path: gitkeepDest, action: 'written' });
  }
}

/** Write AGENTS.md, CLAUDE.md (shim), and .agents/rules/kracked.md. */
export async function writeLoaders({ projectDir, tokens, ask, report }) {
  const agentsContent = applyTokens(readTemplate('loaders/AGENTS.md'), tokens);
  await writeFileWithConflictCheck(path.join(projectDir, 'AGENTS.md'), agentsContent, ask, report);

  const claudeContent = applyTokens(readTemplate('loaders/CLAUDE.md'), tokens);
  await writeFileWithConflictCheck(path.join(projectDir, 'CLAUDE.md'), claudeContent, ask, report);

  const krackedRulesContent = applyTokens(readTemplate('loaders/antigravity-rules.md'), tokens);
  await writeFileWithConflictCheck(
    path.join(projectDir, '.agents', 'rules', 'kracked.md'),
    krackedRulesContent,
    ask,
    report
  );
}

/**
 * Write the 4 skills to BOTH .claude/skills/<name>/SKILL.md and
 * .agents/skills/<name>/SKILL.md — but only for the harnesses selected.
 * `editors` is an array that may contain 'antigravity' and/or 'claude'.
 */
export async function writeSkills({ projectDir, tokens, editors, ask, report }) {
  const targets = [];
  if (editors.includes('claude')) targets.push('.claude/skills');
  if (editors.includes('antigravity')) targets.push('.agents/skills');

  for (const skillName of SKILL_NAMES) {
    const content = applyTokens(readTemplate(`skills/${skillName}/SKILL.md`), tokens);
    for (const targetBase of targets) {
      const destPath = path.join(projectDir, targetBase, skillName, 'SKILL.md');
      await writeFileWithConflictCheck(destPath, content, ask, report);
    }
  }
}
