import { normalizeCatCar } from "./cat-commute.js";
import {
  JOB_CITY_ID,
  JOB_MINUTE_MS,
  JOB_DAY_MINUTES,
  JOB_START,
  JOB_END,
  JOB_KINDS,
  JOB_BUSINESSES,
  JOB_CAPACITY,
  jobBusiness,
  jobCar,
  JOB_CARS,
} from "./jobcity-data.js";
import {
  applyHousingDecisions,
  buyCatHome,
  housingAIProfile,
  housingOffers,
} from "./housing-system.js";
import { houseType, HOUSE_TYPES } from "./housing-data.js";
import { activeCats } from "./cat-roster.js";
import { catSex } from "./cat-sex.js";
import { leisureOffers } from "./leisure-data.js";
import {
  ensureFamily,
  familyReview,
  familyPartners,
  applyFamilyDecisions,
} from "./family-system.js";
import { CATALOG, byItem } from "./game-data.js";
const clone = (v) => structuredClone(v);
const safe = (v, max = 10000000) =>
  Number.isSafeInteger(v) ? Math.max(0, Math.min(max, v)) : 0;
const hash = (s) =>
  [...String(s)].reduce(
    (h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0,
    7,
  );
export const cityCats = (game) => [
  { id: "chichi", name: "Чичі", preferredJob: "estate" },
  ...activeCats(game),
];
export function cityClock(state, now = Date.now()) {
  const absolute =
    JOB_START + Math.max(0, (now - (state?.epoch ?? now)) / JOB_MINUTE_MS);
  const day = Math.floor(absolute / JOB_DAY_MINUTES),
    minute = absolute % JOB_DAY_MINUTES;
  return {
    absolute,
    day,
    minute,
    hour: Math.floor(minute / 60),
    label:
      String(Math.floor(minute / 60)).padStart(2, "0") +
      ":" +
      String(Math.floor(minute % 60)).padStart(2, "0"),
    working: minute >= JOB_START && minute < JOB_END,
  };
}
export function newJobProfile(cat) {
  const seed = hash(cat.id),
    favorite = cat.preferredJob || JOB_KINDS[seed % 6];
  return {
    id: cat.id,
    name: cat.name,
    sex: catSex(cat),
    coins: 0,
    purchaseCount: 0,
    lastHousingAIDay: -1,
    lastEveningDay: -1,
    lastWishDay: -1,
    manualUntil: 0,
    parkedAt: null,
    parkedCar: null,
    worldCar: null,
    earnedTotal: 0,
    spentTotal: 0,
    profession: null,
    careerAIPending: true,
    careerAIRequestedDay: -1,
    professionChanges: 0,
    professionSinceDay: -1,
    professionReason: "",
    professionSource: "local",
    career: [],
    personality: ["Товариський", "Допитливий", "Винахідливий", "Спокійний"][
      seed % 4
    ],
    preferences: [
      favorite,
      JOB_KINDS[(JOB_KINDS.indexOf(favorite) + 1 + (seed % 4)) % 6],
    ],
    skills: Object.fromEntries(
      JOB_KINDS.map((k, i) => [k, 1 + ((seed + i * 3) % 4)]),
    ),
    wishes: [JOB_CARS[seed % JOB_CARS.length].id, seed % 2 ? "yarn" : "bed"],
    status: "rest",
    schedule: null,
    attendance: null,
    lastPaidDay: -1,
    inventory: {},
    transactions: [],
    shifts: [],
    trip: null,
  };
}
export function normalizeJobCity(raw, game, now = Date.now()) {
  if (!raw || raw.version !== 1) return null;
  const state = {
    version: 1,
    epoch: Number.isFinite(raw.epoch) && raw.epoch >= 0 ? raw.epoch : now,
    requestedDay: Number.isSafeInteger(raw.requestedDay)
      ? raw.requestedDay
      : -1,
    eveningAIRequestedDay: Number.isSafeInteger(raw.eveningAIRequestedDay)
      ? raw.eveningAIRequestedDay
      : raw.plan?.source === "ai"
        ? raw.plan.day
        : -1,
    eveningAIAppliedDay: Number.isSafeInteger(raw.eveningAIAppliedDay) ? raw.eveningAIAppliedDay : -1,
    plan: null,
    profiles: {},
  };
  for (const cat of cityCats(game)) {
    const p = newJobProfile(cat),
      r = raw.profiles?.[cat.id];
    if (r) {
      p.coins = safe(r.coins);
      p.purchaseCount = safe(r.purchaseCount, Number.MAX_SAFE_INTEGER);
      p.lastHousingAIDay = Number.isSafeInteger(r.lastHousingAIDay)
        ? r.lastHousingAIDay
        : -1;
      if (typeof r.name === "string" && r.name.trim())
        p.name = r.name.trim().slice(0, 60);
      p.manualUntil = Number.isFinite(r.manualUntil) ? r.manualUntil : 0;
      p.lastEveningDay = Number.isSafeInteger(r.lastEveningDay)
        ? r.lastEveningDay
        : -1;
      p.lastWishDay = Number.isSafeInteger(r.lastWishDay) ? r.lastWishDay : -1;
      if (
        r.parkedAt &&
        Number.isFinite(r.parkedAt.x) &&
        Number.isFinite(r.parkedAt.z) &&
        Math.hypot(r.parkedAt.x, r.parkedAt.z) < 65
      )
        p.parkedAt = { x: r.parkedAt.x, z: r.parkedAt.z };
      p.parkedCar =
        jobCar(r.parkedCar) && r.inventory?.[r.parkedCar] ? r.parkedCar : null;
      p.earnedTotal = safe(r.earnedTotal, Number.MAX_SAFE_INTEGER);
      p.spentTotal = safe(r.spentTotal, Number.MAX_SAFE_INTEGER);
      p.profession = JOB_KINDS.includes(r.profession) ? r.profession : null;
      // Released careers stay fixed. Only genuinely new/provisional cats need
      // an initial AI choice; loading an old local fallback is not a re-roll.
      p.careerAIPending =
        r.careerAIPending === undefined
          ? !p.profession || r.professionSource === "pending"
          : r.careerAIPending === true;
      p.careerAIRequestedDay = Number.isSafeInteger(r.careerAIRequestedDay)
        ? r.careerAIRequestedDay
        : -1;
      p.professionChanges = safe(r.professionChanges, 3);
      p.professionSinceDay = Number.isSafeInteger(r.professionSinceDay)
        ? r.professionSinceDay
        : -1;
      p.professionReason = String(r.professionReason || "").slice(0, 160);
      p.professionSource = ["pending", "local", "ai"].includes(
        r.professionSource,
      )
        ? r.professionSource
        : "local";
      p.career = (Array.isArray(r.career) ? r.career : [])
        .filter((c) => jobBusiness(c.job) && Number.isSafeInteger(c.day))
        .slice(-4);
      p.lastPaidDay = Number.isSafeInteger(r.lastPaidDay)
        ? Math.max(-1, r.lastPaidDay)
        : -1;
      for (const k of JOB_KINDS)
        p.skills[k] = Math.max(1, safe(r.skills?.[k], 100));
      p.inventory = Object.fromEntries(
        Object.entries(r.inventory || {})
          .filter(
            ([k, v]) =>
              (jobCar(k) || byItem(k)) && Number.isSafeInteger(v) && v > 0,
          )
          .slice(0, 80)
          .map(([k, v]) => [k, Math.min(30, v)]),
      );
      p.worldCar = normalizeCatCar(r.worldCar, p.inventory);
      p.transactions = (Array.isArray(r.transactions) ? r.transactions : [])
        .filter(
          (t) =>
            typeof t.id === "string" &&
            t.id.length < 90 &&
            Number.isSafeInteger(t.amount),
        )
        .slice(-12);
      p.shifts = (Array.isArray(r.shifts) ? r.shifts : [])
        .filter((s) => Number.isSafeInteger(s.day) && jobBusiness(s.job))
        .slice(-5);
      if (
        r.schedule &&
        Number.isSafeInteger(r.schedule.day) &&
        [...JOB_KINDS, "rest"].includes(r.schedule.job)
      )
        p.schedule = {
          day: r.schedule.day,
          job: r.schedule.job,
          evening: ["rest", "walk", "drive"].includes(r.schedule.evening)
            ? r.schedule.evening
            : "rest",
          ...(Array.isArray(r.schedule.outings)
            ? {
                outings: r.schedule.outings
                  .filter(
                    (id) => typeof id === "string" && /^[\w-]{1,90}$/.test(id),
                  )
                  .slice(0, 3),
              }
            : {}),
        };
      if (
        Number.isSafeInteger(r.leisureProgress?.day) &&
        Number.isSafeInteger(r.leisureProgress?.done)
      )
        p.leisureProgress = {
          day: r.leisureProgress.day,
          done: Math.max(0, Math.min(3, r.leisureProgress.done)),
        };
      if (
        r.attendance &&
        Number.isSafeInteger(r.attendance.day) &&
        jobBusiness(r.attendance.job) &&
        Number.isFinite(r.attendance.at) &&
        Number.isFinite(r.attendance.worked)
      )
        p.attendance = {
          day: r.attendance.day,
          job: r.attendance.job,
          at: r.attendance.at,
          worked: Math.max(0, Math.min(420, r.attendance.worked)),
          active: !!r.attendance.active,
          credit: Math.max(0, Math.min(2000, Number(r.attendance.credit) || 0)),
        };
      p.status = [
        "rest",
        "travel",
        "work",
        "talk",
        "shop",
        "joy",
        "tired",
        "enter-car",
        "drive",
        "park",
      ].includes(r.status)
        ? r.status
        : "rest";
      if (
        r.trip &&
        jobCar(r.trip.car) &&
        p.inventory[r.trip.car] &&
        Number.isFinite(r.trip.destination?.x) &&
        Number.isFinite(r.trip.destination?.z) &&
        Math.hypot(r.trip.destination.x, r.trip.destination.z) < 65
      ) {
        p.trip = {
          car: r.trip.car,
          destination: { x: r.trip.destination.x, z: r.trip.destination.z },
          startedAt: Number(r.trip.startedAt) || now,
          manualUntil: Number(r.trip.manualUntil) || 0,
          id: String(r.trip.id || "").slice(0, 90),
        };
      }
    }
    state.profiles[cat.id] = p;
  }
  if (raw.plan && Number.isSafeInteger(raw.plan.day)) {
    try {
      const assignments = validateJobAssignments(
        { assignments: raw.plan.assignments },
        Object.values(state.profiles),
      );
      state.plan = {
        day: raw.plan.day,
        source: ["ai", "local", "pending"].includes(raw.plan.source)
          ? raw.plan.source
          : "local",
        assignments,
      };
    } catch {
      /* Old/incomplete plans are regenerated locally. */
    }
  }
  return state;
}
export function ensureJobCity(game, now = Date.now()) {
  if (!game.unlocked.includes(JOB_CITY_ID)) return game;
  const cats = cityCats(game);
  if (game.jobCity && cats.every((c) => game.jobCity.profiles[c.id]))
    return ensureFamily(game, cityClock(game.jobCity, now).day, now);
  const next = clone(game);
  if (!next.jobCity)
    next.jobCity = {
      version: 1,
      epoch: now,
      requestedDay: -1,
      eveningAIRequestedDay: -1,
      eveningAIAppliedDay: -1,
      plan: null,
      profiles: {},
    };
  for (const c of cats) next.jobCity.profiles[c.id] ||= newJobProfile(c);
  return ensureFamily(next, cityClock(next.jobCity, now).day, now);
}
export function localJobPlan(profiles, day) {
  const counts = Object.fromEntries(JOB_KINDS.map((k) => [k, 0]));
  return [...profiles]
    .sort(
      (a, b) =>
        (a.lastPaidDay ?? -1) - (b.lastPaidDay ?? -1) ||
        Number(b.id.startsWith("jobcat-")) -
          Number(a.id.startsWith("jobcat-")) ||
        a.id.localeCompare(b.id),
    )
    .map((p) => {
      const work = p.id.startsWith("jobcat-") || hash(p.id + day) % 5 !== 0;
      const options = JOB_KINDS.filter(
        (k) =>
          (!p.profession || p.profession === k) && counts[k] < JOB_CAPACITY,
      ).sort(
        (a, b) =>
          (p.preferences.includes(b) ? 8 : 0) +
          p.skills[b] -
          ((p.preferences.includes(a) ? 8 : 0) + p.skills[a]),
      );
      const job = work && options.length ? options[0] : "rest";
      if (job !== "rest") counts[job]++;
      return {
        id: p.id,
        job,
        profession: p.profession || (job === "rest" ? p.preferences[0] : job),
        reason: p.professionReason || "Відповідає характеру та здібностям",
        evening:
          (p.hasCar || Object.keys(p.inventory || {}).some(jobCar)) &&
          hash(p.id + day) % 3 === 0
            ? "drive"
            : hash(p.id + day) % 2
              ? "walk"
              : "rest",
      };
    });
}
export function validateJobAssignments(raw, profiles) {
  if (
    !raw ||
    !Array.isArray(raw.assignments) ||
    raw.assignments.length !== profiles.length ||
    profiles.length > 256
  )
    throw Error("Некоректний план роботи");
  const ids = new Set(profiles.map((p) => p.id)),
    seen = new Set(),
    counts = {};
  return raw.assignments.map((a) => {
    if (
      !ids.has(a?.id) ||
      seen.has(a.id) ||
      ![...JOB_KINDS, "rest"].includes(a.job) ||
      !["rest", "walk", "drive"].includes(a.evening)
    )
      throw Error("Некоректне призначення котика");
    seen.add(a.id);
    if (
      a.job !== "rest" &&
      (counts[a.job] = (counts[a.job] || 0) + 1) > JOB_CAPACITY
    )
      throw Error("Робочі місця зайняті");
    const p = profiles.find((p) => p.id === a.id),
      profession =
        a.profession ??
        p.profession ??
        (a.job === "rest" ? p.preferences[0] : a.job),
      reason = String(a.reason || "Відповідає характеру та здібностям").slice(
        0,
        160,
      );
    if (
      !JOB_KINDS.includes(profession) ||
      (a.job !== "rest" && a.job !== profession)
    )
      throw Error("Робота не відповідає професії");
    let house = null;
    if (a.house) {
      if (
        !houseType(a.house.type) ||
        (a.house.roommate != null &&
          (!ids.has(a.house.roommate) || a.house.roommate === a.id))
      )
        throw Error("Некоректна покупка будинку");
      house = { type: a.house.type, roommate: a.house.roommate || null };
    }
    if (
      a.outings !== undefined &&
      (!Array.isArray(a.outings) ||
        a.outings.length > 3 ||
        new Set(a.outings).size !== a.outings.length ||
        a.outings.some(
          (id) => typeof id !== "string" || !/^[\w-]{1,90}$/.test(id),
        ))
    )
      throw Error("Некоректний план відпочинку");
    return {
      id: a.id,
      job: a.job,
      evening: a.evening,
      profession,
      reason,
      ...(house ? { house } : {}),
      ...(a.outings !== undefined ? { outings: [...a.outings] } : {}),
    };
  });
}
export function applyJobPlan(
  game,
  assignments,
  day,
  source = "local",
  families = [],
  options = {},
) {
  const next = clone(game),
    state = next.jobCity;
  if (!state || state.plan?.day > day) return game;
  const valid = validateJobAssignments(
    { assignments },
    Object.values(state.profiles),
  );
  const outings = valid.some((a) => a.outings?.length)
    ? new Set(leisureOffers(game).map((o) => o.id))
    : null;
  if (outings && valid.some((a) => a.outings?.some((id) => !outings.has(id))))
    throw Error("Обране місце відпочинку зараз недоступне");
  state.plan = { day, source, assignments: valid };
  for (const a of valid) {
    const p = state.profiles[a.id];
    if (p.profession !== a.profession) {
      const provisional =
        p.professionSource === "pending" &&
        p.professionChanges === 0 &&
        p.professionSinceDay === day;
      if (
        p.profession &&
        !provisional &&
        (!careerReviewAllowed(p, day) || source !== "ai")
      )
        throw Error("Професія котика постійна; зараз змінювати її не можна");
      if (p.profession && !provisional) p.professionChanges++;
      p.profession = a.profession;
      p.professionSinceDay = day;
      p.professionReason = a.reason;
      if (provisional) p.career = p.career.filter((c) => c.day !== day);
      p.professionSource = source;
      p.career = [
        ...p.career,
        { job: a.profession, day, reason: a.reason },
      ].slice(-4);
    }
    if (
      p.professionSource === "pending" &&
      p.professionSinceDay === day &&
      source !== "pending"
    )
      p.professionSource = source;
    p.schedule = {
      day,
      job: a.job,
      evening: a.evening,
      ...(a.outings ? { outings: a.outings } : {}),
    };
    if (a.outings && p.leisureProgress?.day !== day)
      p.leisureProgress = { day, done: 0 };
  }
  if (source !== "ai" || options.phase === "careers") return next;
  const planned = applyFamilyDecisions(
    applyHousingDecisions(next, day, valid),
    day,
    families,
  );
  // Share the AI's chosen itinerary, while each partner keeps their own shift.
  for (const pair of Object.values(planned.family?.couples || {})) {
    const ids = [pair.male, pair.female],
      leader = ids.includes("chichi") ? "chichi" : pair.male;
    const other = ids.find((id) => id !== leader),
      profiles = planned.jobCity.profiles;
    const itinerary = profiles[leader]?.schedule?.outings?.length
      ? profiles[leader].schedule.outings
      : profiles[other]?.schedule?.outings;
    if (itinerary)
      for (const id of ids) {
        const profile = profiles[id];
        if (profile?.schedule?.day !== day) continue;
        profile.schedule.outings = [...itinerary];
        if (profile.leisureProgress?.day !== day)
          profile.leisureProgress = { day, done: 0 };
      }
  }
  return planned;
}
function transaction(p, t) {
  if (p.transactions.some((x) => x.id === t.id)) return false;
  p.transactions.push(t);
  p.transactions = p.transactions.slice(-12);
  return true;
}
function wages(a, until) {
  return (
    (a.credit || 0) +
    (a.active
      ? (Math.max(0, Math.min(until, a.day * 1440 + JOB_END) - a.at) *
          jobBusiness(a.job).wage) /
        60
      : 0)
  );
}
function worked(a, until) {
  return Math.min(
    420,
    a.worked +
      (a.active
        ? Math.max(0, Math.min(until, a.day * 1440 + JOB_END) - a.at)
        : 0),
  );
}
export function advanceJobCity(game, now = Date.now()) {
  let next = ensureJobCity(game, now);
  if (!next.jobCity) return next;
  const clock = cityClock(next.jobCity, now);
  const due = Object.values(next.jobCity.profiles).some(
    (p) =>
      p.attendance &&
      p.lastPaidDay < p.attendance.day &&
      clock.absolute >= p.attendance.day * 1440 + JOB_END,
  );
  if (!due) return next;
  if (next === game) next = clone(game);
  for (const p of Object.values(next.jobCity.profiles)) {
    const a = p.attendance;
    if (!a || p.lastPaidDay >= a.day || clock.absolute < a.day * 1440 + JOB_END)
      continue;
    const minutes = worked(a, a.day * 1440 + JOB_END),
      b = jobBusiness(a.job),
      amount = Math.floor(wages(a, a.day * 1440 + JOB_END) + 1e-7);
    p.lastPaidDay = a.day;
    p.status = "tired";
    p.attendance = null;
    if (
      amount > 0 &&
      transaction(p, {
        id: "shift-" + a.day,
        kind: "wage",
        amount,
        day: a.day,
        job: a.job,
        at: now,
      })
    ) {
      p.coins += amount;
      p.earnedTotal += amount;
      p.skills[a.job] = Math.min(100, p.skills[a.job] + 1);
      p.shifts = [
        ...p.shifts,
        { day: a.day, job: a.job, minutes: Math.round(minutes), amount },
      ].slice(-5);
    }
  }
  return next;
}
export function recordJobAttendance(game, id, job, active, now = Date.now()) {
  return recordJobAttendanceBatch(game, [{ id, job, active, now }]);
}
// A shift can admit many cats in the same frame. Retain event order and exact
// timestamps, but clone/save the world once rather than once per employee.
export function recordJobAttendanceBatch(game, events) {
  let next = game;
  for (const { id, job, active, now = Date.now() } of events) {
    const p = next.jobCity?.profiles[id],
      clock = cityClock(next.jobCity, now);
    if (!p || !jobBusiness(job) || !clock.working || p.lastPaidDay >= clock.day)
      continue;
    if (active && (p.schedule?.day !== clock.day || p.schedule.job !== job))
      continue;
    if (!active && p.attendance?.job !== job) continue;
    if (
      p.attendance?.active === active &&
      p.attendance?.day === clock.day &&
      p.attendance.job === job
    )
      continue;
    if (next === game) next = clone(game);
    const n = next.jobCity.profiles[id],
      old = n.attendance;
    n.attendance = {
      day: clock.day,
      job,
      at: clock.absolute,
      worked: old?.day === clock.day ? worked(old, clock.absolute) : 0,
      credit: old?.day === clock.day ? wages(old, clock.absolute) : 0,
      active,
    };
    n.status = active ? "work" : "rest";
  }
  return next;
}
export function catProducts(game) {
  return [
    ...JOB_CARS.map((c) => ({ ...c, category: "cars" })),
    ...HOUSE_TYPES,
    ...CATALOG.filter(
      (p) =>
        !p.islandOnly &&
        p.price > 0 &&
        p.price < 100000 &&
        [
          "toys",
          "comfort",
          "rides",
          "transport",
          "nature",
          "business",
        ].includes(p.category),
    ).map((p) => ({ ...p, price: Math.max(30, Math.round(p.price * 0.35)) })),
  ];
}
export function buyCatProduct(game, id, productId, receipt, now = Date.now()) {
  if (houseType(productId))
    return buyCatHome(game, id, productId, receipt, {}, now);
  const p = game.jobCity?.profiles[id],
    product = catProducts(game).find((x) => x.id === productId);
  if (
    !p ||
    !product ||
    typeof receipt !== "string" ||
    !/^[\w-]{8,80}$/.test(receipt)
  )
    throw Error("Покупка недоступна");
  const sequence = Number(receipt.match(/-(\d+)$/)?.[1]);
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw Error("Некоректний номер покупки");
  if (sequence <= p.purchaseCount) return game;
  if (sequence !== p.purchaseCount + 1)
    throw Error("Оновіть гаманець котика перед покупкою");
  if (p.coins < product.price)
    throw Error("У котика поки недостатньо власних монеток");
  if ((p.inventory[productId] || 0) >= 30)
    throw Error("У котика вже багато таких речей");
  const next = clone(game),
    n = next.jobCity.profiles[id];
  n.purchaseCount = sequence;
  n.coins -= product.price;
  n.spentTotal += product.price;
  n.inventory[productId] = (n.inventory[productId] || 0) + 1;
  n.status = "joy";
  transaction(n, {
    id: receipt,
    kind: "purchase",
    item: productId,
    amount: -product.price,
    at: now,
  });
  return next;
}
export function startCatDrive(
  game,
  id,
  car,
  destination,
  now = Date.now(),
  manual = true,
) {
  const p = game.jobCity?.profiles[id];
  if (!p || !jobCar(car) || !p.inventory[car])
    throw Error("Цієї машинки немає в інвентарі котика");
  if (
    !Number.isFinite(destination?.x) ||
    !Number.isFinite(destination?.z) ||
    Math.hypot(destination.x, destination.z) > 65
  )
    throw Error("Виберіть точку на дорогах Cat Job City");
  const next = clone(game),
    n = next.jobCity.profiles[id];
  n.trip = {
    id: "trip-" + now + "-" + id,
    car,
    destination: { x: destination.x, z: destination.z },
    startedAt: now,
    manualUntil: manual ? now + 90000 : 0,
  };
  n.status = "enter-car";
  return next;
}
export function finishCatDrive(game, id, tripId, position) {
  const p = game.jobCity?.profiles[id];
  if (!p?.trip || p.trip.id !== tripId) return game;
  const next = clone(game);
  next.jobCity.profiles[id].parkedAt =
    position &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.z) &&
    Math.hypot(position.x, position.z) < 65
      ? { x: position.x, z: position.z }
      : { ...p.trip.destination };
  next.jobCity.profiles[id].parkedCar = p.trip.car;
  next.jobCity.profiles[id].trip = null;
  next.jobCity.profiles[id].status = "rest";
  return next;
}
export function jobAIState(game, now = Date.now()) {
  const clock = cityClock(game.jobCity, now);
  const partners = familyPartners(game);
  return {
    day: clock.day,
    familyReview: familyReview(game, clock.day),
    leisureOffers: leisureOffers(game, now),
    housingOffers: housingOffers(),
    cats: Object.values(game.jobCity.profiles).map((p) => ({
      id: p.id,
      name: p.name,
      sex: catSex(p.id),
      partner: partners.get(p.id) || null,
      coins: p.coins,
      ...housingAIProfile(game, p.id),
      personality: p.personality,
      skills: p.skills,
      preferences: p.preferences,
      wishes: p.wishes,
      profession: p.professionSource === "pending" ? null : p.profession,
      professionChanges: p.professionChanges,
      canChangeProfession: careerReviewAllowed(p, clock.day),
      professionReason: p.professionReason,
      previous: p.shifts.at(-1)?.job || null,
      lastPaidDay: p.lastPaidDay,
      recentWorkedDays: p.shifts.map((s) => s.day),
      hasCar: Object.keys(p.inventory).some(jobCar),
      scheduleJob: p.schedule?.day === clock.day ? p.schedule.job : "rest",
      scheduleEvening:
        p.schedule?.day === clock.day ? p.schedule.evening : "rest",
      scheduleOutings:
        p.schedule?.day === clock.day ? p.schedule.outings : undefined,
      lastHousingAIDay: p.lastHousingAIDay,
    })),
  };
}

