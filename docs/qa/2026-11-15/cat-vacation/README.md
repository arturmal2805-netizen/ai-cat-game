# Timed cat vacations through the existing daily planner

Ordinary job="rest" is unchanged. A timed vacation has a separate optional
profile record {startDay,endDay,previousJob}; it lasts 2–7 game days from 09:00
to 09:00 on the existing epoch clock. Expired records remain durable so missing,
repeated and stale clients cannot restart or extend an old cycle. Current
same-cycle dates and prior profession are immutable. No general world-merge
semantics changed; the field-specific diff is included alongside this report.

The existing once-a-day local planner selects established adopted workers who
have actually worked before. It starts at most one vacation daily, limits the
active fraction to one quarter (rounded up), and leaves 14 game days between
cycles. It creates no cat, AI timer, payment or per-cat inference call. Ordinary
resting cats do not acquire deadlines merely because they have job="rest".

The original profession survives the validator's rest/preferences fallback.
Active vacations suppress shift starts/attendance through the existing work
runtime, while normal home, care, walking and play simulation remains enabled.
Daytime home windows use the same provided lifeClock as the scheduler/UI/save.
Return assignments use the ordinary profession planner and JOB_CAPACITY 6.

A new regression found that normalization could erase a valid final-day work
assignment when a save loaded before 09:00. The fix leaves the capacity-checked
schedule intact; the actual vacation/working clock gates runtime activity.
The test first failed, then passed without another daily plan being required.
The native fixture explicitly uses the existing planner to save that valid
pre-shift assignment at 00:01; the ordinary app normally plans new days at 09:00.
This fixture does not pretend the app automatically plans at midnight.

## Verification

- 79 related vacation/job/family/shared tests passed after the final-day fix.
- 1036 full-suite tests passed under Node22; no failures or skips.
- Node22 build and Wrangler deploy --dry-run passed; no model manifests changed.
- Native phone DPR2, isolated workerd/SQLite: visible remaining-days card, actual
  home bed rest without a competing work route, middle reload retaining the
  deadline/profession/wallet, next-day countdown, final-day cached assignment
  and pre-shift reload, offline end boundary, actual same-profession shift,
  final save/reload retaining that assignment. AI calls 0; JS errors empty.
- Personal wallet 7400, inventory, owned homes and original epoch unchanged.
- Native ownership audit: proven Mega Loops recovery to storage, free completed
  re-placement and two SQLite reloads retain exactly one paid copy.

The household image proves native bed rest. It is not presented as a separate
native demonstration of every food/play activity; those unchanged systems
continue through the normal free-time update loop. Ordinary rest, 2/7-day
limits, exact 09:00 boundary, providedClock, stale/parallel snapshots, profession
preservation, capacity and old-route cancellation have independent tests.

Native GPU images use Chromium SwiftShader and do not establish phone FPS.
