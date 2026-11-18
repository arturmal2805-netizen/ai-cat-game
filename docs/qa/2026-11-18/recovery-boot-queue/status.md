# Follow-up to live4025f71

During boot a real CloudBackup.flush can accept a queued save before app busy/game/
toast variables initialize. Calling the normal snapshot callback then creates an
artificial conflict and defers the authorized award. Hold snapshot application
and notices only during the scoped boot recovery operation; retain remoteGame,
flush durable writes, install the awarded snapshot via the explicit strict
recovery callback, and restore normal callbacks in finally on every path.
No server/world identifiers/award amounts or receipts changed. No second award.

Node22: all5 recovery-award tests PASS including real CloudBackup pending PUT→
POST→GET, zero early app callbacks, no conflict, restored callback identity,
strictly saved4381984 balance, empty acknowledged queue. Existing duplicate,
large balances, pending-write protection, account scoping still PASS. Client
rebuilt with same esbuild/sculptCacheVersion/versionSiteAssets under Node22;
models unchanged. Full CI/live verification for this follow-up still pending.
