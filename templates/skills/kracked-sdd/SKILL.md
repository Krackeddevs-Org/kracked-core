---
name: kracked-sdd
description: Use when the user asks to build, add, or change a feature, to run the spec-driven flow from idea through spec, docs, build, and review.
---

Run the SDD (spec-driven) flow: idea → spec → docs → build → review. Right-size it first — most
requests do not need the full flow.

## 0. Resume check (do this before anything else)

Read `.kracked/sdd/tracker.md` if it exists. If it lists a story that is not `done`, you are
resuming mid-flow. Pick up at that story's current stage — do not restart the flow from idea, and
do not re-ask questions already answered in its spec.

## 1. Right-size the request FIRST

Classify before doing any ceremony. Say the classification out loud in one line, then act on it.

- **Trivial** — typo fix, one-line change, config tweak, renaming something. Skip straight to
  build. No spec, no tracker entry. Say: "This is trivial — building it directly." Then build it.
- **Small** — a single well-understood feature or fix with limited surface area. Light spec
  (a few lines: what/why, acceptance criteria) → build → review. Skip the full docs breakdown if
  there's only one story.
- **Large or risky** — touches multiple areas, has unclear scope, affects data/migrations/auth,
  or the user is unsure what they want. Full flow below, all five stages.

Over-ceremony on a small task is a failure mode, not thoroughness. Do not write a spec file for a
typo fix.

## Where documents live

Copy the matching `_TEMPLATE.md` in each folder rather than inventing a structure.

| Folder | Holds |
|---|---|
| `.kracked/sdd/specs/` | What to build and why |
| `.kracked/sdd/epics/` | A group of related stories |
| `.kracked/sdd/stories/` | One independently shippable slice |
| `.kracked/sdd/architecture/` | How it's put together — large/risky work only |
| `.kracked/sdd/architecture/decisions/` | ADRs, numbered `0001-`, never renumbered |
| `.kracked/sdd/tracker.md` | Status + evidence for every story |

Naming: `specs/login.md`, `epics/1-authentication.md`, `stories/1.1-email-login.md`. Story IDs are
`<epic>.<story>` and MUST match the ID in `tracker.md` — that link is what makes the tracker
trustworthy.

## 2. Spec stage

Copy `.kracked/sdd/specs/_TEMPLATE.md` to `.kracked/sdd/specs/<short-name>.md` and fill it in:

- **What** — the feature or change, in plain language
- **Why** — the problem it solves, for whom
- **Acceptance criteria** — concrete, checkable conditions for "this works"
- **Out of scope** — explicitly list what this spec does NOT cover. This is not optional; scope
  creep starts where this section is skipped.
- **Edge cases** — for every input: what if it's empty, missing, or unexpected?

Confirm the spec with the user before moving on, unless the request was classified trivial/small
and the spec is short enough that building it IS the confirmation.

## 2b. Architecture — only when the work is large or risky

If the job is **large or risky** (new service, data model change, auth, payments, anything
touching money or user data), write an architecture doc from
`.kracked/sdd/architecture/_TEMPLATE.md` BEFORE building — the shape, the data model, and the
failure modes.

For a decision someone would otherwise re-litigate later (why this database, why this pattern),
add a numbered ADR from `architecture/decisions/_TEMPLATE.md`.

**Do not write either for a small feature.** Ceremony on small work is why people abandon a
process. Say plainly which you're writing and why, or say you're skipping them and why.

## 3. Docs stage

Break the spec into stories. Each story must be independently shippable — a story that can't be
merged and left in a working state on its own is too big; split it further.

If there's more than one story, write an epic from `.kracked/sdd/epics/_TEMPLATE.md` and give each
story its own file from `.kracked/sdd/stories/_TEMPLATE.md`. A single-story job needs neither —
the spec is enough.

Add every story to `.kracked/sdd/tracker.md` with status `backlog`. Use this exact table shape —
do not invent columns:

```markdown
| ID  | Story             | Status      | Evidence |
|-----|-------------------|-------------|----------|
| 1.1 | User can log in   | backlog     | —        |
```

- **ID** — `<epic>.<story>`, e.g. `1.1`, `1.2`, `2.1`
- **Status** — one of exactly: `backlog` · `in-progress` · `review` · `done`
- **Evidence** — `—` until the story reaches `done`. See the evidence gate below.

Keep a `## Spec` line above the table pointing at the spec file this batch of stories came from.

## 4. Build stage

Implement against the spec, one story at a time.

- The moment a story's status changes, update the tracker. Not at the end of the session, not
  batched — the instant it moves (e.g. `backlog` → `in-progress` when you start it, `in-progress`
  → `review` when the code is written).
- Build against what the spec says, not what you assume it should say. If the spec is wrong or
  something it references doesn't exist, stop and flag it — don't improvise around it.

## 5. Review stage

Two checks, both required, neither optional:

1. **Correctness** — does the code do what the spec's acceptance criteria describe? Read it back
   against the criteria, line by line.
2. **Does it actually work** — run it, or trace through the actual execution path. Green tests are
   not proof of a working feature; a test can pass while testing the wrong thing.

### The evidence gate — the most important rule in this flow

A story cannot move to `done` without a note stating:

- What was verified (specifically — "ran X, saw Y", not "looks good")
- What was NOT verified (be honest about the gaps — untested edge cases, unexercised code paths,
  anything you didn't actually run)

"Green tests" is not evidence on its own. If you didn't check it, the story is not `done` — leave
it at `review` and say what's still open. A story marked `done` with no evidence note is worse
than one left at `review`, because it hides risk instead of surfacing it.
