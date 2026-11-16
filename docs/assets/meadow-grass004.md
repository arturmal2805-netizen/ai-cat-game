# Local meadow candidate — Grass004

Original ambientCG Grass004, CC0 1.0, mirrored unchanged from Project Chrono.
The upstream USD material states author, source URL and CC0 dedication; its
unmodified copy is public/art/meadow/Grass004-source-license.usda. Blob IDs and
SHA256 checksums are in meadow-grass004-source.json.

Visual inspection: dense interwoven cut turf with green and dry blades. This
is the grass substrate, distinct from Ground037's sparse weeds and exposed soil.
Colour uses sRGB. NormalGL RGB and roughness R are linear data. All bitmap rows
flip once during decode; Texture.flipY=false, positive normal Y is retained.
The unmodified normal map has no extra DX green-channel reversal.

The local candidate uses a 2.5 metre repeat, anisotropy 4 and trilinear mipmaps;
normal strength 0.28. Height is not opacity. Ground037 roughness comes from A
of its linear packed normal/roughness image, never the blue normal channel.
Native colour is not multiplied by seasonal olive paint. No asset is accepted
until actual local cat-scale still/moving views and timings have been reviewed.

Runtime packs the decoded GL normal RGB and roughness R into one linear RGBA
image at the original 1024-square resolution. No resizing or colour/normal
channel change is applied. This removes one sampler and one GPU image, about
5.33 MiB with mipmaps. Original JPEGs remain in docs/assets/meadow-originals;
scripts/pack-meadow-turf.py verifies their SHA256 and exact saved channels.
The packed image and input hashes are in meadow-turf-packed.json.
