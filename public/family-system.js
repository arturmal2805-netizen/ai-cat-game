import { NEIGHBORS } from "./game-data.js";
import { catSex } from "./cat-sex.js";
export const FAMILY_REVIEW_DAYS = 14;
export const FAMILY_SHARE = 4;
const clone = (value) => structuredClone(value);
const idValid = (id) => typeof id === "string" && /^[\w-]{1,40}$/.test(id);
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const kyivDate = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export function newFamily(day, now = Date.now()) {
  return {
    version: 1,
    calendar: { startDay: day, startedAt: now, startDate: kyivDate(now) },
    lastReviewDay: day - 1,
    couples: {},
  };
}
export function familySnapshotValid(family) {
  if (family == null) return true;
  if (
    family.version !== 1 ||
    !integer(family.calendar?.startDay) ||
    !Number.isFinite(family.calendar.startedAt) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(family.calendar.startDate || "") ||
    !Number.isFinite(Date.parse(family.calendar.startDate + "T12:00:00Z")) ||
    !Number.isSafeInteger(family.lastReviewDay) ||
    !family.couples ||
    typeof family.couples !== "object" ||
    Array.isArray(family.couples)
  )
    return false;
  const members = new Set();
  for (const [id, pair] of Object.entries(family.couples)) {
    if (
      !pair ||
      id !== pair.id ||
      id !== `family-${pair.male}-${pair.female}` ||
      !idValid(pair.male) ||
      !idValid(pair.female) ||
      pair.male === pair.female ||
      catSex(pair.male) !== "male" ||
      catSex(pair.female) !== "female" ||
      members.has(pair.male) ||
      members.has(pair.female) ||
      !integer(pair.formedDay) ||
      !Number.isFinite(pair.formedAt) ||
      pair.source !== "ai" ||
      typeof pair.reason !== "string" ||
      pair.reason.length > 160
    )
      return false;
    members.add(pair.male);
    members.add(pair.female);
  }
  return true;
}
export function normalizeFamily(raw) {
  if (raw == null) return null;
  if (!familySnapshotValid(raw)) throw Error("Пошкоджено збереження сімей");
  return clone(raw);
}
export function ensureFamily(game, day, now = Date.now()) {
  if (!game.jobCity || game.family) return game;
  return { ...game, family: newFamily(day, now) };
}
export function familyPartners(game) {
  const partners = new Map();
  for (const pair of Object.values(game.family?.couples || {})) {
    partners.set(pair.male, pair.female);
    partners.set(pair.female, pair.male);
  }
  return partners;
}
export function familyPartner(game, id) {
  return familyPartners(game).get(id) || null;
}
export const familyLimit = (profiles) =>
  Math.floor(profiles.length / (FAMILY_SHARE * 2));
