# Cat Job City: trading verification

Runtime under test: `c23986f` (the parent `b03275f` adds QA documentation only).
Private local Worker/SQLite, WebKit software Mesa, original DPR 2. No player
world, production write or paid model inference was used.

- 13 focused tests passed. They cover 148 cat profiles, including the 95 adoption
  profiles, tiny/magical cats, initial careers, deliberate skips/poor balances,
  LONG/SHORT PNL, escrow, fees, liquidation, cached clients, simultaneous devices,
  lost ACKs, ledger restart, thirty save reloads and corrupt-backup recovery.
- The actual app puts six employed cats at six independent crypto-office seats.
  One mocked forecast opens a trade, the real 45-second simulation settles it,
  and three full browser reloads retain the exact wallet and investment records
  without another forecast. The private positive-PNL example is not a promise
  of profit: unit tests also exercise losses and liquidation.
- The interval remains seven game days, independent of family review. Active
  document exceptions: zero. The phone investment panel fits its 350px content
  width; desktop office and phone screenshots were inspected.

WebKit reports two departing-document fetch cancellations during full navigation
as “access control checks”. The harness explicitly records these separately in
`trading-browser.json`, releases the local editor lease before navigation, and
still asserts zero active-document errors and exact persistence after each
reload. No production CORS or save change was warranted by this test artifact.

Reproduce:

```sh
node --test test/crypto-trading.test.mjs test/crypto-office.test.mjs
CHICHI_BROWSER=webkit PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
LP_NUM_THREADS=4 CHICHI_PLAYWRIGHT_MODULE=/path/to/playwright \
CHICHI_REVIEW_DIR=/tmp/chichi-trading node scripts/check-crypto-app.mjs
```
