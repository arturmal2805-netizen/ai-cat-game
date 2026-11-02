# Adult gorilla face and high paired jumps

The previous face looked like a flat mask with an overprojected muzzle. This
revision sculpts a broad continuous brow and nose, recessed smaller eyes,
diagonal nostril cavities and gently parted anatomical lips with pink inner
pigment. The dark nasal/oral material stays on the carved skin, without backing
disks. Inspect the actual profile/clay and native phone frames in this folder.

The new original facial skin chart is a shared lossless 1,254-square material,
not a reference sprite or a replacement for three-dimensional features. It
loads once during selected zoo preparation, coalesces concurrent requests and
retains a stable offline fallback. One fully exposed facial fragment samples
it once instead of the old three triplanar coat reads. The feathered border
keeps the original coat. One additional mipmapped RGBA texture costs
**8,384,072 GPU bytes** (2,411,740-byte download), shared by all three gorillas.
This visual improvement is not presented as an FPS gain or RDR 2 equivalence.

Dense 192-cell authoring now provisions proportional temporary capacity and
refuses truncated surfaces. A closed-sphere regression test checks watertight
high-density output. Offline retopology keeps **38,240 vertices / 48,568
triangles / 412,672 pose bytes**, the same released runtime budget. Body volume
controls, ordinary pose bytes, palms, branch grips and all other choreography
remain. Only `gorilla-face-v3` changes the geometry revision. Elephant, approved
axolotl, otter and grizzly model bytes remain identical to the published files.

The existing carry performance now has three distinct high jumps, at **2.6,
4.2 and 3.2 world metres**, using true 9.81 gravity. Each lands before the next
launch and all finish before putdown. The cat follows the very same paired palm
transforms/root displacement; there is no independent cat hop or new buffer
upload. The 31-second performance, original supported pickup/carry, reduced
motion, cancellation and reserved ground return remain. Camera checks include
portrait/landscape and a high carried giant-cat head above the public seat.

Validation: the full local suite passes **857 tests** before the last small
brow refinement; all **62 zoo tests** pass after that refinement, plus the added
high-jump camera check covering five actual aspect ratios. The final CI reruns the
complete suite before deployment. Builds and Worker dry-runs pass. Source/cache
checks retain exact model/pose buffers and approved axolotl body fingerprints.
The native phone/SQLite flow passes five real mouse/touch habitat selections,
five enclosure/animal cameras, live animation behind gates, tiny/giant native
carry, visitor/world return, four payments and two durable reloads with no
browser or HTTP errors. Native captures use the downloaded final v3 model and
the actual shared face texture. Software images are not hardware FPS evidence.

The earlier independently verified working-set optimization remains a separate
commit; see `../active-working-set/`. No other island, owned ID, balance, family,
home, native cat mesh, water, light, shadow or mobile DPR is redesigned here.

The player explicitly approved the final face on 2026-11-02 after inspecting
the actual front/profile and native phone images. Preserve this appearance as
`baseline/approved-gorilla-face-20261102`; do not continue changing its shape.
All sixteen final tiny/giant carry frames, including the three actual jump
apexes, pass with no WebGL errors. `high-jump-frames.json` records their native
hand/visitor positions and fixed resource counts. Only zoo/gorilla shop previews
are refreshed. Publication hashes and the final complete CI count follow.
