<div align="center">

# Kracked Core

**Your AI coding agent forgets everything between sessions — and builds whatever you vaguely described.**

Kracked Core fixes both.

[![npm](https://img.shields.io/npm/v/kracked-core?color=black)](https://www.npmjs.com/package/kracked-core)
[![license](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

```bash
npx kracked-core init
```

</div>

---

## The problem

You've had this conversation:

> **You:** Build me a login page.
> **Agent:** *builds a login page*
> **You:** No, we use Supabase auth. I told you yesterday.
> **Agent:** You're absolutely right! Let me fix that.

Tomorrow it happens again. Your agent has no memory. Every session starts from zero, and every session you re-explain your stack, your conventions, and the same three mistakes you already corrected.

The second problem is quieter: you describe a feature in one sentence, the agent builds *something*, and you spend the next hour discovering it wasn't what you meant.

## What this gives you

| | Before | After |
|---|---|---|
| **Memory** | Re-explain everything, every session | Agent reads its memory on boot and picks up where you left off |
| **Mistakes** | Same correction, over and over | Corrections get written down once, and stay corrected |
| **Building** | "Build me X" → surprise | Idea → spec → build → review, with a tracker you can see |
| **"Done"** | Agent says done, it isn't | Nothing is `done` without stated evidence |

It's plain markdown files. You can read them, edit them, commit them to git, and delete them. No database, no cloud, no black box.

## Install

```bash
npx kracked-core init
```

The wizard asks a few questions — name your agent, is this a new or existing project, which editor you use — and writes the files. Hold Enter through it and you'll get a sane setup.

**Full support** (memory + all five commands):
**Antigravity** · **Claude Code** · **Kilo Code** (VS Code) · **Roo Code** (VS Code)

**Memory only:** Cursor, Windsurf, and anything else that reads `AGENTS.md` — your agent loads its
memory, but the `/kracked-*` commands aren't installed, because those editors use a different
skill format. You can still run the flow by asking in plain language.

## Use

Five commands. Three of them are the whole daily loop.

```
/kracked-boot    Start of session — agent loads its memory and tells you where you left off
/kracked-sdd     Build something — idea → spec → docs → build → review
/kracked-wrap    End of session — agent writes down what it learned

/kracked-identity  Change your agent's name, tone, or how you like to work
/kracked-explain   "What is all this?" — walks you through what got installed
```

> **`/kracked-wrap` is not optional.** Boot without wrap is a memory system that just forgets more slowly. The wrap is where memory actually gets written.

## How it works

Two layers of memory, and the split between them is the whole idea.

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

So: the full lesson goes into `lessons-archive.md`, and **one line** goes into `lessons.md`. The index stays small. The archive grows without cost, and gets opened only when a specific lesson is actually relevant.

Your boot payload stays flat no matter how much your agent learns. That's the trick.

## The build flow

`/kracked-sdd` doesn't force ceremony on everything. It sizes the job first:

| Job | What happens |
|---|---|
| Fix a typo | Skips straight to the fix. No spec. |
| Small, clear feature | Light spec → build → review |
| Big or risky | Full flow: idea → spec → stories → build → review |

Then it tracks the work:

| ID | Story | Status | Evidence |
|---|---|---|---|
| 1.1 | User can log in | done | manual login OK, 3 tests pass |
| 1.2 | Password reset | in-progress | — |
| 1.3 | Remember me | backlog | — |

**A story cannot move to `done` without evidence.** Not "the tests pass" — what did you actually verify, and what did you *not*? Green tests are not a working feature. This one rule catches more bugs than any other part of the system.

## Terminal commands

```bash
npx kracked-core init        # set up memory in this project
npx kracked-core status      # what's installed, and is it current?
npx kracked-core update      # refresh skills + loaders, keep your memory
npx kracked-core uninstall   # remove it (asks before deleting anything)
```

## Am I on the latest version?

```bash
npx kracked-core@latest status
```

Shows the version that installed your files, the latest on npm, and tells you plainly whether
you need to update:

```
This project ~/code/my-app
  installed version: 1.4.0
  .agents/skills: 5/5 skills

Global memory ~/.kracked
  4/4 files present
  lessons learned: 12

Version
  running now:   1.5.0
  latest on npm: 1.5.0

  Up to date.
```

> The `@latest` matters — plain `npx kracked-core` can serve a cached older copy.

## Updating

When a new version ships:

```bash
npx kracked-core@latest update
```

Refreshes the skills and loaders. **Your memory is never touched** — identity, preferences,
lessons, and everything under `.kracked/` stay exactly as they are. It keeps your agent's name too.

Restart your editor afterwards so it picks up the new skills.

## Uninstalling

```bash
npx kracked-core uninstall
```

Shows what it will remove and asks before deleting — project files and global memory are separate
questions. It never touches a `CLAUDE.md` or `AGENTS.md` another tool wrote.

Full guide, including manual removal and how to keep your docs: [docs/UNINSTALL.md](https://github.com/Krackeddevs-Org/kracked-core/blob/main/docs/UNINSTALL.md)

## FAQ

**Does this send my code anywhere?**
No. Everything is local markdown files. There's no service, no telemetry, no account.

**Should I commit `.kracked/` to git?**
Yes, mostly. Project memory is useful to your teammates. Add `.kracked/session.md` to `.gitignore` if you don't want your working state shared.

**My editor isn't listed. Will it work?**
If it reads `AGENTS.md`, yes. That's most of them now. Claude Code is the exception — it reads `CLAUDE.md`, so we write a one-line shim that imports `AGENTS.md`.

**Can I edit the memory files by hand?**
Please do. They're yours. Correcting your agent's memory directly is faster than arguing with it.

**How is this different from just writing a good prompt?**
A prompt lasts one session. This lasts across all of them, and it compounds — every mistake you correct is a mistake you never see again.

## Contributing

Issues and PRs welcome. This started as teaching material for the [KrackedDevs](https://github.com/Krackeddevs-Org) weekly class, so clarity for beginners beats cleverness.

## License

MIT — see [LICENSE](./LICENSE).
