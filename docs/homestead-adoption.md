# Our island and the adoption collection

`homestead` is an appended destination at `[-250, -55]`. Its radius is 46.6,
giving exactly 16 ordinary island areas. It unlocks at level 3 for 1,800 coins.
No existing island record is changed (the published 26-record fixture covers
this). There are no initial residents, fixed attractions, water, scenery or
building reservations. Low flowers and grass are instanced cosmetic cover and
yield to placed buildings. All plots use the existing placement, construction,
currency and save rules; space search also reaches the outer lawn. Players may
transfer their own trees, houses and rocks here normally.

`cat-expansion.js` appends 60 cats without altering any approved profile:

- 20 ordinary kittens, including chubby, curly, short-tailed and hairless pets;
- 16 adult breeds, including Chartreux, Manx, Toyger, Balinese, Oriental,
  LaPerm, Nebelung, Himalayan, Burmilla, Singapura, Bambino, Minuet, Egyptian
  Mau, Ocicat, Havana and Toybob;
- 12 magical families, each with an adult and a tiny version (24 legendary
  pets): moon, flower fairy, dragon, aurora, cloud, lotus, pearl, comet, frost,
  honey fairy, mushroom spirit and unicorn.

Every tiny profile has the exact hot-dog helper scale: `0.63 * size = 0.36`.
Breed proportions still distinguish slender, round, giant and colossal pets.
Prices span accessible ordinary kittens through expensive legendary pets, with
the existing level, payment, care, relationship and adoption systems.

Magical ornaments are attached to the original head/tail rig and a small wing
rig. They use batched indexed geometry and a single soft emissive material,
without additional lights, downloaded textures or render passes. Only owned
pets enter the world; the 95 adoption cards use baked actual-model PNGs, never
95 live WebGL previews. Opening adoption supports collection filters. The 35
approved cats and Chichi retain their exact model fingerprints.

The bounded AI input limit is 48 KiB, allowing all 131 possible neighbours and
the maximum physical target list. Oversized requests still fail before model
inference.

Verification: `npm test`, `npm run build`, Worker dry run and
`scripts/check-homestead.cjs` (isolated local SQLite save, mobile touch,
collection filters, seven real adoptions, exact kitten scale, magical rigs,
outer-area construction and exact wallet/XP/adoption/building reload).
`homestead-adoption.test.mjs` also checks all 60 additions through 25 reloads
and a two-phone merge. Browser screenshots use software rendering to check
correctness, not to claim a physical-phone frame rate.
