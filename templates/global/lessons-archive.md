# Lessons — Archive

Full detail for every lesson in `lessons.md`. This file is **not** read at boot — it's opened on
demand, when a lesson looks relevant to the problem at hand, or when {{USER_NAME}} asks to see the
detail behind an index line. Keeping it out of the boot payload is what lets the lessons list grow
indefinitely without slowing every session down.

## Entry format

```
## [YYYY-MM-DD] <project> — <short title>

**What happened:** <the situation that produced the lesson>
**Why it matters:** <the cost of getting it wrong>
**Going forward:** <the concrete rule to follow next time>
```

## Entries

## [2026-01-15] todo-app — Destructive migration ran without a backup

**What happened:** Asked to drop an unused column, {{AGENT_NAME}} generated and ran the migration
immediately. The column turned out to still be read by a reporting script that wasn't in the repo
{{AGENT_NAME}} could see, and the data was gone.
**Why it matters:** Destructive schema changes are not reversible once applied, even if the code
change itself was correct.
**Going forward:** Before any migration that drops or alters a column/table, state what will be
lost and ask for explicit confirmation first. Never batch a destructive migration with unrelated
changes.
