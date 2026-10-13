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
const dateKey = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
export function newGame(now = Date.now()) {
  return {
    version: 2,
    coins: 420,
    unlocked: ["moon"],
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
}
export function loadGame(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return newGame(now);
    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      const backup = storage.getItem(SAVE_KEY + ":backup");
      if (!backup) return newGame(now);
      saved = JSON.parse(backup);
    }
    if (
      saved.version !== 2 ||
      !Number.isSafeInteger(saved.coins) ||
      saved.coins < 0 ||
      saved.coins > 10000000
    )
      return newGame(now);
    const game = newGame(now);
    game.coins = saved.coins;
    game.unlocked = BIOMES.filter(
      (x) => x.id === "moon" || saved.unlocked?.includes(x.id),
    ).map((x) => x.id);
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
    for (const p of (Array.isArray(saved.placements)
      ? saved.placements
      : []
    ).slice(0, 60)) {
      if (
        typeof p.id === "string" &&
        /^[\w-]{1,40}$/.test(p.id) &&
        byItem(p.item) &&
        canPlace(game, p.item, p.biome, p.x, p.z, p.rotation).ok &&
        !game.placements.some((x) => x.id === p.id)
      )
        game.placements.push(p);
    }
    game.friendship = Object.fromEntries(
      NEIGHBORS.map((n) => [
        n.id,
        Math.max(0, Math.min(100, Math.floor(saved.friendship?.[n.id] || 0))),
      ]),
    );
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

    return game;
  } catch {
    return newGame(now);
  }
}
export function saveGame(storage, game) {
  try {
    const encoded = JSON.stringify(game),
      previous = storage.getItem(SAVE_KEY);
    if (previous && previous !== encoded)
      storage.setItem(SAVE_KEY + ":backup", previous);
    storage.setItem(SAVE_KEY, encoded);
    return storage.getItem(SAVE_KEY) === encoded;
  } catch {
    return false;
  }
}
export function claimRewards(game, now = Date.now(), visit = false) {
  const next = copy(game);
  const rewards = [];
  const hours = Math.floor(Math.max(0, now - next.lastHourly) / HOUR);
  if (hours > 0) {
    const value = Math.min(hours, 24) * HOURLY_COINS;
    next.coins += value;
    next.totalEarned += value;
    next.lastHourly += hours * HOUR;
    rewards.push({ type: "hourly", amount: value, hours: Math.min(hours, 24) });
  }
  if (
    visit &&
    next.lastVisit !== dateKey(now) &&
    now >= next.lastHourly - HOUR
  ) {
    next.lastVisit = dateKey(now);
    next.coins += LOGIN_COINS;
    next.totalEarned += LOGIN_COINS;
    rewards.push({ type: "login", amount: LOGIN_COINS });
  }
  return { game: next, rewards };
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
export function purchase(game, id) {
  const item = byItem(id);
  if (!item) throw Error("Такого предмета нет.");
  if (game.coins < item.price)
    throw Error("Нужно ещё " + (item.price - game.coins) + " котомонет.");
  if ((game.inventory[id] || 0) >= 100)
    throw Error("В сумке уже достаточно этих предметов.");
  const next = copy(game);
  next.coins -= item.price;
  next.inventory[id] = (next.inventory[id] || 0) + 1;
  return next;
}
export function unlockBiome(game, id) {
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
  return next;
}
export function footprint(item, rotation = 0) {
  const [w, d] = byItem(item)?.footprint || [2, 2];
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
) {
  if (!byItem(item) || !game.unlocked.includes(biome))
    return { ok: false, reason: "Сначала откройте этот биом." };
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    !Number.isInteger(rotation) ||
    rotation < 0 ||
    rotation > 3
  )
    return { ok: false, reason: "Некорректная позиция." };
  const [w, d] = footprint(item, rotation);
  if (Math.hypot(Math.abs(x) + w / 2, Math.abs(z) + d / 2) > 10.8)
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
  rectangles.push(...biomeReservations(biome));
  if (
    rectangles.some(
      (p) =>
        Math.abs(x - p.x) < (w + p.w) / 2 + 0.2 &&
        Math.abs(z - p.z) < (d + p.d) / 2 + 0.2,
    )
  )
    return { ok: false, reason: "Это место занято. Выберите другое." };
  return { ok: true, reason: "Красивое место. Можно разместить!" };
}
export function findSpace(game, item, biome, rotation = 0, ignoreId = null) {
  for (let radius = 0; radius <= 10; radius++)
    for (let x = -radius; x <= radius; x++)
      for (let z = -radius; z <= radius; z++) {
        if (Math.max(Math.abs(x), Math.abs(z)) !== radius) continue;
        if (canPlace(game, item, biome, x, z, rotation, ignoreId).ok)
          return { x, z };
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
  next.placements.push({
    id: "p-" + next.nextId++,
    item,
    biome,
    x,
    z,
    rotation,
    startedAt: now,
    readyAt:
      (next.builtInventory?.[item] || 0) > 0
        ? 0
        : now + byItem(item).buildMinutes * 60000,
  });
  if ((next.builtInventory?.[item] || 0) > 0) next.builtInventory[item]--;
  if (byItem(item).category === "farm")
    next.farm.fields[next.placements.at(-1).id] = Array.from(
      { length: 3 },
      () => ({ crop: null, readyAt: 0 }),
    );
  return next;
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
export function storeItem(game, id, now = Date.now()) {
  const found = game.placements.find((p) => p.id === id);
  if (!found) throw Error("Предмет не найден.");
  if (!isBuilt(found, now))
    throw Error(
      "Стройка ещё идёт. Дождитесь завершения, чтобы убрать предмет.",
    );
  if (game.farm.fields[id]?.some((p) => p.crop))
    throw Error("Сначала соберите урожай с этих грядок.");
  const next = copy(game);
  next.placements = next.placements.filter((p) => p.id !== id);
  next.builtInventory[found.item] = (next.builtInventory[found.item] || 0) + 1;
  delete next.farm.fields[id];
  next.inventory[found.item] = (next.inventory[found.item] || 0) + 1;
  return next;
}
export function befriend(game, id, amount = 15) {
  if (!NEIGHBORS.some((n) => n.id === id && game.unlocked.includes(n.biome)))
    return game;
  const next = copy(game);
  next.friendship[id] = Math.min(100, (next.friendship[id] || 0) + amount);
  return next;
}
export function worldSnapshot(game) {
  return {
    activities: game.placements
      .filter((p) => isBuilt(p))
      .map((p) => ({
        id: p.id,
        type: p.item,
        biome: p.biome,
        ...(byItem(p.item).category === "farm"
          ? {
              harvestReady: (game.farm.fields[p.id] || []).filter(
                (c) => c.crop && Date.now() >= c.readyAt,
              ).length,
              emptyPlots: (game.farm.fields[p.id] || []).filter((c) => !c.crop)
                .length,
            }
          : {}),
      })),
    friends: NEIGHBORS.filter((n) => game.unlocked.includes(n.biome)).map(
      (n) => ({ id: n.id, closeness: game.friendship[n.id] || 0 }),
    ),
    biomes: [...game.unlocked],
  };
}
export const isBuilt = (p, now = Date.now()) => !p.readyAt || now >= p.readyAt;
export function biomeRequirement(game, id) {
  const quest = byBiome(id)?.quest;
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
  const friends = Object.values(game.friendship).filter((v) => v >= 30).length;
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
  return { game: next, count };
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
  return next;
}
