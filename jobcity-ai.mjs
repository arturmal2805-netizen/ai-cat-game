import { housingOffers } from "./public/housing-system.js";
import { JOB_KINDS, JOB_CAPACITY } from "./public/jobcity-data.js";
import { validateJobAssignments } from "./public/jobcity-system.js";
import { catSex } from "./public/cat-sex.js";
import {
  validateFamilyProposals,
  familyReviewLimit,
} from "./public/family-system.js";
import { validateLeisureOffers } from "./public/leisure-data.js";
export const JOB_AI_LIMIT = 192 * 1024;
export function validateCityAIState(s) {
  if (
    !Number.isSafeInteger(s?.day) ||
    s.day < 0 ||
    !Array.isArray(s.cats) ||
    s.cats.length < 1 ||
    s.cats.length > 256
  )
    throw Error("Invalid job plan request");
  const seen = new Set();
  const cats = s.cats.map((c) => {
    if (
      typeof c.id !== "string" ||
      !/^[\w-]{1,40}$/.test(c.id) ||
      seen.has(c.id) ||
      typeof c.name !== "string" ||
      c.name.length > 60 ||
      !Number.isSafeInteger(c.coins) ||
      c.coins < 0 ||
      c.coins > 10000000 ||
      !JOB_KINDS.every(
        (k) =>
          Number.isFinite(c.skills?.[k]) &&
          c.skills[k] >= 0 &&
          c.skills[k] <= 100,
      ) ||
      !Array.isArray(c.preferences) ||
      c.preferences.length > 6 ||
      c.preferences.some((k) => !JOB_KINDS.includes(k)) ||
      (c.profession !== null && !JOB_KINDS.includes(c.profession))
    )
      throw Error("Invalid worker profile");
    seen.add(c.id);
    return {
      id: c.id,
      name: c.name,
      sex: catSex(c.id),
      partner: typeof c.partner === "string" ? c.partner : null,
      coins: c.coins,
      ownedHomes:
        Number.isSafeInteger(c.ownedHomes) && c.ownedHomes >= 0
          ? c.ownedHomes
          : 0,
      activeHome:
        typeof c.activeHome === "string" ? c.activeHome.slice(0, 90) : null,
      personality: String(c.personality || "").slice(0, 60),
      preferences: c.preferences,
      skills: c.skills,
      profession: c.profession,
      canChangeProfession: c.canChangeProfession === true,
      professionChanges: Math.max(0, Math.min(3, c.professionChanges || 0)),
      wishes: (c.wishes || []).slice(0, 3).map((x) => String(x).slice(0, 40)),
      previous: c.previous || null,
      lastPaidDay: Number.isSafeInteger(c.lastPaidDay) ? c.lastPaidDay : -1,
      recentWorkedDays: Array.isArray(c.recentWorkedDays)
        ? c.recentWorkedDays.filter(Number.isSafeInteger).slice(-5)
        : [],
      hasCar: !!c.hasCar,
      scheduleJob: JOB_KINDS.includes(c.scheduleJob) ? c.scheduleJob : "rest",
      scheduleEvening: ["rest", "walk", "drive"].includes(c.scheduleEvening)
        ? c.scheduleEvening
        : "rest",
      scheduleOutings: Array.isArray(c.scheduleOutings)
        ? c.scheduleOutings.filter((id) => typeof id === "string").slice(0, 3)
        : undefined,
      lastHousingAIDay: Number.isSafeInteger(c.lastHousingAIDay)
        ? c.lastHousingAIDay
        : -1,
    };
  });
  for (const cat of cats)
    if (cat.partner && (!seen.has(cat.partner) || cat.partner === cat.id))
      throw Error("Invalid partner");
  return {
    day: s.day,
    ...(s.phase !== undefined ? validateCityEvent(s, cats) : {}),
    cats,
    housingOffers: housingOffers(),
    leisureOffers: validateLeisureOffers(s.leisureOffers),
    familyReview: {
      due: s.familyReview?.due === true,
      slots: Math.max(
        0,
        Math.min(
          familyReviewLimit(cats),
          Math.floor(Number(s.familyReview?.slots) || 0),
        ),
      ),
    },
  };
}
function validateCityEvent(s, cats) {
  if (
    !["careers", "evening"].includes(s.phase) ||
    !Number.isFinite(s.epoch) ||
    s.epoch < 0 ||
    !Number.isFinite(s.minute) ||
    s.minute < 0 ||
    s.minute >= 1440 ||
    !Array.isArray(s.initialIds) ||
    new Set(s.initialIds).size !== s.initialIds.length ||
    s.initialIds.some(
      (id) => !cats.some((p) => p.id === id && p.profession === null),
    ) ||
    (s.phase === "evening" && (s.minute < 1140 || s.initialIds.length))
  )
    throw Error("Invalid city AI event");
  return {
    phase: s.phase,
    epoch: s.epoch,
    minute: s.minute,
    initialIds: s.initialIds,
  };
}
export async function requestCityPlan(state, run, timeout = 100000) {
  let timer;
  const inference = run(cityPlanInput(state));
  let result;
  try {
    result = await Promise.race([
      inference,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error("AI timeout")), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  let raw = result?.response ?? result;
  if (typeof raw === "string")
    raw = JSON.parse(
      raw
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, ""),
    );
  // Keep the complete real roster if the model appends a phantom extra row.
  // Missing or duplicate real cats still fail strict expansion/validation.
  if (
    Array.isArray(raw?.assignments) &&
    raw.assignments.length > state.cats.length &&
    raw.assignments.length <= state.cats.length + 16
  ) {
    const ids = new Set(state.cats.map((p) => p.id));
    const key = (row) =>
      Array.isArray(row)
        ? Number.isSafeInteger(row[0]) && state.cats[row[0]]?.id
        : ids.has(row?.id)
          ? row.id
          : null;
    const actual = raw.assignments.filter((row) => key(row));
    if (
      actual.length === state.cats.length &&
      new Set(actual.map(key)).size === state.cats.length
    )
      raw = { ...raw, assignments: actual };
  }
  const expanded = expandCityPlan(raw, state);
  const valid = validateJobAssignments(
    limitCityWorkplaces(expanded, state),
    state.cats,
  );
  for (const a of valid) {
    const p = state.cats.find((c) => c.id === a.id);
    if (p.profession && p.profession !== a.profession && !p.canChangeProfession)
      throw Error("AI changed a permanent career");
    if (a.evening === "drive" && !p.hasCar)
      throw Error("AI chose an unavailable car");
    if (a.outings?.some((id) => !state.leisureOffers.some((o) => o.id === id)))
      throw Error("AI chose an unavailable outing");
  }
  const families = [];
  if (state.familyReview?.due) {
    for (const pair of expanded.families || []) {
      if (families.length >= state.familyReview.slots) break;
      try {
        const [valid] = validateFamilyProposals([pair], state.cats, 1);
        if (
          !families.some(
            (p) => p.male === valid.male || p.female === valid.female,
          )
        )
          families.push(valid);
      } catch {
        // An ineligible/repeated suggestion cannot change a permanent partner
        // or invalidate everyone else's valid career and leisure choices.
      }
    }
  }
  return {
    day: state.day,
    assignments: valid,
    ...(state.familyReview?.due ? { families } : {}),
  };
}

// The 70B fast model has a 24k context window. Repeating object keys for every
// cat plus a 10k output reservation exceeded it at 147 cats. A numbered table
// retains every cat's attributes and uses one compact row per decision.
export function cityPlanInput(state) {
  const houses = housingOffers();
  const cats = state.cats.map((p, i) => [
    i,
    p.name,
    p.personality,
    p.coins,
    JOB_KINDS.indexOf(p.profession),
    p.canChangeProfession ? 1 : 0,
    p.professionChanges,
    JOB_KINDS.map((k) => p.skills[k]),
    p.preferences.map((k) => JOB_KINDS.indexOf(k)),
    p.lastPaidDay ?? -1,
    p.recentWorkedDays || [],
    p.hasCar ? 1 : 0,
    p.ownedHomes || 0,
    p.activeHome ? 1 : 0,
    p.wishes,
    p.sex === "male" ? 0 : 1,
    state.cats.findIndex((c) => c.id === p.partner),
  ]);
  const places = state.leisureOffers || [],
    types = [...new Set(places.map((p) => p.type))],
    islands = [...new Set(places.map((p) => p.biome))];
  return {
    messages: [
      {
        role: "system",
        content: `Plan ONE fictional cat day. Output ONLY compact JSON {"assignments":[[catIndex,job,profession,evening,house,roommate,reason,outings],...],"families":[[maleIndex,femaleIndex,"short Ukrainian reason"],...]}.
Include ALL ${state.cats.length} cat indices from 0 through ${state.cats.length - 1} exactly once, including resting cats. ${state.cats.length} is NOT a cat index. Job/profession indices: ${JOB_KINDS.map((k, i) => i + "=" + k).join(", ")}. Job -1 means off work; profession must be 0..5. At most ${JOB_CAPACITY} workers per job: the rest keep their profession and take a day off. Rotate seats fairly: oldest lastPaidDay first; avoid permanently unemployed cats. Work 12:00-19:00.
Profession is permanent, NOT a daily random job. Keep existing profession unless changeAllowed=1; at most 3 lifetime changes. If profession=-1 choose a first career using personality, skills and preferences. Give a short Ukrainian reason only for changing an established profession; omit reason for an initial or unchanged career.
Evening: 0=rest/home,1=walk/visit friends,2=drive. Choose 2 ONLY if hasCar=1. Give cats varied free-time choices. Outings is an array of 1-3 DIFFERENT place indices for free time; [] if resting. All offered places are real and available, across all islands. Choose varied food cafes, Krusty Krab, lemonade, art, swimming, rides and rest by personality. Partners share their outings outside work; retain their separate careers. No invented indices. reason is "" for initial/unchanged careers.
House: -1=no purchase, otherwise its index in houses. Buy only if affordable from that cat's coins; prioritize a first home when saving permits, single cats may occasionally buy another home. A permanent couple may own ONE shared home: if either partner has a home/hasActiveHome=1, choose -1 for both. Roommate: -1=none or another catIndex with hasActiveHome=0. An owner keeps their existing active home on another purchase.
Families: ${state.familyReview?.due ? `this is the rare 14-game-day review; choose up to ${state.familyReview.slots} new mutual lifelong couples, male + female, both partner=-1. Pick compatible personalities gradually. Choose the male index ONLY from familyCandidates.males and female ONLY from familyCandidates.females; these lists exclude taken cats. Do NOT repeat existing pairs. Keep every existing partner forever. Every cat may eventually form a family; the limit applies ONLY to new couples in THIS review, never to the total number of families.` : "NO review today: output families:[]; never form or change a pair."}
Input cat columns: [index,name,personality,coins,profession,changeAllowed,careerChanges,skillsByJob,preferredJobs,lastPaidDay,recentWorkedDays,hasCar,ownedHomes,hasActiveHome,wishes,sex(0male/1female),partnerIndex(-1none)]. House columns: [index,id,name,price]. Place columns: [index,typeIndex,islandIndex,action]; types and islands give their names. Keep every row compact: numbers, no repeated names or keys. One batch for the whole day, no follow-up requests.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          day: state.day,
          houses: houses.map((h, i) => [i, h.id, h.name, h.price]),
          cats,
          ...(state.familyReview?.due
            ? {
                familyCandidates: {
                  males: state.cats.flatMap((p, i) =>
                    !p.partner && p.sex === "male" ? [i] : [],
                  ),
                  females: state.cats.flatMap((p, i) =>
                    !p.partner && p.sex === "female" ? [i] : [],
                  ),
                },
              }
            : {}),
          types: types.map((t, i) => [
            i,
            places.find((p) => p.type === t).name,
          ]),
          islands: islands.map((id, i) => [i, id]),
          places: places.map((p, i) => [
            i,
            types.indexOf(p.type),
            islands.indexOf(p.biome),
            p.action,
          ]),
        }),
      },
    ],
    max_tokens: Math.min(6500, Math.max(1500, state.cats.length * 34 + 700)),
    temperature: 0.3,
  };
}
export function expandCityPlan(raw, state) {
  if (!Array.isArray(raw?.assignments)) return raw;
  const houses = housingOffers();
  return {
    ...raw,
    families: Array.isArray(raw.families)
      ? raw.families.map((p) => {
          if (!Array.isArray(p)) return p;
          if (
            !Number.isSafeInteger(p[0]) ||
            !Number.isSafeInteger(p[1]) ||
            !state.cats[p[0]] ||
            !state.cats[p[1]]
          )
            throw Error("Invalid family indices");
          return {
            male: state.cats[p[0]].id,
            female: state.cats[p[1]].id,
            reason: p[2],
          };
        })
      : [],
    assignments: raw.assignments.map((a) => {
      if (!Array.isArray(a)) return a;
      if (
        a.length < 6 ||
        a.length > 8 ||
        !a.slice(0, 6).every(Number.isSafeInteger) ||
        a[0] < 0 ||
        a[0] >= state.cats.length ||
        a[1] < -1 ||
        a[1] >= 6 ||
        a[2] < 0 ||
        a[2] >= 6 ||
        a[3] < 0 ||
        a[3] > 2 ||
        a[4] < -1 ||
        a[4] >= houses.length ||
        a[5] < -1 ||
        a[5] >= state.cats.length
      )
        throw Error("Invalid compact city plan");
      if (
        a[7] !== undefined &&
        (!Array.isArray(a[7]) ||
          a[7].length > 3 ||
          !a[7].every(
            (i) =>
              Number.isSafeInteger(i) &&
              i >= 0 &&
              i < (state.leisureOffers?.length || 0),
          ))
      )
        throw Error("Invalid outing indices");
      return {
        id: state.cats[a[0]].id,
        job: a[1] === -1 ? "rest" : JOB_KINDS[a[1]],
        profession: JOB_KINDS[a[2]],
        evening: ["rest", "walk", "drive"][a[3]],
        ...(a[4] >= 0
          ? {
              house: {
                type: houses[a[4]].id,
                roommate: a[5] >= 0 ? state.cats[a[5]].id : null,
              },
            }
          : {}),
        ...(a[6] ? { reason: String(a[6]).slice(0, 160) } : {}),
        ...(a[7]
          ? { outings: a[7].map((i) => state.leisureOffers[i].id) }
          : {}),
      };
    }),
  };
}

// Language models can overbook otherwise valid career decisions. Reserve the
// real six seats fairly instead of discarding all 147 AI-selected professions.
export function limitCityWorkplaces(raw, state) {
  if (!Array.isArray(raw?.assignments)) return raw;
  const profiles = new Map(state.cats.map((p) => [p.id, p]));
  const rows = raw.assignments.map((a) => {
    if (!a || ![...JOB_KINDS, "rest"].includes(a.job))
      throw Error("Invalid work choice");
    const p = profiles.get(a.id),
      profession =
        p?.profession && !p.canChangeProfession
          ? p.profession
          : (a.profession ??
            p?.profession ??
            (a.job === "rest" ? p?.preferences[0] : a.job));
    // A model can write a different job number beside its chosen profession.
    // Treat that as a request for a shift in that profession, then reserve real
    // seats below. Never change an AI-selected lifelong profession to fit a seat.
    return {
      ...a,
      profession,
      job: a.job === "rest" ? "rest" : profession,
      // Walking is the existing safe alternative when no owned car exists.
      evening: a.evening === "drive" && !p?.hasCar ? "walk" : a.evening,
    };
  });
  const working = new Map();
  for (const kind of JOB_KINDS) {
    const candidates = rows
      .filter((a) => {
        const p = profiles.get(a.id),
          initial = p?.profession === null,
          overdue = state.day - (p?.lastPaidDay ?? -1) >= 3;
        return (
          a.job === kind ||
          (a.job === "rest" && a.profession === kind && (initial || overdue))
        );
      })
      .sort(
        (a, b) =>
          (profiles.get(a.id)?.lastPaidDay ?? -1) -
            (profiles.get(b.id)?.lastPaidDay ?? -1) || a.id.localeCompare(b.id),
      );
    for (const row of candidates.slice(0, JOB_CAPACITY))
      working.set(row.id, kind);
  }
  return {
    assignments: rows.map((a) => ({
      ...a,
      job: working.get(a.id) || "rest",
    })),
  };
}
