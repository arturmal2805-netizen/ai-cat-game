# Clear tropical water and filtered sunlight

Reference runtime: published `72dc8ec`, unchanged in the main checkout. The
player requested more work on water with Black Flag as the visual reference.
This is an original stylized optical approximation, not imported game artwork
or real-time ray tracing. The approved foliage, water heights, ripple envelope,
ride routes/clocks, native cats/animals, island data and ownership are retained.

The first pilot improved transparency but exposed narrow reflective bands and
an excess caustic net. The final candidate reduces the high-frequency second
normal field, warps its domain, filters the specular lobe and scenery lookup by
wave footprint, and aligns sunlight with the original world direction. Pool
opacity follows the real sloping floor; blue centres retain contrast against
warm shore sand. Bottom caustics use the same two native field samples and
clock. Native projection/refraction and shader composition stay unchanged.

Runtime water still uses two wave samples plus one environment lookup. No new
textures, reflection passes, render targets, geometry or per-frame buffer
uploads are introduced. The eight refreshed 256-square original static probes
use 886,757 download bytes and the same 2.67 MiB mipmapped GPU allocation.

Twenty-two focused tests passed. Actual pilot normal/grazing/phone and opposing
sun views have no GLSL/browser/context errors and exact native/static colour
parity. The complete eight-model gallery passed: 32 seated/landing poses, 16 phone images, sun-facing and isolated-bottom views, 24 exact native/static comparisons (zero changed bytes), unchanged draw/triangle/channel/outlet counts. All eight 960×640 shop previews were regenerated. The production build passed. The full suite passed 933/933 tests. The real phone/SQLite audit passed eight purchases, all eight native rides/returns, both cameras, grouped boarding and three durable reloads. All 19 islands and repeat returns to Moon Garden and the zoo passed the final native RAF orbit/zoom audit: 21 views, 115 NPCs, original DPR 2, no browser/HTTP/context errors. An environment reconnect interrupted the first camera run; the pending cloud release was cancelled, and this complete fresh run replaced the partial evidence. Software-renderer data
must not be represented as physical Mac/iPhone FPS gains.

The gallery captures native riders only on the candidate. Its later whole-renderer
texture totals include four retained cat textures, so these totals are not a
like-for-like water-texture measurement. The focused shader/composition tests
verify the original three water/two bottom samples and existing field/clock
identities; all eight scenery probes retain their original dimensions/count.
