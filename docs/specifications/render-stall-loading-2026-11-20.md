# Fix first-view renderer stalls and immutable resource reloads

User reports of7a0e1f3 show multi-second renderer stalls and resource requests up
to23seconds on AppleM2/DPR2. Different camera workloads do not establish a code
FPS gain. Preserve all art, native cats, geometry/index bytes, DPR, shadows,
water/animation and ownership/save behavior. No paid inference or player-save QA.

The actual baseline CPU profile attributes16.5seconds across four inspected
renders to native BufferGeometry.computeBoundingSphere under projectObject.
Prepare the same static bound cooperatively before root reveal. Match native
vertex order, getters (including Float16/interleaved), centre/radius exactly;
never publish partial spheres, replace custom/morph bounds or accept buffers
mutated during a yield. Respect cancellation/foreground scheduling. Do not use
approximate enlarged spheres or change sorting/culling semantics.

Existing megabyte art/model files have content-addressed URLs and10-minute HTTP
cache headers. Revalidation stalls can be avoided with native force-cache for
same-origin hashed public art/model GETs. Preserve ordinary API/code requests,
AbortSignal and explicit cache options; no service worker or new persistent DB.
A real browser fixture checks expired cache reuse after two reloads/new app URLs,
byte identity, API requests, cancellation and explicit reload behavior. First
cold downloads remain subject to network throughput, not claimed eliminated.

Lossless WebP trials saved only4–6%; rejected to avoid codec/asset churn. Original
assets remain intact. Re-bake producer-hashed water probes; retain originals.
Same-source native CPU traces/cameras and pixel/geometry parity, phone controls,
all-island returns, Node22 build/full CI and actual live hashes are publication
gates. SwiftShader CPU diagnosis is not an M2 FPS claim. Canonical records:
codex/ocean-recovery-memory/docs/project-memory/CURRENT.md.
