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
parity. The complete eight-model gallery, real phone/SQLite rides, all-island
cameras and full build/suite follow before publication. Software-renderer data
must not be represented as physical Mac/iPhone FPS gains.
