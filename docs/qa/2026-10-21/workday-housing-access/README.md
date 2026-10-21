# 09:00–17:00 work and free residential access

Work starts at 09:00, ends and settles at 17:00, and the saved after-work AI
batch becomes due then. Actual attendance caps at the eight-hour shift, with
no double settlement/repeated evening inference. The released noon clock origin
is independent of work hours: existing epochs, day numbers, calendar dates,
weekly trades and old receipts do not jump backwards or reset. Quiet homeowners
may rest at 17:00; chosen walks/drives retain their existing evening curfew.

Residential sections are one destination, not new paid unlocks. Clicking any
expanded terrain section now centres that section rather than the original
island. Growth remains free and automatic after twelve paid cat houses fill a
section. Archived duplicate-home lots also preserve the extent of previously
expanded land across restart. Other islands and player purchases are unchanged.

Verification:

- Full suite: 695/695 pass. Build and Worker deployment dry run pass.
- Explicit 08:59/09:00/16:59/17:00 boundary tests, eight-hour wage calculation,
  twenty reloads, one 17:00 AI reservation and no second event at old 19:00.
  Crypto and city clocks agree without changing their calendar origin.
- Existing 120-day / 147-cat lifecycle test now exercises arrivals relative to
  09:00 and settlement at 17:00, retaining its independent requirements for
  attended wages, every cat owning a car/home and varied private wealth.
- Actual Chromium app, private SQLite: 25 houses cost 40,000 cat coins; three
  sections appear with zero player-land charges or unrelated biome unlocks.
  Desktop and phone taps select sections 1, 2, 1, 0 at their exact positions.
  Balances/ledger stay unchanged by navigation and survive reload; no AI calls
  or browser errors. Thirty-one focused housing checks also pass.
