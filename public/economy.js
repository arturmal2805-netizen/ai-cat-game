import { normalizeJobCity, ensureJobCity } from "./jobcity-system.js";
import {
  normalizeBuilderBoosts,
  resolveConstructionBoosts,
} from "./construction-boost.js";
import { courtObject, COURT_MENU } from "./foodcourt-data.js";
import { newSpa, normalizeSpa } from "./spa-system.js";
import { SPA_DRINKS } from "./spa-data.js";
import {
  normalizeIslandConstruction,
  startIslandConstruction,
} from "./island-construction.js";
import { islandObjects } from "./world-objects.js";
import { migrateRetiredIsland, WORLD_REVISION } from "./world-migration.js";
import { activeCats, catAvailable } from "./cat-roster.js";
import {
  newAdoption,
  normalizeAdoption,
  normalizeDestinations,
} from "./adoption.js";
import {
  newBusiness,
  normalizeBusiness,
  revenueRate,
  incomeFor,
  collectIncome,
  businessLevel,
  normalizeBusinessLevel,
} from "./business.js";
import {
  gameDay,
  newProgression,
  normalizeProgression,
  visitXP,
  purchaseXP,
  addXP,
  levelRequirement,
} from "./progression.js";
import { HOME_OBJECTS, cleanRecent } from "./interactions.js";
import {
  newCare,
  normalizeCare,
  advanceCare,
  bowlPortions,
} from "./care-system.js";
import {
  newSocial,
  normalizeSocial,
  syncFriendship,
  relationshipStage,
  bestEligible,
} from "./social-system.js";
import {
  initialScenery,
  byScenery,
  sceneryBounds,
  sceneryFootprint,
} from "./scenery-data.js";
import {
  BIOMES,
  CATALOG,
  NEIGHBORS,
  byBiome,
  byItem,
  biomeReservations,
  CROPS,
  JOBS,
} from "./game-data.js";
export const SAVE_KEY = "chichi-world-v2",
  HOUR = 3600000,
  HOURLY_COINS = 60,
  LOGIN_COINS = 70,
  ATTENTION_COINS = 10,
  ATTENTION_COOLDOWN = 600000;
