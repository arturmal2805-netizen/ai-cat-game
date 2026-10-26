# Bounded protection for returning GPU geometry

The player's first physical report is now available: Apple M2 through Chrome
155 / ANGLE Metal, 64 NPCs, Job City, DPR 2. The 11-frame window spans 2.817 s:
3.55 submitted FPS, a 1.432 s maximum gap, 119 policy geometry evictions and
20,134,980 bytes of `bufferData` transfers since reset. The report was copied
before automatic pause (`suspended:false`), with 101 roots still queued for
shader preparation. **It is an early-loading measurement, not a settled
baseline.** Its transfer total cannot distinguish new geometry from re-uploads.
The original privacy-safe report is stored in `m2-before.json`.

## Fix

The released pressure policy can delete a geometry after three native frames
without use. A camera cycle whose working set slightly exceeds the soft cache
budget can therefore repeatedly delete and re-upload exactly the same buffers.
This was reproduced independently of the player's save.

Policy retirements now leave a weak timestamp. A buffer which actually returns
within the normal ten-second grace learns a two-second last-use grace. It is
protected only while total tracked residency fits the original 192 MiB soft
budget plus at most 64 MiB (never more than one third of a configured budget).
Above that allowance the ordinary pressure policy wins. Current/recent colour
and shadow geometry retains its released protection and may exceed a **soft**
budget; new uploads and the existing sweep cadence are not a hard memory cap.
Unused learned buffers become eligible again and return to the original budget.
Cold remote geometry retains the three-frame policy. Shared-attribute owners
retire together, the clock is still read once per native frame, and cleanup
keeps its existing time bound. No CPU vertices, materials, rigs or saves change.

Counters now distinguish all policy returns from rapid returns and count their
restored unique stream bytes. The opt-in report adds corresponding window
deltas. Normal play has no GL diagnostic hooks. The diagnostic label now shows
remaining shader preparation, including active roots, to distinguish loading
from a settled view. Its automatic 15-second pause remains available.

## Independent resource and image evidence

In an isolated real WebGL renderer, four identical independent geometry buffers
cycle through a three-buffer soft budget with a synthetic 25 Hz bookkeeping
clock. Rendering/readback is real; this is **not a device-FPS benchmark**:

| Resource metric | Released policy | Protected returns |
| --- | ---: | ---: |
| Policy evictions / rapid returns | 39 | 4 |
| Actual `bufferData` calls | 172 | 32 |
| Actual transferred bytes | 36,120 | 6,720 |
| Peak tracked geometry bytes | 3,360 | 3,360 |
| Changed framebuffer bytes | 0 | 0 |

The separate Node pressure checks verify over-cap eviction, eventual idle
reclamation, unique accounting of shared streams and ordinary disposal. The
existing live-cat registry/pose-slot retirement checks still pass.

Actual phone-WebKit private world: twelve adopted cats, 64 mobile NPCs, the
existing embedded staff, eight homes, four large slides and sixteen businesses.
Every **17 runtime island** was rendered, its drawn GPU geometry retired, and
the complete native colour/shadow frame rendered again: **zero changed
framebuffer bytes**, equal calls/triangles, preserved cat/pose-slot counts,
no GL errors or context loss, original DPR 2. All **21 native RAF orbit/zoom
samples**, including returns, complete through the original simulation and
nonblocking GPU queue. No raster suppression/readback occurs inside the timed
camera samples. Their Linux software-WebKit rates are not M2/iPhone FPS.
Browser JS/HTTP errors are zero. No player world or paid AI was used.

## Checks and limits

- Full suite: **723 passed, zero failures**.
- Targeted residency/profile/warmup checks pass; actual GL/resource/camera
  evidence is stored alongside this report.
- Sculpt construction cache version remains
  `sculpt-v2-a496203fa13a037a7a10a927`; approved models need no cache invalidation.
- Build and deployment dry run pass. The bundle SHA-256 is
  `097bbf4e32d5605d098f35eabf747f77b0a1ad49cf6052b3724add6e8f76cf9e`;
  private QA hooks are absent. Live publication proof is recorded separately.
- A real opt-in browser report verifies all new numeric refault/preparation
  fields and clipboard/fallback copying; browser JS/HTTP errors are zero.

This fixes a reproduced buffer-refault cycle; a large physical-device FPS
improvement and the whole-Mac slowdown still require a post-publication report.
The new counters will also reveal if the player's remaining initial transfers
are mostly new preparation rather than cache churn.

A separate colony-light preparation experiment was isolated as
`experiment/colony-compile-lighting-20261027` (`f584776`). Its first browser
comparison differed by 12 framebuffer bytes; the cause was not established.
It is **not included** in production, regardless of its traversal savings.
Previously isolated sorting/blending/compaction experiments also remain out.
