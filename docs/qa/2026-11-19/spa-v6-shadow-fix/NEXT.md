# SPA V6 eighth iteration — actual shadow and pool-volume corrections

Seventh exact native checkpoint d0a2e9f4f7b93498d799cd333ecab50dee4e56c8.
All six reference frames and Nap W/World/upper36m pool/SQLite behaviour PASS;
visual review found concrete defects. Those old PNG do not include this fix.

finishResortSpaSteps copied geometry/material but omitted source.castShadow.
batchModelSteps uses parts.some(castShadow), hence opaque furniture/ceilings
became non-casters. Preserved source castShadow/receiveShadow explicitly. Glass
and water remain non-casters as authored. Reproducer fails against6397605;
corrected test passes. No global lights/exposure/shadows/DPR changed.

The enlarged upper pool exposed a duplicate Cafe decorative roof (13–19m) and
pendant (top17.2m) inside its true16.2–18m water volume. Cafe already uses the main
atrium dome: remove duplicate low ribs, lower chandelier under the glass bed.
Vertex-level TubeGeometry test proves no such decorative intrusion remains.
Existing Cafe/sky navigation and original cat geometry unchanged. Two checks PASS.

Next native visual run Node22/Chromium/Playwright:
CHICHI_EXPLORER_AUDIT=1 CHICHI_RESORT_SPA_AUDIT=1 CHICHI_SPA_V6_AUDIT=1
CHICHI_SPA_V6_STAGE=shadow-fix CHICHI_SPA_V6_INCLUDE_SKY=1
CHICHI_REVIEW_HOUR=12 CHICHI_DESKTOP=1
CHICHI_REVIEW_DIR=/workspace/qa/spa-v6-shadow-fix node scripts/check-aquarium.cjs
Same six cameras/settings as seventh stage; compare light records too. This
run checks visual/shader changes, not another duplicate full procedure tour.
Archive exact output and review each reference, preserve remote checkpoint.

## Next reflection stage — design, NOT implemented yet

Current floor finish uses ocean/Mall probe; SPA water uses shared sky fallback.
Neither contains the new SPA lanterns/flowers/interiors. Restore cast flags first,
then capture actual local geometry instead of inserting a random reference image.

Suggested bounded offline path: extend the private native QA runner with a bake
mode AFTER actual SPA preparation. Use actual scene/material/light settings;
mask moving cats/actors/fish and water surfaces to avoid ghosts/recursive probes.
Freeze authored fixture pose, preserve/restore renderer/visibility in finally.
One CubeCamera capture per room plus upper sky (15), linear HDR /4 packed into
64px octahedral charts. No gameplay cube cameras or per-frame render targets.
Record exact source/bundle/settings/assets hashes; abort if source changes.

Store one checksum-addressed PNG tile sheet and full source-revision manifest.
Runtime decode into DataArrayTexture (15x64x64 RGBA8 ~0.31MiB with mips), linear
NoColorSpace, exact byte/orientation check, independent layer mipmaps avoid atlas
bleeding. Fetch/prepare only with selected SPA via existing coalesced preparation;
failure retains previous actual/fallback probe without blocking the world.

SPA-only material hook can derive room layer from existing aMallRoom group IDs
(floor((id-1)/4)), preserving static shader hooks/cache keys. Water uses same
water core/waves/Fresnel with its SPA layer texture only. Verify actual GLSL3
sampler2DArray compilation in this pinned WebGL2 renderer and preserve fallback;
do not alter global water/Mall/cat shaders. Sky needs its own15th layer.
This is a proposal, not a promise of mirror quality or phone/Mac FPS. Actual
scene-derived images and GPU/software measurements required before promotion.
