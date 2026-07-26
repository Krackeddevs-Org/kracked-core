<div align="center">

# Kracked Core

**Your AI coding agent forgets everything between sessions — and builds whatever you vaguely described.**

Kracked Core fixes both.

[![npm](https://img.shields.io/npm/v/kracked-core?color=black)](https://www.npmjs.com/package/kracked-core)
[![license](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

```bash
npx kracked-core init
```

Zero dependencies · plain markdown files · nothing leaves your machine

</div>

---

## Contents

**Start here** — [The problem](#the-problem) · [What it actually is](#what-it-actually-is) · [Install](#install) · [Your first session](#your-first-session) · [A worked example](#a-worked-example)

**Reference** — [How memory works](#how-memory-works) · [The build flow](#the-build-flow) · [What gets written](#what-gets-written-to-disk) · [Commands](#command-reference) · [Editor support](#editor-support) · [FAQ](#faq)

---

## The problem

You've had this conversation:

> **You:** Build me a login page.
> **Agent:** *builds a login page*
> **You:** No, we use Supabase auth. I told you yesterday.
> **Agent:** You're absolutely right! Let me fix that.

Tomorrow it happens again. Your agent has no memory. Every session starts from zero, and every session you re-explain your stack, your conventions, and the same three mistakes you already corrected.

The second problem is quieter: you describe a feature in one sentence, the agent builds *something*, and you spend the next hour discovering it wasn't what you meant.

## What it actually is

Kracked Core is a **CLI installer**. You run it once in a project, it asks a few questions, and it writes a set of markdown files to your disk. That's the whole product — there is no app, no server, no extension.

Those files do two jobs:

**1. They give your agent a memory.** A `~/.kracked/` folder holds who your agent is, how you like to work, and every lesson it has learned. A `.kracked/` folder in each project holds that codebase's stack, conventions, and current state. Your agent reads them at the start of every session.

**2. They give your agent a process.** Five skills get installed as slash commands. They cover starting a session, building a feature properly, and writing memory down before you close the laptop.

| | Before | After |
|---|---|---|
| **Memory** | Re-explain everything, every session | Agent reads its memory on boot and picks up where you left off |
| **Mistakes** | Same correction, over and over | Corrections get written down once, and stay corrected |
| **Building** | "Build me X" → surprise | Idea → spec → build → review, with a tracker you can see |
| **"Done"** | Agent says done, it isn't | Nothing is `done` without stated evidence |

It's plain markdown. You can read it, edit it, commit it to git, and delete it. No database, no cloud, no black box. If you don't like what your agent believes, open the file and fix the sentence.

### What it is not

- **Not a model or an agent.** It configures the agent you already use.
- **Not a hosted service.** Nothing is uploaded. There's no account and no telemetry.
- **Not automatic.** Memory gets written when you run `/kracked-wrap`. Skip that, and nothing is saved.

## Install

```bash
npx kracked-core init
```

The wizard asks six questions. Pressing Enter through all of them gives you a working setup.

| # | Question | Default | What it affects |
|---|---|---|---|
| 1 | What should we call your agent? | `KC` | Your agent's name, used everywhere in its memory |
| 2 | Your name? | your system username | How it addresses you |
| 3 | Set up this project? | Yes | Whether project memory is written here |
| 4 | Project directory? | `.` (here) | Where project memory goes |
| 5 | New project or existing codebase? | auto-detected | Scan vs. ask |
| 6 | Which editor(s) do you use? | Antigravity + Claude Code | Which skill folders get written |

**Existing codebase?** It scans your repo — package name, stack, git status, npm scripts — shows you what it found, and asks if that's right before writing anything.

**Starting fresh?** It asks two optional questions instead (what you're building, what stack), so your agent knows something on day one rather than nothing.

**Already installed here?** It notices, and offers to refresh package files, reinstall, or cancel — rather than asking you about 27 files one at a time.

Node 18 or newer. No other dependencies — the package installs nothing.

## Your first session

After `init` finishes, it tells you exactly this:

```
Next step:
  Open this project in your editor and run /kracked-boot to load Nova's memory.
```

**Restart your editor first.** Editors load skills at startup, so the `/kracked-*` commands won't appear until you do.

Then the daily loop is three commands:

```
/kracked-boot    Start of session — agent loads its memory and tells you where you left off
/kracked-sdd     Build something — idea → spec → docs → build → review
/kracked-wrap    End of session — agent writes down what it learned
```

Boot gives you back a single line, not a wall of text:

> I'm Nova. Last session: shipped email login (story 1.1). Next: password reset (1.2). Caution: this project's tests don't cover the auth callback.

Two more commands you'll use occasionally:

```
/kracked-identity  Change your agent's name, tone, or how you like to work
/kracked-explain   "What is all this?" — walks you through what got installed
```

> **`/kracked-wrap` is not optional.** Boot without wrap is a memory system that just forgets more slowly. The wrap is where memory actually gets written — lessons, session state, decisions. Close the laptop without it and the session is gone.

## A worked example

Here's a real first day, start to finish.

### 1. Install

```bash
cd ~/code/demo-app
npx kracked-core init
```

You name the agent `Nova`, accept the defaults, and it scans the repo:

```
  Scanned project:
    Name:   demo-app
    Stack:  Node.js (react, next)
    Git:    yes
    Scripts: dev, build, test

✔ Does this look right?  Yes
✔ Which editor(s) do you use?  Antigravity, Claude Code
```

It writes the files and stops. Nothing else happens yet.

### 2. What it wrote about your project

`.kracked/project.md` — drafted from the scan, not invented:

```markdown
# Project — demo-app

## Overview
- **Name:** demo-app
- **Stack:** Node.js (react, next)
- **Created:** 2026-07-26

## Conventions
- _(not set yet)_

## How to run it
- `dev` — `npm run dev`
- `build` — `npm run build`
- `test` — `npm run test`
```

The `_(not set yet)_` lines are honest placeholders — it detected your scripts but it does **not** guess your conventions. Fill those in yourself, or let the agent learn them and write them during a wrap.

### 3. Boot

Restart your editor, then:

```
/kracked-boot
```

> I'm Nova. No previous session recorded for demo-app — this is a fresh install. Next: nothing tracked yet. Global memory has no lessons yet.

Honest, because there genuinely is nothing yet. It doesn't fabricate a history.

### 4. Build something

```
/kracked-sdd  add email login
```

The agent sizes the job first and says so out loud. For this one it writes a short spec (`what` / `why` / acceptance criteria / **out of scope** / edge cases), confirms it with you, then splits it into stories and puts them in the tracker:

```markdown
| ID  | Story                        | Status      | Evidence |
|-----|------------------------------|-------------|----------|
| 1.1 | User can log in with email   | in-progress | —        |
| 1.2 | Password reset               | backlog     | —        |
```

Then it builds `1.1`, moving the row to `review` the moment the code is written — not at the end of the session.

### 5. The evidence gate

The agent wants to mark `1.1` done. It can't, until it writes what it actually checked:

```markdown
| 1.1 | User can log in with email | done | Logged in as test@demo.dev in browser, session cookie set. NOT verified: expired-token path, rate limiting. |
```

That "NOT verified" half is the point. Green tests aren't evidence, and the gaps are where tomorrow's bug lives.

### 6. Wrap

```
/kracked-wrap
```

Say during the session you corrected the agent — it used `fetch` when this repo standardises on a typed API client. That correction becomes permanent:

**`~/.kracked/lessons.md`** (the index, read every boot) gets exactly one line:

```markdown
- Use the typed apiClient, never raw fetch — see archive 2026-07-26 apiClient
```

**`~/.kracked/lessons-archive.md`** (opened only when relevant) gets the full story: what happened, why it matters, how to avoid it.

And `.kracked/session.md` records where you stopped and what's next.

### 7. Tomorrow

```
/kracked-boot
```

> I'm Nova. Last session: shipped email login (1.1), evidence recorded. Next: password reset (1.2). Caution: use the typed apiClient, never raw fetch.

You didn't re-explain anything. That's the entire pitch.

## How memory works

Two layers, and the split between them is the whole idea.

```
~/.kracked/              GLOBAL — survives every project
  identity.md            who your agent is
  preferences.md         how you like to work
  lessons.md             mistakes it won't repeat  ← read every boot
  lessons-archive.md     the full detail           ← read on demand only
  projects.md            which projects exist

your-project/.kracked/   PROJECT — this codebase only
  project.md             stack, conventions, how to run it
  session.md             where we are right now
  decisions.md           why things are the way they are
  sdd/
    tracker.md           story status + evidence
    specs/               what to build and why
    epics/               groups of related stories
    stories/             one shippable slice each
    architecture/        how it's built (large work only)
      decisions/         ADRs, numbered, never renumbered
```

### The boundary rule

| Goes GLOBAL | Goes PROJECT |
|---|---|
| Who your agent is | What this codebase is |
| How you like to work | This project's conventions |
| Lessons that apply anywhere | This sprint's state |

Getting this wrong is the #1 failure mode. Put "we use Tailwind in this repo" into global memory and your agent will try to use Tailwind in your Python API. Keep project truth in the project.

### Why lessons split into two files

`lessons.md` is read on **every single boot**. If it grew forever, boot would get slower forever — and Antigravity caps rules files at 12,000 characters, so eventually it would simply break.

So: the full lesson goes into `lessons-archive.md`, and **one line** goes into `lessons.md`. The index stays small. The archive grows without cost, and gets opened only when a specific lesson is actually relevant to what you're doing right now.

Your boot payload stays flat no matter how much your agent learns. That's the trick.

### What boot actually does

`/kracked-boot` reads files in a fixed order — identity, then preferences, then the lessons index, then the project's stack, session, and decisions. Each file individually, never skimmed as a batch.

It works with only one layer present. Global memory but no project here? It boots and says so. Neither installed? It tells you to run `init` rather than pretending. **It never invents identity, preferences, or history it hasn't read** — missing is reported as missing.

## The build flow

`/kracked-sdd` doesn't force ceremony on everything. It sizes the job first and states the call out loud:

| Job | What happens |
|---|---|
| **Trivial** — typo, one-liner, config tweak | Straight to the fix. No spec, no tracker row. |
| **Small** — one clear feature | Light spec → build → review |
| **Large or risky** — multiple areas, unclear scope, data/auth/payments | Full flow: spec → architecture + ADRs → stories → build → review |

Over-ceremony on a small task is a failure mode, not thoroughness. It will not write a spec file for a typo.

Then it tracks the work. Four statuses, no others:

`backlog` → `in-progress` → `review` → `done`

| ID | Story | Status | Evidence |
|---|---|---|---|
| 1.1 | User can log in | done | manual login OK, 3 tests pass |
| 1.2 | Password reset | in-progress | — |
| 1.3 | Remember me | backlog | — |

The tracker updates **the moment** a status changes — never batched to the end of a session, because a stale ledger is worse than none.

### The evidence gate

**A story cannot move to `done` without a note stating what was verified and what was not.**

Not "the tests pass" — what did you actually run, what did you see, and what did you skip? Green tests are not a working feature; a test can pass while testing the wrong thing.

A story marked `done` with no evidence is worse than one left at `review`, because it hides risk instead of surfacing it. This one rule catches more bugs than any other part of the system.

## What gets written to disk

A real install into a Next.js project, choosing Antigravity + Claude Code:

```
demo-app/
├── AGENTS.md                    ← canonical instructions
├── CLAUDE.md                    ← one-line shim: @AGENTS.md
├── .kracked/                    ← your project memory
│   ├── project.md
│   ├── session.md
│   ├── decisions.md
│   ├── .version
│   └── sdd/
│       ├── tracker.md
│       ├── README.md
│       ├── specs/_TEMPLATE.md
│       ├── epics/_TEMPLATE.md
│       ├── stories/_TEMPLATE.md
│       └── architecture/_TEMPLATE.md
│           └── decisions/_TEMPLATE.md
├── .agents/                     ← Antigravity / Kilo / Roo
│   ├── rules/kracked.md
│   └── skills/kracked-{boot,sdd,wrap,identity,explain}/SKILL.md
└── .claude/                     ← Claude Code
    └── skills/kracked-{boot,sdd,wrap,identity,explain}/SKILL.md
```

Plus global memory at `~/.kracked/` (identity, preferences, lessons, archive, projects).

**`AGENTS.md` is canonical; `CLAUDE.md` is a one-line shim that imports it.** Most editors read `AGENTS.md` natively — Claude Code is the exception, it only reads `CLAUDE.md`. Writing the instructions once and shimming means the two can't drift apart, which is the exact bug this package exists to prevent.

Install is **non-destructive**. Existing files are never silently overwritten — you get skip / overwrite / write-alongside per file, and it refuses to touch a `CLAUDE.md` or `AGENTS.md` another tool wrote.

## Command reference

```bash
npx kracked-core init        # set up memory in this project
npx kracked-core status      # what's installed, and is it current?
npx kracked-core update      # refresh skills + loaders, keep your memory
npx kracked-core uninstall   # remove it (asks before deleting anything)
```

### Am I on the latest version?

```bash
npx kracked-core@latest status
```

```
kracked-core status

This project ~/code/demo-app
  installed version: 1.6.1
  .claude/skills: 5/5 skills
  .agents/skills: 5/5 skills

Global memory ~/.kracked
  4/4 files present
  lessons learned: 12

Version
  running now: 1.6.1
  latest on npm: 1.6.1

  Up to date.
```

> The `@latest` matters — plain `npx kracked-core` can serve a cached older copy.

### Updating

```bash
npx kracked-core@latest update
```

Refreshes the skills and loaders. **Your memory is never touched** — identity, preferences, lessons, and everything under `.kracked/` stay exactly as they are. It keeps your agent's name too.

Restart your editor afterwards so it picks up the new skills.

### Uninstalling

```bash
npx kracked-core uninstall
```

Shows what it will remove and asks before deleting — project files and global memory are separate questions. It never touches a `CLAUDE.md` or `AGENTS.md` another tool wrote.

Full guide, including manual removal and how to keep your docs: [docs/UNINSTALL.md](https://github.com/Krackeddevs-Org/kracked-core/blob/main/docs/UNINSTALL.md)

## Editor support

| Editor | Memory | `/kracked-*` commands | Files written |
|---|:---:|:---:|---|
| **Antigravity** | ✅ | ✅ | `AGENTS.md`, `.agents/rules/`, `.agents/skills/` |
| **Claude Code** | ✅ | ✅ | `CLAUDE.md` shim, `.claude/skills/` |
| **Kilo Code** (VS Code) | ✅ | ✅ | `AGENTS.md`, `.agents/`, `kilo.jsonc` entry |
| **Roo Code** (VS Code) | ✅ | ✅ | `AGENTS.md`, `.agents/`, `.roo/rules/` |
| Cursor, Windsurf, others | ✅ | — | `AGENTS.md` |

**Memory only** means your agent still loads everything on boot — but the slash commands aren't installed, because those editors use a different skill format. You can run the same flow by asking in plain language ("load your memory and tell me where we left off").

## FAQ

**Does this send my code anywhere?**
No. Everything is local markdown files. There's no service, no telemetry, no account, and the package has zero dependencies.

**Do I have to use the slash commands?**
Boot and wrap are what make it work. The SDD flow is optional — plenty of people use this purely for memory.

**Should I commit `.kracked/` to git?**
Yes, mostly. Project memory is useful to your teammates. Add `.kracked/session.md` to `.gitignore` if you don't want your working state shared.

**What about `~/.kracked/`?**
That's yours alone — it lives in your home folder and never gets committed anywhere.

**My editor isn't listed. Will it work?**
If it reads `AGENTS.md`, yes. That's most of them now. Claude Code is the exception — it reads `CLAUDE.md`, so we write a one-line shim that imports `AGENTS.md`.

**Can I edit the memory files by hand?**
Please do. They're yours. Correcting your agent's memory directly is faster than arguing with it.

**Will it overwrite my existing `AGENTS.md`?**
No. It detects another agent system and asks before touching anything, per file.

**I ran init but the commands don't appear.**
Restart your editor. Skills load at startup.

**How is this different from just writing a good prompt?**
A prompt lasts one session. This lasts across all of them, and it compounds — every mistake you correct is a mistake you never see again.

## Contributing

Issues and PRs welcome. This started as teaching material for the [KrackedDevs](https://github.com/Krackeddevs-Org) weekly class, so clarity for beginners beats cleverness.

## License

MIT — see [LICENSE](./LICENSE).
