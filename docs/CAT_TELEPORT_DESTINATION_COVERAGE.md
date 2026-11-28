# Cat teleport destination coverage

Generated from actual game catalogues by scripts/generate-cat-teleport-coverage.mjs. 139 stable destinations, plus runtime player-owned placement IDs and eight free SPA invitation aliases. Locked or unbuilt places retain their existing eligibility rules. No new room IDs.

V21 remains IN PROGRESS. A wired adapter is not proof that every real destination is verified.

Actual app sending entry points discovered: `gather`, `moveResident`, `perform`, `performResident`, `useMallItem`, `visitMall`. Venue buttons also use WarehouseWorld.invite, WaterfrontWorld.invite/tryHero/inviteAllTrampoline and ResortSpaWorld call/invitations.

| Real ID | Owner | Arrival source | Status |
|---|---|---|---|
| mall-cafe | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-map | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-vuitton | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-gucci | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-prada | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-chanel | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-nike | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-mcd | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-star | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-kfc | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-sushi | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-bakery | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-ice | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-cinema | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-cinema-two | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-arcade | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-dance | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-bowling | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-vr | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-photo | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-ikea | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-lego | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-tech | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-toys | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-fashion | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-books | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-restaurant | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-spa | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-jellies | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-playground | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-tunnel | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-sky-cafe | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-date | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| mall-observatory | Mall store/floor | native store entrance + measured floor navigation | Adapter implemented; per-destination native QA pending |
| resort-thermal | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| resort-vip | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| resort-midnight | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| resort-massage | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| resort-aroma | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| resort-cabana | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| resort-cafe | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| resort-waterfall | SPA room | existing service-contract approach + triangle navigation | Adapter implemented; per-destination native QA pending |
| waterfront-dine | Restaurant / waterfront | actual runtime destination + current dry/net support | Adapter implemented; per-destination native QA pending |
| waterfront-glass | Restaurant / waterfront | actual runtime destination + current dry/net support | Adapter implemented; per-destination native QA pending |
| waterfront-terrace | Restaurant / waterfront | actual runtime destination + current dry/net support | Adapter implemented; per-destination native QA pending |
| waterfront-walk | Restaurant / waterfront | actual runtime destination + current dry/net support | Adapter implemented; per-destination native QA pending |
| waterfront-bounce | Trampoline | actual runtime destination + current dry/net support | Adapter implemented; per-destination native QA pending |
| waterfront-dive | Trampoline | actual runtime destination + current dry/net support | Adapter implemented; per-destination native QA pending |
| warehouse-explore | Warehouse | actual native gangplank → existing 3-boat fleet → pressure entry | Adapter implemented; per-destination native QA pending |
| warehouse-rest | Warehouse | actual native gangplank → existing 3-boat fleet → pressure entry | Adapter implemented; per-destination native QA pending |
| chichi-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chichi-food | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| zoo-elephant | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| zoo-axolotl | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| zoo-otter | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| zoo-polar | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| zoo-gorilla | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| job-bank | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| job-crypto | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| job-factory | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| job-furniture | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| job-estate | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| job-cars | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| aquarium-aurora | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| aquarium-pearl | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| aquarium-coral | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| aquarium-lilac | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| aquarium-sunrise | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| bikini-krusty | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| bikini-sponge | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| bikini-patrick | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-bikini | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-bikini-shells | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| court-burger | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| court-boba | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| court-coffee | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| court-bakery | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| court-cinema | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-foodcourt | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-sage-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-sage-bath | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-lavender-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-lavender-bath | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-rose-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-rose-bath | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-blue-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-blue-bath | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-honey-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-honey-bath | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-berry-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-berry-bath | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-ivy-bed | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| chill-ivy-bath | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-water | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| spa-lounge | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| spa-jacuzzi | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| spa-bar | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-moon | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-mosasaur | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-autumn | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-whale-blue | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-whale-aurora | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-whale-pearl | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-whale-dream | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-winter-upper | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-winter | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-dinosaur | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-jungle-wheel | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-volcano-upper | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-volcano-river | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-volcano | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-jelly | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-moon-wheel | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-galaxy-upper | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-galaxy-river | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-galaxy | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-lotus | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| island-dragonfly | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-ice-upper | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-ice-river | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-ice | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| capybara-mango | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| capybara-boba | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| capybara-coconut | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| capybara-float | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-summer | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-summer-upper | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-summer-jungle | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-summer-coconut | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| cotton-wheel | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| cotton-express | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| cotton-teacups | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| cotton-slide | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| cotton-pig-rose | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| cotton-pig-peach | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| cotton-pig-lilac | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-clockwork | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-clockwork-upper | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |
| lake-clockwork-cascade | Existing attraction | actual built item group + native surface validation | Adapter implemented; per-destination native QA pending |

