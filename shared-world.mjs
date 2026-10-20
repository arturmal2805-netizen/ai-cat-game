import { mergeHousing } from "./public/housing-system.js";
import {
  mergeFamily,
  reconcileFamilyHomes,
  checkFamilyPace,
} from "./public/family-system.js";
import {
  normalizeBuilderBoosts,
  resolveConstructionBoosts,
} from "./public/construction-boost.js";
import { mergeIslandConstruction } from "./public/island-construction.js";
import {
  canPlace,
  HOUR,
  HOURLY_COINS,
  LOGIN_COINS,
  ATTENTION_COINS,
  ATTENTION_COOLDOWN,
  footprint,
} from "./public/economy.js";
import { BUILDING_EXPANSIONS } from "./public/building-expansions.js";
import { BIOMES, byItem } from "./public/game-data.js";
import { BOWL_CAPACITY, advanceCare } from "./public/care-system.js";
import {
  levelForXP,
  xpForLevel,
  MAX_LEVEL,
  DAILY_XP_LIMIT,
} from "./public/progression.js";

export class SharedConflict extends Error {
  constructor(
    message = "Это действие уже изменено на другом телефоне. Мир обновлён; повторите действие.",
  ) {
    super(message);
    this.code = "SHARED_CONFLICT";
  }
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const changed = (a, b) => !equal(a, b);
const clone = (value) =>
  value === undefined ? undefined : structuredClone(value);
const levelCoins = (before, after) => {
  let total = 0;
  for (let level = levelForXP(before) + 1; level <= levelForXP(after); level++)
    total += 30 + level * 15;
  return total;
};
const additive = (path) =>
  /^(coins|diamonds|totalEarned|inventory\.[\w-]+|builtInventory\.[\w-]+|farm\.stock\.[\w-]+|farm\.harvests|business\.(?:totalCollected|totalDiamonds)|care\.mealId)$/.test(
    path,
  );
const transient = (path) =>
  /^(cat\.|catPosition(?:\.|$)|catDestinations\.|care\.(?:lastTick$|resting(?:\.|$)|residents\.[\w-]+\.(?:hunger|happiness|lastMealAt|lastSwimAt)$)|friendship\.)/.test(
    path,
  );
const guarded = (path) =>
  /^(lastVisit|lastHourly|lastAttention|farm\.fields\.[\w-]+\.\d+|business\.(?:accounts|levels)\.[\w-]+|social\.relationships\.[\w-]+)$/.test(
    path,
  );

function merge(base, current, incoming, path = "", depth = 0) {
  if (depth > 40) throw new SharedConflict("Сохранение слишком сложное.");
  if (path === "family") {
    try {
      return mergeFamily(base, current, incoming);
    } catch (error) {
      throw new SharedConflict(error.message);
    }
  }
  if (path === "housing") {
    try {
      return mergeHousing(base, current, incoming);
    } catch (e) {
      throw new SharedConflict(e.message);
    }
  }
  if (path === "jobCity") {
    if (!incoming) return clone(current);
    if (!current) return clone(incoming);
    if (!base) {
      const result = clone(current);
      for (const [id, p] of Object.entries(incoming.profiles || {}))
        if (!result.profiles[id]) result.profiles[id] = clone(p);
      return result;
    }
    const result = clone(current);
    for (const [id, p] of Object.entries(incoming.profiles || {})) {
      const old = base.profiles?.[id],
        actual = current.profiles?.[id];
      if (equal(old, p) || equal(actual, p)) continue;
      if (!old || !actual) {
        result.profiles[id] = clone(p);
        continue;
      }
      // Private payments/purchases are atomic, but arriving at a desk on the
      // simulator must not reject a purchase made by the other phone.
      const groups = [
        [
          "coins",
          "earnedTotal",
          "spentTotal",
          "purchaseCount",
          "inventory",
          "transactions",
          "lastPaidDay",
          "shifts",
        ],
        [
          "profession",
          "professionChanges",
          "professionSinceDay",
          "professionReason",
          "professionSource",
          "career",
        ],
        ["trip", "parkedAt", "parkedCar"],
      ];
      for (const keys of groups) {
        const incomingChanged = keys.some((k) => changed(old[k], p[k])),
          currentChanged = keys.some((k) => changed(old[k], actual[k]));
        if (
          incomingChanged &&
          currentChanged &&
          !keys.every((k) => equal(p[k], actual[k]))
        )
          throw new SharedConflict(
            "Гаманець або професію цього котика вже змінили на іншому пристрої. Повторіть дію після синхронізації.",
          );
      }
      const profile = clone(actual);
      for (const key of Object.keys(p))
        if (changed(old[key], p[key])) {
          if (key === "lastHousingAIDay")
            profile[key] = Math.max(actual[key] ?? -1, p[key] ?? -1);
          else if (key === "manualUntil")
            profile[key] = Math.max(actual[key] || 0, p[key] || 0);
          else if (key === "leisureProgress") {
            const other = actual[key];
            profile[key] =
              !other || p[key]?.day > other.day
                ? clone(p[key])
                : p[key]?.day === other.day
                  ? { day: other.day, done: Math.max(other.done, p[key].done) }
                  : clone(other);
          } else if (key === "attendance") {
            if (p[key] && profile.lastPaidDay >= p[key].day) continue;
            if (
              actual[key] &&
              p[key] &&
              changed(old[key], actual[key]) &&
              actual[key].at > p[key].at
            )
              continue;
            profile[key] = clone(p[key]);
          } else profile[key] = clone(p[key]);
        }
      // An unrelated arrival update cannot resurrect attendance after wages.
      if (profile.attendance && profile.lastPaidDay >= profile.attendance.day)
        profile.attendance = null;
      result.profiles[id] = profile;
    }
    if (!equal(base.plan, incoming.plan)) {
      if (
        !current.plan ||
        incoming.plan?.day > current.plan.day ||
        equal(base.plan, current.plan)
      )
        result.plan = clone(incoming.plan);
      else if (!equal(current.plan, incoming.plan))
        throw new SharedConflict(
          "План котиків уже збережений на іншому пристрої.",
        );
    }
    result.requestedDay = Math.max(
      current.requestedDay ?? -1,
      incoming.requestedDay ?? -1,
    );
    return result;
  }
  if (path === "builderBoosts") {
    const added = normalizeBuilderBoosts(incoming).filter(
      (e) => !(base || []).some((b) => b.id === e.id),
    );
    const others = normalizeBuilderBoosts(current).filter(
      (e) => !(base || []).some((b) => b.id === e.id),
    );
    if (
      added.some((e) =>
        others.some(
          (o) =>
            e.id !== o.id && e.startedAt < o.until && o.startedAt < e.until,
        ),
      )
    )
      throw new SharedConflict(
        "Ускорение уже включили на другом телефоне. Алмазы не списаны повторно.",
      );
    return normalizeBuilderBoosts([...(current || []), ...added]);
  }
  if (path === "islandConstruction") {
    for (const id of Object.keys(incoming || {}))
      if (
        id.startsWith("court-") &&
        !base?.[id] &&
        current?.[id] &&
        incoming[id]
      )
        throw new SharedConflict(
          "Это заведение уже строится. Повторная оплата отменена.",
        );
    return mergeIslandConstruction(base, current, incoming);
  }
  if (path === "spa.receipts")
    return [...new Set([...(current || []), ...(incoming || [])])].slice(-96);
  if (/^spa\.visits\.[\w-]+$/.test(path))
    return Math.max(current || 0, incoming || 0);
  if (path === "spa.selectedDrink") return clone(incoming);
  if (equal(base, incoming)) return clone(current);
  if (guarded(path) && changed(base, current)) throw new SharedConflict();
  if (additive(path)) {
    const value = (current ?? 0) + (incoming ?? 0) - (base ?? 0);
    if (
      !Number.isSafeInteger(value) ||
      (value < 0 && path !== "coins") ||
      (path === "coins" && value > 10000000)
    )
      throw new SharedConflict(
        "Баланс уже изменился на другом телефоне. Мир обновлён; проверьте монеты или склад.",
      );
    return value;
  }
  if (equal(base, current)) return clone(incoming);
  if (
    transient(path) ||
    /^(placements|scenery)\.[\w-]+\.(x|z|rotation)$/.test(path)
  )
    return clone(incoming);
  if (
    Array.isArray(incoming) &&
    Array.isArray(current) &&
    Array.isArray(base)
  ) {
    if (["unlocked", "progression.discoveries"].includes(path)) {
      const added = incoming.filter((x) => !base.includes(x));
      if (
        path === "unlocked" &&
        added.some((x) => x !== "cat-homes" && current.includes(x))
      )
        throw new SharedConflict(
          "Это открытие уже сделано на другом телефоне.",
        );
      return [
        ...new Set([
          ...current.filter((x) => !base.includes(x) || incoming.includes(x)),
          ...added,
        ]),
      ];
    }
    if (["placements", "scenery", "adoption.cats"].includes(path)) {
      const result = new Map(current.map((x) => [x.id, clone(x)]));
      for (const old of base)
        if (!incoming.some((x) => x.id === old.id)) {
          if (changed(old, result.get(old.id))) throw new SharedConflict();
          result.delete(old.id);
        }
      for (const entry of incoming) {
        const old = base.find((x) => x.id === entry.id);
        if (equal(old, entry)) continue;
        if (!old && result.has(entry.id))
          throw new SharedConflict("Этот котик или предмет уже добавлен.");
        result.set(
          entry.id,
          merge(
            old,
            result.get(entry.id),
            entry,
            path + "." + entry.id,
            depth + 1,
          ),
        );
      }
      return [...result.values()];
    }
    if (path === "care.bowl") {
      const b = Object.fromEntries(base.map((x) => [x.crop, x.portions])),
        c = Object.fromEntries(current.map((x) => [x.crop, x.portions])),
        n = Object.fromEntries(incoming.map((x) => [x.crop, x.portions]));
      return [...new Set([...Object.keys(c), ...Object.keys(n)])]
        .map((crop) => {
          const portions = (c[crop] || 0) + (n[crop] || 0) - (b[crop] || 0);
          if (portions < 0)
            throw new SharedConflict("Эту порцию уже съели. Миска обновлена.");
          return { crop, portions };
        })
        .filter((x) => x.portions > 0);
    }
    if (
      [
        "recentActivities",
        "care.recentMeals",
        "social.events",
        "farm.sales",
      ].includes(path)
    ) {
      const added = incoming.filter((x) => !base.some((y) => equal(x, y)));
      return [
        ...current,
        ...added.filter((x) => !current.some((y) => equal(x, y))),
      ].slice(
        -{
          recentActivities: 12,
          "care.recentMeals": 12,
          "social.events": 24,
          "farm.sales": 8,
        }[path],
      );
    }
    if (path.startsWith("farm.fields."))
      return incoming.map((x, i) =>
        merge(base[i], current[i], x, path + "." + i, depth + 1),
      );
    if (equal(current, incoming)) return clone(current);
    throw new SharedConflict();
  }
  if (
    incoming &&
    current &&
    typeof incoming === "object" &&
    typeof current === "object" &&
    !Array.isArray(incoming) &&
    !Array.isArray(current)
  ) {
    const result = Object.create(null);
    for (const key of new Set([
      ...Object.keys(base || {}),
      ...Object.keys(current),
      ...Object.keys(incoming),
    ])) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        throw new SharedConflict();
      const value = merge(
        base?.[key],
        current[key],
        incoming[key],
        path ? path + "." + key : key,
        depth + 1,
      );
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  if (path === "nextId") return Math.max(current, incoming);
  if (equal(current, incoming)) return clone(current);
  throw new SharedConflict();
}

export function mergeSharedWorld(base, current, incoming) {
  if (!base || !current) return clone(incoming);
  // Older cached clients cannot know the appended city or its private wallets.
  if (
    current.jobCity &&
    base.unlocked?.includes("jobcity") &&
    !incoming.unlocked.includes("jobcity")
  )
    incoming = { ...incoming, unlocked: [...incoming.unlocked, "jobcity"] };
  if (current.housing && !incoming.unlocked.includes("cat-homes"))
    incoming = { ...incoming, unlocked: [...incoming.unlocked, "cat-homes"] };
  // XP is an earned delta. Recalculate shared daily caps and level rewards once,
  // so two purchases cannot award the same level-up coins twice.
  const b = clone(base),
    n = clone(incoming);
  // A cached pre-expansion client drops outer plots in loadGame. This is not a
  // store action: genuine storage/replacement retains the owned item count.
  // Restore only the unaccounted loss, with stable IDs and its attached state.
  const owned = (game, item) =>
    (game.inventory[item] || 0) +
    game.placements.filter((p) => p.item === item).length;
  for (const p of b.placements) {
    const expanded = BUILDING_EXPANSIONS[p.biome],
      newSlide = !!byItem(p.item)?.referenceSlide;
    if ((!expanded && !newSlide) || n.placements.some((v) => v.id === p.id))
      continue;
    const [w, d] = footprint(p.item, p.rotation);
    if (
      (!newSlide &&
        Math.hypot(Math.abs(p.x) + w / 2, Math.abs(p.z) + d / 2) <=
          expanded.originalRadius - 0.7) ||
      owned(n, p.item) >= owned(b, p.item)
    )
      continue;
    n.placements.push(clone(p));
    for (const [old, next] of [
      [b.farm.fields, n.farm.fields],
      [b.business.accounts, n.business.accounts],
      [b.business.levels || {}, (n.business.levels ||= {})],
    ])
      if (old[p.id] !== undefined && next[p.id] === undefined)
        next[p.id] = clone(old[p.id]);
  }
  // A cached catalogue also filters unfamiliar unplaced purchases out of its
  // bag. Attractions cannot be sold: moving one into/out of the bag preserves
  // ownership, so only an unexplained loss is restored here.
  for (const [item, count] of Object.entries(b.inventory)) {
    if (!byItem(item)?.referenceSlide) continue;
    const missing = owned(b, item) - owned(n, item);
    if (missing <= 0) continue;
    n.inventory[item] = (n.inventory[item] || 0) + missing;
    n.builtInventory ||= {};
    n.builtInventory[item] = Math.min(
      n.inventory[item],
      Math.max(n.builtInventory[item] || 0, b.builtInventory?.[item] || 0),
    );
    const old = (b.relocatedPurchases || []).filter((p) => p.item === item);
    n.relocatedPurchases ||= [];
    const retained = n.relocatedPurchases.filter((p) => p.item === item).length;
    n.relocatedPurchases.push(...clone(old.slice(retained)));
  }
  if (n.diamonds === undefined) n.diamonds = b.diamonds || 0;
  if (n.business.totalDiamonds === undefined)
    n.business.totalDiamonds = b.business.totalDiamonds || 0;
  // A tab opened before business upgrades existed must not erase paid tiers
  // while saving an unrelated move or meal. Tiers only increase; removing the
  // actual building still transfers its tier to the inventory normally.
  if (b.business?.levels) {
    n.business.levels ||= {};
    for (const [id, level] of Object.entries(b.business.levels)) {
      const retained = id.startsWith("job-")
        ? n.unlocked.includes("jobcity")
        : id.startsWith("court-")
          ? n.unlocked.includes("foodcourt")
          : id === "spa-bar"
            ? n.unlocked.includes("water")
            : n.placements.some((p) => p.id === id);
      if (retained && !(n.business.levels[id] >= level))
        n.business.levels[id] = level;
    }
  }
  const newSpaReceipts = (n.spa?.receipts || []).filter(
    (id) => !b.spa?.receipts?.includes(id),
  );
  if (newSpaReceipts.some((id) => current.spa?.receipts?.includes(id)))
    throw new SharedConflict(
      "Цей візит до SPA вже збережено. Монети не списані повторно.",
    );
  let c = clone(current),
    duplicateVisitXP = 0,
    duplicateAdventureXP = 0;
  // Offline and online devices can briefly overlap their automatic simulation.
  // Rebase the manual needs delta onto one shared clock, without discarding
  // an unrelated purchase just because a hunger tick happened on both phones.
  if (n.care.lastTick > b.care.lastTick && c.care.lastTick > b.care.lastTick) {
    const automatic = advanceCare(b, n.care.lastTick);
    const target = Math.max(n.care.lastTick, c.care.lastTick);
    c = advanceCare(c, target);
    const needs = (old, proposed, actual) => {
      if (!old || !proposed || !actual) return;
      for (const key of ["hunger", "energy", "happiness"])
        if (
          Number.isFinite(old[key]) &&
          Number.isFinite(proposed[key]) &&
          Number.isFinite(actual[key])
        )
          proposed[key] = Math.max(
            0,
            Math.min(100, actual[key] + (proposed[key] - old[key])),
          );
    };
    needs(automatic.cat, n.cat, c.cat);
    for (const id of Object.keys(n.care.residents))
      needs(
        automatic.care.residents[id],
        n.care.residents[id],
        c.care.residents[id],
      );
    if (equal(n.care.resting, automatic.care.resting))
      n.care.resting = clone(c.care.resting);
    n.care.lastTick = target;
  }
  if (n.lastHourly > b.lastHourly && c.lastHourly > b.lastHourly) {
    const hours = Math.min(
      24,
      Math.floor((Math.min(n.lastHourly, c.lastHourly) - b.lastHourly) / HOUR),
    );
    n.coins -= Math.max(0, hours) * HOURLY_COINS;
    n.totalEarned -= Math.max(0, hours) * HOURLY_COINS;
    n.lastHourly = Math.max(n.lastHourly, c.lastHourly);
    b.lastHourly = c.lastHourly;
  }
  if (
    n.lastVisit !== b.lastVisit &&
    c.lastVisit !== b.lastVisit &&
    n.lastVisit === c.lastVisit
  ) {
    n.coins -= LOGIN_COINS;
    n.totalEarned -= LOGIN_COINS;
    duplicateVisitXP = Math.min(
      40,
      Math.max(0, n.progression.xp - b.progression.xp),
    );
    b.lastVisit = c.lastVisit;
    n.progression.visits = b.progression.visits;
  }
  if (n.lastAttention > b.lastAttention && c.lastAttention > b.lastAttention) {
    if (Math.abs(n.lastAttention - c.lastAttention) < ATTENTION_COOLDOWN) {
      n.coins -= ATTENTION_COINS;
      n.totalEarned -= ATTENTION_COINS;
    }
    n.lastAttention = Math.max(n.lastAttention, c.lastAttention);
    b.lastAttention = c.lastAttention;
  }
  if (
    n.progression.lastAdventureAt > b.progression.lastAdventureAt &&
    c.progression.lastAdventureAt > b.progression.lastAdventureAt
  ) {
    if (
      Math.abs(n.progression.lastAdventureAt - c.progression.lastAdventureAt) <
      180000
    )
      duplicateAdventureXP = 16;
    n.progression.lastAdventureAt = Math.max(
      n.progression.lastAdventureAt,
      c.progression.lastAdventureAt,
    );
    b.progression.lastAdventureAt = c.progression.lastAdventureAt;
  }
  const duplicateDiscoveries = n.progression.discoveries.filter(
    (id) =>
      !b.progression.discoveries.includes(id) &&
      c.progression.discoveries.includes(id),
  );
  const duplicateXP = duplicateDiscoveries.reduce((sum, id) => {
    const product = byItem(id);
    return (
      sum +
      (product
        ? Math.max(25, Math.min(240, Math.round(product.price * 0.08)))
        : 0)
    );
  }, 0);
  // Business income is guarded by each register above. Merge its earned XP
  // separately, including offline income, without spending the activity cap.
  // Missing counters from cached clients mean zero NEW business XP, not a reset.
  const businessGain = Math.min(
    Math.max(0, n.progression.xp - b.progression.xp),
    Math.max(
      0,
      (n.progression.businessXP || 0) - (b.progression.businessXP || 0),
    ),
  );
  const xpGain = Math.max(
    0,
    n.progression.xp -
      b.progression.xp -
      businessGain -
      duplicateXP -
      duplicateVisitXP -
      duplicateAdventureXP,
  );
  const day =
    [c.progression.xpDay, n.progression.xpDay].filter(Boolean).sort().at(-1) ||
    null;
  const daily = c.progression.xpDay === day ? c.progression.dailyXP : 0;
  const activityGain =
    n.progression.xpDay === day ? Math.min(xpGain, DAILY_XP_LIMIT - daily) : 0;
  const room = Math.max(0, xpForLevel(MAX_LEVEL) - c.progression.xp),
    earnedBusiness = Math.min(businessGain, room),
    earnedActivity = Math.min(activityGain, room - earnedBusiness),
    gain = earnedBusiness + earnedActivity;
  const localBonus = levelCoins(b.progression.xp, n.progression.xp);
  n.coins -= localBonus;
  n.totalEarned -= localBonus;
  // These fields are reconstructed below, not merged as competing whole snapshots.
  for (const field of ["xp", "businessXP", "dailyXP", "xpDay"])
    n.progression[field] = b.progression[field];
  const result = merge(b, c, n);
  result.islandConstruction = mergeIslandConstruction(
    b.islandConstruction,
    c.islandConstruction,
    n.islandConstruction,
  );
  result.progression.xp = c.progression.xp + gain;
  result.progression.businessXP =
    (c.progression.businessXP || 0) + earnedBusiness;
  result.progression.dailyXP = daily + earnedActivity;
  result.progression.xpDay = day;
  const bonus = levelCoins(c.progression.xp, result.progression.xp);
  if (
    result.care.bowl.reduce((sum, batch) => sum + batch.portions, 0) >
    BOWL_CAPACITY
  )
    throw new SharedConflict(
      "Миска уже наполнена с другого телефона. Урожай остался на складе.",
    );
  result.coins += bonus;
  result.totalEarned += bonus;
  // Stable UUIDs avoid two phones both producing p-1. Purchases survive a
  // placement race: an occupied plot puts the second object back in its bag.
  const incomingIds = new Set(
    incoming.placements
      .filter((p) => !base.placements.some((b) => b.id === p.id))
      .map((p) => p.id),
  );
  for (const p of [...result.placements]) {
    const old = base.placements.find((x) => x.id === p.id);
    const proposed = incoming.placements.find((x) => x.id === p.id);
    const moved =
      old &&
      proposed &&
      ["x", "z", "biome", "rotation"].some((k) => old[k] !== proposed[k]);
    if (!incomingIds.has(p.id) && !moved) continue;
    const check = canPlace(
      result,
      p.item,
      p.biome,
      p.x,
      p.z,
      p.rotation,
      p.id,
      { ignoreTerrain: true },
    );
    if (!check.ok) {
      if (moved)
        throw new SharedConflict(
          "Место уже занято на другом телефоне. Предмет сохранился; повторите перестановку.",
        );
      result.placements = result.placements.filter((x) => x.id !== p.id);
      result.inventory[p.item] = (result.inventory[p.item] || 0) + 1;
      result.relocatedPurchases = [
        ...(result.relocatedPurchases || []),
        {
          item: p.item,
          readyAt: p.readyAt || 0,
          ...(p.startedAt ? { startedAt: p.startedAt } : {}),
          ...(p.boostBaseReadyAt
            ? { boostBaseReadyAt: p.boostBaseReadyAt }
            : {}),
          businessLevel: result.business.levels?.[p.id] || 1,
          fieldCells: result.farm.fields[p.id],
        },
      ].slice(-60);
      delete result.farm.fields[p.id];
      delete result.business.accounts[p.id];
      delete result.business.levels?.[p.id];
    }
  }
  for (const p of result.scenery || []) {
    const old = base.scenery?.find((x) => x.id === p.id),
      proposed = incoming.scenery?.find((x) => x.id === p.id);
    if (
      !old ||
      !proposed ||
      p.stored ||
      !["x", "z", "biome", "rotation", "stored"].some(
        // Early saves omit `stored` for visible decorations. Normalization
        // writes false; that is not a player move into the replacement lake.
        (k) =>
          k === "stored"
            ? !!old.stored !== !!proposed.stored
            : old[k] !== proposed[k],
      )
    )
      continue;
    if (
      !canPlace(result, p.type, p.biome, p.x, p.z, p.rotation, p.id, {
        allowLocked: true,
      }).ok
    )
      throw new SharedConflict(
        "Место для декора уже занято на другом телефоне. Дерево или камень сохранились на прежнем месте.",
      );
  }
  if (
    result.placements.length > 60 ||
    result.unlocked.length > BIOMES.length ||
    result.coins > 10000000 ||
    result.coins < 0 ||
    !Number.isSafeInteger(result.diamonds) ||
    result.diamonds < 0 ||
    result.diamonds > 1000000
  )
    throw new SharedConflict("Общий мир достиг ограничения.");
  for (const p of result.placements)
    if (!byItem(p.item))
      throw new SharedConflict("Неизвестный предмет в сохранении.");
  try {
    checkFamilyPace(
      current.family,
      result.family,
      Object.values(result.jobCity?.profiles || {}),
    );
  } catch (error) {
    throw new SharedConflict(error.message);
  }
  return resolveConstructionBoosts(reconcileFamilyHomes(result));
}
