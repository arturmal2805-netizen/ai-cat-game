# Mall finish authoring checkpoint

The existing seven-floor Mall retains its architecture, shops, native cats,
walking surfaces, collision geometry, airlock and circulation. This stage
refines finish scale and response; its native acceptance is recorded separately.

Marble charts tile over 2.4 m, wood over 1.5 m, metal over 0.75 m, cloth over
0.25 m and leather over 0.45 m. UVs are baked from construction transforms into
independent buffer copies before immutable batching. Large public floor slabs,
bridges, pavilions and aquarium fittings receive the same preparation as shops.
It yields every 1024 vertices. Moving escalator instances retain their native
geometry and animation. Position, normal and index streams are not rewritten.

Room stamping and architecture stamping detach copied geometry metadata before
setting ownership flags. BufferGeometry.copy shares userData with its source;
mutating that object would change the original primitive's shared-ownership flag.
Tests cover that owner, real public slabs, adjoining panels and transformed scale.

The existing single reflection sampler now responds to material roughness,
dielectric Fresnel and metal colour. The original shared local room-light table
remains. Marble is a polished dielectric rather than blue metallic emission;
wood, cloth and painted fittings have more restrained finish/emission. Glazing
uses a fifth-power Fresnel edge and preserves the separate signage/lift tints.
There are no new reflection targets, render passes, runtime texture generation,
paid AI calls or model substitutions. Colour/data texture spaces retain the
existing loader contract. Native art, routes, camera modes, purchases and private
SQLite reloads must pass before this checkpoint is published.
