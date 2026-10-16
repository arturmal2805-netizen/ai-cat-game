# Chichi portrait camera and full-detail loading

The camera button lives inside the existing “ВАША ЧИЧИ” care menu. It closes the
menu and smoothly frames the actual animated head of the main Chichi model.
It follows her through walks, play, swimming and rides. Pinch/zoom adjusts the
portrait framing; the return button and island navigation restore the usual
world camera. View preferences never enter the shared game save. Only scenery
actually obstructing the face becomes temporarily transparent in this view.
The ordinary world keeps its existing occlusion behavior.

Scene preparation now prioritizes the island the player selects. A background
island keeps its iterator and resumes later, rather than making the selected
island wait for its entire build. The shared scheduler advances short slices
and yields to input/paint. Safari's fallback uses MessageChannel instead of
hundreds of clamped zero-delay timers. The extra forced animation-frame wait
has been removed. Default scenery arrangements are cached with independent
records for each world and a bounded key based on occupied plots.

An optional IndexedDB graphics cache reuses the original sculpt and fur buffers
on repeat visits. Attributes, normalization and indices remain exact. A version
change, invalid cache, unavailable storage or quota error falls back to the
original sculpt, never a cheaper model. The graphics database is separate from
local saves, the cloud outbox and the Cloudflare save vault.

Browser validation includes all 24 islands using the MessageChannel path,
complete geometry/instance count parity with the previous release on the
comparison islands, phone portrait/landscape camera tracking, an animated
capybara ride, ordinary-camera return and SQLite save/reload. Software Chromium
measurements are not phone FPS guarantees. The isolated lagoon comparison
improved from approximately 10.5 to 3.6 seconds to full detail. A separate actual
app check restored the graphics cache and reduced world-constructor work from
about 5.3 to 2.7 seconds. These are environment-specific measurements.
