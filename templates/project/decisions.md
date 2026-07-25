# Decisions — {{PROJECT_NAME}}

A log of decisions made on this project, with the reasoning behind them. The point of this file
is the **why**, not the what — the code already shows what was decided; this file is for the
reasoning a future session couldn't re-derive just by reading the code.

Not every choice belongs here. Skip anything obvious or easily reversible. Log it when getting
it wrong would mean redoing real work, or when a future session (human or agent) might look at
the code and reasonably ask "why was it done this way?"

## Format

```
## [YYYY-MM-DD] <short title>

**Decision:** <what was decided>
**Rationale:** <why, including what alternatives were considered and rejected>
```

## Log

<!--
Example:

## [2026-01-10] Use Postgres instead of SQLite

**Decision:** Store data in Postgres from day one, even though SQLite would be simpler for a
solo project this size.
**Rationale:** Planning to add a second concurrent writer (a background job) within a few weeks.
SQLite's single-writer lock would force a migration later anyway, and doing it now while the
schema is small is cheaper than doing it after there's real data.
-->

_(empty — add an entry the first time a non-obvious decision gets made)_
