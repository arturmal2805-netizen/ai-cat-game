# Paid attractions survive rejected placements and cached saves

Reproduction: a paid finished Mega Loops whose saved placement lies beyond the
current shore loads with zero placements AND zero inventory, while the price
remains deducted and its purchase discovery still exists. The previous loader
simply skipped rejected placements. This reproduces a possible loss mechanism;
no private player world was accessed, and it does not identify their exact loss.

The loader returns rejected registered purchases to the bag with original ID,
construction deadline, crops and business metadata. Duplicate IDs cannot create
copies. Paid receipts are not truncated at sixty, and storing many copies does
not clamp the bag back to 100 on restart.

Reference attractions also retain monotonic total/completed-copy receipts.
A legacy purchase discovery establishes one owned copy when all physical copies
were lost. Known receipts retain the exact greater count and finished state.
Only matching-world-epoch local backups may supply extra ownership/completion
evidence. An unrelated account's backup cannot grant an attraction. No coins,
XP, geometry, approved cats, water or renderer settings are changed by recovery.
A missing completion receipt alone does not grant free finished construction.

Shared saves preserve those receipts across cached clients and combine actual
concurrent purchases. The included free waterpark land unlock does not reject
two separately paid first attraction purchases. Ownership recovery runs after
normal placement reconciliation, retaining stable valid placement IDs.

Validation: all 767 tests passed; 60 focused ownership/atoll/shared/resilience
checks and eight dedicated recovery checks passed. Forty storage/replacement
restarts preserve one finished copy and exact balance/XP. Real phone Chromium,
DPR 2 and private native Worker/SQLite: rejected finished Mega Loops recovers to
bag, replaces for no charge/deadline, prepares its actual full model, and stays
one copy after two reloads. Zero browser/HTTP errors. No player data or paid AI.
