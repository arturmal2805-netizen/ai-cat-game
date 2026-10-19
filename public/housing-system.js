import {
  HOUSE_TYPES,
  houseType,
  housingPlot,
  HOUSING_ID,
} from "./housing-data.js";
import { familyPartner, reconcileFamilyHomes } from "./family-system.js";
const clone = (v) => structuredClone(v);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validId = (v) => typeof v === "string" && /^[\w-]{1,90}$/.test(v);
const integer = (v) => Number.isSafeInteger(v) && v >= 0;
export const newHousing = () => ({ version: 1, homes: {}, residences: {} });
export function housingSnapshotValid(raw) {
  if (raw == null) return true;
  if (
    typeof raw !== "object" ||
    raw.version !== 1 ||
    !raw.homes ||
    typeof raw.homes !== "object" ||
    Array.isArray(raw.homes) ||
    !raw.residences ||
    typeof raw.residences !== "object" ||
    Array.isArray(raw.residences)
  )
    return false;
  const normalized = normalizeHousing(raw);
  return (
    Object.keys(normalized.homes).length === Object.keys(raw.homes).length &&
    Object.keys(normalized.residences).length ===
      Object.keys(raw.residences).length
  );
}
export function reconcileHousingProfiles(game) {
  for (const home of Object.values(game.housing?.homes || {})) {
    const p = game.jobCity?.profiles[home.owner];
    if (!p) continue;
    p.purchaseCount = Math.max(p.purchaseCount, home.sequence);
    if (home.source === "ai" && Number.isSafeInteger(home.aiDay))
      p.lastHousingAIDay = Math.max(p.lastHousingAIDay ?? -1, home.aiDay);
  }
  return game;
}
export function nextHousingPlot(housing) {
  const used = new Set(Object.values(housing.homes).map((h) => h.plot));
  let index = 0;
  while (used.has(index)) index++;
  return index;
}
export function normalizeHousing(raw, profiles = {}) {
  if (!raw || raw.version !== 1) return null;
  const h = newHousing(),
    used = new Set();
  for (const [id, home] of Object.entries(raw.homes || {})) {
    if (
      !validId(id) ||
      !home ||
      typeof home !== "object" ||
      home.id !== id ||
      !validId(home.owner) ||
      !houseType(home.type) ||
      !validId(home.purchaseId) ||
      !integer(home.sequence) ||
      home.sequence < 1 ||
      !integer(home.price) ||
      !integer(home.plot) ||
      !Number.isFinite(home.at)
    )
      continue;
    const plot = used.has(home.plot) ? nextHousingPlot(h) : home.plot;
    used.add(plot);
    const roommate =
      validId(home.roommate) && home.roommate !== home.owner
        ? home.roommate
        : null;
    h.homes[id] = {
      id,
      owner: home.owner,
      type: home.type,
      purchaseId: home.purchaseId,
      sequence: home.sequence,
      price: home.price,
      at: home.at,
      plot,
      source: home.source === "ai" ? "ai" : "manual",
      aiDay: integer(home.aiDay) ? home.aiDay : null,
      roommate,
    };
  }
  for (const [cat, id] of Object.entries(raw.residences || {})) {
    const home = h.homes[id];
    if (validId(cat) && home && (home.owner === cat || home.roommate === cat))
      h.residences[cat] = id;
  }
  return h;
}
export const ownedHomes = (game, id) =>
  Object.values(game.housing?.homes || {}).filter((h) => h.owner === id);
