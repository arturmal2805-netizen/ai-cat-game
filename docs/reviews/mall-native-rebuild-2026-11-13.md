# Underwater Mall — integrated architecture and real retail revision

This batch replaces the isolated narrow tower with the connected horizontal
Mall. It is an incremental implementation, not acceptance of 85–90% visual
similarity, photorealism, or physical-device 60 FPS.

## Implemented

Seven connected floors, 34 stable venues and 63 real products retain their
released IDs, prices, receipts, private wallets and inventory. The measured
usable area is 125,705.85 m² over seven floors and two pavilions; the preceding
plan was 23,285.49 m². Existing cats keep their native anatomy and scales.
Rounded retail wings, a true open atrium, cat-head glass crown, separate side
pavilions, green roofs and supported bridges replace scaled kiosk disks.

The four-seat lift has actual shaft/slab apertures, separate boarding/arrival
lanes and four physical doors. Larger simultaneous visitors keep clearance;
old paid visit goals migrate without another debit. Floor paths are measured
from actual furniture bounds. Escalator treads use fixed instance buffers and
one clock, with matching CPU picking.

New shops are real rooms. All fronts receive recessed glazing, window frames,
sills, seals and door hardware; fashion windows have supported merchandise
staging. Exterior columns now follow retail bays instead of bisecting brands.
Balcony fascias have a continuous shaped section; wing corners have real
22-metre curvature. The public restaurant terrace no longer hides McDonald’s
entrance behind a parasol. Floral urns have stems and petals instead of floating
glowing spheres.

The first brand-specific retail revision covers McDonald’s and Louis Vuitton.
McDonald’s has a charcoal/walnut service counter, fitted kitchen pass, stainless
equipment, mounted menus with actual prices, booths and stone dining tables.
Its actual bevelled golden-arch silhouette replaces thin tubes and the generic
striped awning. Louis Vuitton has bowed/fluted frontage, bronze framing,
continuous illuminated walnut display joinery, glass jewellery islands,
apparel, fitting alcoves and a shaped ceiling cove. They no longer reuse the
same generic food/fashion room. Correct metre-scale UVs and physical bevel sizes
avoid stretched grain and inflated rounded-cube corners across all fittings.

The native close camera starts at the storefront. “Оглянути зал” enters the
actual room with its ceiling retained; “До вітрини” returns. Orbiting above the
room lifts the ceiling and the selected front header; ordinary facade views
retain the authored surfaces. Catalogue controls remain separately accessible
on phones. Views restore the ordinary camera and shadow framing on exit.

## Real-store visual references

These photographs are inspection references only. No photograph is shipped as
a replacement room, window, billboard interior or fake 3D facade.

- [Louis Vuitton, Hamad Airport, Doha](https://commons.wikimedia.org/wiki/File:QAT_Doha,_Hamad_International_Airport_030.jpg): bowed, finely ribbed exterior and an open warm interior.
- [Louis Vuitton, Incheon Airport](https://commons.wikimedia.org/wiki/File:LV_shop_in_Incheon_International_Airport.jpg): recessed merchandise windows and the proportion of sign, glazing and entrance.
- [Louis Vuitton, Heathrow Terminal 2](https://commons.wikimedia.org/wiki/File:Louis_Vuitton_at_Heathrow_Terminal_2.jpg): sculpted light frontage and warm fitted display niches.
- [McDonald’s, Philippines interior](https://commons.wikimedia.org/wiki/File:Interiors_of_McDonald%27s_restaurants_in_Philippines11.jpg): enclosed room, tiled preparation pass, fitted counters and wall-mounted screens.

The user's full Mall illustration remains the overall architecture/art target.
Material inputs are separately licensed CC0 charts; provenance remains in
`mall-material-sources-2026-11-11.json`. Reference photographs are not those charts.

## Resources and compatibility

Only requested ocean/Mall preparation loads the material charts, shared probe
and new geometry. Room lamps use one immutable 2 KiB table; there are no per-shop
render targets, live texture generation, extra AI calls or per-frame geometry
uploads. Fourteen fixed native ambient visitors and at most two additional
close-view guests have no wallets or fake purchase receipts. Actual residents
continue using the native shopping runtime.

The separate lossless compaction checkpoint preserves indexed attributes,
triangles, picking faces and buffers' index type. The recorded previous art
checkpoint saved 117.02 MiB with zero colour/shadow pixel differences; the final
art revision requires its own resource/image check before applying that number
to it. More visual detail is not itself an FPS optimization.

The foundation is a local ocean excavation. Twelve detailed reef templates,
scales and materials remain; six intersecting unowned formations are translated
by an offline exact-surface fitting pass. The other six retain original object
identity. Deep-wall coral placement retries nearby real faces when the new
shoulder would otherwise put a colony on the flat bed. The original pier,
animal ride, purchased shoreline objects, other islands and native models stay
on their released IDs and coordinates. Submarine swept collision follows the
real Mall envelope; old embedded pilots recover nearby at the same depth.

## Verification checkpoints

- `mall-signature-routes-v27.json`: 108/108 shop/pavilion paths at three native
  cat radii; 13,725 supporting ray hits against actual floor/bridge geometry.
- `mall-signature-core-v2.log`: 10/10 native journey/navigation/vehicle tests,
  including six simultaneous large restaurant guests and all 34 destinations.
- `mall-real-retail-v3/evidence.json`: actual isolated WebGL images of the two
  fitted fronts and full-DPR phone overview; no shader/browser/GL errors.
- `mall-real-retail-build-v5.log`: full build passed. Additional native phone,
  reload, all-island and final full-suite checks are recorded after completion.

## Remaining visual limits

The reference has richer facade lighting, denser crowds, more varied individual
stores and significantly more convincing water/environment integration.
Other brands retain the improved common fit-out while these two stores now
have their own plans. Software-rendered images establish actual implementation
and visual defects; they do not establish hardware FPS or a numerical fidelity
percentage. Continue comparing actual native full/close/phone images rather
than presenting this checkpoint as the finished reference match.
