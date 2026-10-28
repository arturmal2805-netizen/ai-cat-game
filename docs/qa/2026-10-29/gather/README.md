# Giant-waterpark recall regression

The old command changed each resident's destination but left actual movement to
ordinary 3.5 m/s wandering toward the island centre. The park entrance is 375 m
from its centre, and the map transfer can be over a kilometre. Unrelated durable
saves could then capture the still-departing cat on its original shore and undo
the command.

Residents now use the same bounded manual magical transfer as Chichi, with a
continuous raised middle and exact ground endpoints. Landing spots use native
rest-anatomy radii, shore/venue/placement clearance and distinct reservations.
Work, existing sleep, families, money and professions are preserved. A transfer
is transient for location snapshots, so an autosave cannot restore the old
shore as its destination. Manual cancellation/repeated invitation replaces the
trip in place. The local invitation permits family cats to take ordinary ride
outings; at most two nearest cold, already paid rides are requested for native
cooperative preparation. No island geometry, purchase rule or AI polling changed.

Validation:
- Seven focused recall tests, including all 64 collision-free park landings,
  continuous position samples and exact completion in at most 18 seconds.
- Existing full suite: 802/802; final location/leisure/performance checks: 20/20.
- Production build and Worker dry-run pass.
- The private native phone/SQLite probe checks the real menu button, live
  work/sleep exclusions, a save during transit, actual arrival near the park
  gate, repeated recall/manual cancellation and two durable reloads.

The private probe uses simulated player data and no paid AI. Software-browser
correctness and bounded object counts do not establish physical-device FPS.

Follow-up: location snapshots now invalidate old coordinates BEFORE the transient
ride check. Shared merges also reconcile resurrected cached coordinates with the
actual merged destination; otherwise server normalization could undo the recall.
A single completion save preserves real landing positions. Regression tests
cover old active rides, stale/omitted cached positions, cloud ACKs and repeated
restoration of completed arrivals, without changing balances or ownership.
