---
name: kracked-wrap
description: Use at the end of a session, or when the user says they're done for now, to write memory before context is lost and close the session cleanly.
---

Run this at the end of a session, before context is lost. Work through the steps in order.

## 1. Decide if this session is worth logging

Not every session needs a memory write. If nothing changed — pure discussion with no decisions,
no code, no lesson — say so and skip the writes below. Logging a trivial session pollutes the
signal for future boots, which makes the real lessons harder to find.

If the session had meaningful work (code changed, a decision was made, or something was learned
the hard way), continue.

## 2. Check for a lesson

Ask: did the agent get corrected, drift off track, or hit a trap that will recur? If yes, that's a
lesson. If the session went smoothly with no correction needed, there is no lesson to log — do not
invent one to fill the step.

If there is a lesson:

1. Append the FULL entry to `~/.kracked/lessons-archive.md` — what happened, what triggered it,
   what the fix or avoidance is. Enough detail that a future session reading it cold understands
   the trap without re-living it.
2. Add exactly ONE line to `~/.kracked/lessons.md` — short enough to scan at boot, specific enough
   to be useful, pointing at the archive entry.

Never paste the full entry into the index file. The index stays scannable; the archive holds the
detail.

## 3. Update project session state

Write `.kracked/session.md` with:

- Current state — what's actually true right now, not a history of how you got there
- Next steps — what to pick up next session

Keep this file to current state, not a running log. If it's grown into a chronicle of every past
session, trim it back to what's still relevant before writing the new entry — session.md is
working memory, not an archive.

## 4. Update decisions, if one was made

If a non-obvious decision was made this session (a tradeoff chosen for a reason that wouldn't be
obvious from the code alone), add it to `.kracked/decisions.md`. Skip this if nothing decision-
worthy happened — not every session needs a decisions entry.

## 5. Never write secrets

Before writing anything, check it for API keys, tokens, passwords, connection strings, or other
credentials. None of that belongs in any memory file, archive or otherwise. If a lesson or
decision references a secret, describe it generically ("the deploy token" not the token itself).

## 6. Close

Confirm to the user, in one or two lines, what was written and where — not a restatement of the
whole session.
