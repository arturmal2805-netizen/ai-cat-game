# Colony rendering and gradual families

This pass preserves Chichi's native renderer, every approved cat/fish vertex,
material, shadow setting, water effect and DPR 2. Compatible non-hero cat draws
share pose data and rendering across the colony. Quiet scenes retain individual
draws. Static-range outfit paint remains native; the regression check covers
the actual shared staff-apron material, not a synthetic shader marker.

`whole-render.json` compares the same world with sharing disabled/enabled. The
crowded homestead submits 2,323→490 draws while still and 2,325→492 while moving,
with exactly 5,303,337 and 5,340,281 triangles respectively. Resident duplicate
GPU geometry buffers drop from 1,533→551 and 1,553→559. Renderer CPU medians in
this diagnostic change from 63.8→33.6 ms and 67.6→36.8 ms. Quiet-island results
are also retained, including noisy samples and cases without an improvement.

These are software Chromium diagnostics, **not physical-device FPS**. The CPU
audit suppresses raster draws/clears after warming real frames, while retaining
matrix evaluation, traversal, frustum checks, shaders, texture/uniform uploads
and render commands. Driver backpressure can still cause outliers. It excludes
navigation and cannot establish that reported Mac/iPhone lag is eliminated.

`homestead-images.json` separately records actual full-resolution colour/shadow
frames, four frozen views, with equal triangle counts and a 776×1464 framebuffer.
Mean absolute channel error is at most 0.000037/255, with at most 8 large channel
differences among 4,544,256 channels. This bounds floating-point/antialias edge
rounding; it does not permit a missing model or reduced detail. Both real-world
image reports include shader diagnostics and context-loss checks. The aquarium
keeps all 50 fish. Chichi and isolated pose-transport comparisons additionally
check the approved poses; the colony comparison includes three breed profiles.

Families now use a per-review introduction budget rather than a lifetime cap.
Approximately a quarter of the roster can join new couples every 14 game days;
remaining compatible singles stay eligible in later reviews. Existing couples,
sex identities, balances, homes and calendar origin are retained. Tests cover
successive reviews through the compatible roster, small colonies, concurrent
devices, adjacent-day budget races and grandfathered saved couples. The existing
daily AI batch is reused without additional per-cat requests.

Browser checks use temporary SQLite Workers and random private worlds. They
never load or modify a player account. `validation.json` lists the completed
checks and their commands. Full CI runs the Node suite before deployment.

`whole-map.json` covers all 30 islands with 147 residents plus Chichi, four large
placed slides and sixteen businesses. Browser/HTTP errors are empty; original
prop picking works and all 147 friend cards retain their identity while values
update. `phone-and-saves.json` checks all 50 fish, visitor seat separation,
interior/fish cameras, three actual touch drops, friendship/piggyback and shared
save/reload. `fish-gpu-motion.json` compares actual GPU positions/normals and
full/culled frames, including frozen and reduced-motion cases.
