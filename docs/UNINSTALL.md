# Uninstalling kracked-core

## The easy way

From your project folder:

```bash
npx kracked-core uninstall
```

It shows exactly what it will remove and asks before deleting anything. Two separate questions —
project files first, then global memory — because they're very different things.

> It will never delete a `CLAUDE.md` or `AGENTS.md` that another system wrote. If you had a
> different agent setup before installing, that file is left alone.

---

## What gets removed

### Project layer — `your-project/`

```
.kracked/                     all project memory + SDD docs
AGENTS.md                     the loader
CLAUDE.md                     the Claude Code shim
.agents/rules/kracked.md      the Antigravity pointer
.claude/skills/kracked-*/     5 skills
.agents/skills/kracked-*/     5 skills
.roo/rules/kracked.md         Roo Code pointer (if installed)
```

**Not removed:** `kilo.jsonc`, if you selected Kilo Code. That file may hold your own
settings, so uninstall leaves it alone — delete the `.agents/rules/kracked.md` line from its
`instructions` array by hand.

Empty `.claude/` and `.agents/` folders are cleaned up afterwards. If you keep other things in
them, they stay.

### Global layer — `~/.kracked/`

```
identity.md          who your agent is
preferences.md       how you like to work
lessons.md           the lessons index
lessons-archive.md   full lesson detail
projects.md          your project registry
```

**Think before removing this one.** Reinstalling gives you empty template files back — it does
not restore your lessons, your preferences, or your agent's personality. That content is yours,
built up over time, and deleting it is permanent.

If you're uninstalling from one project but still using kracked-core elsewhere, keep global
memory.

---

## Doing it manually

If you'd rather not run the command, or you're cleaning up a project you've already deleted the
package from.

**Project files** — from inside the project:

```bash
rm -rf .kracked AGENTS.md CLAUDE.md
rm -rf .claude/skills/kracked-* .agents/skills/kracked-* .agents/rules/kracked.md
```

**Global memory** — only if you're sure:

```bash
rm -rf ~/.kracked
```

> Check `CLAUDE.md` before deleting it. If it says anything other than `@AGENTS.md` plus a short
> note, another tool wrote it and you probably want to keep it.

---

## Backing up first

Global memory is the half worth keeping. To save it before removing anything:

```bash
cp -r ~/.kracked ~/kracked-backup
```

To restore later:

```bash
cp -r ~/kracked-backup ~/.kracked
```

Project memory usually lives in git already — check `git status` before deleting, and if
`.kracked/` is committed you can always recover it with `git checkout`.

---

## Keeping the docs, dropping the tooling

A common middle ground: you want the specs, epics, and architecture docs you wrote, but not the
memory system.

Move them somewhere neutral first, then uninstall:

```bash
mv .kracked/sdd docs/sdd
npx kracked-core uninstall
```

Your documentation is plain markdown. It doesn't need kracked-core to stay useful.