export function availableRoommates(game, owner) {
  return Object.values(game.jobCity?.profiles || {}).filter(
    (p) => p.id !== owner && !game.housing?.residences[p.id],
  );
}
export function buyCatHome(
  game,
  owner,
  type,
  receipt,
  { roommate = null, source = "manual", day = null } = {},
  now = Date.now(),
) {
  const p = game.jobCity?.profiles[owner],
    product = houseType(type),
    sequence = Number(
      typeof receipt === "string" && receipt.match(/-(\d+)$/)?.[1],
    );
  if (!p || !product || !validId(receipt) || !integer(sequence) || sequence < 1)
    throw Error("Будинок недоступний");
  const highWater = ownedHomes(game, owner).reduce(
    (n, h) => Math.max(n, h.sequence),
    p.purchaseCount,
  );
  if (sequence <= highWater) return game;
  if (sequence !== highWater + 1)
    throw Error("Оновіть гаманець котика перед покупкою");
  if (p.coins < product.price)
    throw Error("У котика поки недостатньо власних монеток на будинок");
  const free = availableRoommates(game, owner);
  const spouse = familyPartner(game, owner);
  if (spouse) roommate = free.some((c) => c.id === spouse) ? spouse : null;
  if (roommate && !free.some((c) => c.id === roommate)) {
    if (source === "ai") roommate = null;
    else
      throw Error(
        "Цей співмешканець уже має активний дім. Виберіть вільного котика.",
      );
  }
  if (!roommate) roommate = free[0]?.id || null;
  const next = clone(game),
    n = next.jobCity.profiles[owner];
  next.housing ||= newHousing();
  const id = "house-" + owner + "-" + sequence,
    home = {
      id,
      owner,
      type,
      purchaseId: receipt,
      sequence,
      price: product.price,
      at: now,
      plot: nextHousingPlot(next.housing),
      source: source === "ai" ? "ai" : "manual",
      aiDay: integer(day) ? day : null,
      roommate,
    };
  n.coins -= product.price;
  n.spentTotal += product.price;
  n.purchaseCount = sequence;
  n.status = "joy";
  n.transactions = [
    ...n.transactions,
    {
      id: receipt,
      kind: "house",
      item: type,
      houseId: id,
      amount: -product.price,
      at: now,
    },
  ].slice(-12);
  next.housing.homes[id] = home;
  if (!next.housing.residences[owner]) next.housing.residences[owner] = id;
  if (roommate) next.housing.residences[roommate] = id;
  if (!next.unlocked.includes(HOUSING_ID)) next.unlocked.push(HOUSING_ID);
  return reconcileFamilyHomes(next);
}
// Called with the already persisted daily AI plan, including after a reload.
// The day marker also covers an unaffordable decision: it never becomes a
// surprise second purchase after another action adds coins that same day.
export function applyHousingDecisions(
  game,
  day,
  assignments,
  now = Date.now(),
) {
  let next = game;
  for (const a of assignments) {
    const profile = next.jobCity?.profiles[a.id];
    const processed = ownedHomes(next, a.id).reduce(
      (d, h) => (h.source === "ai" ? Math.max(d, h.aiDay ?? -1) : d),
      profile?.lastHousingAIDay ?? -1,
    );
    if (!profile || processed >= day) continue;
    if (next === game) next = clone(game);
    next.jobCity.profiles[a.id].lastHousingAIDay = day;
    if (!a.house) continue;
    const type = houseType(a.house.type),
      p = next.jobCity.profiles[a.id];
    if (!type || p.coins < type.price) continue;
    next = buyCatHome(
      next,
      a.id,
      type.id,
      "buy-" + a.id + "-" + (p.purchaseCount + 1),
      { roommate: a.house.roommate, source: "ai", day },
      now,
    );
  }
  return next;
}
export function setActiveHome(game, cat, homeId) {
  const home = game.housing?.homes[homeId];
  if (
    !game.jobCity?.profiles[cat] ||
    !home ||
    (home.owner !== cat && home.roommate !== cat)
  )
    throw Error("Котик не може оселитися в цьому будинку");
  const next = clone(game);
  next.housing.residences[cat] = homeId;
  return reconcileFamilyHomes(next, homeId);
}
export function setHomeRoommate(game, homeId, cat = null) {
  const home = game.housing?.homes[homeId];
  if (!home) throw Error("Будинок не знайдено");
  const spouse = familyPartner(game, home.owner);
  if (
    spouse &&
    game.housing.residences[home.owner] === homeId &&
    cat !== spouse
  )
    throw Error("У цьому будинку разом живе постійна сім'я");
  if (
    cat &&
    (cat === home.owner ||
      !game.jobCity?.profiles[cat] ||
      (game.housing.residences[cat] && game.housing.residences[cat] !== homeId))
  )
    throw Error("Виберіть вільного співмешканця");
  const next = clone(game),
    h = next.housing.homes[homeId];
  if (h.roommate && next.housing.residences[h.roommate] === homeId)
    delete next.housing.residences[h.roommate];
  h.roommate = cat;
  if (cat) next.housing.residences[cat] = homeId;
  return next;
}
export function housingAIProfile(game, cat) {
  return {
    ownedHomes: ownedHomes(game, cat).length,
    activeHome: game.housing?.residences[cat] || null,
  };
}
export const housingOffers = () =>
  HOUSE_TYPES.map(({ id, name, price }) => ({ id, name, price }));

// Union the permanent purchase ledger. A concurrent new purchase may be moved
// to the next free lot; established homes never move. Wallet conflicts are
// checked atomically by the parent shared-world transaction before this result
// can be committed. Cached clients cannot delete unknown homes or residences.
export function mergeHousing(base, current, incoming) {
  if (!incoming) return clone(current);
  if (!current) return clone(incoming);
  const result = clone(current),
    added = new Set();
  for (const [id, h] of Object.entries(incoming.homes || {})) {
    const old = base?.homes?.[id],
      actual = current.homes?.[id];
    if (!old && !actual) {
      const occupied = Object.values(result.homes).some(
        (x) => x.plot === h.plot,
      );
      result.homes[id] = {
        ...clone(h),
        plot: occupied ? nextHousingPlot(result) : h.plot,
      };
      added.add(id);
    } else if (actual) {
      const immutable = [
        "id",
        "owner",
        "type",
        "purchaseId",
        "sequence",
        "price",
        "at",
        "source",
        "aiDay",
      ];
      if (!immutable.every((k) => equal(h[k], actual[k])))
        throw Error("Покупку будинку вже збережено з іншими даними");
      if (old && old.roommate !== h.roommate) {
        if (actual.roommate !== old.roommate && actual.roommate !== h.roommate)
          throw Error("Співмешканця вже змінили на іншому пристрої");
        result.homes[id].roommate = h.roommate;
      }
    }
  }
  for (const [cat, id] of Object.entries(incoming.residences || {})) {
    const old = base?.residences?.[cat],
      actual = current.residences?.[cat];
    if (old === id || actual === id) continue;
    if (actual && actual !== old) {
      if (base?.homes?.[id])
        throw Error("Активний дім котика вже змінили на іншому пристрої");
      continue;
    }
    result.residences[cat] = id;
  }
  // Explicitly removing a roommate frees their residence; omission of the
  // entire housing field by an older client is handled above, not as removal.
  for (const [cat, id] of Object.entries(base?.residences || {}))
    if (
      !incoming.residences?.[cat] &&
      current.residences?.[cat] === id &&
      incoming.homes?.[id]?.roommate !== cat &&
      base.homes?.[id]?.roommate === cat
    )
      delete result.residences[cat];
  for (const id of added) {
    const h = result.homes[id];
    if (h.roommate && result.residences[h.roommate] !== id) h.roommate = null;
  }
  return result;
}
