# Rejected native-depth extension

The experiment also cached alpha-one and colour-only animated scenery's native
depth. Ten synthetic GPU invalidation cases matched native shadows byte for
byte, but the required full RAF comparison failed the performance gate.

WebKit 26.5, Linux software Mesa, four rendering threads, identical private
16-cat stress fixture, DPR 2, 20 seconds of real orbit/wheel input per sample.
Order per island: control/experiment/experiment/control. Median submitted FPS:

| Island | Control | Experiment |
| --- | ---: | ---: |
| Capybaras | 1.377 | 1.357 |
| Aquarium | 2.839 | 2.180 |
| Our Island | 2.011 | 1.860 |
| Chill Land | 1.829 | 1.994 |

These are software diagnostics, not MacBook FPS. Fewer shadow triangles did not
produce a general gain. The runtime change was removed, preserving the approved
depth cache and all other accepted optimizations. Raw samples and patches are
retained for audit, not applied to production.
