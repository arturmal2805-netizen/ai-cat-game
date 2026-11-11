# Submarine controls and air tricks — 2026-11-11

Player-requested increment based on released `d5821c84c9d274403c3fbd2530ad2f989d2410a8`.
This release is isolated from the unfinished horizontal underwater mall rebuild.

- Both keyboard and touch use A/left → visible left, D/right → visible right.
  The physics/autopilot yaw convention remains unchanged.
- Forward maximum 24 → 36 m/s; acceleration 20 → 30 m/s². Reverse similarly
  increases by 50%. Swept collision substeps include vertical jump speed.
- Space breach impulse is 26.6 m/s, calibrated against the released dock-depth
  Space hold rather than merely multiplying a number in the code. Gravity is
  still 9.81 m/s². Equal 60/120 Hz runs give old/new above-water apex heights:

| Simulation step | Released height | New height | Ratio |
| --- | ---: | ---: | ---: |
| 1/60 s | 8.227593 m | 32.919090 m | 4.001060× |
| 1/120 s | 8.221993 m | 33.049043 m | 4.019590× |

- Airborne W and S control forward/back somersaults. They resume ordinary
  throttle/reverse after landing. Air steering remains available. Pitch eases
  upright in the water. Airborne pitch/height survives a valid save/reload.
- The approved native cat sits in the hull's rotating seat. Chase camera follows
  yaw with an upright horizon and velocity feed-forward; cockpit follows hull.
  The HUD shows height and air control labels when appropriate. No per-frame
  mesh/texture/buffer creation or new render pass is introduced.

## Verification

`/workspace/qa/submarine-flight-system-final.log`: 20/20 targeted tests, including
screen-relative A/D, both complete flips, speed, measured jump height, constant
gravity, landing, saved flight, camera tracking, real cave return, collision and
purchase preservation.

`/workspace/qa/submarine-flight-native/submarine-native.json`: native mobile
DPR-2 keyboard/touch, both full air rotations, seated pilot, upright chase camera,
real private SQLite reload, autopilot return and dry exit all passed. The pilot's
seat error after the reverse flip was 1.14e-13 m; hull screen coordinates were
(0, -0.065), with camera up (0, 1, 0). Browser/HTTP errors: none.

`/workspace/qa/submarine-flight-ownership.log`: owned Mega Loops recovered to bag,
placed fully built at zero charge, real model prepared, exactly one copy retained
through two private SQLite reloads.

Production build passed. The complete local suite is running in
`/workspace/qa/submarine-flight-full-suite.log`; publication is gated on the
workflow's complete test/build/dry-run checks. Software-renderer timings are not
M2/iPhone FPS measurements.
