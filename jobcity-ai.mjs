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
      hasCar: !!c.hasCar,
    };
  });
  return { day: s.day, cats, housingOffers: housingOffers() };
}
export async function requestCityPlan(state, run, timeout = 20000) {
  let timer;
  const inference = run({
    messages: [
      {
        role: "system",
        content: `Plan a charming cat working day. Output ONLY JSON {"assignments":[{"id":"...","profession":"bank|crypto|factory|furniture|estate|cars","job":"same profession or rest","evening":"rest|walk|drive","reason":"short Ukrainian reason","house":null or {"type":"home-sage","roommate":"another cat id or null"}}]}. Include EACH cat exactly once. A profession is a long-term career, NEVER a daily random job. Keep every existing profession unless canChangeProfession is true; at most 3 career changes in a lifetime, with a concrete circumstance (new skill, burnout, a new goal). A null profession means choose an initial profession by personality, skills, preferences, experience and savings goals. At most ${JOB_CAPACITY} working cats per profession; others rest without losing their profession. Use drive only if hasCar. Opening hours 12:00–19:00. Jobs: ${JOB_KINDS.join(", ")}. Consider buying a permanent home once per day in this SAME batch, never request another AI call. Choose house:null when saving or uninterested. Otherwise choose an affordable type from housingOffers; prioritize a first home once savings allow, and occasionally another home for a new wish even when ownedHomes > 0 (there is no ownership limit). Use only the cat's private coins, reserve some savings for their wishes. Choose a roommate from the other cats whose activeHome is null, or null if none. Never relocate a cat that already has activeHome when buying another home. No real money or real investment advice; this is fictional game currency.`,
      },
      { role: "user", content: JSON.stringify(state) },
    ],
    max_tokens: 10000,
    temperature: 0.45,
  });
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
  const valid = validateJobAssignments(raw, state.cats);
  for (const a of valid) {
    const p = state.cats.find((c) => c.id === a.id);
    if (p.profession && p.profession !== a.profession && !p.canChangeProfession)
      throw Error("AI changed a permanent career");
    if (a.evening === "drive" && !p.hasCar)
      throw Error("AI chose an unavailable car");
  }
  return { day: state.day, assignments: valid };
}
