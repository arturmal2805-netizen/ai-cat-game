# Mosasaur Ocean surface scans

The ocean uses the following Poly Haven CC0 photographs, hosted locally with
the game. The license is https://polyhaven.com/license (CC0 1.0 public domain).
These are original coastal/rock scans, not assets from Assassin's Creed.

| Asset | Authors | Use |
| --- | --- | --- |
| [Rock Face 03](https://polyhaven.com/a/rock_face_03) | Dario Barresi (photography), Rico Cilliers (processing) | 2048² colour, 1024² OpenGL normal + roughness |
| [Coral Ground 02](https://polyhaven.com/a/coral_ground_02) | Rob Tuytel | 1024² reef ledges and coral micro-normal + roughness |
| [Coast Sand 01](https://polyhaven.com/a/coast_sand_01) | Rob Tuytel | 1024² sandy seabed |

`scripts/build-ocean-rock-surfaces.py` downloads and checks the source MD5s,
retains the JPEG photographs, and packs linear roughness into normal alpha.
`public/art/ocean-rock/sources.json` records exact URLs and source SHA-256s.
The five maps total 11,518,457 download bytes / 44,739,236 mipmapped RGBA bytes.
Only the selected ocean prepares them; requests coalesce and decoding is
limited to three concurrent images. No external requests occur during play.
Metre-based triplanar mapping avoids stretched UVs on the real sculpted cliffs.

This is surface art work. It does not establish a physical-device FPS increase
or equivalence to the user's AAA reference.
