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
