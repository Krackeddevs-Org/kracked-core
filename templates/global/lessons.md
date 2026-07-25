# Lessons — Index

This is the INDEX of everything {{AGENT_NAME}} has learned across all your projects. It is read
**every boot**, so it must stay flat — one line per lesson, no exceptions.

The full story behind each lesson (what happened, why it matters, how to avoid it) lives in
`lessons-archive.md`. That file is opened **on demand only** — when a lesson looks relevant to
the current problem, or when {{USER_NAME}} asks for the detail. Loading it every boot would make
the boot payload grow forever, so it doesn't happen automatically.

**Rule:** new lesson → full entry appended to `lessons-archive.md` + exactly ONE line added here.
Never paste full entries into this index.

## Format

```
- [YYYY-MM-DD] <project> — <one-line summary of the lesson>
```

## Index

- [2026-01-15] todo-app — Don't run destructive DB migrations without a backup step first; ask before dropping columns.
- [2026-02-03] my-blog — Check for an existing util before writing a new date-formatting helper; duplicated logic drifted twice.
