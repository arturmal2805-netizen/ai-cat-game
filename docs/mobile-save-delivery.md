# Mobile save delivery and queued construction

No production world is migrated or populated by this change. The existing
placements, IDs, currency, construction deadlines and account binding remain
as saved by the players. Only the construction island's radius expands; the
centre and all plot coordinates remain fixed.

Developed cooperative worlds send a full snapshot plus their merge base. A
representative 84.6 KB world therefore made a 169 KB request, above browsers'
keepalive limit. Native gzip transport brings that request to about 22 KB and
allows the upload to continue after leaving the page. The local verified save
and durable outbox are still plain original state, written before sending.
Unsupported compression falls back to the original request and retains the
same restart queue. The server limits decompressed bytes and supports both
old JSON clients and gzip clients; CORS permits Content-Encoding.

A second independently reproduced failure involved a rejected income collection
while a later construction placement waited in the queue. The 409 handler
cleared both the rejected mutation and the later placement. It now drops only
the rejected entry, retains the later action's own merge base, and sends that
action next. It still refuses duplicate income or overspending. A regression
fails on the old handler and passes with the fix.

Confirming construction starts upload immediately, and the placement message
only reports shared-cloud success after acknowledgement and retention of the
placement. The world limit uses the current biome catalogue instead of the old
25-island limit, which would reject otherwise valid 26/27-island worlds.

Validation covers 30 repeated offline phone restarts with an Adoption Center
and a glass mega slide, simultaneous edits from another device, exact saved
IDs/coordinates/deadlines, lost acknowledgements, duplicate prevention, gzip
round-trips and size limits, plus the mobile browser/SQLite workflow in
`scripts/check-camera-shortcuts.cjs`. Abrupt termination without a network
connection necessarily waits for that device to reopen before its durable
outbox can reach the other device.
