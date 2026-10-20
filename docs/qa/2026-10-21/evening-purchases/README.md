# Optional purchases must not cancel valid evenings

Read-only production diagnostics confirmed five permanent families from a
successful evening decision. A later event failed with `invalid_house`, which
rejected its entire otherwise usable evening response.

House tuples now accept null/missing roommates in the same way as house objects.
Unknown or unaffordable optional house suggestions are omitted without charging.
An unavailable roommate does not cancel an affordable AI-selected house; the
existing housing system selects an available occupant. Structured purchase
warnings retain the reason. Unrequested buyers, duplicate buyers, invalid
mandatory activities/careers and invalid family proposals remain strict.

This avoids a reserve inference for an optional purchase error. Daily event
reservations, exact prices, house receipts, lifelong families and professions
remain intact. No player save or live AI event was changed during diagnosis.

58 targeted event/provider/housing/family tests passed, including seven purchase
forms with and without a family review; valid activities/families apply and only
affordable houses charge once. Build passed. The preceding rendering release
passed all 634 tests and all three production CI jobs.


Final verification:
- Production `ecfc104f409a24fca888574e22ba8b47a8439718`; all 635 tests,
  deployment and Pages jobs green in run 39504293882.
- Real bounded private-world Cloudflare inference: a lifelong pair, a real
  leisure choice and a house choice; receipt restoration and an identical cached
  replay applied once. No production player world was modified.
- All 30 islands plus an aquarium revisit: exact frozen colour/shadow images,
  DPR 2, wheel/orbit/pinch and exact GPU-buffer re-upload. The environment paused
  after 27 entries; the remaining four entries resumed in a fresh private browser.
- Real desktop WebKit: four capybara views, zero changed bytes, about 289,080 fewer
  submitted triangles per steady frame, unchanged 2124×1360 render buffer.
- Native Chichi: four walking/resting images unchanged. All five tanks/50 fish
  passed actual GPU pose/normal and exact culled-image checks.
- Published script hash matches the build; Pages configuration points at the
  deployed Worker. These are software-GPU correctness/work checks, not a claim
  about physical MacBook FPS or a guarantee that every device is lag-free.
