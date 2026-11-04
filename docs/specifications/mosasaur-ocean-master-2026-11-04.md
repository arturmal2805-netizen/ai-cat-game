# MASTER DEVELOPMENT SPECIFICATION
## CHICHI CAT WIZARD WORLD — MOSASAUR OCEAN REMAKE + GLOBAL WATER ENGINE + PLAYABLE SUBMARINE

**Priority:** CRITICAL  
**Target:** Existing browser-based game  
**Reference:** Attached cinematic Mosasaur Ocean image  
**Visual goal:** Maximum possible 1:1 recreation  
**Platform:** Desktop web browser, primarily Chrome  
**Implementation:** Real-time interactive 3D, not a static image

---

# 1. MAIN OBJECTIVE

Completely rebuild the existing location **«Небесное море мозазавра»** to match the supplied reference image as closely as technically possible.

The location must become an enormous, spectacular, explorable tropical ocean environment with:

- Crystal-clear turquoise Caribbean water.
- High-quality ocean rendering comparable in visual ambition to a modern pirate adventure game.
- An enormous, realistic, terrifying Mosasaurus.
- A dramatically enlarged island and ocean basin.
- Deep underwater environments with actual 3D geometry.
- Hundreds of visually varied coral formations.
- Underwater caves, cliffs, ruins, vegetation, fish, and marine life.
- A fully playable, fast, responsive submarine.
- Two interchangeable submarine camera modes.
- Seamless above-water and underwater transitions.
- Dynamic lighting, water reflections, caustics, foam, and particle effects.

**Do not create a new location. Replace and upgrade the existing Mosasaur Ocean location.**

Preserve all existing player progression, location unlocks, currency, inventory, character data, navigation, and save compatibility.

# 2. FIRST — INSPECT THE EXISTING PROJECT

Before changing anything:

1. Inspect the repository and identify the rendering engine, scene structure, camera system, movement system, terrain system, save system, and location registry.
2. Find the existing location with the identifier or display name «Небесное море мозазавра».
3. Identify all assets and scripts belonging to this location.
4. Determine how the game currently renders water.
5. Identify existing player character models and animation systems.
6. Determine whether the game uses Three.js, React Three Fiber, Babylon.js, PlayCanvas, or a custom engine.
7. Reuse the existing architecture wherever possible.

Do not introduce a second competing rendering engine.

Do not delete existing gameplay features.

Do not replace the entire game with a new application.

# 3. REBUILD THE LOCATION AT FIVE TIMES THE SCALE

The new ocean location must be approximately five times larger in horizontal dimensions than the current location.

This means the explorable area should expand dramatically, not merely appear larger through camera zoom.

Preserve the existing entrance and navigation connections.

## Island environment

Create:

- Massive tropical coastline.
- White sand beaches.
- Natural rocky cliffs.
- Dense palms and tropical vegetation.
- Bright flowering trees.
- Small waterfalls.
- Wooden piers and bridges.
- Decorative paths and lanterns.
- Hidden coves.
- Small surrounding islands.
- Underwater cave entrances.
- Ancient submerged ruins.

Maintain the original game's charming, colorful, stylized art direction.

The world must feel like an exceptionally polished premium version of the existing game, not a completely different game.

## Ocean geometry

Create a real underwater terrain mesh with:

- Shallow sandy shelves.
- Coral terraces.
- Sloping seabeds.
- Deep vertical cliffs.
- Underwater canyons.
- Massive central trench.
- Hidden underwater chambers.
- Natural rock arches.
- Submerged temple ruins.
- Deep caves accessible by submarine.

Suggested target depths relative to the water surface:

- Beaches: 0–3 meters.
- Shallow reefs: 3–15 meters.
- Coral slopes: 15–40 meters.
- Underwater ruins: 25–60 meters.
- Deep canyon: 60–120 meters.
- Central abyss: 120–200 meters.

These depths are gameplay design targets and can be adjusted to the existing world's scale.

**The ocean floor must be real geometry with collision and textures, not a flat blue plane.**

# 4. GLOBAL WATER ENGINE REPLACEMENT

This is a GLOBAL upgrade.

The new water rendering system must replace or upgrade the existing water in every appropriate location throughout the game.

Do not limit the improvement to Mosasaur Ocean.

## Visual quality target

Use the supplied reference and modern Caribbean ocean rendering as the visual benchmark.

The water should have:

- Brilliant turquoise shallows.
- Rich sapphire-blue deep water.
- High underwater visibility.
- Realistic sunlight transmission.
- Dynamic surface waves.
- Animated wave normals.
- Natural Fresnel reflections.
- Depth-dependent absorption.
- Refraction.
- Soft foam near coastlines.
- Waterfall interaction.
- Dynamic caustic patterns.
- Underwater light shafts.
- Smooth transitions between shallow and deep water.
- Beautiful reflections of the sky and surrounding environment.

Avoid opaque blue surfaces that hide everything underneath.

## Water depth colors

Shallow water should be luminous aqua.

Medium-depth water should become saturated turquoise and blue.

Deep water should transition gradually into rich ocean blue.

Very deep areas should become darker without looking like an empty black hole.

The player must still be able to see illuminated coral structures and underwater terrain from above in clear, shallow regions.

## Rendering implementation

Use the existing engine's supported GPU rendering pipeline.

Where appropriate, implement:

