# Camera-driven cat GPU buffer churn

The user reported constant Cat Job City freezes. Private native WebKit profiling
with 113 cats measured the periodically called `world.sync` at 5–10 ms maximum
and `jobs.step` at 3–9 ms, while native rendering was much more expensive.
These instrumented portions do not measure every application timer or durable
save callback. The initial 32-adoption fixture also stayed below the
residency budget, with zero memory evictions. Rolling back all recent CPU or
memory changes would not address those measured cases.

A separate, reproducible rendering fault appears when the camera crosses the
native/colony draw threshold. The shared-draw path eagerly deleted every native
fallback geometry buffer. Looking back immediately needed them again. The new
three-frame pressure policy could also discard the other representation during
a short excursion. These are working render caches, not abandoned islands.

The correction removes eager deletion and marks native and colony cat draw
buffers with the normal time grace. The shared residency controller still
retires them after actual inactivity, preserves connected attribute owners,
keeps the original fast policy for other unused geometry and never destroys
a living cat or its atlas slots. Original meshes, attributes, poses, materials,
shadows, water, DPR, save fields, careers, purchases and families are unchanged.

`check-colony-buffer-churn.mjs` reproduces the old deletion ONLY in private QA.
At DPR 2, eight approved cats repeatedly cross the actual six/eight visibility
threshold using the native Three renderer. Under a zero-byte test budget:

- Six repeated threshold cycles: old 1,728 buffer uploads / 19,201,248 bytes;
  corrected 0 uploads / 0 bytes, in both corrected repeats.
- Identical final image: zero changed bytes, including visible shadows.
- Real RAF, animation, camera movement and nonblocking GPU fences over four
  16-second runs: the old path uploads 51,203,328 bytes in each run; corrected
  uploads zero. Completed frame counts are 194 / 210 / 208 / 216 (old / new /
  new / old). The software-renderer cadence varies; this is not a guaranteed
  physical MacBook FPS gain or a claim that all city lag is gone.
- After simulated long inactivity, all 56 tracked geometries retire. Waking
  produces zero changed image bytes; all eight cats and 216 joint entries
  survive. GL error 0, no lost context or JavaScript errors.
- The retained working buffers in this fixture peak at 7,273,948 bytes rather
  than allocating new geometry on every switch. Under pressure, truly idle
  fallback buffers continue to be reclaimed.

Focused rendering/navigation tests: 23/23. Full suite: 706/706. Build and Worker
dry-run are checked before publication. A separate all-island camera replay is
recorded when complete. All tests use private fixtures, never a player save or
paid inference. The experimental pre-reveal city shader change was left out:
its loading priority needs a separate measured check before adoption.

Final common-world replay: 17/17 runtime islands, 36 native orbit/zoom samples,
including a return to Job City, at original DPR 2. All completed without lost
context, JavaScript errors or HTTP errors. The fixture includes four giant
water slides and sixteen extra businesses on the homestead. Complete native
RAF, animation, world simulation and nonblocking GPU fences stayed active.
The old eager deletion is emulated only in the comparative QA callback.

The general-view samples show mixed software cadence and few frames per sample;
they do NOT establish a universal FPS increase. In Job City both paths submit
nine frames on the first visit and eight on the return. The accepted change is
the verified removal of unnecessary buffer deletion/upload around visibility
thresholds, with exact pixels and bounded inactive retirement, rather than an
unsupported promise that every source of MacBook lag has disappeared.

Release c23986f: GitHub Actions 39736272417 test/deploy/pages all succeeded.
Both the Worker release check and the published GitHub Pages entry return 200;
cloud saves remain enabled. The sculpt cache keeps its previous construction
key, sculpt-v2-a496203fa13a037a7a10a927. This final evidence update changes no
runtime code and is kept on the working branch without another site rollout.
