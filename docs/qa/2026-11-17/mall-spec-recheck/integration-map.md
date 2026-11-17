# Renewed Mall request — integration map, 2026-11-17

Base: e25f6ffd3ab4cab2d3595a337573699bbaa4d3c2. The new pasted request is
byte-identical to docs/specifications/underwater-cat-mall-2026-11-11.md.
The attached exterior image renews the visual target, not proof that current
geometry matches it. Do not recreate a parallel Mall, inventory, AI or currency.

| Required system | Current source | What remains to assess |
| --- | --- | --- |
| Seven physical storeys, cat-head glass dome, wings and annexes | mall-rebuild-model.js, mall-architecture.js, mall-facade.js, mall-layout.js | Broad silhouette, transparent interiors and cyan/pink/gold lighting against attached reference |
| Real lift, doors, capacity four, physical queues and landing paths | mall-runtime.js, mall-layout.js, mall-rebuild-model.js | Preserve complete body sweeps and current route openings during visual edits |
| Store-specific real interiors and displayed products | mall-rooms.js, mall-interiors.js, mall-signature-interiors.js, mall-data.js | Floor-by-floor density/readability at actual ordinary camera; no decorative replacement of working shop controls |
| Existing autonomous AI choices and validated execution | leisure-data.js, mall-system.js, mall-runtime.js, mall-world.js | Verify current call sites and ordinary-job priorities; do not add per-cat inference timers |
| Wallets, transaction IDs, stock, owned/useable inventory | mall-system.js, jobcity-system.js, shared-world.mjs | Preserve once-only receipts and old-client merge semantics; shared-world is unchanged in current release |
| Cinema, food, ice cream and original animations | mall-interiors.js, mall-ice-serving.js, mall-ice-shop.js, mall-ice-data.js, mall-runtime.js | Verify current concrete exports before edits; character anatomy remains approved |
| Inspection, F1–F7/ALL/EXIT, guest observation | mall-world.js, mall-guest-camera.js, world.js | Distinct from global third-person control; no camera ownership overlap |
| Walking, swimming, airlock and reboarding | submarine-runtime.js, explorer-camera.js, chichi-manual.js | Keep actual sequential airlock, full body collisions, autonomous release and reload |
| Selected loading, warmup and explicit teardown | scene-tasks.js, mall-world.js, world.js | Bounded work and late-completion guards; no continuous full-scene reflection or new heavy postprocessing |
| Lossless floor RGB compression | mall-colour-palette.js | Maintain e25 exact colour/normal/UV/index/picking contract and its native pixel guard |

Source presence is not a new complete acceptance pass. Existing historical QA
is linked from standards/mall.md. Current Node22 targeted and private native
catalogue/lift/purchase/SQLite checks are being recorded separately. Visual
approval, actual Mac/iPhone performance and the entire image's composition are
not established by these unit tests or by CI.
