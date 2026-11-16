# Independent unfinished Chichi WIP backup — 2026-11-16

This branch contains archival files only. It has no deployment workflows and
is NOT a production game release. See the current project index on branch
codex/ocean-recovery-memory at docs/project-memory/README.md.

The tar.gz was fully read and then independently restored into a fresh clone
of the published 12d478e source. Every one of 12 linked worktrees matched its
archived HEAD diff, cached diff, Git status and saved file bytes. Original
worktrees were not reset/deleted. Checksums and results are in backups/.

The incremental Git bundle REQUIRES published c9a2ac7; this is NOT full Git
history. It includes local branch history plus each worktree's independent
working/index overlays and deletions. Ignored build caches/dependencies and
live player databases/credential files are not included. Rebuild with Node22.

To restore, download tar.gz and restore-wip-archive.py, then run Python with
archive, a NEW destination, --sha256 from SHA256SUMS and --base pointing to a
published clone or https://github.com/arturmal2805-netizen/ai-cat-game.git.
Never restore over the original worktrees. The code is an unfinished draft;
its pictures/performance are explicitly rejected, not a release certificate.
