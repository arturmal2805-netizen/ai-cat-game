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

The final prop-batch checks retain all 50 fish and DPR 2. The aquarium's four
views are byte-identical; the built homestead reduces calls by 32–58 in the four
views, with 6–39 channel values differing by more than 8 across 1.1 million
pixels (ordinary native-vs-batch raster precision). No geometry was removed.

The day-28 browser fixture starts with both legacy empty reviews consumed.
One mocked response forms two real application couples. Phone cards fit; the
partners complete their native Krusty Krab outing, reload three times with exact
private balances/homes, and occupy separate shared-home sleep positions. Five
identical SQLite retries and concurrent cached-phone writes preserve every pair.
The separate actual provider test above establishes real AI selection, not the
browser mock. A further real mixed request (36 working cats, affordable houses,
real available leisure places and families in one response) passes the strict
contract too:
https://github.com/arturmal2805-netizen/ai-cat-game/actions/runs/39465059285
The mixed probe exposed a provider's invalid negative roommate sentinel; the
scheduled structured response now uses nullable roommate objects while accepting
legacy tuple responses. There are no extra in-game inference timers or retries.

The mixed real request returned 17 valid pairs, plans for all 36 after-work cats
and 18 actual outing itineraries from 92 available places. It used 929 output
tokens and reported cost 0. Cloudflare's native Workers binding uses the schema
directly, whereas OpenRouter needs the OpenAI name/strict/schema envelope; the
router adapts only the primary copy and retains the reserve request unchanged.
Reference: https://developers.cloudflare.com/workers-ai/features/json-mode/

Final live WebKit follow-up covers summer, sakura, bikini, aquarium, the heavily
built homestead and a return to summer with the retained-batch implementation.
All complete and keep rendering through gestures; repeat summer detail readiness
is 42 ms. Cold-load timings remain variable in the software driver (sakura is
slower in this run); these data are not evidence of uniformly faster physical
Mac rendering. Actual fish GPU poses/normals/culling and native Chichi colour and
shadow comparisons pass separately, without lowering details.

A persistent primary-only quota flag from before reserve installation can no
longer block a newly configured reserve until midnight. The same day's failed
result remains cached and the next evening is reserved durably once; a restarted
ledger reuses its saved result without another model call. Without a configured
reserve, the original daily quota guard remains in force.
