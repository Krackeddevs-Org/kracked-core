---
name: kracked-explain
description: Use right after kracked-core init finishes, or when the user asks what kracked-core does or how memory works, to walk through what got installed in plain language.
---

Walk the user through what just got installed. Keep it conversational and short — this is likely
their first five minutes with the tool. Don't lecture, don't dump the whole file tree at once.

## 1. What got created, and where

Explain in plain language, not a file listing dump:

- **Global memory**, at `~/.kracked/` — this lives on the machine, not in any one project. It
  holds who the agent is (`identity.md`), how the user likes to work (`preferences.md`), and
  lessons learned across every project (`lessons.md` / `lessons-archive.md`), plus a registry of
  known projects (`projects.md`).
- **Project memory**, at `.kracked/` inside this repo — this is specific to this codebase: what
  it is (`project.md`), what's being worked on right now (`session.md`), and why past decisions
  were made (`decisions.md`).
- **The loader files** — `AGENTS.md` is the one every harness reads; `CLAUDE.md` just points at
  it (`@AGENTS.md`) so there's one source of truth instead of two files drifting apart.

## 2. The boundary rule

Teach it with a concrete wrong example, not just the rule stated abstractly:

> The rule: global memory never contains anything specific to one project. Project memory never
> contains anything about the user's general preferences or identity.
>
> Here's the mistake this prevents: say the agent learns "this project uses PostgreSQL with a
> `snake_case` naming convention" and writes that into global `preferences.md` instead of this
> project's `project.md`. Next week, in a completely different project that uses MongoDB, the
> agent boots up carrying that PostgreSQL assumption with it — because global memory loads
> everywhere. That's project detail leaking into global memory, and it poisons every other
> project from then on.

Keep the fix simple: project truth goes in `.kracked/`, everything that should follow the user
everywhere goes in `~/.kracked/`.

## 3. Why lessons split into an index and an archive

Explain the reasoning, not just the mechanism:

- `lessons.md` is read in full at every single boot, on every project. If every lesson's full
  detail lived there, that file would grow every session and eventually the boot itself would get
  slow and bloated just to load memory.
- So `lessons.md` stays a short index — one line per lesson — and the full detail lives in
  `lessons-archive.md`, which is only opened on demand when a specific lesson looks relevant to
  what's being worked on right now.
- This is the same reason project memory and global memory are split: keep what loads by default
  small, keep the detail available but not mandatory.

## 4. The three commands

Introduce them as a cycle, with when to reach for each:

- **`/kracked-boot`** — run this first, every session. Loads memory, orients on what happened
  last and what's next.
- **`/kracked-sdd`** — run this to build something. Right-sizes the work, then walks idea → spec
  → docs → build → review depending on how big the task is.
- **`/kracked-wrap`** — run this at the end of a session. Writes back anything worth remembering
  before the context disappears.

Boot at the start, wrap at the end, sdd for the work in between.

## 5. Close

End with the next concrete step: run `/kracked-boot` now to see it work. Don't add anything after
that — let the student try it rather than reading more.
