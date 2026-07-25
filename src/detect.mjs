// Detection helpers: what's already on disk, so the wizard doesn't ask
// questions it can answer itself and scaffold.mjs doesn't clobber anything.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** Does ~/.kracked/ already exist? */
export function globalMemoryExists() {
  const dir = path.join(os.homedir(), '.kracked');
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

export function globalMemoryDir() {
  return path.join(os.homedir(), '.kracked');
}

/**
 * Find agent setups already governing this directory, so we never silently
 * overwrite someone's existing system. A CLAUDE.md/AGENTS.md that kracked-core
 * didn't write is another system's loader — installing over it would replace
 * that agent's identity, which is exactly the failure this check prevents.
 *
 * Returns [{ file, path, scope, ours }] — `ours` marks files kracked-core
 * itself wrote (safe to refresh), everything else is someone else's.
 */
export function detectExistingAgentSetup(projectDir) {
  const found = [];

  const inspect = (filePath, label, scope) => {
    if (!fs.existsSync(filePath)) return;
    let body = '';
    try {
      body = fs.readFileSync(filePath, 'utf8');
    } catch {
      return; // unreadable is not our problem to solve here
    }
    // Our own loaders always reference kracked-core by name.
    const ours = /kracked-core|kracked\.md|\.kracked\//.test(body);
    found.push({ file: label, path: filePath, scope, ours });
  };

  inspect(path.join(projectDir, 'CLAUDE.md'), 'CLAUDE.md', 'project');
  inspect(path.join(projectDir, 'AGENTS.md'), 'AGENTS.md', 'project');
  inspect(path.join(projectDir, '.agents', 'rules', 'kracked.md'), '.agents/rules/kracked.md', 'project');
  inspect(path.join(os.homedir(), '.claude', 'CLAUDE.md'), '~/.claude/CLAUDE.md', 'global');

  return found;
}

/**
 * Is the target dir an existing codebase, empty, or new (doesn't exist yet)?
 * Returns one of: "new" (doesn't exist), "empty" (exists, no entries),
 * "existing" (exists, has files/dirs signalling a real codebase).
 */
export function classifyProjectDir(targetDir) {
  if (!fs.existsSync(targetDir)) return 'new';

  const entries = fs.readdirSync(targetDir).filter((e) => e !== '.DS_Store');
  if (entries.length === 0) return 'empty';
  return 'existing';
}

// Markers checked, in order, to guess the primary stack of an existing repo.
const STACK_MARKERS = [
  { file: 'package.json', label: 'Node.js' },
  { file: 'requirements.txt', label: 'Python' },
  { file: 'pyproject.toml', label: 'Python' },
  { file: 'go.mod', label: 'Go' },
  { file: 'composer.json', label: 'PHP' },
  { file: 'Cargo.toml', label: 'Rust' },
  { file: 'Gemfile', label: 'Ruby' },
  { file: 'pom.xml', label: 'Java (Maven)' },
  { file: 'build.gradle', label: 'Java/Kotlin (Gradle)' },
  { file: 'mix.exs', label: 'Elixir' },
];

/**
 * Extract a light summary of an existing codebase: name, stack guess,
 * framework hints, package.json scripts, whether it's a git repo.
 * Never throws — worst case it returns a mostly-empty summary.
 */
export function scanExistingProject(targetDir) {
  const summary = {
    name: path.basename(path.resolve(targetDir)),
    stack: [],
    frameworks: [],
    scripts: {},
    isGitRepo: fs.existsSync(path.join(targetDir, '.git')),
  };

  for (const marker of STACK_MARKERS) {
    if (fs.existsSync(path.join(targetDir, marker.file))) {
      summary.stack.push(marker.label);
    }
  }

  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) summary.name = pkg.name;
      if (pkg.scripts && typeof pkg.scripts === 'object') {
        summary.scripts = pkg.scripts;
      }
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const frameworkHints = [
        'react', 'next', 'vue', 'nuxt', 'svelte', 'angular',
        'express', 'fastify', 'nestjs', '@nestjs/core', 'koa',
      ];
      for (const hint of frameworkHints) {
        if (deps && deps[hint]) summary.frameworks.push(hint);
      }
    } catch {
      // Malformed package.json — skip framework/script detection, keep the rest.
    }
  }

  return summary;
}

/** Build the {{STACK}} token value from a scan result. */
export function stackSummaryLine(summary) {
  const parts = [];
  if (summary.stack.length) parts.push(summary.stack.join(', '));
  if (summary.frameworks.length) parts.push(`(${summary.frameworks.join(', ')})`);
  return parts.length ? parts.join(' ') : 'unknown — not auto-detected';
}

/** Which harnesses already have a footprint in this project dir? */
export function detectHarnesses(targetDir) {
  return {
    claudeCode: fs.existsSync(path.join(targetDir, '.claude')) ||
      fs.existsSync(path.join(targetDir, 'CLAUDE.md')),
    antigravity: fs.existsSync(path.join(targetDir, '.agents')) ||
      fs.existsSync(path.join(targetDir, 'AGENTS.md')),
    cursor: fs.existsSync(path.join(targetDir, '.cursor')),
  };
}