export function careerReviewAllowed(profile, day) {
  return (
    !!profile.profession &&
    profile.professionChanges < 3 &&
    day - profile.professionSinceDay >= 3 &&
    ((profile.shifts.length >= 3 && hash(profile.id + day) % 4 === 0) ||
      profile.coins < 200)
  );
}

export function advanceCityEvening(game, now = Date.now()) {
  const clock = cityClock(game.jobCity, now);
  if (!game.jobCity || clock.minute < JOB_END) return game;
  let next = game;
  for (const original of Object.values(game.jobCity.profiles)) {
    if (
      original.schedule?.day !== clock.day ||
      original.lastEveningDay >= clock.day
    )
      continue;
    if (next === game) next = clone(game);
    const p = next.jobCity.profiles[original.id];
    p.lastEveningDay = clock.day;
    if (clock.day - p.lastWishDay >= 3 && hash(p.id + clock.day) % 3 === 0) {
      p.lastWishDay = clock.day;
      const product = catProducts(next).find(
        (x) =>
          p.wishes.includes(x.id) &&
          !p.inventory[x.id] &&
          p.coins >= x.price * 1.2,
      );
      if (product)
        next = buyCatProduct(
          next,
          p.id,
          product.id,
          "buy-" + p.id + "-" + (p.purchaseCount + 1),
          now,
        );
    }
    const live = next.jobCity.profiles[p.id];
    if (live.schedule.evening === "drive" && !live.trip &&
        !live.schedule.outings?.length && !next.housing?.residences[p.id]) {
      const car = Object.keys(live.inventory).find(jobCar);
      if (car)
        next = startCatDrive(
          next,
          p.id,
          car,
          { x: hash(p.id) % 2 ? 16 : -16, z: -38 },
          now,
          false,
        );
    }
  }
  return next;
}
export function pauseCatCareer(game, id, now = Date.now()) {
  const p = game.jobCity?.profiles[id];
  if (!p) return game;
  const next = clone(game),
    n = next.jobCity.profiles[id],
    clock = cityClock(next.jobCity, now);
  n.manualUntil = now + 30000;
  if (n.attendance?.active) {
    n.attendance.worked = worked(n.attendance, clock.absolute);
    n.attendance.credit = wages(n.attendance, clock.absolute);
    n.attendance.at = clock.absolute;
    n.attendance.active = false;
  }
  return next;
}
