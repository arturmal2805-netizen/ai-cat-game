# Meadow material source

Original: https://ambientcg.com/view?id=Ground037
License: CC0 1.0 Universal, https://docs.ambientcg.com/license/

Unmodified mirror files from TokisanGames/Terrain3D:
- project/demo/assets/textures/ground037_alb_ht.png
- project/demo/assets/textures/ground037_nrm_rgh.png

The mirror calls Ground037 grass, but visual inspection shows sparse weeds,
moss, twigs and exposed soil. This candidate uses it for worn ground only.
The mirror licenses ambientCG assets as CC0. A copy accompanies the files.
Immutable Git blob IDs and SHA256 digests are in meadow-ground037-source.json.

Packing: base colour RGB and height A; OpenGL normal RGB and roughness A.
Colour RGB is sRGB; normal/roughness are linear data. Height is not opacity.
The upstream texture-preparation documentation specifies OpenGL +Y normals:
https://github.com/TokisanGames/Terrain3D/blob/main/doc/docs/texture_prep.md

These are source candidates, not an accepted visual stage. Native cat-scale,
lighting, filtering, coverage and motion review are still required.
