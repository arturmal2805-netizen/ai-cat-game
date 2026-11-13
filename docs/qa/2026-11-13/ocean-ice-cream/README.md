# Ocean Ice Cream verification

These are unmodified native game captures, not concept renders. The browser
uses Chromium SwiftShader at phone DPR 2; these checks do not measure M2/iPhone
FPS or establish a numerical visual-reference similarity.

- [Real storefront](ice-native-phone-front.png)
- [Six-flavor purchase menu](ice-native-phone-menu.png)
- [Blue Lagoon, native cat eating](ice-native-cat-eating-0.png)
- [Cosmic Rainbow, native cat eating](ice-native-cat-eating-1.png)
- [Private SQLite receipt/use and fixed-buffer summary](native-summary.json)
- [Lossless compaction proof](compact-evidence.json)

Both actual visits paid, ate, reloaded and returned. Balance 5000 → 4952 → 4887;
two receipts and one use per flavor. Both machine buffer versions are unchanged.
The native phone/desktop run has no browser/HTTP errors. Final route and runtime
checks cover saved chair height, stand-up clearance and position handoff before
clearing the goal. Manual detachment preserves the player's own drop.

## Known strict camera-image failure

The complete 20-visit / 19-island camera itinerary and three purchased-home
returns ran. Nineteen image comparisons have zero differences. The Zoo's gorilla
face varies even between repeated draws of the same frozen cached scene. The
same original-material comparison was repeated on the clean released eb6cbec
worktree: 26 changed channel bytes, maximum 4, with 45 changing on a repeated
same-path draw. The candidate has 38, maximum 5, with 42 on its repeated draw.
Zoo animal, surface and face sources/assets are unchanged by this branch.

[Exact counts](camera-known-issue.json). The strict zero-pixel assertion still
fails and remains in the harness; it was not relaxed or reported as passed.
The harness now completes all gestures/returns before reporting that failure.
This is recorded as an existing Zoo validation issue, separate from the passing
Ice shop, purchase/reload and lossless Mall compaction checks.
