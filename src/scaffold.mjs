// File writer: copies templates to their destinations, replacing {{TOKEN}}
// placeholders, and never overwrites an existing file without asking first.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_ROOT = path.join(__dirname, '..', 'templates');

// Written into every loader kracked-core generates. `uninstall` requires this
// exact string before deleting a shared-name file (AGENTS.md / CLAUDE.md), so
// another tool's loader is never removed. Never change it without a migration.
export const OWNED_MARKER = '<!-- kracked-core:owned -->';

export const SKILL_NAMES = [
  'kracked-boot',
  'kracked-sdd',
  'kracked-wrap',
  'kracked-explain',
  'kracked-identity',
];

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
/**
 * Drop the illustrative example entries from a freshly-written memory file.
 * They exist to show the format, but left in place they sit alongside the
 * user's real lessons forever and make the index untrustworthy.
 */
function stripExamples(content) {
  return content
    .split('\n')
    .filter((line) => !/^[-|]\s*\[?(YYYY-MM-DD|\d{4}-\d{2}-\d{2})\]?\s*(todo-app|my-blog|<project>)/.test(line))
    .filter((line) => !/^\|\s*(todo-app|my-blog)\s*\|/.test(line))
    .join('\n');
}

export async function writeGlobalMemory({ tokens, ask, report }) {
  const globalDir = path.join(os.homedir(), '.kracked');
  // projects.md is excluded here — it's a running registry appended to by
  // every install, never treated as a skip/overwrite conflict. See registerProject().
  const files = ['identity.md', 'preferences.md', 'lessons.md', 'lessons-archive.md'];

  for (const file of files) {
    const destPath = path.join(globalDir, file);
    const content = stripExamples(applyTokens(readTemplate(`global/${file}`), tokens));
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
  // Escape pipes — a path or name containing `|` would add phantom columns.
  const cell = (v) => String(v ?? '').replace(/\|/g, '\\|');
  const stack = tokens.STACK && tokens.STACK.trim() ? tokens.STACK : '—';
  const row = `| ${cell(tokens.PROJECT_NAME)} | ${cell(tokens.PROJECT_PATH)} | ${cell(stack)} | active |`;

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

  // Anchor on the Registry heading first — a table-looking line elsewhere in the
  // doc (an example, a fenced snippet) would otherwise capture the insert and
  // produce a second, malformed table.
  const registryIdx = lines.findIndex((l) => /^##\s+Registry\s*$/i.test(l));
  const searchFrom = registryIdx >= 0 ? registryIdx : 0;
  const rel = lines.slice(searchFrom).findIndex(isDivider);
  const dividerIdx = rel >= 0 ? searchFrom + rel : -1;

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

  // SDD docs: tracker + the artifact folders, each with a template that
  // explains what belongs there. An empty folder teaches nothing.
  const sddDocs = [
    'sdd/tracker.md',
    'sdd/README.md',
    'sdd/specs/_TEMPLATE.md',
    'sdd/epics/_TEMPLATE.md',
    'sdd/stories/_TEMPLATE.md',
    'sdd/architecture/_TEMPLATE.md',
    'sdd/architecture/decisions/_TEMPLATE.md',
  ];

  for (const rel of sddDocs) {
    const destPath = path.join(krackedDir, rel);
    const content = applyTokens(readTemplate(`project/${rel}`), tokens);
    await writeFileWithConflictCheck(destPath, content, ask, report);
  }
}

/**
 * Record which version wrote these files. Without this there is no way to
 * answer "am I on the latest?" — you can see what npm serves, but not what
 * you actually installed.
 */
export function writeVersionStamp({ projectDir, version, report }) {
  const dest = path.join(projectDir, '.kracked', '.version');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${version}\n`, 'utf8');
  report({ path: dest, action: 'written' });
}

/** Read the version that last wrote this project's files, or null. */
export function readVersionStamp(projectDir) {
  try {
    return fs.readFileSync(path.join(projectDir, '.kracked', '.version'), 'utf8').trim();
  } catch {
    return null; // pre-1.5.0 install, or not installed
  }
}

/** Write AGENTS.md, CLAUDE.md (shim), and .agents/rules/kracked.md. */
export async function writeLoaders({ projectDir, tokens, ask, report, editors }) {
  const agentsContent = applyTokens(readTemplate('loaders/AGENTS.md'), tokens);
  await writeFileWithConflictCheck(path.join(projectDir, 'AGENTS.md'), agentsContent, ask, report);

  const claudeContent = applyTokens(readTemplate('loaders/CLAUDE.md'), tokens);
  await writeFileWithConflictCheck(path.join(projectDir, 'CLAUDE.md'), claudeContent, ask, report);

  // Roo reads .roo/rules/ only — it does NOT read .agents/rules/, so without
  // this mirror the pointer is invisible to Roo.
  if (editors && editors.includes('roo')) {
    const rooRules = applyTokens(readTemplate('loaders/antigravity-rules.md'), tokens);
    await writeFileWithConflictCheck(
      path.join(projectDir, '.roo', 'rules', 'kracked.md'),
      rooRules,
      ask,
      report
    );
  }

  // Kilo only loads a rules file if it's declared in kilo.jsonc's `instructions`
  // array. Merge into an existing config rather than clobbering the user's.
  if (editors && editors.includes('kilo')) {
    await writeKiloConfig({ projectDir, report });
  }

  // Only write the Antigravity pointer when Antigravity is actually in use —
  // `update` was creating .agents/ in Claude-only projects.
  if (!editors || editors.includes('antigravity')) {
    const krackedRulesContent = applyTokens(readTemplate('loaders/antigravity-rules.md'), tokens);
    await writeFileWithConflictCheck(
      path.join(projectDir, '.agents', 'rules', 'kracked.md'),
      krackedRulesContent,
      ask,
      report
    );
  }
}

/**
 * Write every skill to BOTH .claude/skills/<name>/SKILL.md and
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

/**
 * Add our rules file to kilo.jsonc's `instructions` array. Kilo does not
 * auto-load `.kilo/rules/` — a file is only read if it's listed here, so
 * without this the pointer is silently ignored.
 * Merges into an existing config; never overwrites the user's settings.
 */
async function writeKiloConfig({ projectDir, report }) {
  const configPath = path.join(projectDir, 'kilo.jsonc');
  const entry = '.agents/rules/kracked.md';

  if (fs.existsSync(configPath)) {
    const body = fs.readFileSync(configPath, 'utf8');
    if (body.includes(entry)) {
      report({ path: configPath, action: 'already configured' });
      return;
    }
    // Append to the existing instructions array if there is one, else add it.
    let updated;
    if (/"instructions"\s*:\s*\[/.test(body)) {
      updated = body.replace(/("instructions"\s*:\s*\[)/, `$1\n    "${entry}",`);
    } else {
      updated = body.replace(/^\s*\{/, `{\n  "instructions": ["${entry}"],`);
    }
    fs.writeFileSync(configPath, updated, 'utf8');
    report({ path: configPath, action: 'updated (added instructions entry)' });
    return;
  }

  const fresh = `{
  // Kilo reads AGENTS.md automatically. This entry additionally loads the
  // kracked-core rules pointer. Add your own settings alongside it.
  "instructions": ["${entry}"]
}
`;
  fs.writeFileSync(configPath, fresh, 'utf8');
  report({ path: configPath, action: 'written' });
}
