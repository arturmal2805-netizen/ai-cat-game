# Eye-only axolotl fix and compact gorilla face

In an overhead close camera the axolotl's eyelid tubes, solid backing and
scaling lid cap appeared as stacked pale bars over the eye. Those extra parts
are removed for axolotls only; the outer corneal rim now matches the turquoise
iris. The original eye/highlights and its real blink squeeze remain.

The user explicitly approved the axolotl's glossy skin and body. An independent
fixture from release `36c2009` verifies exact canonical nonocular vertices,
normals, colours, skin/coat attributes and triangles, plus every byte of its
400-row pose atlas. The eye domain includes the former backing extent. The
fixture is captured from the approved binary, not generated from the candidate.
No body/material/scene redesign is hidden in this small eye correction.

The gorilla's projecting muzzle was rejected. Facial relief depth is now 65%
of its previous depth around a more compact facial plane; eyes are smaller,
narrower, darker and recessed, the nose is more clearly shaded, and hair frames
the brow lower. The head remains continuous and no dark nasal/oral backing
meshes return. Dense 160-cell offline authoring improves the small facial
curves; runtime simplification retains 48,568 triangles (38,240 vertices), the
same pose count and fixed species batch. All nonocular pose matrix bytes,
including body, branch grips, palms and legs, match the approved release.
The front/profile and clay images show the actual model, not a reference sprite.

Only axolotl/gorilla model hashes change. New `axolotl-eyes-v2` and
`gorilla-face-v2` headers reject their old face caches independently; elephant,
otter and grizzly binaries are byte-identical. Global anatomy, ownership/save
IDs, animals, actions, other islands, water, light, mobile DPR and native cat
meshes stay on the released systems. Three corresponding zoo previews refresh.
There is no new texture, per-frame mesh update, AI call or render pass.

Validation:

- **851 local tests passed, zero failed**; production build and Worker dry-run
  passed. Added checks cover approved-body/pose fingerprints, real blinking
  without lid caps, compact muzzle bounds, unchanged gorilla body motion and
  independent stale-face rejection. Existing cache byte equality, native cat
  carry, branch/palm contacts, cameras and save tests pass.
- Native phone/SQLite full flow passes five real mouse/touch habitat selections,
  five enclosure/animal cameras, tiny/giant cat carry, random visitor/world
  return, gate payments and two durable reloads without browser/HTTP errors.
- Separate native overhead run captures open/partial/closed eye frames at
  **measured** elevation 1.05 radians after waiting for the actual camera/look
  to reach their target. All six frames verify downloaded/prebaked geometry.
  The screenshots retain ordinary game water, lighting and full phone DPR.
- Before/after source overhead views and final compact gorilla front/profile
  views pass WebGL checks. These are software-browser diagnostics, not a claim
  about physical-device FPS or exact photographic/AAA equivalence.

`assets.json`, approved fixture, native reports and images record the checks;
publication hashes are recorded separately after live deployment succeeds.
