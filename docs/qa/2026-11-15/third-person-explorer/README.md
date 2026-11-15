# Third-person Chichi exploration

The player replaced first-person free swimming/walking with a low rear third-person
view. The final input requirement hides all travel controls on desktop and
uses compact 44-pixel thumb buttons at the lower corners on phones. Submarine cockpit/chase, the low Mall visitor view and floor overview
remain separate modes. No Chichi clone or model/cache producer is introduced.

Input:

- Desktop: WASD relative to the displayed camera, mouse drag to look, wheel for
  distance, E to exit/reboard/use a nearby airlock/resume, Space up/jump,
  Shift/Down to dive. C retains the existing submarine camera switch.
- When both hull and airlock are reachable, E selects the target ahead of the
  displayed camera. The real outer door is the portal aim target, including
  immediately after exiting the chamber. Phone actions remain separate.
- Touch: left canvas drag moves; right drag looks. Two left fingers drag
  vertically to ascend/dive; a two-left-finger tap jumps inside the Mall.
  Double-tap the right view to interact. Tap the actual boat to board, or tap
  Chichi during automatic return to resume. Compact arrows on the lower left
  also move; the lower right has up/dive (jump inside), board/exit, nearby
  airlock and submarine-camera/return actions. There is no instruction card.
  Buttons use pointer capture and independent pointer ownership; releasing one
  cannot release another held action or a keyboard key. Safe-area insets keep
  controls above the phone edge. The visible-viewport anchor also handles a
  canvas extending below the screen; the existing inventory bar stays clear. Primary fine-pointer desktops draw none.

The existing native rig turns toward actual displacement; travelled distance
sets leg/paddle phase and blocked/stopped motion cannot keep a walking stroke.
Breathing/expressions use the original animation clock. Runtime poses are outside
approved sculpt/geometry producers; a byte-level test retains the original mesh.

Camera clearance uses its own 0.22 radius, not a smaller character radius.
Furniture retains original measured OBBs; additional high boxes are collected
separately without changing navigation defaults. Actual retained walking-surface
buffers keep atrium/shaft apertures and landing geometry; boundary, pressure-door,
reef, terrain and seabed checks stop the camera. Following retains private state
and uses elapsed-time exponential easing rather than the earlier world orbit.

Explorer saves retain the released schema/version, original professions, wallets,
coins, inventory, ownership and ordinary-life handoff. Overview/visitor inspection
owns its floor display after manual control is released.

## Verification

Use Node 22, matching CI. The native harness creates a private Worker/SQLite world,
snapshots Worker/assets, disables paid AI and archives the exact served QA bundle
and its SHA256. No player save or live AI request is used.

- `test/explorer-camera.test.mjs`: low framing, stationary stability, 30/60/144 Hz,
  immediate safe retraction/smooth return, real floor openings/walls/furniture.
- `test/explorer-locomotion.test.mjs`: original rig motion, stop/cancel/reduced
  motion and unchanged geometry bytes.
- `test/ocean-explorer.test.mjs`: real runtime exit/axes/dive/reboard/reload/return,
  editing/blur, look versus movement ownership, touch input and held phone buttons, inspection
  isolation, unchanged save/economy fields and pressure-door sequencing.
- Native route: exit, swimming, actual sequential airlock, walking, exit/reboard,
  re-entry, continuous collision-checked approach to the escalator, floor 2,
  cold reload, Island/World release, physical dock and normal work after reload.
  A private boat checkpoint initializes the second scenario before its exit;
  the character is never relocated along the Mall walking route.
- Native input audit: real Chromium multitouch movement/look, ascent/descent,
  jump/release, actual compact phone buttons and no desktop control overlay. Touch delivery waits for native RAF
  before assertions; simulation stepping is accelerated for correctness checks.
- Native mode audit: manual view, actual Mall overview button, random low visitor
  button and World release keep separate camera ownership.

PNG and JSON evidence, exact QA bundles and logs are retained in the execution
workspace. Chromium uses SwiftShader with DPR 2; these correctness checks do not
establish physical-device FPS. Final completed run IDs/results are recorded in
`results.json` after verification.
