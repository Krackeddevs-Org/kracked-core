# Architecture — <area>

**Date:** {{DATE}}
**Status:** current | superseded by `<file>`

Write one of these only for work that's **large or risky** — new services, data model changes,
auth, anything touching money or user data. A small feature does not need an architecture doc,
and writing one anyway is how the system becomes ceremony people skip.

## The shape

What the pieces are and how they talk to each other. A diagram in text is fine:

```
browser → api route → service → database
                   ↘ queue → worker
```

## Data model

Tables/collections, key fields, and the relationships that matter. Not every column — the ones a
newcomer would get wrong.

| Entity | Key fields | Related to |
|---|---|---|
| | | |

## Key decisions

The choices someone would otherwise re-litigate. Link to an ADR in `decisions/` for the big ones.

| Decision | Why | Alternative rejected |
|---|---|---|
| | | |

## Failure modes

What breaks, and what happens when it does. Answer for each: does it fail loudly or silently?

| What fails | Effect | Handling |
|---|---|---|
| Database unreachable | | |
| Third-party API down | | |
| Duplicate/retried request | | |

## What this does NOT do

Scope boundaries and deliberate limitations. Prevents someone assuming a capability that isn't
there.

- ...
