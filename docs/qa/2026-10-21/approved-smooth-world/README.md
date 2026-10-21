# Approved world baseline and durable-save smoothness

The player's approved result is preserved remotely at
`baseline/approved-smooth-world` → `4e4f7e4f9bc15a39e7e0eae3465bb1ad7b1df695`
(runtime `9735e35133d399527925c9cb6f8f0df034373058`). The older
`baseline/capybara-standard` is retained separately. `AGENTS.md` now applies the
approved loading, resource-sharing, teardown and verification contract to every
future object, venue, house and island.

## Bounded change

The cloud queue reuses its own immutable merge bases. Each incoming live game
still gets a new independent snapshot; external or recovered unowned bases are
copied before reuse. A WeakSet tracks ownership without retaining old worlds.
The synchronous journal, mutation IDs, read-back and legacy JSON format stay
unchanged.

The local save path reuses the parse of the verified previous generation when
its bytes still match the primary. It encodes a rollback only on failure.
Changed/corrupt primary bytes are never trusted merely because validation ran
earlier. Primary and both backup writes remain synchronous, with the same
recovery behavior. No purchases or save writes are delayed to hide frame cost.

No renderer, geometry, material, water, light, shadow, animation, texture, cat
model, island population, DPR or gameplay frequency changed in this patch.

## Reproducible measurement

`scripts/check-durable-save-performance.mjs` compares the baseline and working
code in A/B/B/A order in Chromium, using the same fixed private world: all
islands unlocked, 16 adopted cats and 75 paid houses. There is no rendering,
inference or remote game state. Each run performs 48 real localStorage
checkpoints, verifies identical primary/pending/base bytes and restores the
pending purchase journal in a new client. See `durable-save.json`.

| Run | Median | p95 | Full copies | Synchronous writes |
| --- | ---: | ---: | ---: | ---: |
| Baseline, first | 21.1 ms | 34.4 ms | 96 | 288 |
| Updated, first | 8.2 ms | 15.2 ms | 48 | 288 |
| Updated, repeat | 8.0 ms | 11.5 ms | 48 | 288 |
| Baseline, warm return | 10.3 ms | 18.8 ms | 96 | 288 |

The first baseline includes cold-path overhead; do not compare only that number
or claim an equivalent FPS gain. Both warm results support reduced checkpoint
work. This measures synchronous saves on the test machine, not physical
MacBook/Safari rendering FPS. Whole-scene software-renderer timing was noisy and
is not used to claim a camera-frame improvement. Existing all-island/WebKit
exact-image evidence remains in `../capybara-standard/` for the unchanged
renderer.

The same A/B/B/A check also passed in WebKit 26.5, the Safari browser engine
(`CHICHI_BROWSER=webkit`; see `durable-save-webkit.json`). Warm medians were
8–9 ms updated versus 10 ms for the baseline return; updated repeat p95 was
14 ms versus 30 ms baseline return. First/cold tail values varied. All four
runs kept the same 288 writes and exact journal bytes and recovered 75 homes;
copies fell from 96 to 48. These are Linux WebKit storage measurements, not
physical MacBook frame rates.

## Homes: observations and visibility

Read-only player diagnostics found zero purchased home records, five existing
families and 18 cats able to afford the least expensive home. The ledger's last
two evening events were old failed `invalid_evening` responses. A later read
showed the same save revision and no new evening request; it did not show a
rendered home disappearing. No player save, lease, wallet, family or event was
modified, and no inference was started by diagnosis.

The previous runtime release already requires an explicit voluntary buy/wait
decision for each affordable buyer in the one normal after-work AI batch. Its
isolated real-provider proof created 80 purchases and recovered them exactly
once (see `../capybara-standard/production-ai-housing.json`). Failed old player
days are not replayed, and a house is not forced just to fill an empty island.

The real cat property panel now explains affordability and the normal evening
decision state: before work ends, pending, saved/voluntary waiting, or failed
without payment. This adds no AI requests, timers or purchases. Homes continue
to use original Chill Land architecture and expand into new residential
sections as purchases fill existing space.

## Verification

Added regression coverage checks immutable queue ownership across 19 successive
checkpoints/caller mutations, unchanged outbox restoration, one prior parse per
successful save, lazy rollback, and a primary changed between validation and
write. Housing-status tests cover affordability, time, pending/failure and a
completed voluntary wait without inventing purchases.

The browser/SQLite check also covers the actual phone property status, recovery
of one cached AI result after a lost response, visible original house models,
separate partner sleeping seats, reloads, repeated receipts and concurrent
older-client saves. All fixtures are private and use a mocked AI response.
`family.json` records one inference, two couples, completed native restaurant
visits, separate bed positions, zero browser errors and a phone dialog with no
horizontal overflow. Three reloads retain exact homes and private balances;
five repeated writes and concurrent old/new clients retain the same families
and home ledger. The AI-purchased native house renders after those reloads and
is charged once.

Full local suite: **645 passed, zero failed**. The final housing-status follow-up
also passed all 19 AI-event tests. Build completed successfully. Publication and
CI evidence are recorded separately after deployment.

Published source: `87ff8131e6fd138d6b629b01a29350c97256e2ca`. Workflow
`39565807889` passed test, Worker deployment and Pages publication. Live server
release/header match that SHA; live HTML references the verified
`8b8a2b07ca73ccf6` client bundle. Cloud saves and AI configuration remain
available. Routine deployment checks spent no inference credits. See
`publication.json`.
