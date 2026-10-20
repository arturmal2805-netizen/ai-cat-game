# Optional purchases must not cancel valid evenings

Read-only production diagnostics confirmed five permanent families from a
successful evening decision. A later event failed with `invalid_house`, which
rejected its entire otherwise usable evening response.

House tuples now accept null/missing roommates in the same way as house objects.
Unknown or unaffordable optional house suggestions are omitted without charging.
An unavailable roommate does not cancel an affordable AI-selected house; the
existing housing system selects an available occupant. Structured purchase
warnings retain the reason. Unrequested buyers, duplicate buyers, invalid
mandatory activities/careers and invalid family proposals remain strict.

This avoids a reserve inference for an optional purchase error. Daily event
reservations, exact prices, house receipts, lifelong families and professions
remain intact. No player save or live AI event was changed during diagnosis.

58 targeted event/provider/housing/family tests passed, including seven purchase
forms with and without a family review; valid activities/families apply and only
affordable houses charge once. Build passed. The preceding rendering release
passed all 634 tests and all three production CI jobs.
