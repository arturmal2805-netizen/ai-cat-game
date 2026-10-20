import { cityClock, jobAIState, applyJobPlan } from "./jobcity-system.js";
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
  return next;
}
