# AGENTS.md — {{PROJECT_NAME}}

This is the canonical loader. Every harness (Antigravity, Claude Code, others) reads this file
first. If a harness has its own shim (`CLAUDE.md`, `.agents/rules/kracked.md`), that shim points
back here — the instructions live in exactly one place, here, so they can't drift apart.

## Who you are

You are **{{AGENT_NAME}}**. Your identity, communication style, and how you work are defined in
global memory at `~/.kracked/identity.md`. Read it — don't assume a different persona.

## Boot sequence (run this at the start of every session)

Read these files, in this exact order, before doing any work:

1. `~/.kracked/identity.md` — who you are
2. `~/.kracked/preferences.md` — how {{USER_NAME}} likes to work, across all projects
3. `~/.kracked/lessons.md` — the lessons INDEX only (one line per lesson)
4. `~/.kracked/projects.md` — what else {{USER_NAME}} is building
5. `.kracked/project.md` — what THIS project is (stack, conventions, structure)
6. `.kracked/session.md` — working memory: current state, next step, blockers
7. `.kracked/decisions.md` — this project's decision log
8. `.kracked/sdd/tracker.md` — story status ledger, if this project uses SDD

**Important: do NOT read `~/.kracked/lessons-archive.md` at boot.** It holds the full detail
behind each line in `lessons.md` and is opened on demand only — when a lesson looks relevant to
the current problem, or {{USER_NAME}} asks for it. Reading it every boot would make the boot
payload grow without bound as more lessons accumulate; the index/archive split exists specifically
to prevent that.

After reading, orient in one line before starting work: state the project, the last known state
from `session.md`, and the next step. Example: "{{PROJECT_NAME}}: last session left off building
the signup flow, next step is wiring the email step. Ready."

## Boundary rule

- **Global memory** (`~/.kracked/`) — identity, cross-project preferences, cross-project lessons,
  the project registry. Nothing about a specific codebase belongs here.
- **Project memory** (`.kracked/`) — this codebase's stack, conventions, session state, decisions,
  and SDD tracker. Nothing here should be copied up into global memory.
- Putting project-specific detail into global memory poisons every other project that shares it.
  If you're unsure which layer something belongs in, ask: "would this make sense in a totally
  different project?" If no, it's project memory.

## Available commands

| Command | Does |
|---|---|
| `/kracked-boot` | Runs the boot sequence above and orients in one line |
| `/kracked-sdd` | Runs the SDD flow: idea → spec → docs → build → review |
| `/kracked-wrap` | Writes lessons + updates session state, closes the session cleanly |
| `/kracked-explain` | Walks {{USER_NAME}} through what kracked-core installed and why |
| `/kracked-identity` | Change who you are, your tone, or how {{USER_NAME}} likes to work |

## Writing memory (wrap)

When a session ends (`/kracked-wrap`), update `.kracked/session.md` with the new "Last Active"
state and next step. If something non-obvious was learned that would help a future session avoid
the same mistake, append a full entry to `~/.kracked/lessons-archive.md` and add exactly ONE line
to `~/.kracked/lessons.md`. Never paste a full lesson entry into the index — that's the mistake
this split exists to prevent.

## Terminology

Use these words, consistently: **global memory**, **project memory**, **boot**, **wrap**, **SDD**,
**tracker**. Don't call this system "the core," "the brain," "context files," or "rules" — those
terms don't appear anywhere else in this project's docs, and mixing terminology makes the memory
model harder to reason about over time.
