# Zoo animal sculpt, surfaces and movement

The previous animals visibly consisted of separate ellipsoids. This update
builds closed continuous sculpts with blended neck, shoulder and paw weights,
then retains the native fixed-palette animation and one batch per species.

- Elephant: continuous head/body/legs, softer ears, trunk attachment and folds,
  toe details, skin pores, weight shifts and corrected resting floor clearance.
- Axolotl: raised rounded head, joined short limbs, glossy protruding eyes,
  radial iris colour, six fine feathery external gills, breathing and tail motion.
- Otter: joined muzzle/body, underside cream coat, tapered fur, toes/pads,
  carried pebble and a body-centred roll instead of rolling through the floor.
- Tiger: joined cheeks/body/paws, tapered cheek fur, filtered white coat,
  separate face/body stripe fields, finer brows, stretch/groom/lie choreography.
  Removed raised stripe geometry that produced black spikes beside the legs.
- Polar bear: continuous muzzle/limbs, fur and paw details, nose-down dive,
  actual out-and-back turning and ice floes beneath its land-rest locations.
- Gorilla: continuous shoulders/elbows/knuckles, grey facial skin and fur,
  less bead-like tufts, articulated chest beat, climbing and seated knees.

RDR 2 is an anatomy/material/motion reference. These are original stylized mobile
animals; this report does not claim AAA photorealism or 1:1 visual fidelity.
The earlier landscape comparison still applies: this patch does not rebuild
all zoo terracing or claim that the island is 1:1 with the illustration.

Loading/performance safeguards:
- Full source sculpts and poses are built offline into six immutable assets.
  The browser downloads them only for detailed zoo preparation, not other islands.
- 11,871,932 raw bytes / 3,491,804 gzip bytes for all six. The loader checks the
  content hash and retains the same cooperative source builder on failure.
- Unit tests compare every decoded vertex/normal/colour/skin attribute, index,
  joint and pose float byte-for-byte with the full source. Native phone QA
  verifies that all six actual zoo batches use the downloaded templates.
- One shared 256² mipmapped coat texture; continuous animation changes uniforms,
  never instance or skin buffers. Species/animal counts, water, DPR and native
  cat geometry stay intact. Approved cat cache remains
  `sculpt-v2-a496203fa13a037a7a10a927`.
- Source preparation yields during sculpt rows, fairing, detail parts and pose
  baking. This remains a fallback, not the normal browser loading path.

Validation: 810 tests passed, production build and Worker dry-run passed.
The private real app/phone/SQLite test opens the island and five paid habitats,
checks all six visitor activities, close axolotl camera, tiny/giant native cat
photos and two reloads. Separate giant-park recall checks actual arrivals,
work/sleep exclusions, saving in flight and cancellation. All tests use private
worlds and no paid inference. Software-renderer images/counts are not physical
M2 or iPhone FPS measurements. More detailed geometry is not called an FPS gain.