- Custom GLSL shaders.
- Depth textures.
- Screen-space refraction.
- Fresnel terms.
- Multiple scrolling normal maps.
- Foam masks.
- Depth-aware color absorption.
- Underwater fog.
- Animated caustic projections.
- Environment reflections.
- Smooth waterline transitions.

Avoid expensive full-scene reflection passes on every frame unless performance allows.

## Global compatibility

The shared water system must support:

- Lakes.
- Ponds.
- Rivers.
- Ocean locations.
- Waterfalls.
- Aquariums where appropriate.
- Decorative water features.

Each location should have its own water configuration while sharing the same rendering architecture.

Do not apply ocean-sized waves to small ponds or aquariums.

# 5. BUILD AN EXTRAORDINARY UNDERWATER CORAL WORLD

The underwater environment must be exceptionally detailed and colorful.

Create numerous distinct coral families:

- Branching staghorn corals.
- Large table corals.
- Brain corals.
- Mushroom corals.
- Fan corals.
- Soft waving corals.
- Tube sponges.
- Giant colorful anemones.
- Glowing fantasy coral species.
- Tall kelp forests.
- Sea grass fields.

Use a wide color palette:

- Electric blue.
- Turquoise.
- Violet.
- Magenta.
- Orange.
- Yellow.
- Coral pink.
- Emerald green.

Every coral cluster should have varied scale, orientation, shape, and density.

Do not repeat one identical coral mesh hundreds of times without visual variation.

## Environmental animation

Add:

- Gently swaying soft corals.
- Moving sea grass.
- Floating plankton.
- Rising bubbles.
- Swimming schools of fish.
- Small crabs.
- Rays.
- Jellyfish.
- Ambient marine creatures.

Underwater caves should contain their own distinct ecosystems.

Use instanced rendering and LOD to keep performance manageable.

# 6. COMPLETELY REBUILD THE MOSASAURUS

The Mosasaurus must be the spectacular centerpiece of the location.

## Appearance

Create a colossal, frightening, anatomically inspired marine reptile.

It must have:

- A massive crocodile-like head.
- An enormous jaw.
- Multiple rows of sharp, individually modeled teeth.
- Powerful neck and torso.
- Four swimming flippers.
- A strong tail with an appropriate swimming profile.
- Detailed scales and skin folds.
- Scars and weathered skin.
- Wet skin shaders.
- Dark blue-gray coloration.
- Subtle turquoise underwater highlights.
- Powerful predatory eyes.

The creature should be terrifying without abandoning the established visual style.

Avoid making it look like a generic dragon, whale, or fantasy snake.

## Scale

The Mosasaurus must feel gigantic relative to:

- The cat character.
- The submarine.
- The pier.
- Nearby coral formations.
- The surrounding island.

The creature should be large enough that players can recognize its scale from a distance.

## Animation system

Implement:

1. Slow underwater patrol.
2. Natural tail-driven swimming.
3. Coordinated flipper motion.
4. Smooth turning.
5. Deep diving.
6. Surfacing.
7. Head lifting.
8. Mouth opening.
9. Powerful roaring.
10. Water splashes.
11. Bubble trails.
12. Sudden acceleration.
13. Underwater circling.
14. Breaching and returning to the water.

All movements must use smooth animation blending.

The creature must not slide through the water with a static body.

## Behavior

Create a simple state machine:

- Idle patrol.
- Curious observation.
- Deep dive.
- Surface inspection.
- Fast swim.
- Cinematic breach.
- Return to patrol.

Keep the creature compatible with the game's friendly fantasy setting while making its visual appearance genuinely intimidating.

# 7. ADD A FULLY PLAYABLE SUBMARINE

Create a new interactive vehicle inside Mosasaur Ocean.

The submarine must be an actual controllable 3D vehicle, not a decorative object.

## Appearance

Design a premium fantasy-exploration submarine that fits the game's existing visual identity.

The submarine should have:

- Beautiful streamlined body.
- Large panoramic front window.
- Transparent cockpit glass.
- Detailed interior.
- Comfortable seat for the cat.
- Animated control panels.
- Digital depth display.
- Speed indicator.
- Small exterior lights.
- Powerful rear propulsion.
- Side stabilizers.
- Bubble and wake effects.
- Smooth animated mechanical parts.

The submarine should be colorful, charming, and visually impressive.

Do not make it look like a plain industrial tube.

# 8. ENTERING THE SUBMARINE

Place the submarine at a dedicated dock in Mosasaur Ocean.

When the player approaches, show:

**«Сесть в субмарину»**

On interaction:

1. The cat walks toward the submarine.
2. The cockpit opens.
3. The cat climbs inside.
4. The cat sits in the pilot seat.
5. The cockpit closes.
6. The camera transitions smoothly to the selected submarine view.
7. Vehicle controls become active.

The cat must remain visibly seated inside the cockpit.

Preserve the character's current appearance and accessories.

Add an exit interaction when the submarine is safely stopped at the dock or another designated exit location.

# 9. SUBMARINE MOVEMENT CONTROLS

Use standard desktop keyboard controls.

| Key | Action |
|---|---|
| W | Accelerate forward |
| S | Reverse |
| A | Turn left |
| D | Turn right |
| Space | Powerful upward boost / water breach |
| Shift | Dive deeper |
| C | Switch camera mode |
| E | Enter or exit at safe locations |
| Mouse | Look around in cockpit mode |

The controls must feel responsive, smooth, and exciting.

## Movement behavior

Implement acceleration, drag, turning inertia, and smooth braking.

The submarine must be fast and maneuverable.

It should feel like an exciting arcade