import { JOB_KINDS } from "./public/jobcity-data.js";
import { housingOffers } from "./public/housing-system.js";
import { familyLimit, validateFamilyProposals } from "./public/family-system.js";
import {
  validateJobAssignments,
  localJobPlan,
} from "./public/jobcity-system.js";
import { JOB_CAPACITY } from "./public/jobcity-data.js";

export function cityLifeChoices(s) {
  const houses = housingOffers(),
    minimum = Math.min(...houses.map((h) => h.price));
  return {
    careers:
      s.phase === "careers"
        ? s.cats.flatMap((p, i) => (s.initialIds.includes(p.id) ? [i] : []))
        : [],
    evenings:
      s.phase === "evening"
        ? s.cats.flatMap((p, i) => (p.scheduleJob !== "rest" ? [i] : []))
        : [],
    buyers:
      s.phase === "evening"
        ? s.cats.flatMap((p, i) =>
            p.coins >= minimum && p.lastHousingAIDay < s.day ? [i] : [],
          )
        : [],
    family: s.phase === "evening" && s.familyReview.due &&
      s.familyReview.slots > 0 && familyLimit(s.cats.filter(p => !p.partner)) > 0,
  };
}
// Bound every after-work response at decoding time. Loose heterogeneous tuples
// let providers confuse ownsCar with the selected mode or output venue indices
// outside the offered catalogue, discarding the entire evening (including homes).
function eveningResponseFormat(s, choices) {
  const properties = {};
  if (choices.evenings.length) {
    const variants = [false, true].flatMap(hasCar => {
      const cats = choices.evenings.filter(i => !!s.cats[i].hasCar === hasCar);
      if (!cats.length) return [];
      return [{ type: "object", additionalProperties: false,
        required: ["cat", "mode", "outings"], properties: {
          cat: { type: "integer", enum: cats },
          mode: { type: "integer", enum: hasCar ? [0, 1, 2] : [0, 1] },
          outings: { type: "array", maxItems: Math.min(3, s.leisureOffers.length),
            uniqueItems: true, items: { type: "integer", minimum: 0,
              maximum: Math.max(0, s.leisureOffers.length - 1) } },
        } }];
    });
    properties.evenings = {
      type: "array", minItems: choices.evenings.length, maxItems: choices.evenings.length,
      items: variants.length === 1 ? variants[0] : { anyOf: variants },
    };
  }
  if (choices.buyers.length) properties.houses = {
    type: "array", maxItems: choices.buyers.length,
    items: { type: "object", additionalProperties: false,
      required: ["cat", "house", "roommate"], properties: {
        cat: { type: "integer", enum: choices.buyers },
        house: { type: "integer", enum: housingOffers().map((_,i) => i) },
        roommate: { type: ["integer", "null"], enum: [null, ...s.cats.flatMap((p,i) => !p.activeHome ? [i] : [])] },
      } },
  };
  if (choices.family) properties.families = {
    type: "array", minItems: 1, maxItems: s.familyReview.slots,
    items: {
      type: "object", additionalProperties: false, required: ["male", "female", "reason"],
      properties: {
        male: { type: "integer", enum: s.cats.flatMap((p,i) => !p.partner && p.sex === "male" ? [i] : []) },
        female: { type: "integer", enum: s.cats.flatMap((p,i) => !p.partner && p.sex === "female" ? [i] : []) },
        reason: { type: "string", maxLength: 64 },
      },
    },
  };
  return { type: "json_schema", json_schema: { name: "cat_life", strict: true,
    schema: { type: "object", properties, required: Object.keys(properties), additionalProperties: false } } };
}
export function cityLifeInput(s) {
  const c = cityLifeChoices(s),
    houses = housingOffers();
  const places = s.leisureOffers || [],
    types = [...new Set(places.map((p) => p.type))],
    islands = [...new Set(places.map((p) => p.biome))];
  const initial = s.phase === "careers";
  const fields = [
    ...(c.evenings.length ? ['"evenings":[{"cat":catIndex,"mode":mode,"outings":placeIndices}]'] : []),
    ...(c.buyers.length
      ? ['"houses":[{"cat":catIndex,"house":houseIndex,"roommate":null}]']
      : []),
    ...(c.family
      ? ['"families":[{"male":maleIndex,"female":femaleIndex,"reason":"3 Ukrainian words"}]']
      : []),
  ];
  return {
    messages: [
      {
        role: "system",
        content: initial
          ? `Choose a lifelong profession for each requested fictional cat. Return ONLY compact JSON {"careers":[[catIndex,professionIndex]]} without indentation, line breaks, prose or other keys. Exactly one numeric pair for every index provided in careers; no extra rows. Profession indices ${JOB_KINDS.map((k, i) => i + "=" + k).join(",")}. Each input row is [catIndex,personality,preferredProfessionIndices,skillPerProfession]. Choose by personality, preferences and skills. This is initial career selection only. Do not choose evening plans, purchases, houses or families.`
          : `Choose ONLY requested fictional cat life events. Return ONLY compact JSON {${fields.join(",")}} without indentation, line breaks, prose or other keys. Never select or change professions. Evening input rows are [catIndex,personality,ownsCar,partnerIndex]; ownsCar is a permission, not the chosen activity. Place rows are [placeIndex,typeIndex,islandIndex,action]. Choose for every index in evenings, mode 0=rest/home,1=walk/friends,2=owned car; 1-3 different real place indices, or [] for rest. Choose varied rides, meals, water, games or peaceful rest by personality. Partners spend free time together. Houses: OPTIONAL only buyers, only affordable; roommate=null for no roommate, otherwise a different free cat index; never the buyer or a cat with an active home. Existing owners may buy additional homes without moving their active residence. Families: ${c.family ? `This is the scheduled 14-day introduction. Return at least 1 and AT MOST ${s.familyReview.slots} rows in families (never pair the entire singles list). Choose compatible lifelong male+female couples from the offered singles, using their personalities. Each singles row is [catIndex,name,sex,personality]; male and female indices must refer to different free cats. Do not return an empty review when compatible singles are available. Every cat can eventually pair.` : "none today"} Return houses:[] when no purchase is wanted. No family choices outside a scheduled review. No work schedule or career review.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          day: s.day,
          careers: c.careers.map((i) => {
            const p = s.cats[i];
            return [
              i,
              p.personality,
              p.preferences.map((k) => JOB_KINDS.indexOf(k)),
              JOB_KINDS.map((k) => p.skills[k]),
            ];
          }),
          ...(!initial
            ? {
                evenings: c.evenings.map((i) => {
                  const p = s.cats[i];
                  return [
                    i,
                    p.personality,
                    p.hasCar ? 1 : 0,
                    s.cats.findIndex((q) => q.id === p.partner),
                  ];
                }),
                buyers: c.buyers.map((i) => [
                  i,
                  s.cats[i].coins,
                  s.cats[i].ownedHomes,
                ]),
                houses: c.buyers.length
                  ? houses.map((h, i) => [i, h.name, h.price])
                  : [],
                roommates: c.buyers.length
                  ? s.cats.flatMap((p, i) =>
                      !p.activeHome ? [[i, p.name]] : [],
                    )
                  : [],
                familyCoupleLimit: c.family ? s.familyReview.slots : 0,
                singles: c.family
                  ? s.cats.flatMap((p, i) =>
                      !p.partner ? [[i, p.name, p.sex, p.personality]] : [],
                    )
                  : [],
                types: c.evenings.length
                  ? types.map((t, i) => [
                      i,
                      places.find((p) => p.type === t).name,
                    ])
                  : [],
                islands: c.evenings.length ? islands : [],
                places: c.evenings.length
                  ? places.map((p, i) => [
                      i,
                      types.indexOf(p.type),
                      islands.indexOf(p.biome),
                      p.action,
                    ])
                  : [],
              }
            : {}),
        }),
      },
    ],
    max_tokens: Math.min(
      8192,
      Math.max(
        256,
        c.careers.length * 9 +
          c.evenings.length * 30 +
          c.buyers.length * 20 +
          (c.family ? s.familyReview.slots * 48 : 0) +
          128,
      ),
    ),
    temperature: 0.3,
    response_format: initial ? { type: "json_object" } : eveningResponseFormat(s, c),
  };
}
export async function requestCityLife(s, run) {
  const choices = cityLifeChoices(s);
  let answer = { response: {}, provider: "none" };
  if (
    choices.careers.length ||
    choices.evenings.length ||
    choices.buyers.length ||
    choices.family
  ) {
    answer = await run(cityLifeInput(s), (result) =>
      expandCityLife(s, result),
    );
  }
  return expandCityLife(s, answer);
}
function expandCityLife(s, result) {
  const choices = cityLifeChoices(s),
    houses = housingOffers(),
    provider = result?.provider || "cloudflare";
  let raw = result?.response ?? result;
  if (typeof raw === "string")
    raw = JSON.parse(
      raw
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, ""),
    );
  const assignments = localJobPlan(s.cats, s.day).map((a) => {
    const p = s.cats.find((p) => p.id === a.id);
    return {
      ...a,
      job: p.scheduleJob,
      evening: p.scheduleEvening,
      ...(p.scheduleOutings ? { outings: p.scheduleOutings } : {}),
    };
  });
  const byIndex = (i) => assignments.find((a) => a.id === s.cats[i]?.id);
  const rows = (name, allowed, required = false) => {
    let a = raw?.[name] ?? [];
    const seen = new Set();
    if (!Array.isArray(a)) throw Error("Invalid life choices");
    if (name === "evenings") a = a.map(row => Array.isArray(row)
      ? row : [row?.cat, row?.mode, row?.outings]);
    if (name === "houses") a = a.map(row => Array.isArray(row)
      ? [row[0], row[1], row[2] ?? -1]
      : [row?.cat, row?.house, row?.roommate ?? -1]);
    for (const row of a) {
      if (!Array.isArray(row) || !allowed.includes(row[0]) || seen.has(row[0]))
        throw Error("Unrequested AI choice");
      seen.add(row[0]);
    }
    if (required && seen.size !== allowed.length)
      throw Error("Missing AI life choices");
    return a;
  };
  for (const [i, k] of rows("careers", choices.careers, true)) {
    if (!Number.isSafeInteger(k) || !JOB_KINDS[k])
      throw Error("Invalid initial profession");
    const a = byIndex(i);
    a.profession = JOB_KINDS[k];
    a.job = a.profession;
  }
  for (const [i, mode, outings] of rows("evenings", choices.evenings, true)) {
    if (
      !Number.isSafeInteger(mode) ||
      mode < 0 ||
      mode > 2 ||
      (mode === 2 && !s.cats[i].hasCar) ||
      !Array.isArray(outings) ||
      outings.length > 3 ||
      new Set(outings).size !== outings.length ||
      outings.some((j) => !Number.isSafeInteger(j) || !s.leisureOffers[j])
    )
      throw Error("Invalid evening choice");
    Object.assign(byIndex(i), {
      evening: ["rest", "walk", "drive"][mode],
      outings: outings.map((j) => s.leisureOffers[j].id),
    });
  }
  const purchaseWarnings = [];
  for (const [i, h, r] of rows("houses", choices.buyers)) {
    const house = houses[h];
    // Buying is optional. A bad/too expensive suggestion must never discard
    // valid leisure or family decisions, nor trigger another paid AI request.
    if (!Number.isSafeInteger(h) || !house || s.cats[i].coins < house.price) {
      purchaseWarnings.push({ cat: s.cats[i].id,
        reason: !Number.isSafeInteger(h) || !house ? "unknown_house" : "unaffordable" });
      continue;
    }
    const available = Number.isSafeInteger(r) && r >= -1 &&
      (r === -1 || (s.cats[r] && !s.cats[r].activeHome && r !== i));
    if (!available) purchaseWarnings.push({ cat: s.cats[i].id, reason: "roommate_unavailable" });
    byIndex(i).house = {
      type: house.id,
      roommate: available && r >= 0 ? s.cats[r].id : null,
    };
  }
  const proposals = raw?.families ?? [];
  if (!Array.isArray(proposals) || (!choices.family && proposals.length))
    throw Error("Unrequested family review");
  if (choices.family && !proposals.length)
    throw Error("Missing family choice");
  const families = validateFamilyProposals(
    proposals.map((row) => {
      const [m, f, reason] = Array.isArray(row)
        ? row : [row?.male, row?.female, row?.reason];
      return { male: s.cats[m]?.id, female: s.cats[f]?.id, reason };
    }),
    s.cats,
    choices.family ? s.familyReview.slots : 0,
  );
  // Only initial choices can change a shift; established jobs remain intact.
  const counts = Object.fromEntries(
    JOB_KINDS.map((k) => [
      k,
      assignments.filter((a) => a.job === k && !s.initialIds.includes(a.id))
        .length,
    ]),
  );
  for (const i of choices.careers) {
    const a = byIndex(i);
    a.job = counts[a.profession] < JOB_CAPACITY ? a.profession : "rest";
    if (a.job !== "rest") counts[a.job]++;
  }
  const final = assignments;
  return {
    day: s.day,
    phase: s.phase,
    provider,
    assignments: validateJobAssignments({ assignments: final }, s.cats),
    families,
    ...(purchaseWarnings.length ? { purchaseWarnings } : {}),
  };
}