## Native evidence

The original Chichi Warehouse button opened a real portal at the actual homestead origin, transferred to an actual gangplank, boarded the original native submarine and reached the real pressure entry. The same original resident Luna arrived in submerged thermal SPA at y=-164.988, then floor2 mall-nike at y=-156.32, then the actual trampoline net at y=0.7018878. Proof: docs/qa/2026-11-28/cat-teleport/owner-handoff. This verifies those transitions only.

## Dispatch integration (CPU verified; native QA pending)

- `gather` now requests the shared portal coordinator at each existing biome arrival; it filters current workers/sleepers, reserves distinct native-radius slots and waits behind the bounded visual pool. Unsupported/locked destinations fail explicitly.
- `moveResident` requests a portal around the actual drop/Chichi point and revalidates its real supporting surface; a drop onto Chichi starts the greeting only after arrival.
- Generic `perform` / `performResident` prepare cold paid attractions under the operation token, resolve current placement transforms and native SPA/chill/court/job entry data, and never silently revert to an unregistered distant activity route.
- Built/cold eligible player placement registry entries refresh during world sync; removed/stored entries cancel pending operations. Native manual takeover cancels a pending portal.
- Before relocation, saves retain the confirmed command without a mid-air pose. After relocation, saves project to the actual validated floor while the arrival hop is still animated. Save fields and wallet logic are unchanged.
- Followed cats rebase the existing camera via its enable/disable API at relocation; other camera modes retain their framing. Actual visual transition QA is pending.

| Dispatch destination key | Existing destination source | Status |
|---|---|---|
| gather:moon | moon authored arrival + actual native surface | Wired; native recall QA pending |
| gather:autumn | autumn authored arrival + actual native surface | Wired; native recall QA pending |
| gather:winter | winter authored arrival + actual native surface | Wired; native recall QA pending |
| gather:water | water authored arrival + actual native surface | Wired; native recall QA pending |
| gather:summer | summer authored arrival + actual native surface | Wired; native recall QA pending |
| gather:sakura | sakura authored arrival + actual native surface | Wired; native recall QA pending |
| gather:volcano | volcano authored arrival + actual native surface | Wired; native recall QA pending |
| gather:candy | candy authored arrival + actual native surface | Wired; native recall QA pending |
| gather:galaxy | galaxy authored arrival + actual native surface | Wired; native recall QA pending |
| gather:ice | ice authored arrival + actual native surface | Wired; native recall QA pending |
| gather:clockwork | clockwork authored arrival + actual native surface | Wired; native recall QA pending |
| gather:foodcourt | foodcourt authored arrival + actual native surface | Wired; native recall QA pending |
| gather:bikini | bikini authored arrival + actual native surface | Wired; native recall QA pending |
| gather:homestead | homestead authored arrival + actual native surface | Wired; native recall QA pending |
| gather:aquarium | aquarium authored arrival + actual native surface | Wired; native recall QA pending |
| gather:jobcity | jobcity authored arrival + actual native surface | Wired; native recall QA pending |
| gather:cat-homes | cat-homes authored arrival + actual native surface | Wired; native recall QA pending |
| gather:atoll-park | atoll-park authored arrival + actual native surface | Wired; native recall QA pending |
| gather:magic-zoo | magic-zoo authored arrival + actual native surface | Wired; native recall QA pending |
| move-resident:&lt;existing cat ID&gt; | Actual drop point or current Chichi position on selected unlocked biome | Wired; native drag/drop QA pending |

## Remaining coverage and failures

- Generic attractions, dynamic placements and every catalogue row need native destination tests.
- Free hero SPA park frame and initial complete destination registry are implemented after the last native run; rerun pending.
- Autonomous leisure still contains its prior preliminary travel stage; route it directly to the portal dispatch queue.
- Warehouse departures while already visiting need a safe vessel/door handoff; current coordinator waits for the existing visit to release.
- Group calls, paid-session ledgers, quick redirection, cold reload, touch and performance require final native coverage.
- Generic physical validation and explicit failure are implemented; native evidence for every generic destination is still required.
- No V20/V21/V22 release has been published.
