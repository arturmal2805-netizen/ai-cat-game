# Withdraw the four large farm islands

The player requested immediate withdrawal pending more precise instructions.
The active world returns to its existing 18 islands. Farm islands, shore roads,
land-shop cards, the dedicated farm category and owned-farm controls are absent.
Released island addresses and all twenty premium water slides remain unchanged.

Ownership and harvested stock are retained, without another payment or refund.
Archived orchard cycles remain in the save. Existing bought buildings migrate
through the established retired-island system; decorations go into storage,
and visitors move to the homestead. Repeated/cached saves cannot recreate the
islands or erase the archived orchard/ownership fields.

Validation: 13 withdrawal/legacy-island/layout/preview tests, nine focused
withdrawal/save-resilience tests, build and real phone Chromium + native local
Worker/SQLite audit. Actual shop/map has 18 islands and no farm cards. A paid
building migrates, Mega Loops remains owned, balances/stock are unchanged, and
two browser reloads restore the same save with zero browser/HTTP errors.
