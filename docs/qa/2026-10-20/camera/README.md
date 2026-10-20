# Camera gestures, all islands and return to Catquarium

Private local SQLite worlds only. The fixture contains all 30 islands, 147
residents plus Chichi, four large placed slides and sixteen businesses. Chromium
uses software WebGL at DPR 2 (776 × 1464); these measurements are not Mac/iPhone
FPS and do not establish that every physical-device stall has been eliminated.

The same ordered 30-island tour returns to Catquarium as visit 31. Each visit
exercises wheel zoom, pointer orbit and native two-finger touch. Page zoom stays
unchanged. The final run also asserts that pinch does not issue cat raycasts.
Frozen colour/shadow frames with native versus cached node matrices match
exactly on every visit. The crowded homestead and both aquarium visits compare
pixels after disposing/re-uploading actual rendered GPU geometry: zero changed
channels. Browser/HTTP errors and context loss are absent.

- `unbounded.json`: the pre-retirement implementation retains 747,160,462 WebGL
  buffer bytes after the tour. This diagnostic includes the camera/matrix/shader
  work in this patch; it isolates the missing geometry-retirement policy rather
  than representing a separate published release or a device-FPS benchmark.
- `residency.json`: the same fixture/order with retirement retains 244,370,118
  bytes, 67.3% less. All image comparisons match.
- `gestures-and-reupload.json`: final touch handling and forced re-upload proof;
  244,342,086 bytes after the same tour, all 31 image checks and three re-upload
  comparisons pass. Current/recent colour and shadow geometry always take
  priority over the cache target; no detail or DPR changes are made.

Buffer bytes exclude textures, driver overhead and the browser framebuffer.
CPU phase samples retain simulation and full renderer commands but suppress
raster draws/clears after real image checks. They include outliers and cases
where matrix caching provides no gain. Different live animation/AI phases and
software-driver backpressure prevent treating these samples as a precise FPS
comparison. Temporary shader reflection spikes are retained in the reports.

Reproduce with `CHICHI_GESTURE_ALL=1 CHICHI_MAP_CHECK=1 CHICHI_SCENE_STRESS=1
CHICHI_MOSA_CAPTURE=0 node scripts/check-aquarium.cjs`, setting
`CHICHI_PLAYWRIGHT_MODULE` and `CHICHI_CHROMIUM` for the installed browser.

Final validation: all 592 Node tests pass, production build and Wrangler dry run
pass. The phone integration retains all 50 fish, correct visitor seats, glass
roof/fish camera and three real touch drags (resident→resident, hero→resident,
resident→hero), then reloads the shared save. The family integration repeats
reloads, lost-response retries and concurrent writes from current/older clients;
exact homes, couples, private balances and completed outings survive. Real GPU
fish pose/normal probes and all four native Chichi colour/shadow comparisons
also pass. Commands and completed statuses are in `validation.json`.
