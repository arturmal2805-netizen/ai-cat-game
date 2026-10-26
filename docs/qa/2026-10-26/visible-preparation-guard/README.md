# Covered-map preparation and bounded physical-device reports

The player reports that the whole M2/8 GB Mac slows while the game is open and
recovers when its tab closes. The physical cause of the visible-game overload
is still unknown; this report does not claim a Mac FPS improvement.

An initial source inspection incorrectly suspected offscreen native draws.
The browser test rejected that hypothesis: an earlier return in the loop already
omits them. That return is preserved. The actual missed gate was **graphics
preparation**: shader/texture warmup continued when a menu covered the map or
when the map was scrolled out of view; cooperative geometry work also continued
offscreen. Both now wait for the map to be usable. They retain their progress,
original geometry/materials and resume when it is visible. Work, rides, families,
housing and durable saves keep their existing simulation paths.

## Browser resource and lifecycle checks

Private local SQLite, Linux WebKit software graphics, DPR 2, four adopted cats
(18 actual mobile NPCs), moon/Job City fixture. A private hook restores the old
warmup gate for the comparison. It is not shipped in the application.

- Released offscreen: zero native frames (already correct), but an explicitly
  queued material compiles and its new texture uploads while the map is absent.
- Candidate offscreen: zero native frames, zero preparation/texture uploads;
  the queued work remains pending. The same eight work-simulation updates
  continue in both cases.
- Returning to the map resumes preparation and native drawing. A real modal
  likewise pauses preparation and native draws, then resumes normally.
- Manually pausing the opt-in profile produces zero native frames while 30
  work-simulation updates continue over the observation. Resuming works.
- Cat count, DPR and drawing buffer are unchanged; native return raster is
  coloured, with no GL errors or context loss. Browser JS/HTTP errors: zero.
- An independent second page using `?profile=1&pauseAfter=5` automatically
  stops native submissions at its deadline. A second page avoids counting
  WebKit's cancelled-unload fetch messages as visual-test errors. Both pages
  use the real private save service; AI networking is disabled in this visual
  fixture because careers/inference are outside its scope.

This measures resource gating, not device FPS. The generic/masked `Apple GPU`
string in the attached software-WebKit report is not an M2 hardware benchmark.
The full suite passes **718 tests**; the build passes. Graphics, water, shadows,
mobile DPR, cat meshes, save schemas and AI schedules are unchanged. Ordinary
visible play uses the same rendering and preparation conditions as before.

## Physical-device diagnosis without indefinite GPU load

Normal play has no diagnostic panel, transfer hooks, timer or automatic pause.
With `?profile=1`, the local panel can explicitly pause/resume its 3D view.
Adding `pauseAfter=15` pauses automatically after fifteen seconds, including
when a RAF/timer callback is late. It also stops preparation work, while
continuing the existing simulation. The next bounded attempt can be resumed
manually; the report remains copyable while paused. No networking or player
records are included.

The report now includes aggregated buffer upload calls/bytes and geometry
evictions during the frame window, alongside the existing CPU, native render,
GPU-queue and event-loop measurements. Those will help distinguish buffer
turnover from expensive stable rendering on the player's actual Safari.
Transfer hooks forward original GL arguments/results and are removed on
disposal. A frame that crosses the deadline is retained in the report.

The initial visual fixture inadvertently allowed a local, unconfigured career
request on reload; that 503 and WebKit unload errors were not accepted as a
clean test. The final fixture makes no AI requests and has zero JS/HTTP errors.
