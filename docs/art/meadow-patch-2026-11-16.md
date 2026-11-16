# Native meadow authoring checkpoint

This is the real Mosasaur shore at local (275, -25), approximately 54 by 46
metres. It preserves the original walking plane, saved placement coordinates,
approved cat models, lighting, DPR and shadows. It is a local authoring stage;
full-coast coverage is still pending visual and performance acceptance.

Grass004 supplies the turf. Ground037 supplies exposed soil and the worn path.
The original CC0 licences, upstream blob IDs and SHA256 checksums are recorded
in docs/assets. Colour is sRGB; GL normals and roughness are linear data, with
one image-row flip and no green-channel inversion. Tiles repeat every 2.5 m.
A prepared mask blends turf into soil and keeps the walking strip clear.

Low dense clumps retain the original v4 authored blade/colour/pose fixture.
Near blades have three curved segments; middle-distance blades have one.
The shader morph completes before each chunk switches topology, then collapses
between 30 and 46 m before the empty level. Chunk bounds include every instance
and bounded wind. Shared scalar wind changes no vertex or instance buffers.
Curved, ribbed broad leaves replace the local flat leaves.

The shore is split once along the material footprint, retaining its original
plane, side faces, area and UV interpolation. This keeps the local PBR shader
off the rest of the island. Paid-placement clearance still uses the native
placement system.

The turf normal RGB and roughness R are packed into one linear RGBA image at
original resolution. Browser ImageBitmap decoding and all eleven actual GPU
mip levels were checked against the original JPEGs: every channel matches.
This saves one sampler/lookup and one 1024-square GPU image, about 5.33 MiB
including mipmaps. It is a resource saving, not a physical-device FPS claim.
Original JPEGs are retained under docs/assets/meadow-originals. Run
scripts/pack-meadow-turf.py to reproduce the packed image, and
scripts/check-meadow-packing-native.mjs for the browser check.

The offline Mosasaur reflection baker now includes the actual meadow material,
local grass and local leaf geometry. The capture was genuinely rendered again;
its source dependency list includes all three meadow modules. Gameplay adds
no reflection pass or render target.

Native audit: CHICHI_TERRAIN_AUDIT=1 node scripts/check-aquarium.cjs. It archives
the exact source bundle, source hashes, texture hashes, renderer settings,
close/gameplay/medium/wide PNGs, moving views, ownership snapshots and raw frame
samples. The paired control uses the original shore material and no grass in
the same partitioned scene, with the same authored large leaves. Keep the
separate published c9 source run as the full original-scene comparison.
Native audit completion and its measurements belong in the review artifact;
unit checks or a successful build alone do not accept this stage.
