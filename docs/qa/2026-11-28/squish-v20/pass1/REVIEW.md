# V20 Pass1 native comparison — intermediate, not approved

Baseline exact f1abf006; candidate parent overlay and full source snapshot preserved per directory.
Actual native Warehouse, unchanged ten sector anchors and2220 collectible placements.
Same UI cameras, hour12, seed4419, terrain7, desktop DPR2. Before close and after close
camera matrices match; added developer close-ups do not alter production cameras.
After all10sector views+overview+3close: GL/HTTP errors empty. Diagnostics are
SwiftShader software rendering; counts do not imply phone/Mac frame rate.

Applied: owned static HDR replaces old probe in same resource slot; ivory floor,
shelf LED trims, fluted side podium boxes, smaller headers, softer white giant.
The all-sector images are preserved even where changes are artistically weak.

Reference review against user-provided glossy pink Jelly / golden shelves / whitegiant image:
1. Main Jelly remains too flat pink; broad white/coloured environment reflections are missing.
2. Metal remains brown and floor remains matte/hard-shadowed compared with reference.
3. Shelf variety, packages/plants/soft lighting and atmospheric density remain insufficient.
This pass is NOT reference parity or final visual acceptance. Actual supplied inline
reference bytes are not mounted; comparison is visual against conversation image.
Next investigate actual GPU probe content/material response, then repeat same-camera
native captures. Do not interpret diagnostic env gain15 override as production proof.

## Review correction: QA-only environment suppression

Subsequent causal investigation found check-aquarium.cjs paused render wrapper
suppressed ALL nested renderer.render calls, including Three PMREM generation.
It also suppressed the tiny probe readback render itself. Therefore the apparent
black map and almost identical gain0/15 images do NOT establish production map
failure. The flat material assessment above describes those captured frames;
it is not a trustworthy production lighting comparison. Preserve them as rejected
intermediate evidence, not acceptance evidence. Geometry/anchor/count observations
remain valid. A corrected gate allows internal/offscreen scenes and suppresses
only the exact main scene/camera. A fresh native browser is required because Three
caches the first generated map. New audit /workspace/qa/squish-v20-real-ibl pending.
