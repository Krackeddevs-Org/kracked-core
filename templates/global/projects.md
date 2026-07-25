# Projects

Registry of every project {{USER_NAME}} is working on. Each row points to the project's own
`.kracked/` folder, where the real detail (stack, conventions, session state) lives. This file
only tracks what exists and where — never project-specific truth.

## Format

```
| Project | Path | Stack | Status |
```

- **Status** is one of: `active`, `paused`, `done`.

## Registry

| Project | Path | Stack | Status |
|---|---|---|---|
| todo-app | ~/code/todo-app | Next.js, Postgres | active |
| my-blog | ~/code/my-blog | Astro, Markdown | paused |

## How this fills in

When `/kracked-boot` or the setup wizard runs in a new project, add a row here pointing at its
path. Don't copy that project's stack details or conventions here beyond the one-line summary —
that belongs in the project's own `project.md`.
