# Tracker — {{PROJECT_NAME}}

The story status ledger for this project's SDD flow (idea → spec → docs → build → review).
Every story tracked here goes through the same four statuses, and status changes are never
batched up and applied later — the moment a story's state actually changes, this table changes
with it.

## Statuses

- `backlog` — written down, not started
- `in-progress` — actively being built
- `review` — built, being checked against the spec
- `done` — reviewed and confirmed working

## Rule: evidence before `done`

A story **cannot** be marked `done` without an `Evidence` entry stating how it was confirmed
(e.g. "manual test: signup flow works end-to-end", "3 unit tests passing", "verified in prod").
No evidence, no `done` — it stays in `review` until there's something concrete to point at.

## Spec

_(no spec yet — run `/kracked-sdd` to create one)_

## Stories

| ID | Story | Status | Evidence |
|---|---|---|---|
| 1.1 | _(example)_ User can sign up with email | backlog | — |

<!--
ID format is <epic>.<story> — 1.1, 1.2, then 2.1 when the next epic starts.
Add a row per story as specs are generated under sdd/specs/, and point the Spec heading above at
the spec file this batch of stories came from. Keep the Story column short — the detail lives in
the spec file. This is a ledger, not a spec.
-->
