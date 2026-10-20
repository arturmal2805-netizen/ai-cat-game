# Camera/loading regression and missing families

Production reports concern MacBook Safari, with long first visits and stalls on
rotation/zoom across the map. No player save or account was used for these checks.

Graphics preparation previously ran explicit background work outside its queue,
so scene attachment and explicit preparation could compile the same root twice
and hundreds of batches could compete. Preparations now share an in-flight job,
serialize background work, promote the selected island and stop retired jobs at
async boundaries. Only relevant island roots and actually visible prop batches
prepare. Original native props draw until their exact batch shaders are ready.

Adding one completed attraction previously destroyed every static prop batch.
Unchanged groups now keep their buffers, materials and prepared programs. Paint
and vertex layout signatures are cached within each synchronous edit, preserving
later tint edits even when Three does not increment material.version. Source
geometry, shadow passes, resolution, cat/fish counts and authored water remain.

`webkit-all-islands.json` is a real RAF/WebGL/fence run on Linux software WebKit
26.5, 1100x800 CSS viewport, DPR 2, 16 adopted cats plus native venue staff and a
built homestead with four large rides and twenty businesses. It visits all 30
islands, wheels/rotates every island and revisits moon. All loads completed and
all gestures continued rendering, without context loss. This first run includes
the queue fix; later unchanged-batch retention needs its own final probe. These
slow software raster timings do not demonstrate physical Mac/phone smoothness.
Previous command-only diagnostics did not measure that live GPU path.

An empty family response previously advanced lastReviewDay by another fourteen
days. Empty results no longer advance it; a legacy save with no families keeps
its first introduction due. Calendar origin, careers, wallets and existing pairs
are preserved. A successful review still observes the quarter-roster budget and
fourteen-day interval; there is no lifetime family cap or per-cat inference.

Two explicit free reserve probes reproduced invalid truncated family responses:
the provider enumerated too many pairs despite the prose limit. A bounded JSON
schema now constrains family count and eligible male/female indices at decoding.
The full atomic validator still rejects duplicates, conflicting partners and
oversized proposals. The successful third real probe selected 18 valid pairs for
147 fictional cats, finished normally with 369 output tokens and reported cost 0:
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/39464223770
No player balances or actual families were accessed or changed by the probe.
