import { NEIGHBORS } from "./game-data.js";
export const SOCIAL_VERSION = 3,
  SOCIAL_COOLDOWN = 120000;
export const SOCIAL_INTENTS = [
  "greet",
  "play",
  "relax",
  "cuddle",
  "best_friend",
];
const empty = () => ({
  points: 0,
  meetings: 0,
  plays: 0,
  lastProgressAt: 0,
  firstMetAt: null,
});
export function newSocial() {
  return {
    version: SOCIAL_VERSION,
    relationships: Object.fromEntries(NEIGHBORS.map((n) => [n.id, empty()])),
    bestFriendId: null,
    events: [],
  };
}
export function bestEligible(r) {
  return !!r && r.points >= 80 && r.meetings >= 16 && r.plays >= 7;
}
export function relationshipStage(r, best = false) {
  return !r?.meetings
    ? "unknown"
    : best
      ? "best"
      : r.points >= 65 && r.meetings >= 12 && r.plays >= 5
        ? "close"
        : r.points >= 35 && r.meetings >= 6 && r.plays >= 2
          ? "friend"
          : "acquaintance";
}
export const stageLabel = (stage) =>
  ({
    unknown: "Ещё не знакомы",
    acquaintance: "Знакомые",
    friend: "Друзья",
    close: "Близкие друзья",
    best: "Лучший дружок",
  })[stage];
export function normalizeSocial(raw) {
  const social = newSocial();
  if (raw?.version !== SOCIAL_VERSION) return social;
  for (const n of NEIGHBORS) {
    const r = raw.relationships?.[n.id];
    if (!r) continue;
    const num = (v, max) =>
      Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
    social.relationships[n.id] = {
      points: num(r.points, 100),
      meetings: num(r.meetings, 10000),
      plays: num(r.plays, 10000),
      lastProgressAt: num(r.lastProgressAt, 1e15),
      firstMetAt: Number.isFinite(r.firstMetAt)
        ? Math.max(0, r.firstMetAt)
        : null,
    };
  }
  if (
    NEIGHBORS.some((n) => n.id === raw.bestFriendId) &&
    bestEligible(social.relationships[raw.bestFriendId])
  )
    social.bestFriendId = raw.bestFriendId;
  social.events = (Array.isArray(raw.events) ? raw.events : [])
    .filter(
      (e) =>
        NEIGHBORS.some((n) => n.id === e?.friendId) &&
        [...SOCIAL_INTENTS, "party"].includes(e.kind) &&
        Number.isFinite(e.at),
    )
    .slice(-16)
    .map((e) => ({
      friendId: e.friendId,
      kind: e.kind,
      at: Math.max(0, e.at),
      source: e.source === "ai" ? "ai" : "manual",
      gain: Math.max(0, Math.min(6, Number(e.gain) || 0)),
    }));
  return social;
}
export function syncFriendship(game) {
  game.friendship = Object.fromEntries(
    NEIGHBORS.map((n) => [n.id, game.social.relationships[n.id].points]),
  );
  return game;
}
export function encounterKind(game, id, intent) {
  const r = game.social.relationships[id];
  if (!r?.meetings) return "greet";
  return SOCIAL_INTENTS.includes(intent) ? intent : "play";
}
export function recordSocialEncounter(
  game,
  id,
  intent = "play",
  source = "manual",
  now = Date.now(),
) {
  if (!NEIGHBORS.some((n) => n.id === id && game.unlocked.includes(n.biome)))
    throw Error("Котик пока недоступен.");
  const next = structuredClone(game),
    r = next.social.relationships[id],
    kind = intent === "party" ? "party" : encounterKind(next, id, intent);
  const canProgress = !r.meetings || now - r.lastProgressAt >= SOCIAL_COOLDOWN;
  let gain = 0;
  if (canProgress) {
    gain =
      kind === "greet" ? 2 : kind === "play" ? 5 : kind === "party" ? 1 : 3;
    r.points = Math.min(100, r.points + gain);
    r.meetings++;
    if (kind === "play") r.plays++;
    r.lastProgressAt = now;
    r.firstMetAt ??= now;
  }
  if (intent === "best_friend" && source === "ai" && bestEligible(r))
    next.social.bestFriendId = id;
  next.social.events = [
    ...next.social.events,
    {
      friendId: id,
      kind,
      at: now,
      source: source === "ai" ? "ai" : "manual",
      gain,
    },
  ].slice(-16);
  if (next.care?.residents[id])
    next.care.residents[id].happiness = Math.min(
      100,
      next.care.residents[id].happiness + (kind === "play" ? 8 : 4),
    );
  return syncFriendship(next);
}
