# Native cats through island zoom

Compared `b0bf624` and the visibility revision in the real phone/SQLite app.
Both runs use the original native meshes/scales and DPR 2, with ordinary RAF,
final view/shadow frusta and unchanged coat materials. Eight views cover Moon
Garden at distances 85, 109, 111, 140 and 240, and the large water park at 160,
650 and 1400. Browser, HTTP and context errors: none.

The old renderer replaced the focused Moon Garden cats at 111, 140 and 240;
the revision keeps the actual cat body in every measured view. The distant
park target's fog contribution falls from 61.7% to at most 11.6%. Close fog is
unchanged through 65 units; the old abrupt 90-unit switch is eased. This is a
visibility correction: physical model scale remains unchanged, so an entire
large island overview naturally shows small cats. It is not an FPS benchmark.
Remote island wake limits and actual frustum checks remain enabled.

Focused tests: 16 passed. Combined production build and full suite: 930 passed,
zero failures. All-island native camera coverage is recorded alongside the
water-garden release after it completes.
