import { cityClock, jobAIState, applyJobPlan } from "./jobcity-system.js";
import { familyReview, familyPartners, applyFamilyDecisions } from "./family-system.js";
import { JOB_END, JOB_START } from "./jobcity-data.js";

// Event markers are saved BEFORE networking. A reload/second device cannot
// turn the one-second city clock into repeated inference requests.
export function nextCityAIEvent(game, now = Date.now()) {
  const state = game.jobCity;
  if (!state) return null;
  const clock = cityClock(state, now);
  if (clock.minute < JOB_START) return null;
  const initialIds = Object.values(state.profiles)
    .filter(
      (p) => p.careerAIPending && (p.careerAIRequestedDay ?? -1) < clock.day,
    )
    .map((p) => p.id);
  const phase = initialIds.length
    ? "careers"
    : clock.minute >= JOB_END && (state.eveningAIRequestedDay ?? -1) < clock.day
      ? "evening"
      : null;
  if (!phase) return null;
  const request = jobAIState(game, now);
  for (const p of request.cats) {
    if (initialIds.includes(p.id)) p.profession = null;
    p.canChangeProfession = false;
  }
  return {
    ...request,
    phase,
    epoch: state.epoch,
    minute: clock.minute,
    initialIds,
  };
}
export function reserveCityAIEvent(game, event) {
  const next = structuredClone(game),
    state = next.jobCity;
  state.requestedDay = Math.max(state.requestedDay, event.day);
  if (event.phase === "careers")
    for (const id of event.initialIds) {
      const p = state.profiles[id];
      if (!p?.careerAIPending) continue;
      p.careerAIRequestedDay = event.day;
      p.professionSource = "pending";
      p.professionSinceDay = event.day;
      p.career = [];
    }
  else state.eveningAIRequestedDay = event.day;
  return next;
}
export function applyCityAIEvent(game, event, result) {
  if (result.day !== event.day || result.phase !== event.phase)
    throw Error("Stale AI event");
  let next = applyJobPlan(
    game,
    result.assignments,
    event.day,
    "ai",
    result.families || [],
    { phase: event.phase },
  );
  if (event.phase === "careers")
    for (const id of event.initialIds) {
      if (next.jobCity.profiles[id])
        next.jobCity.profiles[id].careerAIPending = false;
    }
  if (event.phase === "evening") next.jobCity.eveningAIAppliedDay = event.day;
  return next;
}

// Recover only an AI decision already held by this world's durable ledger.
// Reading this receipt never starts inference or replays an offline work day.
export function recoverCityAIFamilies(game, snapshot, now = Date.now()) {
  if (!game.jobCity) return game;
  const day = cityClock(game.jobCity, now).day;
  if (!familyReview(game, day).due) return game;
  const partners = familyPartners(game);
  const events = [...(snapshot?.events || [])].filter(e =>
    e.epoch === game.jobCity.epoch && e.phase === "evening" && e.day <= day &&
    e.status === 200 && e.body?.phase === "evening" && e.body.day === e.day &&
    Array.isArray(e.body.families) && e.body.families.length
  ).sort((a,b) => b.day-a.day);
  for (const event of events) {
    if (event.body.families.some(p => partners.has(p.male) || partners.has(p.female))) continue;
    // Current-day schedules, professions, payments, purchases and wallets must
    // not be replaced by an older receipt. Families become visible together now.
    return applyFamilyDecisions(game, day, event.body.families, now);
  }
  return game;
}
export function cityAIFamilyMessage(game, status, now = Date.now()) {
  if (!game.jobCity || !familyReview(game, cityClock(game.jobCity, now).day).due) return "";
  if (status?.state === "pending") return "AI обирає пару. Відповідь збережеться на сервері й відновиться після повернення.";
  if (status?.state === "clock") return "Годинник спільного світу змінився. Наступний вечірній план узгодить його автоматично.";
  if (status?.state === "failed") return "Останній запит AI не завершився. Сім’ї не скинуто; новий вибір буде в наступному вечірньому плані.";
  const clock = cityClock(game.jobCity, now);
  return clock.minute < JOB_END
    ? "Знайомство вже доступне. AI обере пари після роботи, з 19:00 ігрового часу."
    : "Знайомство вже доступне й очікує найближчого вечірнього плану AI.";
}


// The current evening can still use the original complete AI plan. Mark its
// application durably, retaining completed visits and house purchase receipts.
// Older days recover families only; never replay offline wages or purchases.
export function recoverCityAIReceipt(game, snapshot, now = Date.now()) {
  const state = game.jobCity;
  if (!state) return game;
  const clock = cityClock(state, now);
  if (clock.minute >= JOB_END && (state.eveningAIAppliedDay ?? -1) < clock.day) {
    const event = (snapshot?.events || []).find(e => e.epoch === state.epoch &&
      e.phase === "evening" && e.day === clock.day && e.status === 200 &&
      e.body?.day === e.day && e.body.phase === e.phase && Array.isArray(e.body.assignments));
    if (event) return applyCityAIEvent(game,event,event.body);
  }
  return recoverCityAIFamilies(game,snapshot,now);
}
