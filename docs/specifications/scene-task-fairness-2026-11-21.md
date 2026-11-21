# Prevent boosted continuation starvation during scene preparation

User M2 report of c199697 confirms an8.8838s framegap/8.9225s timer delay during
loading/transition, while the longest observed mainthread task is808ms. Shader
preparation fixes alone did not remove the pause. Do not attribute the whole
pause to shaders or network; resources now observed at<=1.552s in this report.

The production yieldSceneTask helper prefers scheduler.yield. In Chromium156,
long boosted continuation chains starve ordinary timers and reduce native RAF
opportunities despite short3ms slices. A standalone sequential experiment:
3000x3ms scheduler chain delays200ms timer8877.1ms,96RAF callbacks. The same
CPU work with MessageChannel:5.6ms max timerdelay,557RAF callbacks.

Actual production ESM imports reproduce this: baseline module2391613b...,
9532.8ms maxdelay/2timer callbacks; candidate3349093a...,6.1ms/46callbacks;
102vs564nativeRAF callbacks. Timing is software-browser scheduling attribution,
not M2FPS. The second fixture overlapped focused Node checks during baseline;
the independent first experiment did not. Preserve both raw results/runners.

Prefer the existing MessageChannel path in Window environments, retaining its
FIFO promise queue and Safari timer-clamp avoidance. Preserve scheduler.yield
as non-Window fallback, then setTimeout. Builder steps/budgets/cancellation/
priorities remain identical. No geometry/material/cat/animation/DPR/water/shadow/
save changes, no disabled diagnostics, no extra renderpass or loading overlay.

35focused checks PASS. Node22 fullbuild/mainCI/live bytes and native19islands+
returns/phonecontrols/deepdive/two private reloads are publication gates. Actual
Mac loading/transition pause after this change still requires a fresh report.