const copy = (value) => structuredClone(value);
const dateKey = gameDay;
export function newGame(now = Date.now()) {
  const game = {
    version: 2,
    worldRevision: WORLD_REVISION,
    retiredIslandRefund: 0,
    relocatedPurchases: [],
    coins: 420,
    diamonds: 0,
    builderBoosts: [],
    unlocked: ["moon"],
    islandConstruction: {},
    jobCity: null,
    inventory: {},
    builtInventory: {},
    farm: {
      fields: {
        "welcome-farm": [
          { crop: "wheat", readyAt: now - 1 },
          { crop: "wheat", readyAt: now - 1 },
          { crop: null, readyAt: 0 },
        ],
      },
      stock: {},
      harvests: 0,
      jobs: {},
    },
    placements: [
      {
        id: "welcome-yarn",
        item: "yarn",
        biome: "moon",
        x: -5,
        z: 2,
        rotation: 0,
      },
      {
        id: "welcome-party",
        item: "party",
        biome: "moon",
        x: 4,
        z: 0,
        rotation: 0,
      },
      {
        id: "welcome-farm",
        item: "farm-field",
        biome: "moon",
        x: -6,
        z: -1,
        rotation: 0,
        readyAt: 0,
      },
    ],
    friendship: {},
    adoption: newAdoption(),
    spa: newSpa(),
    business: newBusiness(),
    catDestinations: {},
    catPosition: null,
    recentActivities: [],
    cat: {
      location: "home",
      hunger: 30,
      energy: 85,
      happiness: 75,
      mood: "happy",
    },
    lastHourly: now,
    lastVisit: null,
    lastAttention: 0,
    nextId: 1,
    totalEarned: 0,
  };
  game.scenery = initialScenery(game.placements);
  game.business = normalizeBusiness(game.business, game, now);
  game.care = newCare(now);
  game.social = newSocial();
  game.progression = newProgression();
  return game;
}
export function loadGame(storage, now = Date.now(), { advance = true } = {}) {
  try {
    let saved = readSavedState(storage);
    if (!saved) return newGame(now);
    if (
      saved.version !== 2 ||
      !Number.isSafeInteger(saved.coins) ||
      saved.coins < 0 ||
      saved.coins > 10000000
    )
      return newGame(now);
    saved = migrateRetiredIsland(saved, now);
    const game = newGame(now);
    game.retiredIslandRefund = saved.retiredIslandRefund || 0;
    game.relocatedPurchases = (
      Array.isArray(saved.relocatedPurchases) ? saved.relocatedPurchases : []
    )
      .slice(0, 60)
      .filter((p) => byItem(p?.item));
    game.coins = saved.coins;
    game.diamonds = Number.isSafeInteger(saved.diamonds)
      ? Math.max(0, Math.min(1000000, saved.diamonds))
      : 0;
    game.builderBoosts = normalizeBuilderBoosts(saved.builderBoosts);
    game.unlocked = BIOMES.filter(
      (x) => x.id === "moon" || saved.unlocked?.includes(x.id),
    ).map((x) => x.id);
    game.islandConstruction = normalizeIslandConstruction(
      saved.islandConstruction,
    );
    game.adoption = normalizeAdoption(saved.adoption, game);
    game.spa = normalizeSpa(saved.spa);
    if (
      game.unlocked.includes(saved.catPosition?.biome) &&
      Number.isFinite(saved.catPosition.x) &&
      Number.isFinite(saved.catPosition.z) &&
      Math.hypot(saved.catPosition.x, saved.catPosition.z) <
        (byBiome(saved.catPosition.biome).radius || 11) - 0.8
    )
      game.catPosition = {
        biome: saved.catPosition.biome,
        x: saved.catPosition.x,
        z: saved.catPosition.z,
      };
    game.inventory = Object.fromEntries(
      CATALOG.map((x) => [
        x.id,
        Math.max(0, Math.min(100, Math.floor(saved.inventory?.[x.id] || 0))),
      ]),
    );
    game.builtInventory = Object.fromEntries(
      CATALOG.map((x) => [
        x.id,
        Math.max(
          0,
          Math.min(
            game.inventory[x.id],
            Math.floor(saved.builtInventory?.[x.id] || 0),
          ),
        ),
      ]),
    );
    game.placements = [];
    // Existing purchases are restored first. New scenery finds spare land,
    // never invalidating an attraction that was valid before this update.
    game.scenery = [];
    for (const p of (Array.isArray(saved.placements)
      ? saved.placements
      : []
    ).slice(0, 60)) {
      if (
        typeof p.id === "string" &&
        /^[\w-]{1,40}$/.test(p.id) &&
        byItem(p.item) &&
        canPlace(game, p.item, p.biome, p.x, p.z, p.rotation, null, {
          ignoreTerrain: true,
        }).ok &&
        !game.placements.some((x) => x.id === p.id)
      )
        game.placements.push(p);
    }
    // A replaced biome must not swallow paid buildings in its new sea.
    // Move only conflicting autumn plots; keep IDs, timers, crops and tiers.
    for (const building of game.placements.filter(
      (p) => p.biome === "autumn",
    )) {
      if (
        canPlace(
          game,
          building.item,
          building.biome,
          building.x,
          building.z,
          building.rotation,
          building.id,
        ).ok
      )
        continue;
      const free = findSpace(
        game,
        building.item,
        "autumn",
        building.rotation,
        building.id,
      );
      if (free) Object.assign(building, free);
      else {
        game.placements = game.placements.filter((p) => p.id !== building.id);
        game.inventory[building.item] =
          (game.inventory[building.item] || 0) + 1;
        game.builtInventory[building.item] =
          (game.builtInventory[building.item] || 0) + 1;
        game.relocatedPurchases.push({
          ...building,
          businessLevel: saved.business?.levels?.[building.id] || 1,
          fieldCells: saved.farm?.fields?.[building.id],
        });
      }
    }
    // Venue kittens need restored placements before their saved home can be
    // validated. Released kittens also keep living here if the stand is stored.
    game.catDestinations = normalizeDestinations(saved.catDestinations, game);
    game.social = normalizeSocial(saved.social);
    game.business = normalizeBusiness(saved.business, game, now);
    syncFriendship(game);
    for (const key of ["hunger", "energy", "happiness"])
      if (Number.isFinite(saved.cat?.[key]))
        game.cat[key] = Math.max(0, Math.min(100, saved.cat[key]));
    if (["sleep", "crazy hungry", "happy"].includes(saved.cat?.mood))
      game.cat.mood = saved.cat.mood;
    if (
      ["home", "pond", "garden", "tree", "picnic"].includes(saved.cat?.location)
    )
      game.cat.location = saved.cat.location;
    for (const key of ["lastHourly", "lastAttention"])
      if (Number.isFinite(saved[key]) && saved[key] >= 0)
        game[key] = saved[key];
    game.lastVisit =
      typeof saved.lastVisit === "string" ? saved.lastVisit : null;
    game.nextId = Math.max(
      1,
      Math.min(10000000, Math.floor(saved.nextId) || 1),
    );
    game.totalEarned = Math.max(0, Math.floor(saved.totalEarned) || 0);
    if (saved.farm && typeof saved.farm === "object")
      game.farm = normalizeFarm(saved.farm, game, now);
    else {
      game.farm = { fields: {}, stock: {}, harvests: 0, jobs: {} };
      if (!game.placements.some((p) => byItem(p.item).category === "farm")) {
        const space = findSpace(game, "farm-field", "moon");
        if (space) {
          game.placements.push({
            id: "welcome-farm",
            item: "farm-field",
            biome: "moon",
            ...space,
            rotation: 0,
            readyAt: 0,
          });
          game.farm.fields["welcome-farm"] = [
            { crop: "wheat", readyAt: now - 1 },
            { crop: "wheat", readyAt: now - 1 },
            { crop: null, readyAt: 0 },
          ];
        } else {
          game.inventory["farm-field"] =
            (game.inventory["farm-field"] || 0) + 1;
          game.builtInventory["farm-field"] =
            (game.builtInventory["farm-field"] || 0) + 1;
        }
      }
    }

    game.jobCity = normalizeJobCity(saved.jobCity, game, now);
    game.progression = normalizeProgression(saved.progression, game);
    restoreScenery(game, saved.scenery);
    game.care = normalizeCare(saved.care, game, now);
    game.recentActivities = cleanRecent(
      saved.recentActivities,
      worldSnapshot(game),
    );
    const resolved = resolveConstructionBoosts(game);
    return advance ? advanceCare(resolved, now, { offline: true }) : resolved;
  } catch {
    return newGame(now);
  }
}
export function readSavedState(storage) {
  for (const key of [SAVE_KEY, SAVE_KEY + ":backup", SAVE_KEY + ":backup2"])
    try {
      const saved = JSON.parse(storage.getItem(key) || "null");
      if (
        saved?.version === 2 &&
        Number.isSafeInteger(saved.coins) &&
        saved.coins >= 0 &&
        saved.coins <= 10000000 &&
        Array.isArray(saved.placements) &&
        Array.isArray(saved.unlocked) &&
        saved.cat &&
        typeof saved.cat === "object"
      )
        return saved;
    } catch {}
  return null;
}
export function saveGame(storage, game) {
  let previous, rollback;
  try {
    const encoded = JSON.stringify(game),
      trusted = readSavedState(storage);
    previous = storage.getItem(SAVE_KEY);
    rollback = trusted ? JSON.stringify(trusted) : null;
    if (previous && previous !== encoded) {
      let valid = false;
      try {
        const p = JSON.parse(previous);
        valid =
          p?.version === 2 &&
          Number.isSafeInteger(p.coins) &&
          Array.isArray(p.placements);
      } catch {}
      if (valid) {
        const backup = storage.getItem(SAVE_KEY + ":backup");
        if (backup)
          try {
            JSON.parse(backup);
            storage.setItem(SAVE_KEY + ":backup2", backup);
          } catch {}
        storage.setItem(SAVE_KEY + ":backup", previous);
      }
    }
    storage.setItem(SAVE_KEY, encoded);
    if (storage.getItem(SAVE_KEY) === encoded) return true;
  } catch {}
  if (rollback)
    try {
      storage.setItem(SAVE_KEY, rollback);
    } catch {}
  return false;
}
export function claimRewards(game, now = Date.now(), visit = false) {
  const hours = Math.floor(Math.max(0, now - game.lastHourly) / HOUR),
    day = visit ? dateKey(now) : null,
    login = visit && game.lastVisit !== day && now >= game.lastHourly - HOUR,
    xpVisit =
      visit &&
      (!game.progression.lastVisitDay || day > game.progression.lastVisitDay);
  // This is polled once a second. A large world should not be cloned just to
  // discover that the next reward is still an hour away.
  if (!hours && !login && !xpVisit) return { game, rewards: [] };
  const next = copy(game);
  const rewards = [];
  if (hours > 0) {
    const value = Math.min(hours, 24) * HOURLY_COINS;
    next.coins += value;
    next.totalEarned += value;
    next.lastHourly += hours * HOUR;
    rewards.push({ type: "hourly", amount: value, hours: Math.min(hours, 24) });
  }
  if (visit && next.lastVisit !== day && now >= next.lastHourly - HOUR) {
    next.lastVisit = day;
    next.coins += LOGIN_COINS;
    next.totalEarned += LOGIN_COINS;
    rewards.push({ type: "login", amount: LOGIN_COINS });
  }
  return { game: visit ? visitXP(next, now) : next, rewards };
}
export function attentionReward(game, now = Date.now(), meaningful = true) {
  const next = copy(game);
  if (!meaningful || now - next.lastAttention < ATTENTION_COOLDOWN)
    return { game: next, amount: 0 };
  next.lastAttention = now;
  next.coins += ATTENTION_COINS;
  next.totalEarned += ATTENTION_COINS;
  return { game: next, amount: ATTENTION_COINS };
}
export function purchase(game, id, now = Date.now()) {
  const item = byItem(id);
  if (!item) throw Error("Такого предмета нет.");
  if (item.islandOnly)
    throw Error("Этот друг уже живёт на своём острове. Откройте его локацию.");
  const locked = levelRequirement(game, item.requiredLevel);
  if (locked) throw Error(locked);
  if (game.coins < item.price)
    throw Error("Нужно ещё " + (item.price - game.coins) + " котомонет.");
  if ((game.inventory[id] || 0) >= 100)
    throw Error("В сумке уже достаточно этих предметов.");
  const next = copy(game);
  next.coins -= item.price;
  next.inventory[id] = (next.inventory[id] || 0) + 1;
  return purchaseXP(next, id, item.price, now);
}
export function unlockBiome(game, id, now = Date.now()) {
  const biome = byBiome(id);
  if (!biome || game.unlocked.includes(id))
    throw Error("Этот биом уже открыт.");
  if (game.coins < biome.price)
    throw Error("Нужно ещё " + (biome.price - game.coins) + " котомонет.");
  const requirement = biomeRequirement(game, biome.id);
  if (requirement) throw Error(requirement);
  const next = copy(game);
  next.coins -= biome.price;
  next.unlocked.push(id);
  if (["water", "foodcourt", "bikini", "jobcity"].includes(id))
    next.business = normalizeBusiness(next.business, next, now);
  return addXP(
    ensureJobCity(startIslandConstruction(next, id, now), now),
    80,
    now,
  );
}
export function footprint(item, rotation = 0) {
  const [w, d] = (byItem(item) || byScenery(item))?.footprint || [2, 2];
  return rotation % 2 ? [d, w] : [w, d];
}
export function canPlace(
  game,
  item,
  biome,
  x,
  z,
  rotation = 0,
  ignoreId = null,
  { allowLocked = false, ignoreTerrain = false } = {},
) {
  if (
    !(byItem(item) || byScenery(item)) ||
    !byBiome(biome) ||
    (!allowLocked && !game.unlocked.includes(biome))
  )
    return { ok: false, reason: "Сначала откройте этот биом." };
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    !Number.isInteger(rotation) ||
    rotation < 0 ||
    rotation > 3
  )
    return { ok: false, reason: "Некорректная позиция." };
  const record = game.scenery?.find((p) => p.id === ignoreId);
  const [w, d] = record
    ? sceneryFootprint(record, rotation)
    : footprint(item, rotation);
  if (
    Math.hypot(Math.abs(x) + w / 2, Math.abs(z) + d / 2) >
    (byBiome(biome).radius ? byBiome(biome).radius - 0.7 : 10.8)
  )
    return {
      ok: false,
      reason: "Предмет должен целиком поместиться на острове.",
    };
  const rectangles = game.placements
    .filter((p) => p.biome === biome && p.id !== ignoreId)
    .map((p) => {
      const [w, d] = footprint(p.item, p.rotation);
      return { ...p, w, d };
    });
  if (!ignoreTerrain) rectangles.push(...biomeReservations(biome));
  rectangles.push(
    ...(game.scenery || [])
      .filter((p) => !p.stored && p.biome === biome && p.id !== ignoreId)
      .map(sceneryBounds),
  );
  if (
    rectangles.some((p) =>
      p.rx && p.rz
        ? (Math.max(0, Math.abs(x - p.x) - w / 2) / p.rx) ** 2 +
            (Math.max(0, Math.abs(z - p.z) - d / 2) / p.rz) ** 2 <
          1
        : Math.abs(x - p.x) < (w + p.w) / 2 + 0.2 &&
          Math.abs(z - p.z) < (d + p.d) / 2 + 0.2,
    )
  )
    return { ok: false, reason: "Это место занято. Выберите другое." };
  return { ok: true, reason: "Красивое место. Можно разместить!" };
}
export function findSpace(
  game,
  item,
  biome,
  rotation = 0,
  ignoreId = null,
  options = {},
) {
  for (
    let radius = 0;
    radius <=
    (["autumn", "homestead"].includes(biome)
      ? Math.floor(byBiome(biome).radius - 1)
      : byBiome(biome)?.radius
        ? 17
        : 10);
    radius++
  )
    for (let x = -radius; x <= radius; x++)
      for (let z = -radius; z <= radius; z++) {
        if (Math.max(Math.abs(x), Math.abs(z)) !== radius) continue;
        if (canPlace(game, item, biome, x, z, rotation, ignoreId, options).ok)
          return { x: x || 0, z: z || 0 };
      }
  return null;
}
export function placeItem(
  game,
  item,
  biome,
  x,
  z,
  rotation = 0,
  now = Date.now(),
) {
  if (!(game.inventory[item] > 0)) throw Error("Сначала купите предмет.");
  if (game.placements.length >= 60)
    throw Error("В мире уже 60 предметов. Уберите один в сумку.");
  const check = canPlace(game, item, biome, x, z, rotation);
  if (!check.ok) throw Error(check.reason);
  const next = copy(game);
  next.inventory[item]--;
  const relocatedIndex = next.relocatedPurchases.findIndex(
      (p) => p.item === item,
    ),
    relocated =
      relocatedIndex >= 0
        ? next.relocatedPurchases.splice(relocatedIndex, 1)[0]
        : null;
  next.nextId++;
  next.placements.push({
    id: "p-" + crypto.randomUUID(),
    item,
    biome,
    x,
    z,
    rotation,
    startedAt: relocated?.startedAt || now,
    ...(relocated?.boostBaseReadyAt
      ? { boostBaseReadyAt: relocated.boostBaseReadyAt }
      : {}),
    readyAt: relocated
      ? relocated.readyAt || 0
      : (next.builtInventory?.[item] || 0) > 0
        ? 0
        : now + byItem(item).buildMinutes * 60000,
  });
  if (revenueRate(item)) {
    const placed = next.placements.at(-1);
    const level = normalizeBusinessLevel(relocated?.businessLevel);
    if (level > 1) next.business.levels[placed.id] = level;
    next.business.accounts[placed.id] = {
      collectedAt: Math.max(now, placed.readyAt || 0),
    };
  }
  if ((next.builtInventory?.[item] || 0) > 0) next.builtInventory[item]--;
  if (byItem(item).category === "farm")
    next.farm.fields[next.placements.at(-1).id] =
      relocated?.fieldCells ||
      Array.from({ length: 3 }, () => ({ crop: null, readyAt: 0 }));
  return resolveConstructionBoosts(next);
}
export function moveItem(game, id, biome, x, z, rotation = 0) {
  const old = game.placements.find((p) => p.id === id);
  if (!old) throw Error("Предмет не найден.");
  const check = canPlace(game, old.item, biome, x, z, rotation, id);
  if (!check.ok) throw Error(check.reason);
  const next = copy(game);
  Object.assign(
    next.placements.find((p) => p.id === id),
    { biome, x, z, rotation },
  );
  return next;
}
function restoreScenery(game, raw) {
  const saved = new Map(
    (Array.isArray(raw) ? raw : [])
      .slice(0, 400)
      .filter((r) => r && typeof r.id === "string")
      .map((r) => [r.id, r]),
  );
  game.scenery = [];
  const retired = [...saved.values()]
    .filter((r) => r.id.startsWith("decor-wizard-") && byScenery(r.type))
    .map((r) => ({
      id: r.id,
      type: r.type,
      originBiome: "moon",
      biome: game.unlocked.includes(r.biome) ? r.biome : "moon",
      x: Number.isFinite(r.x) ? r.x : 0,
      z: Number.isFinite(r.z) ? r.z : 0,
      rotation:
        Number.isInteger(r.rotation) && r.rotation >= 0 && r.rotation <= 3
          ? r.rotation
          : 0,
      scale: Number.isFinite(r.scale)
        ? Math.max(0.35, Math.min(1.6, r.scale))
        : 1,
      stored: true,
    }));
  for (const seed of [...retired, ...initialScenery(game.placements)]) {
    const old = saved.get(seed.id);
    const record = { ...seed, stored: true };
    game.scenery.push(record);
    if (old?.stored === true) {
      if (
        (game.unlocked.includes(old.biome) || old.biome === seed.biome) &&
        Number.isFinite(old.x) &&
        Number.isFinite(old.z) &&
        Math.abs(old.x) <= (byBiome(old.biome)?.radius || 11.6) &&
        Math.abs(old.z) <= (byBiome(old.biome)?.radius || 11.6) &&
        Number.isInteger(old.rotation) &&
        old.rotation >= 0 &&
        old.rotation <= 3
      )
        Object.assign(record, {
          biome: old.biome,
          x: old.x,
          z: old.z,
          rotation: old.rotation,
        });
      continue;
    }
    const candidate =
      old && (game.unlocked.includes(old.biome) || old.biome === seed.biome)
        ? old
        : seed;
    let position = canPlace(
      game,
      seed.type,
      candidate.biome,
      candidate.x,
      candidate.z,
      candidate.rotation,
      seed.id,
      {
        allowLocked: true,
        ignoreTerrain: !!old && ["summer", "water"].includes(candidate.biome),
      },
    ).ok
      ? candidate
      : null;
    if (
      !position &&
      canPlace(
        game,
        seed.type,
        seed.biome,
        seed.x,
        seed.z,
        seed.rotation,
        seed.id,
        { allowLocked: true },
      ).ok
    )
      position = seed;
    if (!position) {
      const free = findSpace(game, seed.type, seed.biome, 0, seed.id, {
        allowLocked: true,
      });
      if (free) position = { ...free, biome: seed.biome, rotation: 0 };
    }
    if (position)
      Object.assign(record, {
        biome: position.biome,
        x: position.x,
        z: position.z,
        rotation: position.rotation,
        stored: false,
      });
  }
}
export function moveScenery(game, id, biome, x, z, rotation = 0) {
  const old = game.scenery?.find((r) => r.id === id);
  if (!old || !game.unlocked.includes(old.biome))
    throw Error("Сначала откройте остров этой декорации.");
  const check = canPlace(game, old.type, biome, x, z, rotation, id);
  if (!check.ok) throw Error(check.reason);
  const next = copy(game);
  Object.assign(
    next.scenery.find((r) => r.id === id),
    { biome, x, z, rotation, stored: false },
  );
  return next;
}
export function storeScenery(game, id) {
  const old = game.scenery?.find((r) => r.id === id);
  if (!old || old.stored || !game.unlocked.includes(old.biome))
    throw Error("Декорация недоступна.");
  const next = copy(game);
  next.scenery.find((r) => r.id === id).stored = true;
  return next;
}
export function storeItem(game, id, now = Date.now()) {
  const found = game.placements.find((p) => p.id === id);
  if (!found) throw Error("Предмет не найден.");
  if (!isBuilt(found, now))
    throw Error(
      "Стройка ещё идёт. Дождитесь завершения, чтобы убрать предмет.",
    );
  if (game.farm.fields[id]?.some((p) => p.crop))
    throw Error("Сначала соберите урожай с этих грядок.");
  const next =
    incomeFor(game, id, now) > 0
      ? collectIncome(game, id, now).game
      : copy(game);
  delete next.business.accounts[id];
  const level = businessLevel(next, id);
  if (level > 1)
    next.relocatedPurchases.push({
      item: found.item,
      readyAt: 0,
      businessLevel: level,
    });
  delete next.business.levels[id];
  next.placements = next.placements.filter((p) => p.id !== id);
  next.builtInventory[found.item] = (next.builtInventory[found.item] || 0) + 1;
  delete next.farm.fields[id];
  next.inventory[found.item] = (next.inventory[found.item] || 0) + 1;
  return next;
}
export function befriend(game, id, amount = 15) {
  if (!NEIGHBORS.some((n) => n.id === id && catAvailable(game, n))) return game;
  const next = copy(game);
  next.friendship[id] = Math.min(100, (next.friendship[id] || 0) + amount);
  const r = next.social.relationships[id];
  r.points = next.friendship[id];
  r.meetings++;
  r.firstMetAt ??= Date.now();
  return next;
}
export function worldSnapshot(game, now = Date.now()) {
  return {
    activities: [
      ...HOME_OBJECTS.map((o) => ({
        ...o,
        ...(o.id === "chichi-food" ? { foodPortions: bowlPortions(game) } : {}),
      })),
      ...islandObjects(game, { now })
        .map(({ id, type, biome, name }) => ({ id, type, biome, name }))
        .map((o) =>
          courtObject(o.id) && COURT_MENU[courtObject(o.id).kind]
            ? {
                ...o,
                foodPortions:
                  game.coins >= COURT_MENU[courtObject(o.id).kind].price
                    ? 1
                    : 0,
              }
            : o.id === "spa-bar"
              ? {
                  ...o,
                  foodPortions:
                    game.coins >=
                    (
                      SPA_DRINKS.find(
                        (d) => d.id === game.spa?.selectedDrink,
                      ) || SPA_DRINKS[0]
                    ).price
                      ? 1
                      : 0,
                }
              : o,
        ),
      ...game.placements
        .filter((p) => isBuilt(p, now))
        .map((p) => ({
          id: p.id,
          type: p.item,
          biome: p.biome,
          ...(byItem(p.item).actions.includes("eat")
            ? { foodPortions: bowlPortions(game) }
            : {}),
          ...(byItem(p.item).category === "farm"
            ? {
                harvestReady: (game.farm.fields[p.id] || []).filter(
                  (c) => c.crop && Date.now() >= c.readyAt,
                ).length,
                emptyPlots: (game.farm.fields[p.id] || []).filter(
                  (c) => !c.crop,
                ).length,
                seedAffordable: CROPS.some(
                  (c) =>
                    game.unlocked.includes(c.biome) && c.seed <= game.coins,
                ),
              }
            : {}),
        })),
    ],
    recent: [...(game.recentActivities || [])],
    friends: activeCats(game).map((n) => {
      const r = game.social.relationships[n.id];
      return {
        id: n.id,
        biome: n.biome,
        closeness: r.points,
        meetings: r.meetings,
        plays: r.plays,
        stage: relationshipStage(r, n.id === game.social.bestFriendId),
        bestEligible: bestEligible(r),
        hunger: game.care.residents[n.id].hunger,
        happiness: game.care.residents[n.id].happiness,
      };
    }),
    biomes: [...game.unlocked],
  };
}
export const isBuilt = (p, now = Date.now()) => !p.readyAt || now >= p.readyAt;
export function biomeRequirement(game, id) {
  const biome = byBiome(id),
    quest = biome?.quest;
  const locked = levelRequirement(game, biome?.requiredLevel);
  if (locked) return locked;
  if (quest?.visits > game.progression.visits)
    return `Посетите мир в ${quest.visits} разных дней (${game.progression.visits}/${quest.visits})`;
  if (quest?.harvests > (game.farm?.harvests || 0))
    return (
      "Сначала соберите " +
      quest.harvests +
      " урожаев (" +
      (game.farm?.harvests || 0) +
      "/" +
      quest.harvests +
      ")."
    );
  const friends = Object.entries(game.social.relationships).filter(([id, r]) =>
    ["friend", "close", "best"].includes(
      relationshipStage(r, id === game.social.bestFriendId),
    ),
  ).length;
  if (quest?.friends > friends)
    return (
      "Сначала подружитесь с " +
      quest.friends +
      " котами (" +
      friends +
      "/" +
      quest.friends +
      ")."
    );
  return "";
}
export function normalizeFarm(raw, game, now) {
  const fields = {};
  for (const p of game.placements.filter(
    (p) => byItem(p.item).category === "farm",
  )) {
    fields[p.id] = Array.from({ length: 3 }, (_, i) => {
      const cell = raw.fields?.[p.id]?.[i];
      return cell &&
        CROPS.some((c) => c.id === cell.crop) &&
        Number.isFinite(cell.readyAt) &&
        cell.readyAt >= 0
        ? { crop: cell.crop, readyAt: cell.readyAt }
        : { crop: null, readyAt: 0 };
    });
  }
  const stock = {};
  for (const id of [...CROPS.map((c) => c.id), ...JOBS.map((j) => j.resource)])
    stock[id] = Math.max(0, Math.min(100000, Math.floor(raw.stock?.[id] || 0)));
  const jobs = {};
  for (const job of JOBS)
    jobs[job.id] = Number.isFinite(raw.jobs?.[job.id])
      ? Math.max(0, raw.jobs[job.id])
      : 0;
  return {
    fields,
    stock,
    jobs,
    harvests: Math.max(0, Math.floor(raw.harvests) || 0),
    sales: (Array.isArray(raw.sales) ? raw.sales : [])
      .filter(
        (s) =>
          Number.isSafeInteger(s?.value) &&
          s.value > 0 &&
          Number.isFinite(s.at),
      )
      .slice(-8),
  };
}
export function plantCrop(game, field, index, cropId, now = Date.now()) {
  const placement = game.placements.find((p) => p.id === field),
    crop = CROPS.find((c) => c.id === cropId);
  if (
    !placement ||
    byItem(placement.item).category !== "farm" ||
    !isBuilt(placement, now)
  )
    throw Error("Грядки пока строятся.");
  if (!crop || !game.unlocked.includes(crop.biome))
    throw Error("Эта культура откроется в новом биоме.");
  if (!Number.isInteger(index) || index < 0 || index > 2)
    throw Error("Неизвестная грядка.");
  if (game.farm.fields[field]?.[index]?.crop)
    throw Error("Здесь уже растёт урожай.");
  if (game.coins < crop.seed) throw Error("Не хватает монет на семена.");
  const next = copy(game);
  next.coins -= crop.seed;
  next.farm.fields[field] ??= Array.from({ length: 3 }, () => ({
    crop: null,
    readyAt: 0,
  }));
  next.farm.fields[field][index] = {
    crop: cropId,
    readyAt: now + crop.minutes * 60000,
  };
  return next;
}
export function harvestField(game, field, now = Date.now()) {
  const placement = game.placements.find((p) => p.id === field);
  if (!placement || !isBuilt(placement, now))
    throw Error("Ферма пока недоступна.");
  const next = copy(game);
  let count = 0;
  for (const cell of next.farm.fields[field] || []) {
    if (cell.crop && now >= cell.readyAt) {
      next.farm.stock[cell.crop] = (next.farm.stock[cell.crop] || 0) + 1;
      cell.crop = null;
      cell.readyAt = 0;
      count++;
    }
  }
  if (!count) throw Error("Урожай ещё не созрел.");
  next.farm.harvests += count;
  return { game: addXP(next, count * 18, now), count };
}
export function stockValue(game) {
  return Object.entries(game.farm.stock).reduce(
    (sum, [id, count]) =>
      sum +
      count *
        (CROPS.find((c) => c.id === id)?.value ||
          JOBS.find((j) => j.resource === id)?.value ||
          0),
    0,
  );
}
export function sellHarvest(game) {
  const value = stockValue(game);
  if (!value) throw Error("Склад урожая пока пустой.");
  const next = copy(game);
  next.coins += value;
  next.totalEarned += value;
  next.farm.sales = [
    ...(next.farm.sales || []),
    { value, at: Date.now(), balance: next.coins },
  ].slice(-8);
  next.farm.stock = {};
  return { game: next, value };
}
export function gatherResource(game, jobId, now = Date.now()) {
  const job = JOBS.find((j) => j.id === jobId);
  if (!job || !job.biomes.some((id) => game.unlocked.includes(id)))
    throw Error("Это занятие откроется в новом биоме.");
  if (now < (game.farm.jobs[jobId] || 0))
    throw Error("Ресурсы ещё восстанавливаются.");
  const next = copy(game);
  next.farm.jobs[jobId] = now + job.minutes * 60000;
  next.farm.stock[job.resource] = (next.farm.stock[job.resource] || 0) + 1;
  return addXP(next, 12, now);
}
