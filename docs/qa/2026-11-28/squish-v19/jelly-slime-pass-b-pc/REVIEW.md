# Native original Jelly + continuous Slime twist, source8b603d1

Actual existing Chichi submarine/entry/Jelly jump/paws/body/exit/recovery, plus
separate developer Slime/Jelly four-state models.58 tests/full Node22 build PASS,
actual game native/GL/HTTP checks PASS, no faults or inversion-limiter activations.

Original Jelly body contact depth0.454506m, exact body vertex0.466370m, actual
rendered body volume ratio0.983959. After release2s vertex displacement0.0001519m,
actual body-volume ratio0.9999983. Body target falls within artistic12–22% local
thickness, while remaining a real local volumetric deformation. Face stays bound.
Native paw contact frame has3 supports during a raised-paw action, not a fake
claim that all4 are simultaneously planted. Original rigs/camera preserved.

Slime twist now continuous and genuinely angular: actual main mesh displacement
1.28729m, actual body volume1.02603/cage1.00754;3 live filaments/0 tears, positive
tets and no limiter. Earlier forced input discontinuity and lost twist are fixed.
Pointer rest-space attachment is separately verified using real deformed rotated
triangle barycentrics. Merge still explicitly approximated, no fluid-CFD claim.

New Jelly visual reference review: smoother close surface and colored depth,
but still MAJOR visual gap in highlights/soft lighting versus user concept. No
new refraction target or global environment change. Do not call visual exactness
or whole V19 accepted. Developer copies currently lack explicit low supports;
add those and correct their exit floor before isolated full-cycle recordings.
This is a test-bench presentation issue; existing live display podiums retained.
