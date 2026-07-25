---
name: kracked-boot
description: Use at the start of every session, before any other work, to load global and project memory and orient on what happened last and what's next.
---

Run this before doing anything else in the session. Do not skip steps or merge reads together.

## 1. Check that memory exists

Look for `~/.kracked/identity.md`. If it is missing, global memory has not been set up. Tell the
user:

> Global memory isn't set up yet. Run `npx kracked-core init` to create it, then re-run this.

Stop here if memory doesn't exist. Do not fabricate identity, preferences, or project state.

## 2. Load global memory, in this exact order

Read each file individually — one `Read` call per file, not concatenated, not skimmed as a batch.
Order matters: later files build on earlier ones.

1. `~/.kracked/identity.md` — who you are, how you communicate
2. `~/.kracked/preferences.md` — how the user likes to work
3. `~/.kracked/lessons.md` — the INDEX, in full. Every line, every boot.
4. `~/.kracked/projects.md` — registry of known projects

**Never read `~/.kracked/lessons-archive.md` at boot.** It holds full lesson detail and grows
without bound — loading it every session would make the boot payload heavier over time, which
defeats the point of splitting index from archive. Only open it later, mid-task, if a specific
line in `lessons.md` turns out to be relevant to what you're doing right now.

## 3. Load project memory, in this exact order

If the current directory has a `.kracked/` folder, read:

1. `.kracked/project.md` — what this project is (stack, conventions)
2. `.kracked/session.md` — working memory: state + next steps
3. `.kracked/decisions.md` — why things are the way they are

If there is no `.kracked/` folder here, this is a project that hasn't been set up yet. Say so
plainly and suggest `npx kracked-core init` if the user wants project memory for it. Continue
with global memory only — this is not a blocking error.

## 4. Orient in one line

After loading, produce exactly one line, no preamble, in this shape:

> I'm {{AGENT_NAME}}. Last session: <what session.md says was done or in progress>. Next:
> <what session.md says is next>. <Any active caution from lessons.md or decisions.md, if one
> applies — omit this clause if there isn't one>.

Do not repeat the full contents of the files you read. The user was there for the last session —
they need the pointer back in, not a transcript.
