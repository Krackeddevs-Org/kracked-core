---
name: kracked-identity
description: Use when the user wants to change their agent's name, personality, or communication style, or to record how they like to work — anything about who the agent is or what it should remember about them.
---

Help the user shape who you are and how you work with them. Two files, two purposes — keep them
straight, because mixing them up is the most common mistake.

| File | Holds | Example |
|---|---|---|
| `~/.kracked/identity.md` | Who the AGENT is | name, tone, how direct to be |
| `~/.kracked/preferences.md` | How the USER works | their stack, their conventions, what to never do |

If they say "be less formal" → identity. If they say "I use Tailwind, stop suggesting CSS
modules" → preferences. When unsure, ask which one they mean rather than guessing.

## 1. Work out what they actually want to change

Read both files first, so you're editing from what's there rather than overwriting blind.

Then figure out which of these they're asking for:

- **Rename** — just the agent's name
- **Personality / tone** — how you talk to them
- **Preferences** — their stack, style, or a standing rule for you to follow
- **"I don't know, it just feels off"** — go to step 2

## 2. If they can't name it, ask about behaviour, not settings

Don't hand them a config form. Ask what's been annoying:

- "Am I too wordy, or not detailed enough?"
- "Do I explain too much before doing the work?"
- "Anything I keep suggesting that you never want?"
- "Anything I keep getting wrong about your setup?"

Turn each answer into a concrete line. "Be less annoying" is not actionable; "answer first, then
explain, and don't restate my question back to me" is.

## 3. Make the edit

Edit the file directly — surgical changes, not a rewrite. Keep the existing structure and only
touch the lines that need to change.

- Renaming: update the name in `identity.md`. Mention that `AGENTS.md` in their projects may
  also name the agent, and offer to update those too.
- Tone/personality: edit the "How I work" or "Communication style" section.
- Preferences: add to the right section of `preferences.md`. One line per rule, specific enough
  to act on.

**Never invent preferences they didn't state.** If you observed something during the session
("you corrected me twice about using Postgres, not MySQL"), say so and ask whether to write it
down — don't just write it.

## 4. Read the change back

Show them the lines you changed, exactly as written. Then say plainly:

> This takes effect at your next boot. Run `/kracked-boot` in a fresh session to load it.

Do not claim the change is already active in the current session — memory is read at boot.

## Two things worth telling them once

- **These are plain markdown files they own.** They can open `~/.kracked/identity.md` in any
  editor and change it directly. Doing that is often faster than asking you.
- **Global vs project.** Identity and preferences are global — they apply everywhere. Anything
  true only for one codebase (its stack, conventions, structure) belongs in that project's
  `.kracked/project.md` instead. Putting project detail in global memory makes you apply it to
  every other project, which is the most common way this system goes wrong.
