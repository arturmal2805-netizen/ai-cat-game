# Mall vertex storage compaction

The horizontal Mall's baked copies retained source vertices that their exact
reuse indices never referenced. Compact only those copies, without welding,
quantization, triangle reordering, material replacement or changes to native cats.
Keep the index type and face numbers so native picking and static multi-draw
byte offsets remain valid. Dynamic, interleaved, half-float and morph streams
retain their original representation.

The current authoring scene includes the new fittings and fourteen native
background cats. Before/after resources from the same frozen view:

| Resource | Before | After |
| --- | ---: | ---: |
| Geometry buffers | 375,383,211 bytes | 252,678,097 bytes |
| Geometry count | 1,230 | 1,230 |
| Differing colour/shadow channel bytes | — | 0 |
| WebGL error | — | 0 |

122,705,114 bytes (117.02 MiB) of unused storage were removed. All rendered
indexed attributes and triangles remain. The comparison uses Chromium
SwiftShader, native Three rendering and its real shadow pass, not an estimate
of Mac/iPhone FPS. The complete game's physical-device rate is not established
by this result. Images are actual renderer captures, not concept artwork.

Evidence: `/workspace/qa/mall-horizontal-compact-v2/compact-evidence.json`,
`compact-before.png`, `compact-after.png` and
`/workspace/qa/mall-compaction-unit-final.log`. The unit checks independently
compare the indexed streams, native ray hits, face order, bounds, normalized
attributes, idempotence and unsupported dynamic/unindexed data.

This is one optimization checkpoint. Mall architecture/native integration and
visual reference acceptance remain separate work; this commit does not claim
85–90% reference similarity or completion of that rebuild.

## Final retail-art recheck, 2026-11-13

The revised physical shopfronts, ceilings, signature stores and sixteen bounded
ambient guests were checked again. Before/after geometry bytes are 405,584,173 /
268,698,703; all 1,395 geometries remain. Saving: 136,885,470 bytes (130.54 MiB).
The actual frozen colour/shadow comparison again has zero differing channel
bytes, maximum difference zero, GL error zero and no browser errors.

Evidence: `/workspace/qa/mall-all-storefronts-v4/compact-evidence.json` and its
`compact-before.png` / `compact-after.png`. The same run renders every one of
the 34 fronts. Native phone/world/purchase checks remain separate; these figures
still do not establish physical-device FPS.

## Ocean Ice Cream integration recheck, 2026-11-13

The six-flavor shop, dispensing machines and supported display cones retain
all 1,403 geometries. Buffer storage is 411,127,247 before / 271,099,295 bytes
after compaction: 140,027,952 bytes (133.54 MiB) removed. The actual frozen
colour/shadow comparison has zero differing channel bytes, maximum difference
zero, GL error zero and no browser errors. All 34 fronts plus the Ice interior
rendered successfully in the same run.

Evidence: `/workspace/qa/mall-all-storefronts-v5/compact-evidence.json`,
`evidence.json`, `compact-before.png`, `compact-after.png`. This remains a lossless
resource reduction and does not measure physical-device FPS.
