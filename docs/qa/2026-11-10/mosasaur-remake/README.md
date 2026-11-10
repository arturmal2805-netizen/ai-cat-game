# Mosasaur working stage — 10 November 2026

Production remains on the approved global-water release 6a5a5d9. This feature branch is under development. The player approved the new creature's direction but explicitly rejected the present underwater terrain as too coarse; the environment does not meet the requested reference fidelity and is not a release candidate.

The continuous creature and exact packed geometry have a preserved checkpoint: baseline/approved-mosasaur-shape-20261110 (55de3b2). Later work adds outward-facing overlapping scutes, real nostril recesses, curved enamel teeth and matching animated depth/shadow geometry.

Verification so far:

- 21 focused Mosasaur, ownership, navigation and fish checks passed before the final small detail pass.
- 13 current creature/packed-asset/route/marine tests passed; seven topology/coral/scenery LOD checks passed; all three ambient-continuity checks passed.
- 17 world-performance and purchase-preservation unit checks passed.
- Native full-DPR phone: real touch drag, both ride cameras, submerged and airborne cat seat transforms, dry return, resident ride and private SQLite persistence passed (`/workspace/qa/mosa-native-v10.log`). Ten actual earlier phase images are in `/workspace/qa/mosa-native-v9`; that run stopped only at an obsolete post-cancellation expectation, corrected in v10 for autonomous swimming.
- Removed the invisible lagoon selection plane's obstruction of a visibly submerged creature. A ride command retains the cat at its original location and uses the dry approach, rather than teleporting it onto water.
- Packed geometry is fetched/decompressed/coalesced before cooperative construction; the native phone audit asserts that the downloaded geometry was actually installed.
- 65,536 seabed queries stayed bit-for-bit identical after avoiding distant terrace work/repeated base calculations. One local CPU comparison was 192.83ms -> 100.73ms. This is construction/collision-query timing, not an M2/iPhone FPS claim.

Current art gaps: close canyon surfaces are too coarse and repetitive, coral gardens lack underwater richness, and the master reference's density/composition is not achieved. Next work integrates the playable submarine and uses its actual close camera for terrain and marine-life review. Keep the global water baseline, native cats, all existing ownership and other islands intact.
