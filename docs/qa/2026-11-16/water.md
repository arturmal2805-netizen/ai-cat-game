# Resolved ocean swells and filtered water highlights

> Historical technical release record. Current user acceptance and references are in [project memory](../../project-memory/CURRENT.md); this report is not artistic approval of a later candidate.

Ocean geometry previously carried short waves below the sampling resolution
of its original polar grid. It now carries longer 0.50 m bounded swells with
analytic swell normals, shoreline fade and conservative native culling bounds.
Fine ripples remain in the shared normal field. Original geometry, movement,
creature models, purchase data and native clocks are retained.

The shared water response uses water's 0.0204 Fresnel reflectance, a bounded
GGX highlight and reflection filtering from the actual normal footprint.
Placement-local reflection orientation remains intact. A former showcase shader
insertion would duplicate the common roughness declaration; the composed shader
now uses the common response directly and has a regression check. Every surface
retains two existing wave-field lookups and one shared scenery lookup. No new
runtime texture, render target, reflection pass or buffer upload is introduced.

Nine actual static scenery probes were rendered again after the source changes.
Their manifests match the captured inputs. The source render content remains
identical where static producers have not changed; hashes were not substituted
for an actual capture.

Native source commit: `4ec37371e6b71a03050d4e2a14e8b8fbdc9ae6b3`.
Node 22.23.5 build, Worker dry run and 57 water-related tests passed. Blue/pink
water, waterfalls, wakes, animation, reduced motion and full phone DPR passed.
The real ocean passed normal, grazing, phone, close, low and sun-facing A/B views,
with unchanged draws, triangles, texture count and geometry bytes. The submerged
Marin visibility test retained about 87.5% of native contrast on desktop/phone,
and still rejected the deliberately opaque control.

All eight retained adventures passed before/after native normal, grazing,
phone, basin/sun/cascade and rider captures. Their draws/triangles match; native
static submission comparisons have zero changed pixels in all three tested views.
Four rider poses per candidate remain finite with the original native joints.
Page texture totals after the first candidate include the candidate-only native
cat captures; they are recorded without presenting that difference as new water
allocation. Native source PNGs, hashes and raw timing samples are retained.
SwiftShader measurements do not establish physical-device FPS.

The real phone application purchased all eight items through the existing shop,
kept the expected wallet/ownership through three private SQLite reloads, completed
all eight native rides and physical return walks, exercised both cameras and
verified three passengers share one raft and the original 15-second seating
clock. Final browser and HTTP error lists are empty. No production save or paid
AI inference was used. Models, inventory, native routes and room/ride capacity
remain under their existing systems.

See water-native-summary.json for measurements, source/build hashes and PNG
checksums. Publication additionally requires successful CI/deployment and exact
live JS/CSS comparison, recorded with the release evidence outside the source.
