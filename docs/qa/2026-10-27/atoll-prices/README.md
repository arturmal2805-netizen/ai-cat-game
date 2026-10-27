# Affordable giant water-slide prices

The user superseded the original eight-times pricing rule with a range of
80,000–250,000 coins. All twenty new slides now progress in catalogue order
from exactly 80,000 (Giant Wave) to exactly 250,000 (Mega Loops), rounded to
whole thousands. Existing slides retain their prices.

Only the new slides' purchase prices change. A deep comparison against the
previous release, excluding `price`, found every other catalogue field equal:
income, construction times, unlock levels, routes, dimensions and save IDs.
Graphics, animation and rendering sources are untouched; the approved sculpt
cache remains `sculpt-v2-a496203fa13a037a7a10a927`.

Validation: 65 existing atoll, economy, business-XP and shared-save tests passed;
production build passed. Tests cover all twenty payments and repeated reloads,
insufficient funds, legacy purchases, cache-client merging and bounded income.
The income fixture leaves wallet headroom because the newly cheaper purchase
no longer necessarily creates room for an entire unchanged hourly register.

`prices.json` records all twenty final prices and unchanged income rates.
`unit-tests.txt` contains the test results. Deployment still runs the complete
repository test suite before publishing the Worker and GitHub Pages.
