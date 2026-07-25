# Kracked Core — Class Handout

**For students.** Everything you need in one page. Keep this open during class.

---

## Before we start

You need:
- An editor with an AI agent — any of:
  **Antigravity** · **Claude Code** · **Kilo Code** or **Roo Code** (both VS Code extensions)
  *(Cursor and Windsurf load the memory but don't get the `/kracked-*` commands.)*
- **Node 18+** — check with `node --version`
- A project folder (new or existing, both work)

---

## Part 1 — The problem we're solving (5 min)

Your AI agent has **amnesia**. Every new chat, it knows nothing about:
- your stack
- your conventions
- the three things you corrected it on yesterday

So you re-explain. Every time. Forever.

And when you say *"build me a login page"*, it builds **something** — then you spend an hour finding out it wasn't what you meant.

Two problems:

| Problem | Cause |
|---|---|
| It forgets | No memory between sessions |
| It builds the wrong thing | No spec before code |

Kracked Core is two fixes: **memory files** the agent reads every session, and a **build flow** that specs before it codes.

---

## Part 2 — Install (2 min)

In your project folder:

```bash
npx kracked-core init
```

Answer the questions — **arrow keys to move, Enter to pick, spacebar to tick boxes.**
Pressing Enter on every question accepts the defaults and gives you a working setup.

It will ask:
1. What to call your agent
2. Your name
3. Set up this project?
4. New project or existing codebase?
5. Which editor(s) you use — **spacebar to tick, Enter to confirm**

Then it writes your files and tells you what it made.

> **If it asks to overwrite something — read the prompt.** It never overwrites without asking. If you're unsure, choose *skip*.

---

## Part 3 — What just got created (5 min)

Two places. **The split between them is the most important idea in this class.**

### Global memory — `~/.kracked/`
Lives in your home folder. **Shared by every project.**

| File | What's in it |
|---|---|
| `identity.md` | Who your agent is, how it talks |
| `preferences.md` | How *you* like to work |
| `lessons.md` | Mistakes it won't repeat — **read every boot** |
| `lessons-archive.md` | The full detail — read only when needed |
| `projects.md` | List of your projects |

### Project memory — `your-project/.kracked/`
Lives in the repo. **This project only.**

| File | What's in it |
|---|---|
| `project.md` | Stack, conventions, how to run it |
| `session.md` | Where we are right now |
| `decisions.md` | Why things are the way they are |
| `sdd/tracker.md` | Story status + evidence |
| `sdd/specs/` `epics/` `stories/` `architecture/` | Your design docs |

### ⚠️ The boundary rule — get this right

| Put in GLOBAL | Put in PROJECT |
|---|---|
| Who your agent is | What this codebase is |
| How you like to work | This project's conventions |
| Lessons for any project | This sprint's state |

**Get it wrong and here's what happens:** you write *"we use Tailwind"* into **global** memory. Next week you open your Python API project. Your agent tries to use Tailwind. In a Python API.

> **Rule of thumb:** if it's only true for *this* repo, it goes in the project.

---

## Part 4 — The three daily commands (10 min)

### `/kracked-boot` — start of session

The agent reads its memory and tells you where you left off, in one line.

Run this **first, every session.** Before anything else — even a quick question.

### `/kracked-sdd` — build something

The build flow: **idea → spec → docs → build → review**

It sizes the job first, so you don't get a 5-page spec for a typo:

| Your job | What it does |
|---|---|
| Fix a typo | Just fixes it |
| Small feature | Quick spec, then builds |
| Big feature | Full flow with stories |

It keeps a tracker:

| ID | Story | Status | Evidence |
|---|---|---|---|
| 1.1 | User can log in | done | logged in manually, 3 tests pass |
| 1.2 | Password reset | in-progress | — |

**The rule that matters:** nothing becomes `done` without **evidence**. Not "tests pass" — *what did you actually check, and what didn't you?*

### `/kracked-wrap` — end of session

The agent writes down what it learned before you close the chat.

> **Don't skip this.** Boot without wrap = a memory system that just forgets more slowly. The wrap is where memory gets *written*.

---

## Part 4b — Make it yours (5 min)

Your agent shipped with a generic personality. Change it.

```
/kracked-identity
```

Tell it what's annoying — too wordy, too formal, keeps suggesting the wrong library. It edits
the right file for you.

**Two files, two purposes — don't mix them up:**

| File | Holds | Example |
|---|---|---|
| `~/.kracked/identity.md` | Who your AGENT is | its name, its tone |
| `~/.kracked/preferences.md` | How YOU work | "I use Tailwind, never CSS modules" |

> These are just markdown files in your home folder. You can open and edit them directly —
> often faster than asking. Changes load at your next `/kracked-boot`.

---

## Part 5 — Try it now (15 min)

**Exercise 1 — prove it remembers**
1. `/kracked-boot`
2. Tell your agent something about your project: *"we use Postgres, not MySQL"*
3. `/kracked-wrap`
4. **Close the chat completely. Open a new one.**
5. `/kracked-boot`
6. Ask: *"what database do we use?"*

It knows. That's the whole product.

**Exercise 2 — build something small**
1. `/kracked-sdd`
2. Ask for a small feature
3. Watch it spec before it builds
4. Check `.kracked/sdd/tracker.md`

**Exercise 3 — teach it a lesson**
1. Correct your agent on something
2. `/kracked-wrap`
3. Open `~/.kracked/lessons.md` — your correction is there, one line
4. It won't make that mistake again

---

## Cheat sheet

```
npx kracked-core init      install
npx kracked-core update    get the latest skills, keep your memory
/kracked-boot             start of session   ← always first
/kracked-sdd              build something
/kracked-wrap             end of session     ← don't skip
/kracked-explain          "what is all this?"
/kracked-identity         change your agent's name/tone/preferences
```

**Memory locations**
```
~/.kracked/               global — all projects
<your-project>/.kracked/  project — this repo only
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `/kracked-boot` does nothing | Restart your editor — skills load at startup |
| "Command not found" | Restart your editor first. Still missing? Run `npx kracked-core@latest update` |
| Agent ignores its memory | Check `AGENTS.md` exists in your project root |
| Claude Code doesn't see it | Check `CLAUDE.md` exists — it should contain `@AGENTS.md` |
| Agent forgot everything | Did you run `/kracked-wrap` last session? |
| Wrong info in memory | **Just edit the file.** It's markdown. Faster than arguing |
| Want to remove it all | `npx kracked-core uninstall` — asks before deleting anything |
| New version came out | `npx kracked-core@latest update` — keeps all your memory |

---

## The one thing to remember

> Your agent's memory is **plain files you own**. Read them. Edit them. Commit them.
>
> When it gets something wrong — fix the file, not the prompt.

---

*Questions after class: open an issue at [github.com/Krackeddevs-Org/kracked-core](https://github.com/Krackeddevs-Org/kracked-core)*
