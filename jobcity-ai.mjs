import { housingOffers } from "./public/housing-system.js";
import { JOB_KINDS, JOB_CAPACITY } from "./public/jobcity-data.js";
import { validateJobAssignments } from "./public/jobcity-system.js";
export const JOB_AI_LIMIT = 90000;
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
    };
  });
  return { day: s.day, cats, housingOffers: housingOffers() };
}
export async function requestCityPlan(state, run, timeout = 70000) {
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
  const valid = validateJobAssignments(
    limitCityWorkplaces(expandCityPlan(raw, state), state),
    state.cats,
  );
  for (const a of valid) {
    const p = state.cats.find((c) => c.id === a.id);
    if (p.profession && p.profession !== a.profession && !p.canChangeProfession)
      throw Error("AI changed a permanent career");
    if (a.evening === "drive" && !p.hasCar)
      throw Error("AI chose an unavailable car");
  }
  return { day: state.day, assignments: valid };
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
  ]);
  return {
    messages: [
      {
        role: "system",
        content: `Plan ONE fictional cat day. Output ONLY JSON {"assignments":[[catIndex,job,profession,evening,house,roommate,reasonOptional],...]}.
Include ALL ${state.cats.length} cat indices exactly once, including resting cats. Job/profession indices: ${JOB_KINDS.map((k, i) => i + "=" + k).join(", ")}. Job -1 means off work; profession must be 0..5. At most ${JOB_CAPACITY} workers per job: the rest keep their profession and take a day off. Rotate seats fairly: oldest lastPaidDay first; avoid permanently unemployed cats. Work 12:00-19:00.
Profession is permanent, NOT a daily random job. Keep existing profession unless changeAllowed=1; at most 3 lifetime changes. If profession=-1 choose a first career using personality, skills and preferences. Give a short Ukrainian reason only for changing an established profession; omit reason for an initial or unchanged career.
Evening: 0=rest/home,1=walk/visit friends,2=drive. Choose 2 ONLY if hasCar=1. Give cats varied free-time choices.
House: -1=no purchase, otherwise its index in houses. Buy only if affordable from that cat's coins; prioritize a first home when saving permits, occasionally another home (no ownership limit). Roommate: -1=none or another catIndex with hasActiveHome=0. An owner keeps their existing active home on another purchase.
Input cat columns: [index,name,personality,coins,profession,changeAllowed,careerChanges,skillsByJob,preferredJobs,lastPaidDay,recentWorkedDays,hasCar,ownedHomes,hasActiveHome,wishes]. House columns: [index,id,name,price]. Keep every row compact: numbers, no repeated names or keys. This is one batch for the whole day, no follow-up requests.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          day: state.day,
          houses: houses.map((h, i) => [i, h.id, h.name, h.price]),
          cats,
        }),
      },
    ],
    max_tokens: Math.min(6500, Math.max(1500, state.cats.length * 25 + 400)),
    temperature: 0.3,
  };
}
export function expandCityPlan(raw, state) {
  if (!Array.isArray(raw?.assignments)) return raw;
  const houses = housingOffers();
  return {
    assignments: raw.assignments.map((a) => {
      if (!Array.isArray(a)) return a;
      if (
        a.length < 6 ||
        a.length > 7 ||
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
        a.profession ??
        p?.profession ??
        (a.job === "rest" ? p?.preferences[0] : a.job);
    if (a.job !== "rest" && profession !== a.job)
      throw Error("Робота не відповідає професії");
    return { ...a, profession };
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
