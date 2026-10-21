# Camera, memory and map fixes

No approved cat/fish meshes, water, scenery, shadows, light, mobile DPR or working
family sleep are simplified. The rejected orthographic-command cache is recorded
separately and is not in the released runtime or common template.

## Two independent resource-bookkeeping improvements

1. GPU buffer use reads the clock once per native renderer frame, rather than
   once per draw. The focused test retains all 2,000 native calls while clock
   reads change from 2,000 to 2. Shadow and colour use remain recorded.
2. Under the existing 192 MiB soft budget, unused geometry can retire after
   three native frames rather than holding it for ten seconds. Current/recent
   colour/shadow buffers, shared attribute owners and living cat atlas slots
   remain protected. Cleanup retains its two-millisecond slice and exact CPU
   source buffers. A return uploads the identical source, with native quality.

Actual WebKit phone/DPR 2 GPU replay, with a controlled wall clock still inside
that legacy grace: 21,961,600 bytes stay allocated under the old policy; the new
policy retires 180 unused geometries to 90,324 bytes. Returning restores exactly
21,961,600 bytes, with ZERO changed colour/shadow bytes. This is an isolated
resource-retirement check, not a claim of 99.6% lower whole-game memory or a
physical iPhone/Mac FPS measurement.

All 17 active island phone views also pass complete native colour/shadow
byte comparisons after GPU retirement/re-upload. Living cat registration and
joint totals survive. See phone-island-returns.json. Native guest/world/island
button repetitions and the updated Job City camera checks are recorded separately.

## Other changes

- Direct Job City building clicks inspect from above/front at elevation .38;
  hide only the selected roof, restore on exit/switch, retain portrait fit.
  Foreground masking now includes the lower facade, not just its centre ray.
- Cat visibility follows real camera/shadow bounds instead of the old 45-unit
  target cutoff. A visible approved dragon at x=48 stays at its exact position.
- Cancelling/replacing a still-approaching giant/deep ride no longer sends the
  cat to the attraction's distant dismount. Native active ride exits stay intact.
- Stars, Coral and Clouds are retired by the user's latest request; 17 islands
  remain with 16 unobstructed shore-to-shore roads. Earlier migration districts
  retain their exact addresses. Existing purchases/timers/tiers/crops and cats
  migrate once. An occupied migration address searches for free land rather
  than losing the incoming purchase on load. Cached worlds and repeated reloads
  retain receipts and balances.
- Trading checked for all 148 actual cat profiles, including all 95 adoption
  cats and both dragon sizes: official crypto profession, actual voluntary
  weekly skips, server admission, margin, settlement, three reloads each and no
  duplicate payout. 148 mocked forecasts; zero paid AI requests. Family pacing
  remains independent at 14 game days.

Validation: full suite 703/703 before the extra collision regression, then all
42 shared-save/migration tests including that new case. Final CI runs the complete
suite again before publishing. Browser records use private local SQLite only.
