# Chichi R10 independent recovery archive

2026-11-18.30 linked worktrees. Incremental history requires published base
39148734bd3f4a0265a6ec9aff8ab4b41f36c0b4. This is NOT full Git history.
Each worktree preserves HEAD, cached/working binary patches, porcelain status,
new/changed files and deletions. Ignored dependencies/caches/live DB/credentials
are excluded. Model resources tracked in source history remain in Git/bundle.

Reassemble in filename order:

```bash
cat backups/chichi-memory-r10.tar.gz.part-* > /outside/chichi-memory-r10.tar.gz
sha256sum /outside/chichi-memory-r10.tar.gz
```

Expected SHA256:1ddb1c75b512a5e2c55c724947e4a870d5b675d7fdcd5267b0ef5deadefd683c
Use restore-wip-archive.py from source memory commitced69e7, into a NEW path.
The existing source worktrees must never be reset or removed.

Remote download/restore verification is recorded separately after upload.

VERIFIED: remote bytes matched SHA256; trial restoration verified all30/30
worktrees HEADdiff/indexdiff/status/filebytes exactly. Test copies were removed
after verification to bound disk usage; original worktrees were untouched.
See restore-result.json and remote-verification.json.
