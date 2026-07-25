# SDD — {{PROJECT_NAME}}

Spec-driven development artifacts. Run `/kracked-sdd` to work through the flow; these folders are
where it puts things.

```
idea → spec → epic → stories → build → review
```

| Folder | Holds | Written when |
|---|---|---|
| `specs/` | What to build and why | Start of any non-trivial job |
| `epics/` | A group of related stories | When a spec is too big for one story |
| `stories/` | One independently shippable slice | Broken out of a spec or epic |
| `architecture/` | How the system is put together | Large or risky work only |
| `tracker.md` | Status of every story + evidence | Continuously |

## Naming

Numbers first so files sort in the order you built them.

```
specs/login.md
epics/1-authentication.md
stories/1.1-email-login.md
stories/1.2-password-reset.md
architecture/data-model.md
architecture/decisions/0001-use-postgres.md
```

Story IDs are `<epic>.<story>` and must match the ID in `tracker.md`. That's the link between a
story's detail and its status — if they drift, the tracker stops being trustworthy.

## The two rules that matter

**1. Not everything needs the full flow.** A typo fix needs no spec. `/kracked-sdd` sizes the job
first and skips straight to the build when ceremony would be waste. Over-documenting small work is
the fastest way to abandon the system entirely.

**2. A story isn't `done` without evidence.** The tracker's Evidence column must say what was
actually verified — and what wasn't. "Tests pass" is not evidence of a working feature.

## Commit these

These docs belong in git. They're how the next person — including you in three months, and your
agent on its next boot — finds out why the code looks the way it does.
