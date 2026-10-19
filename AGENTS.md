# Project context

This repository is the Independent Tribunal informational website and research hub.
It is a work-in-progress demo, not a live dispute service. See README.md for setup
and publishing details when those are relevant.

## Read only what the task needs

- Start with a scoped search and the relevant source files. Expand when dependencies
  or uncertainty require it; do not routinely read the entire repository or corpus.
- Reuse information already available in the conversation. Re-read when files have
  changed, context is missing, or verification requires it.
- UI: `app/`. Shared header/footer: `shared/site-shell.mjs`, `app/site-frame.tsx`,
  and `public/site-shell.css`. Navigation/contact data: `data/navigation.json` and
  `data/site.json`.
- Research/content: read `data/README.md`, the relevant dataset, and applicable
  editorial policies. Read collection-specific guidance when editing that collection.
  Keep source citations, dates, uncertainty, and reporting/judgment distinctions intact.
- Generation: `scripts/build-data.mjs` and the relevant module in `scripts/`.
  Locate the source before editing generated output.
- Validation: commands are in `package.json`; tests are in `tests/`.
  Keep command output focused; inspect full logs when needed to diagnose failures.
- Exclude dependencies, build output, and unrelated research from exploratory searches.
  Inspect generated output when the task requires verification.

## Resuming substantial work

Before handing unfinished work to another chat, save a short task-specific note in
`work/`: objective, decisions and reasons, affected paths, checks/results, blockers,
and next action. Update the note instead of appending transcripts. Read only the
handoff relevant to the current task, and verify its state against the working tree.
Do not create handoff paperwork for completed small edits.
