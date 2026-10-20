import { JOB_KINDS } from "./public/jobcity-data.js";
import { housingOffers } from "./public/housing-system.js";
import { validateFamilyProposals } from "./public/family-system.js";
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
    family: s.phase === "evening" && s.familyReview.due,
  };
}
export function cityLifeInput(s) {
  const c = cityLifeChoices(s),
    houses = housingOffers();
  const places = s.leisureOffers || [],
    types = [...new Set(places.map((p) => p.type))],
    islands = [...new Set(places.map((p) => p.biome))];
  return {
    messages: [
      {
        role: "system",
        content: `Choose ONLY requested fictional cat life events. JSON {"careers":[[catIndex,professionIndex]],"evenings":[[catIndex,mode,placeIndices]],"houses":[[catIndex,houseIndex,roommateIndex]],"families":[[maleIndex,femaleIndex,"short Ukrainian reason"]]}. No prose or extra rows. Careers: choose exactly once for every new cat in careers; never change an established profession. Profession indices ${JOB_KINDS.map((k, i) => i + "=" + k).join(",")}. Evening: choose for every index in evenings, mode 0=rest/home,1=walk/friends,2=owned car; 1-3 different real place indices, or [] for rest. Choose interesting varied rides, meals, water, games or peaceful rest by personality. Partners spend free time together; their jobs never change. Houses: OPTIONAL only buyers, only affordable; -1 roommate or a free cat. Existing owners may buy additional homes without moving their active residence. Families: ${c.family ? `rare 14-day review, up to ${s.familyReview.slots} compatible lifelong male+female couples from the offered singles; every cat can eventually pair.` : "none today"} Omit optional purchases/pairs when unwanted. No new work schedule, no skills or career review for established cats.`,
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
            ? s.cats.flatMap((p, i) => (!p.activeHome ? [[i, p.name]] : []))
            : [],
          singles: c.family
            ? s.cats.flatMap((p, i) =>
                !p.partner ? [[i, p.name, p.sex, p.personality]] : [],
              )
            : [],
          types: c.evenings.length
            ? types.map((t, i) => [i, places.find((p) => p.type === t).name])
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
        }),
      },
    ],
    max_tokens: Math.min(
      4000,
      Math.max(
        256,
        c.careers.length * 9 +
          c.evenings.length * 18 +
          c.buyers.length * 10 +
          (c.family ? s.familyReview.slots * 24 : 0) +
          128,
      ),
    ),
    temperature: 0.3,
    response_format: { type: "json_object" },
  };
}
export async function requestCityLife(s, run) {
  const choices = cityLifeChoices(s),
    houses = housingOffers();
  let raw = { careers: [], evenings: [], houses: [], families: [] };
  let provider = "none";
  if (
    choices.careers.length ||
    choices.evenings.length ||
    choices.buyers.length ||
    choices.family
  ) {
    const result = await run(cityLifeInput(s));
    provider = result?.provider || "cloudflare";
    raw = result?.response ?? result;
    if (typeof raw === "string")
      raw = JSON.parse(
        raw
          .trim()
          .replace(/^```(?:json)?\s*/, "")
          .replace(/\s*```$/, ""),
      );
  }
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
    const a = raw?.[name] ?? [],
      seen = new Set();
    if (!Array.isArray(a)) throw Error("Invalid life choices");
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
  for (const [i, h, r] of rows("houses", choices.buyers)) {
    const house = houses[h];
    if (
      !Number.isSafeInteger(h) ||
      !house ||
      s.cats[i].coins < house.price ||
      !Number.isSafeInteger(r) ||
      r < -1 ||
      (r >= 0 && (!s.cats[r] || s.cats[r].activeHome || r === i))
    )
      throw Error("Invalid house choice");
    byIndex(i).house = {
      type: house.id,
      roommate: r >= 0 ? s.cats[r].id : null,
    };
  }
  const proposals = raw?.families ?? [];
  if (!Array.isArray(proposals) || (!choices.family && proposals.length))
    throw Error("Unrequested family review");
  const families = validateFamilyProposals(
    proposals.map(([m, f, reason]) => ({
      male: s.cats[m]?.id,
      female: s.cats[f]?.id,
      reason,
    })),
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
  };
}
