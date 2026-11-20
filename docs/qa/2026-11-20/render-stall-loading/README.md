# WIP renderer stall/loading fix,2026-11-20

Published baseline7a0e1f3, exact451publicmodules verified in archived QA source.
Four actual full-game cameras + CPUprofile1000µs. Node22, desktopDPR1,
SwiftShader, private Worker/SQLite; timings do not establish physical M2FPS.
Baseline profile:16.5s inclusive native BufferGeometry.computeBoundingSphere
under WebGLRenderer/projectObject across inspected views; unrelated gl.finish
sampling/driver wait must not be counted as JS improvement. Raw profile retained.

Source candidate935a375 on codex/ocean-stall-loading-fix: native static spheres
prepared cooperatively before root reveal, exact Float16/interleaved/native
getters/centre/radius. Mutation/custom/morph/cancellation safeguards tested.
Hashed same-origin public art/model GETs reuse stale native HTTPcache entries;
API/code/AbortSignal/explicitcache remain unchanged. Real browser expiry/reload
fixture PASS, no new DB or service worker. First cold transfer not eliminated.

35focusedtests/Node22build PASS. Nineprobe rebakes reproduce identical PNGbytes;
only producer revisions change. LosslessWebP trials4–6% saved, rejected.
Candidate same-camera profile and all-map/phone checks underway. Not published,
no FPS multiplier/artistic approval claim. Baseline source proof and raw timings
are separate from candidate evidence.