export function familyReview(game, day) {
  const state = game.family;
  const profiles = Object.values(game.jobCity?.profiles || {});
  const capacity = Math.max(
    0,
    familyLimit(profiles) - Object.keys(state?.couples || {}).length,
  );
  return {
    due:
      !!state &&
      day >= state.lastReviewDay + FAMILY_REVIEW_DAYS &&
      capacity > 0,
    slots: Math.min(2, capacity),
    nextDay: state
      ? state.lastReviewDay + FAMILY_REVIEW_DAYS
      : day + FAMILY_REVIEW_DAYS - 1,
    interval: FAMILY_REVIEW_DAYS,
  };
}
export function familyCalendar(game, day) {
  const calendar = game.family?.calendar;
  const number = Math.max(1, day - (calendar?.startDay ?? day) + 1);
  const date = new Date(
    (calendar?.startDate || kyivDate(Date.now())) + "T12:00:00Z",
  );
  date.setUTCDate(date.getUTCDate() + number - 1);
  return {
    number,
    date: date.toISOString().slice(0, 10),
    label: `День ${number} · ${new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", timeZone: "UTC" }).format(date)}`,
  };
}
export function validateFamilyProposals(proposals, profiles, slots = 2) {
  if (!Array.isArray(proposals) || proposals.length > slots)
    throw Error("Некоректний вибір сімей");
  const people = new Map(profiles.map((p) => [p.id, p]));
  const used = new Set();
  return proposals.map((pair) => {
    const male = people.get(pair?.male),
      female = people.get(pair?.female);
    if (
      !male ||
      !female ||
      catSex(male) !== "male" ||
      catSex(female) !== "female" ||
      male.partner ||
      female.partner ||
      used.has(male.id) ||
      used.has(female.id)
    )
      throw Error("AI має вибрати двох вільних сумісних котиків");
    used.add(male.id);
    used.add(female.id);
    return {
      male: male.id,
      female: female.id,
      reason: String(pair.reason || "Подобаються одне одному").slice(0, 160),
    };
  });
}
// Called only for a successful real-AI daily response. Local fallbacks cannot
// create families, and replayed responses cannot change a lifelong partner.
export function applyFamilyDecisions(
  game,
  day,
  proposals = [],
  now = Date.now(),
) {
  const review = familyReview(game, day);
  if (!review.due) return game;
  const partners = familyPartners(game);
  const profiles = Object.values(game.jobCity.profiles).map((p) => ({
    ...p,
    partner: partners.get(p.id) || null,
  }));
  const valid = validateFamilyProposals(proposals, profiles, review.slots);
  const next = clone(game);
  next.family.lastReviewDay = day;
  for (const pair of valid) {
    const id = `family-${pair.male}-${pair.female}`;
    next.family.couples[id] = {
      ...pair,
      id,
      formedDay: day,
      formedAt: now,
      source: "ai",
    };
    // A venue kitten becomes a permanent resident when it starts a family.
    // Storing the counter must never remove someone's lifelong partner.
    for (const member of [pair.male, pair.female])
      if (
        NEIGHBORS.find((n) => n.id === member)?.venue &&
        !next.unlocked.includes(next.catDestinations[member])
      )
        next.catDestinations[member] = next.unlocked.includes("jobcity")
          ? "jobcity"
          : "moon";
  }
  return reconcileFamilyHomes(next);
}
// Family formation is the explicit reason to share a home. Buying extra
// property afterwards never relocates an established couple to another home.
export function reconcileFamilyHomes(game, preferredHome = null) {
  if (!game.family || !game.housing) return game;
  for (const pair of Object.values(game.family.couples)) {
    const members = [pair.male, pair.female],
      homes = game.housing.homes;
    const active = members.map((id) => homes[game.housing.residences[id]]);
    const preferred = homes[preferredHome];
    const home =
      (preferred && members.includes(preferred.owner) ? preferred : null) ||
      active.find((h) => h && members.includes(h.owner)) ||
      Object.values(homes).find((h) => members.includes(h.owner));
    if (!home) continue;
    const spouse = members.find((id) => id !== home.owner);
    if (
      home.roommate &&
      home.roommate !== spouse &&
      game.housing.residences[home.roommate] === home.id
    )
      delete game.housing.residences[home.roommate];
    for (const old of Object.values(homes))
      if (old.id !== home.id && members.includes(old.roommate))
        old.roommate = null;
    home.roommate = spouse;
    for (const id of members) game.housing.residences[id] = home.id;
  }
  return game;
}
export function mergeFamily(base, current, incoming) {
  if (!incoming) return current ? clone(current) : null;
  if (!current) return normalizeFamily(incoming);
  if (!familySnapshotValid(incoming) || !familySnapshotValid(current))
    throw Error("Неповна сім'я у збереженні");
  const next = clone(current),
    members = familyPartners({ family: current });
  for (const [id, pair] of Object.entries(incoming.couples)) {
    if (next.couples[id]) {
      if (JSON.stringify(next.couples[id]) !== JSON.stringify(pair))
        throw Error("Постійну сім'ю вже збережено з іншими даними");
      continue;
    }
    if (members.has(pair.male) || members.has(pair.female))
      throw Error("Партнера вже обрано на іншому пристрої");
    next.couples[id] = clone(pair);
    members.set(pair.male, pair.female);
    members.set(pair.female, pair.male);
  }
  next.lastReviewDay = Math.max(current.lastReviewDay, incoming.lastReviewDay);
  return next;
}
