import {
  buyCatHome,
  setActiveHome,
  setHomeRoommate,
} from "./housing-system.js";
import { createJobCityUI } from "./jobcity-ui.js";
import { catSexBadge } from "./cat-card-ui.js";
import { createFriendCards } from "./friend-cards.js";
import { familyCalendar, familyReview } from "./family-system.js";
import {
  nextCityAIEvent,
  reserveCityAIEvent,
  applyCityAIEvent,
  recoverCityAIReceipt,
} from "./city-ai-schedule.js";
import { completeLeisure } from "./leisure-data.js";
import {
  ensureJobCity,
  advanceJobCity,
  advanceCityEvening,
  localJobPlan,
  applyJobPlan,
  cityClock,
  buyCatProduct,
  startCatDrive,
  finishCatDrive,
  recordJobAttendanceBatch,
  pauseCatCareer,
} from "./jobcity-system.js";
import {
  activateBuilderBoost,
  builderBoostUntil,
  BUILDER_BOOST_COST,
  resolveConstructionBoosts,
} from "./construction-boost.js";
import { bikiniFriend, BIKINI_ACTIONS } from "./bikini-data.js";
import {
  moveResidentToBiome,
  completeResidentAction,
} from "./resident-actions.js";
import { COURT_MENU, courtObject, courtProject } from "./foodcourt-data.js";
import { startCourtConstruction } from "./island-construction.js";
import { islandProjects } from "./island-construction.js";
import { SPA_DRINKS } from "./spa-data.js";
import { selectSpaDrink, completeSpaVisit } from "./spa-system.js";
import { ADOPTION_CATS, BREEDS, catAppearance } from "./cat-breeds.js";
import { activeCats, catAvailable } from "./cat-roster.js";
import { adoptCat, adoptionCenters, gatherCats } from "./adoption.js";
import {
  incomeFor,
  incomeForVenue,
  incomeCurrency,
  incomeSymbol,
  collectIncome,
  collectAllIncome,
  revenueRate,
  BUSINESS_CAP_HOURS,
  businessXP,
  businessVenues,
  businessLevel,
  upgradeBusiness,
  businessUpgradeCost,
  BUSINESS_LEVELS,
} from "./business.js";
import { prepareCatPortraits, catPortraits } from "./cat-portraits.js";
import {
  levelStatus,
  levelRequirement,
  adventureXP,
  DAILY_XP_LIMIT,
} from "./progression.js";
import {
  resolveInteraction,
  manualInteraction,
  recordInteraction,
  HOME_OBJECTS,
} from "./interactions.js";
import { apiBase } from "./config.js";
import { createWorld } from "./world.js";
import { restoreSculptCache, scheduleSculptCache } from "./sculpt-cache.js";
import {
  BIOMES,
  CATALOG,
  CATEGORIES,
  NEIGHBORS,
  byItem,
  byBiome,
  CROPS,
  JOBS,
  buildTimeLabel,
  biomeFeature,
} from "./game-data.js";
import {
  loadGame as readGame,
  saveGame,
  claimRewards,
  attentionReward,
  purchase,
  unlockBiome,
  findSpace,
  canPlace,
  placeItem,
  moveItem,
  storeItem,
  worldSnapshot,
  HOUR,
  ATTENTION_COOLDOWN,
  SAVE_KEY,
  isBuilt,
  biomeRequirement,
  plantCrop,
  harvestField,
  stockValue,
  sellHarvest,
  gatherResource,
} from "./economy.js";
import { catalogPreviews } from "./catalog-previews.js";
import { byScenery, sceneryName } from "./scenery-data.js";
import { moveScenery, storeScenery } from "./economy.js";
import { readSavedState } from "./economy.js";
import { CloudBackup } from "./cloud-save.js";
import {
  residentSwam,
  fillBowl,
  bowlPortions,
  BOWL_CAPACITY,
  foodYield,
  advanceCare,
  eatFromBowl,
  startRest,
  colonyNeeds,
} from "./care-system.js";
import {
  relationshipStage,
  stageLabel,
  recordSocialEncounter,
  encounterKind,
  bestEligible,
} from "./social-system.js";
// Shared snapshots are loaded verbatim; only the elected simulator advances offline care.
const loadGame = (storage) => readGame(storage, Date.now(), { advance: false });
const $ = (id) => document.getElementById(id),
  api = (path) =>
    apiBase
      ? new URL(path, apiBase).href
      : new URL("." + path, location.href).href;
for (const [id, value] of [
  ["biome-total", BIOMES.length],
  ["wonder-total", CATALOG.length],
  ["adoption-total", ADOPTION_CATS.length],
])
  $(id).textContent = value;
let storage;
try {
  storage = localStorage;
} catch {
  storage = {
    getItem: () => null,
    setItem: () => {
      throw Error("Storage unavailable");
    },
  };
}
let cloudStatus = "local";
function cloudStatusChanged(status) {
  cloudStatus = status;
  const texts = {
    local: "Локальная копия",
    ready: "☁ Общий мир синхронизирован",
    pending: "☁ Синхронизация…",
    saved: "☁ Сохранено в облаке",
    offline: "☁ Локально сохранено · ждём сеть",
    conflict: "☁ Другая версия · откройте аккаунт",
    watching: "☁ Общий мир · наблюдение",
  };
  $("cloud-state").textContent = texts[status] || texts.local;
  $("cloud-detail").textContent =
    status === "saved" || status === "ready"
      ? "Изменения сохранены в облаке. Второй телефон обновляется автоматически."
      : status === "conflict"
        ? "На другом устройстве есть новая копия. Локальные изменения сохранены отдельно; облако не перезаписано. Вставьте свой код ниже, чтобы получить облачную копию."
        : status === "watching"
          ? "Вы видите общий мир. Изменения с другого телефона появляются автоматически; действия обоих игроков сохраняются вместе."
          : "Каждая подтверждённая покупка и перестановка сначала записывается на этом устройстве. Облачная копия обновляется автоматически; статус показывает, завершилась ли синхронизация.";
}
const cloud = new CloudBackup({
  storage,
  base: apiBase,
  onStatus: cloudStatusChanged,
  shared: true,
  cooperative: true,
  onSnapshot: (raw) => {
    if (busy || buildMode) return false;
    installRemote(raw);
    return true;
  },
  onNotice: (message) => toast(message),
  onMode: (editable) => {
    document.body.classList.toggle("watching-world", !editable);
    $("account-mode").textContent = "Один мир для вас двоих";
  },
});
const localSaved = readSavedState(storage);
const recoveredAtBoot =
  !cloud.createdToken && cloud.token
    ? await cloud.load({ force: !localSaved })
    : null;
await cloud.claimEditor();
let adoptionCenterId = null,
  selectedIsland = "moon";
let game = loadGame(
    recoveredAtBoot
      ? {
          getItem: (key) =>
            key === SAVE_KEY ? JSON.stringify(recoveredAtBoot) : null,
        }
      : storage,
  ),
  busy = false,
  configured = false,
  steps = 0,
  world,
  buildMode = null,
  selectedItem = null,
  selectedScenery = false,
  shopCategory = "all",
  previews = new Map(),
  previewsStarted = false,
  toastTimer,
  farmSelected = null,
  farmCrop = "wheat",
  farmViewKey = "",
  adoptionViewKey = "",
  shopViewKey = "";
if (cloud.simulationOwner)
  game = advanceCare(game, Date.now(), { offline: true });
const firstRewards =
  cloud.simulationOwner && !cloud.conflict
    ? claimRewards(game, Date.now(), true)
    : { game, rewards: [] };
if (saveGame(storage, firstRewards.game)) game = firstRewards.game;
const clamp = (n) => Math.max(0, Math.min(100, n)),
  money = (n) => new Intl.NumberFormat("ru-RU").format(n),
  buttonLabel = "Дай Чичи решить самой ✦";
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
}
function persist() {
  if (!cloud.editable || cloud.conflict) return;
  if(cloud.simulationOwner)game=world?.snapshotCatLocations(game,game)||game;
  const ok = saveGame(storage, game);
  $("save-state").textContent = ok
    ? "Прогресс сохраняется на этом устройстве"
    : "Сохранение недоступно. Прогресс сохранится только до закрытия страницы.";
  if (ok) cloud.enqueue(game);
}
function commit(next, syncWorld = true) {
  cloud.assertEditable();
  next = resolveConstructionBoosts(next);
  if(cloud.simulationOwner)next=world?.snapshotCatLocations(next,game)||next;
  if (!saveGame(storage, next)) {
    $("save-state").textContent =
      "Сохранение не подтверждено. Изменение отменено.";
    throw Error(
      "Не удалось записать сохранение. Покупка или изменение не выполнены.",
    );
  }
  game = next;
  cloud.enqueue(game);
  $("save-state").textContent =
    "Сохранено на этом устройстве · резервная копия включена";
  if (syncWorld) world?.sync(game);
  renderGame();
  if ($("shop-dialog").open) renderShop();
  if ($("bowl-dialog").open) renderBowl();
  if ($("adoption-dialog").open) renderAdoption();
  if ($("business-dialog").open) renderBusiness();
  cityUI?.render();
}
let cityAIStatus = null;
const cityUI = createJobCityUI({
  getGame: () => game,
  getAIStatus: () => cityAIStatus,
  onError: toast,
  buy: (id, product) => {
    const p = game.jobCity.profiles[id];
    commit(
      buyCatProduct(
        game,
        id,
        product,
        "buy-" + id + "-" + (p.purchaseCount + 1),
      ),
      false,
    );
    toast("Покупка у власному інвентарі котика");
  },
  buyHome: (id, type, roommate) => {
    const p = game.jobCity.profiles[id];
    commit(
      buyCatHome(game, id, type, "buy-" + id + "-" + (p.purchaseCount + 1), {
        roommate,
      }),
    );
    toast("Будинок уже на житловому острові · покупку збережено");
  },
  viewHome: (id) => world?.showCatHome(id),
  liveHome: (id, home) => commit(setActiveHome(game, id, home)),
  roommate: (id, cat) => commit(setHomeRoommate(game, id, cat)),
  drive: (id, car) => {
    world?.chooseCityDrive(id, car);
  },
  view: (id) => {
    world?.focus("jobcity");
    if (id) world?.inspectJobBusiness(id);
  },
  follow: (id) => {
    world?.followCat(id);
  },
});
$("rewards-cat-tab").onclick = () => cityUI.open();
$("rewards-player-tab").onclick = () => renderRewards();
$("jobcity-open").onclick = () => cityUI.open();
let cityPlanning = false;
let attendanceEvents = [];
function queueAttendance(id, job, active) {
  attendanceEvents.push({ id, job, active, now: Date.now() });
  if (attendanceEvents.length !== 1) return;
  // A microtask commits before the browser can handle another input event or
  // paint. No timed/debounced save window is introduced for player actions.
  queueMicrotask(() => {
    const events = attendanceEvents;
    attendanceEvents = [];
    if (!cloud.simulationOwner || !cloud.editable || cloud.conflict) return;
    try {
      const next = recordJobAttendanceBatch(game, events);
      if (next !== game) commit(next, false);
    } catch (e) {
      $("save-state").textContent = e.message;
    }
  });
}
let receiptKey = "", receiptAttempts = 0, receiptNext = 0, receiptBusy = false;
async function recoverDailyFamilies() {
  if (receiptBusy || !cloud.token || !game.jobCity) return;
  const clock = cityClock(game.jobCity);
  if (!familyReview(game, clock.day).due &&
      !((game.jobCity.eveningAIRequestedDay ?? -1) === clock.day &&
        (game.jobCity.eveningAIAppliedDay ?? -1) < clock.day)) return;
  const key = JSON.stringify([cloud.token, game.jobCity.epoch, game.jobCity.eveningAIRequestedDay]);
  if (key !== receiptKey) {
    receiptKey = key; receiptAttempts = 0; receiptNext = 0;
  }
  if (receiptAttempts >= 8 || Date.now() < receiptNext) return;
  receiptBusy = true; receiptAttempts++;
  const epoch = game.jobCity.epoch;
  const token = cloud.token;
  try {
    const response = await fetch(api("/api/jobcity/status"), {
      headers: { "X-Chichi-Save-Token": token }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error("Receipt unavailable");
    const snapshot = await response.json();
    if (cloud.token !== token || game.jobCity?.epoch !== epoch || !cloud.simulationOwner) return;
    const recovered = recoverCityAIReceipt(game, snapshot);
    if (recovered !== game) commit(recovered, false);
    const latest = [...(snapshot.events || [])].filter(e => e.phase === "evening" && e.epoch === epoch)
      .sort((a,b) => b.day-a.day)[0];
    if (snapshot.epoch !== null && snapshot.epoch !== epoch)
      cityAIStatus = { state: "clock" };
    else if (latest && (!cityAIStatus?.day || latest.day >= cityAIStatus.day))
      cityAIStatus = { state: latest.pending ? "pending" : latest.status === 200 ? "ready" : "failed", day: latest.day };
    if (latest?.pending) receiptNext = Date.now() + 15000;
    else receiptAttempts = 8; // No polling of a completed event and no inference.
  } catch {
    receiptNext = Date.now() + 30000;
  } finally {
    receiptBusy = false;
    cityUI.render();
  }
}
async function requestDailyCareers(event) {
  const day = event.day, token = cloud.token;
  cityPlanning = true;
  cityAIStatus = { state: "pending", day };
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 105000);
  try {
    const response = await fetch(api("/api/jobcity/plan"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Chichi-Save-Token": token || "",
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      cityAIStatus = { state: failure.code === "AI_EVENT_PENDING" ? "pending" :
        failure.code === "AI_WORLD_EPOCH_MISMATCH" ? "clock" : "failed", day };
      if (failure.code === "AI_EVENT_PENDING") return;
      throw Error("AI unavailable");
    }
    const result = await response.json();
    if (
      result.day !== day || cloud.token !== token || game.jobCity?.epoch !== event.epoch ||
      cityClock(game.jobCity).day !== day ||
      !cloud.simulationOwner
    )
      return;
    commit(applyCityAIEvent(game, event, result));
    cityAIStatus = { state: "ready", day };
  } catch {
    if (cityAIStatus?.state === "pending") cityAIStatus = { state: "failed", day };
    if (event.phase === "careers" && cloud.token === token && game.jobCity?.epoch === event.epoch && cityClock(game.jobCity).day === day) {
      const next = structuredClone(game);
      for (const id of event.initialIds) {
        const p = next.jobCity.profiles[id];
        if (p?.professionSource === "pending") p.professionSource = "local";
      }
      try {
        commit(next, false);
      } catch {
        /* Retain the durable local snapshot. */
      }
    }
  } finally {
    clearTimeout(timer);
    cityPlanning = false;
    receiptAttempts = 0; receiptNext = 0;
    void recoverDailyFamilies();
  }
}
function cityTick() {
  if (game.unlocked.includes("jobcity")) {
    $("jobcity-open").hidden = false;
    const clock = cityClock(game.jobCity);
    $("jobcity-clock").textContent =
      `День ${familyCalendar(game, clock.day).number} · ${clock.label}`;
  }
  cityUI.render();
  if (
    document.hidden ||
    !cloud.simulationOwner ||
    !cloud.editable ||
    cloud.conflict ||
    !game.unlocked.includes("jobcity")
  )
    return;
  void recoverDailyFamilies();
  try {
    let next = advanceCityEvening(advanceJobCity(game));
    if (next !== game) commit(next, false);
    const state = game.jobCity,
      clock = cityClock(state);
    if (clock.minute >= 720 && state.plan?.day !== clock.day) {
      next = applyJobPlan(
        game,
        localJobPlan(Object.values(state.profiles), clock.day),
        clock.day,
        "local",
      );
      commit(next, false);
    }
    if (!cityPlanning) {
      const event = nextCityAIEvent(game);
      if (event) {
        commit(reserveCityAIEvent(game, event), false);
        void requestDailyCareers(event);
      }
    }
  } catch (error) {
    $("save-state").textContent = error.message;
  }
}
setInterval(cityTick, 1000);
$("care-open").onclick = () => open("care-dialog");
$("level-open").onclick = () => open("level-dialog");
function open(id) {
  for (const dialog of document.querySelectorAll("dialog[open]"))
    dialog.close();
  $(id).showModal();
}
for (const button of document.querySelectorAll("[data-close]"))
  button.onclick = () => $(button.dataset.close).close();
for (const dialog of document.querySelectorAll("dialog"))
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
function renderGame() {
  const lvl = levelStatus(game);
  $("level-number").textContent = lvl.level;
  $("level-xp").value = lvl.progress;
  $("level-big-xp").value = lvl.progress;
  $("level-title").textContent = "Уровень " + lvl.level;
  $("level-detail").textContent =
    `${lvl.xp} XP · до следующего уровня: ${lvl.needed} XP · занятия сегодня: ${game.progression.dailyXP}/${DAILY_XP_LIMIT} XP · опыт бизнеса без дневного лимита`;
  $("level-guide").textContent =
    "Быстрый старт: урожайная лавочка доступна с уровня 1, кофейня — с уровня 2. Собранная грядка даёт 18 XP, визит — 40 XP, приключение — 16 XP раз в 3 минуты. Прибыль каждого бизнеса и аттракциона приносит XP без дневного лимита до максимального уровня 30. Киты и китовая лагуна открываются на уровне 4.";
  const upcoming = [...CATALOG, ...BIOMES, ...ADOPTION_CATS]
    .filter((i) => i.requiredLevel === lvl.level + 1)
    .map((i) => i.name);
  $("level-next").textContent = upcoming.length
    ? "Следующие открытия: " + upcoming.join(", ")
    : lvl.level >= 20
      ? "Коллекция доступна по уровню. Для легендарного острова также нужны достижения и накопления."
      : "Следующий уровень принесёт награду и приблизит новые открытия.";
  for (const key of ["energy", "happiness"]) {
    $(key).value = game.cat[key];
    $(key + "-text").textContent = Math.round(game.cat[key]) + "%";
  }
  $("food").value = game.cat.hunger;
  $("food-text").textContent = Math.round(game.cat.hunger) + "%";
  $("coins").textContent = money(game.coins);
  renderBuilderBoost();
  $("shop-coins").textContent = money(game.coins);
  $("bag-count").textContent = Object.values(game.inventory).reduce(
    (a, b) => a + b,
    0,
  );
  $("friend-count").textContent = Object.entries(
    game.social.relationships,
  ).filter(([id, r]) =>
    ["friend", "close", "best"].includes(
      relationshipStage(r, id === game.social.bestFriendId),
    ),
  ).length;
  for (const node of document.querySelectorAll("[data-mood]"))
    node.classList.toggle(
      "active",
      node.dataset.mood === (game.care.resting ? "sleep" : game.cat.mood),
    );
  const colony = colonyNeeds(game);
  $("colony-count").textContent = colony.count;
  $("colony-hunger").value = colony.hunger;
  $("colony-hunger-text").textContent = Math.round(colony.hunger) + "%";
  $("colony-happiness").value = colony.happiness;
  $("colony-happiness-text").textContent = Math.round(colony.happiness) + "%";
  $("bowl-count").textContent = bowlPortions(game);
  $("rest-hint").textContent = game.care.resting
    ? "Чичи спит: энергия восстанавливается. Перетащите её к другому предмету, чтобы разбудить."
    : "Перетащите Чичи на подушку, чтобы уложить спать. К игрушке — чтобы поиграть.";
  for (const [id, value, negative] of [
    ["energy", game.cat.energy, false],
    ["food", game.cat.hunger, true],
    ["happiness", game.cat.happiness, false],
    ["colony-hunger", colony.hunger, true],
    ["colony-happiness", colony.happiness, false],
  ])
    $(id).style.setProperty(
      "--need-color",
      (negative ? value >= 75 : value <= 25)
        ? "#d99298"
        : (negative ? value >= 45 : value <= 50)
          ? "#d4b176"
          : "#96b7a6",
    );
  renderBiomes();
  renderNeighbors();
  renderRewards();
  if ($("farm-dialog").open) renderFarm();
}
let biomeNavKey = "";
function renderBiomes() {
  const active = world?.getFocused() || "moon";
  const key = active + ":" + game.unlocked.join(",");
  if (key === biomeNavKey) return;
  biomeNavKey = key;
  const navScroll = $("biome-nav").scrollLeft;
  $("biome-nav").replaceChildren();
  for (const biome of BIOMES) {
    const owned = game.unlocked.includes(biome.id);
    const button = document.createElement("button");
    button.className = "biome-chip" + (active === biome.id ? " active" : "");
    button.setAttribute("aria-label", "Посмотреть " + biome.name);
    button.dataset.biome = biome.id;
    if (active === biome.id) button.setAttribute("aria-current", "location");
    const icon = document.createElement("span");
    icon.textContent = owned ? biome.icon : "🔒";
    const text = document.createElement("span");
    text.textContent = biome.name;
    const subtitle = document.createElement("small");
    subtitle.textContent = owned ? "Открыт" : money(biome.price) + " ✦";
    text.append(subtitle);
    button.append(icon, text);
    button.onclick = () => {
      world?.focus(biome.id);
      $("map").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      if (owned && buildMode) {
        $("build-biome").value = biome.id;
        changeBuildBiome(biome.id);
      }
    };
    $("biome-nav").append(button);
  }
  $("biome-nav").scrollLeft = navScroll;
}
const updateFriendCards = createFriendCards(
  $("neighbors"),
  $("friends-list"),
  () => open("friends-dialog"),
);
function renderNeighbors() {
  updateFriendCards(game);
}

function renderRewards() {
  const until = Math.max(0, game.lastHourly + HOUR - Date.now());
  $("hourly-reward").textContent =
    "Следующая через " +
    Math.floor(until / 60000) +
    " мин " +
    Math.floor((until / 1000) % 60) +
    " с";
  const attention = Math.max(
    0,
    game.lastAttention + ATTENTION_COOLDOWN - Date.now(),
  );
  $("attention-reward").textContent = attention
    ? "Следующая через " + Math.ceil(attention / 60000) + " мин"
    : "За заботу или завершённое приключение";
}
async function showShop(category = "all", search = "") {
  if (category === "cats") return showAdoption();
  shopCategory = category;
  $("shop-search").value = search;
  renderShop();
  open("shop-dialog");
  if (!previewsStarted) {
    previewsStarted = true;
    previews = await catalogPreviews((key, src) => {
      previews.set(key, src);
      const node = document.querySelector(`[data-preview="${key}"]`);
      if (node) {
        let img = node.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.alt = node.dataset.name;
          img.loading = "lazy";
          img.decoding = "async";
          node.querySelector(".placeholder")?.remove();
          node.prepend(img);
        }
        img.src = src;
      }
    });
    // Each preview has already updated its current card. Rebuilding the grid
    // here would interrupt a player's scroll, focus or pending tap.
  }
}
function renderShop() {
  const viewKey = JSON.stringify([
    shopCategory,
    $("shop-search").value,
    game.coins,
    game.inventory,
    game.unlocked,
    game.progression.xp,
    shopCategory === "lands"
      ? BIOMES.map((b) => biomeRequirement(game, b.id))
      : null,
  ]);
  if (shopViewKey === viewKey) return;
  shopViewKey = viewKey;
  $("shop-coins").textContent = money(game.coins);
  $("shop-tabs").replaceChildren();
  for (const category of CATEGORIES) {
    const button = document.createElement("button");
    button.setAttribute("role", "tab");
    button.setAttribute(
      "aria-selected",
      category.id === shopCategory ? "true" : "false",
    );
    button.textContent = category.icon + " " + category.name;
    button.onclick = () => {
      if (category.id === "cats") {
        showAdoption();
        return;
      }
      shopCategory = category.id;
      $("shop-search").value = "";
      renderShop();
    };
    $("shop-tabs").append(button);
  }
  const query = $("shop-search").value.toLocaleLowerCase("ru");
  let collection =
    shopCategory === "lands"
      ? BIOMES.filter((b) => b.id !== "moon")
      : CATALOG.filter(
          (i) =>
            !i.islandOnly &&
            (shopCategory === "all" ||
              (shopCategory === "bag" && game.inventory[i.id] > 0) ||
              i.category === shopCategory),
        );
  collection = collection.filter((i) =>
    (i.name + " " + (i.description || i.subtitle || ""))
      .toLocaleLowerCase("ru")
      .includes(query),
  );
  $("shop-count").textContent = collection.length + " чудес";
  $("shop-grid").replaceChildren();
  for (const entry of collection) {
    const land = shopCategory === "lands",
      owned = land
        ? game.unlocked.includes(entry.id)
        : game.inventory[entry.id] || 0;
    const card = document.createElement("article");
    card.className = "shop-card";
    card.dataset.product = entry.id;
    const art = document.createElement("div");
    art.className = "shop-art";
    const previewKey = land ? "biome-" + entry.id : entry.id;
    art.dataset.preview = previewKey;
    art.dataset.name = entry.name;
    if (previews.has(previewKey)) {
      const img = document.createElement("img");
      img.src = previews.get(previewKey);
      img.alt = entry.name;
      img.loading = "lazy";
      img.decoding = "async";
      art.append(img);
    } else {
      const icon = document.createElement("span");
      icon.className = "placeholder";
      icon.textContent = entry.icon;
      art.append(icon);
      if (land) {
        art.style.background =
          "radial-gradient(ellipse,#" +
          entry.accent.toString(16).padStart(6, "0") +
          "77,#" +
          entry.ground.toString(16).padStart(6, "0") +
          "88)";
      }
    }
    if (!land) {
      const tier = document.createElement("span");
      tier.className =
        "rarity-pill" +
        (entry.rarity === "Легендарное"
          ? " legendary"
          : entry.rarity === "Эпическое"
            ? " epic"
            : "");
      tier.textContent =
        (entry.rarity === "Легендарное" ? "♔ " : "✦ ") + entry.rarity;
      art.append(tier);
    }
    if (owned) {
      const badge = document.createElement("span");
      badge.className = "owned";
      badge.textContent = land ? "Открыт" : "В сумке: " + owned;
      art.append(badge);
    }
    const info = document.createElement("div");
    info.className = "shop-info";
    const title = document.createElement("h3"),
      text = document.createElement("p"),
      button = document.createElement("button");
    title.textContent = entry.name;
    text.textContent =
      (entry.description || entry.subtitle) +
      " · Уровень " +
      entry.requiredLevel +
      " · " +
      (land
        ? " · Открывает: " + biomeFeature(entry.id)
        : " · " +
          entry.rarity +
          " · Стройка " +
          buildTimeLabel(entry.buildMinutes));
    button.textContent = land
      ? owned
        ? "Посмотреть остров"
        : "Открыть · " + money(entry.price) + " ✦"
      : shopCategory === "bag"
        ? "Разместить"
        : "Купить · " + money(entry.price) + " ✦";
    button.setAttribute("aria-label", button.textContent + " " + entry.name);
    if (!land && shopCategory !== "bag") {
      const locked = levelRequirement(game, entry.requiredLevel);
      if (locked) {
        text.textContent += " · " + locked;
        button.textContent = "🔒 Уровень " + entry.requiredLevel;
        button.disabled = true;
      } else if (game.coins < entry.price) {
        button.disabled = true;
      }
    }
    if (land && !owned) {
      const requirement = biomeRequirement(game, entry.id);
      if (requirement) {
        text.textContent += " · " + requirement;
        button.disabled = true;
      }
    }
    button.setAttribute("aria-label", button.textContent + " " + entry.name);
    button.onclick = () => {
      try {
        if (land) {
          if (!owned) {
            commit(unlockBiome(game, entry.id));
            toast(
              "Открыт " +
                entry.name +
                " · Новая функция: " +
                biomeFeature(entry.id),
            );
          }
          $("shop-dialog").close();
          world?.focus(entry.id);
        } else {
          if (shopCategory !== "bag") {
            commit(purchase(game, entry.id));
            toast(entry.name + " добавлен в сумку.");
          }
          $("shop-dialog").close();
          beginPlacement(entry.id);
        }
      } catch (error) {
        toast(error.message);
      }
    };
    info.append(title, text, button);
    if (!land && revenueRate(entry.id)) {
      const income = document.createElement("p");
      income.className = "shop-income";
      income.textContent =
        money(revenueRate(entry.id)) +
        " " +
        incomeSymbol(entry.id) +
        "/ч · " +
        businessXP(entry.id) +
        " XP/ч";
      info.insertBefore(income, button);
    }
    if (land && !owned) {
      const preview = document.createElement("button");
      preview.className = "biome-preview-button";
      preview.textContent = "Посмотреть остров";
      preview.setAttribute("aria-label", "Предпросмотр " + entry.name);
      preview.onclick = () => {
        $("shop-dialog").close();
        world?.focus(entry.id);
      };
      info.append(preview);
    }
    card.append(art, info);
    $("shop-grid").append(card);
  }
  if (!collection.length) {
    const empty = document.createElement("p");
    empty.className = "shop-empty";
    empty.textContent =
      shopCategory === "bag"
        ? "Сумка пока пустая. Выберите своё первое чудо в магазине."
        : "Здесь пока ничего не найдено.";
    $("shop-grid").append(empty);
  }
}
$("shop-search").oninput = renderShop;
$("shop-open").onclick = () => showShop();
$("bag-open").onclick = () => showShop("bag");
$("discover-shop").onclick = () => showShop();
$("friends-open").onclick = () => open("friends-dialog");
$("rewards-open").onclick = () => {
  renderRewards();
  open("rewards-dialog");
};
$("shop-rewards").onclick = () => {
  renderRewards();
  open("rewards-dialog");
};
function beginPlacement(item, ignoreId = null, scenery = false) {
  if (!cloud.editable || cloud.conflict) {
    toast("Дождитесь синхронизации в аккаунте перед изменением мира.");
    return;
  }
  if (busy) {
    toast("Сначала дождитесь приключения Чичи. Предмет остаётся в сумке.");
    return;
  }
  let biome = world?.getFocused() || "moon";
  if (!game.unlocked.includes(biome)) biome = "moon";
  const old = (scenery ? game.scenery : game.placements).find(
    (p) => p.id === ignoreId,
  );
  if (old) biome = old.biome;
  const space =
    (old && !old.stored ? old : null) ||
    findSpace(game, item, biome, 0, ignoreId);
  if (!space) {
    toast("На этом острове тесно. Выберите другой открытый биом.");
    const candidate = game.unlocked.find((b) =>
      findSpace(game, item, b, 0, ignoreId),
    );
    if (!candidate) return;
    biome = candidate;
  }
  const chosen =
    (old && !old.stored ? old : null) ||
    findSpace(game, item, biome, 0, ignoreId);
  buildMode = {
    item,
    biome,
    x: chosen.x,
    z: chosen.z,
    rotation: old?.rotation || 0,
    ignoreId,
    scenery,
  };
  $("build-panel").hidden = false;
  $("build-title").textContent = scenery ? sceneryName(old) : byItem(item).name;
  $("build-biome").replaceChildren();
  for (const id of game.unlocked) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = byBiome(id).name;
    $("build-biome").append(option);
  }
  $("build-biome").value = biome;
  world?.beginBuild({ ...buildMode });
  previewChanged({
    ...buildMode,
    ...canPlace(
      game,
      item,
      biome,
      chosen.x,
      chosen.z,
      buildMode.rotation,
      ignoreId,
    ),
  });
}
function previewChanged(value) {
  if (!buildMode) return;
  Object.assign(buildMode, {
    x: value.x,
    z: value.z,
    rotation: value.rotation,
    biome: value.biome,
  });
  $("build-reason").textContent =
    value.reason + " · " + value.x + ", " + value.z;
  $("build-confirm").disabled = !value.ok;
}
function changeBuildBiome(id) {
  if (!buildMode) return;
  const position = findSpace(
    game,
    buildMode.item,
    id,
    buildMode.rotation,
    buildMode.ignoreId,
  );
  if (!position) {
    toast("Нет свободного места для этого предмета.");
    return;
  }
  Object.assign(buildMode, { biome: id, ...position });
  world?.focus(id);
  world?.updateBuild(buildMode);
}
function cancelPlacement() {
  buildMode = null;
  $("build-panel").hidden = true;
  world?.beginBuild(null);
}
$("build-biome").onchange = (e) => changeBuildBiome(e.target.value);
$("build-rotate").onclick = () => {
  if (!buildMode) return;
  buildMode.rotation = (buildMode.rotation + 1) % 4;
  world?.updateBuild(buildMode);
};
$("build-cancel").onclick = cancelPlacement;
$("build-confirm").onclick = async () => {
  if (!buildMode) return;
  try {
    const p = buildMode;
    commit(
      p.scenery
        ? moveScenery(game, p.ignoreId, p.biome, p.x, p.z, p.rotation)
        : p.ignoreId
          ? moveItem(game, p.ignoreId, p.biome, p.x, p.z, p.rotation)
          : placeItem(game, p.item, p.biome, p.x, p.z, p.rotation),
    );
    const placed = p.ignoreId
      ? (p.scenery ? game.scenery : game.placements).find(
          (item) => item.id === p.ignoreId,
        )
      : game.placements.at(-1);
    cancelPlacement();
    toast(
      p.scenery
        ? "Декорация на новом месте. Положение сохранено."
        : isBuilt(placed)
          ? "Готово! Предмет на новом месте, Чичи может его выбрать."
          : "Стройка началась! Сохраняем её для обоих телефонов…",
    );
    await cloud.flush();
    if (cloud.dirty || cloud.pending || cloud.retryEntry)
      toast(
        "Постройка записана на этом телефоне. Облачная синхронизация ещё идёт.",
      );
    else if (
      !cloud.reconciling &&
      !cloud.conflict &&
      (p.scenery ? game.scenery : game.placements).some(
        (item) => item.id === placed.id,
      )
    )
      toast("Положение постройки сохранено в общем мире ☁");
  } catch (error) {
    toast(error.message);
  }
};
window.addEventListener("keydown", (e) => {
  if (
    !buildMode ||
    document.querySelector("dialog[open]") ||
    e.target.tagName === "SELECT"
  )
    return;
  if (e.key === "Escape") {
    cancelPlacement();
    return;
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
    e.preventDefault();
    buildMode.x += e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    buildMode.z += e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    world?.updateBuild(buildMode);
  }
});
function showSpaBar() {
  $("item-guest-camera").hidden = $("item-attraction-camera").hidden = true;
  if (busy || buildMode || !game.unlocked.includes("water")) return;
  selectedItem = "spa-bar";
  selectedScenery = false;
  $("item-icon").textContent = "🍹";
  $("item-name").textContent = "Cat SPA · бар біля басейну";
  $("item-construction").textContent =
    "Відкрито · " +
    revenueRate("cat-barista", businessLevel(game, "spa-bar")) +
    " ✦/год · " +
    businessXP("cat-barista", businessLevel(game, "spa-bar")) +
    " XP/год";
  $("item-description").textContent =
    "Оберіть напій для Чичі. Вона підійде до бару, дочекається вільного місця та вип’є замовлення. Інші котики теж відвідують бар.";
  $("item-note").textContent =
    "Оплата після обслуговування. Скасування в черзі не коштує монет. Дохід бару збирається монеткою або в розділі «Бізнес».";
  $("item-move").hidden = true;
  $("item-store").hidden = true;
  const list = $("spa-bar-actions");
  list.hidden = false;
  list.replaceChildren();
  for (const drink of SPA_DRINKS) {
    const button = document.createElement("button"),
      name = document.createElement("span"),
      price = document.createElement("small");
    name.textContent = drink.icon + " " + drink.name;
    price.textContent = drink.price + " ✦";
    button.append(name, price);
    button.disabled = game.coins < drink.price;
    button.dataset.drink = drink.id;
    button.onclick = () => {
      try {
        commit(selectSpaDrink(game, drink.id));
        manualActivity({ activityId: "spa-bar" });
      } catch (error) {
        toast(error.message);
      }
    };
    list.append(button);
  }
  open("item-dialog");
}
function showBikiniFriend(id, catId = "chichi") {
  const friend = bikiniFriend(id);
  if (!friend || busy || buildMode || !game.unlocked.includes("bikini")) return;
  selectedItem = id;
  selectedScenery = false;
  $("item-icon").textContent = friend.kind === "sponge" ? "🧽" : "⭐";
  $("item-name").textContent = friend.name;
  $("item-description").textContent =
    catId === "chichi"
      ? "Чичи выбирает, как провести время с морским другом."
      : "Выберите совместное занятие для котика.";
  $("item-construction").textContent = "Бикини-Боттом · дружба и игры";
  $("item-note").textContent =
    friend.kind === "sponge"
      ? "Губка Боб может взять котика на ручки и погулять по дорожкам. Когда есть заказы, он работает на кухне."
      : "Патрик любит компанию, фотографии и крабсбургеры.";
  $("item-move").hidden = $("item-store").hidden = true;
  const actions = $("spa-bar-actions");
  actions.hidden = false;
  actions.replaceChildren();
  for (const [intent, label] of BIKINI_ACTIONS[friend.kind]) {
    const button = document.createElement("button");
    button.className = "primary";
    button.textContent = label;
    button.dataset.bikiniAction = intent;
    button.onclick = () => {
      if (!cloud.editable || cloud.conflict)
        return toast("Дождитесь синхронизации мира.");
      if (catId === "chichi")
        manualActivity({ activityId: id, characterAction: intent });
      else
        try {
          const decision = manualInteraction(
            worldSnapshot(game),
            { activityId: id, characterAction: intent },
            "happy",
          );
          commit(moveResidentToBiome(game, catId, "bikini"));
          $("item-dialog").close();
          if (!world.performResident(catId, decision))
            toast("Друг пока занят. Попробуйте чуть позже.");
        } catch (e) {
          toast(e.message);
        }
    };
    actions.append(button);
  }
  const other = document.createElement("button");
  other.className = "soft";
  other.textContent =
    friend.kind === "sponge" ? "⭐ Пойти к Патрику" : "🧽 Пойти к Губке Бобу";
  other.onclick = () =>
    showBikiniFriend(
      friend.kind === "sponge" ? "bikini-patrick" : "bikini-sponge",
      catId,
    );
  actions.append(other);
  open("item-dialog");
}
function showCourt(id, fishIndex) {
  const o = courtObject(id),
    p = courtProject(game, id);
  if (!o || !p) return;
  if (p.built) {
    world?.enterCourt(id, fishIndex);
    return;
  }
  selectedItem = id;
  selectedScenery = false;
  $("item-icon").textContent = o.icon;
  $("item-name").textContent = o.name;
  $("item-description").textContent = o.description;
  $("item-construction").textContent = p.unstarted
    ? "Строительная площадка · " +
      money(p.price) +
      " ✦ · " +
      p.buildMinutes +
      " мин"
    : "Строится · осталось " + countdown(p.readyAt);
  $("item-note").textContent =
    "После открытия здесь будут работать котики. Доход — монеты и XP; улучшения доступны в разделе «Бизнес». Строительство сохраняется, даже если закрыть игру.";
  $("item-move").hidden = $("item-store").hidden = true;
  const actions = $("spa-bar-actions");
  actions.hidden = false;
  actions.replaceChildren();
  if (p.unstarted) {
    const button = document.createElement("button");
    button.className = "primary";
    button.textContent = "Построить · " + money(p.price) + " ✦";
    button.disabled = game.coins < p.price;
    button.onclick = () => {
      try {
        commit(startCourtConstruction(game, id));
        $("item-dialog").close();
        toast("Котики начинают строить " + o.name + " 🛠️");
      } catch (e) {
        toast(e.message);
      }
    };
    actions.append(button);
  }
  open("item-dialog");
}
function inspect(id, manage = false) {
  $("item-guest-camera").hidden = $("item-attraction-camera").hidden = true;
  $("spa-bar-actions").hidden = true;
  $("item-move").hidden = false;
  if (id === "spa-bar") return showSpaBar();
  if (buildMode) return;
  selectedItem = id;
  selectedScenery = false;
  const placement = game.placements.find((p) => p.id === id);
  if (!placement) return;
  const item = byItem(placement.item);
  if (item.id === "adoption-center" && isBuilt(placement) && !manage) {
    showAdoption(placement.id);
    return;
  }
  $("item-icon").textContent = item.icon;
  $("item-name").textContent = item.name;
  $("item-description").textContent = item.description;
  $("item-construction").textContent = isBuilt(placement)
    ? item.rarity + " · Постройка готова"
    : "Строится · осталось " + countdown(placement.readyAt);
  $("item-store").disabled = busy || !isBuilt(placement);
  $("item-move").disabled = busy;
  $("item-store").hidden = false;
  $("item-move").textContent = "Переставить";
  $("item-note").textContent = revenueRate(item.id)
    ? "Приносит " +
      revenueRate(item.id, businessLevel(game, id)) +
      " " +
      incomeSymbol(item.id) +
      " и " +
      businessXP(item.id, businessLevel(game, id)) +
      " XP в час. Доход можно собрать прямо над постройкой. Улучшения — в разделе «Бизнес»."
    : "Чичи пользуется этим предметом, когда сама выберет его через ИИ.";
  updateGuestCamera();
  open("item-dialog");
}
function updateGuestCamera() {
  const p =
      !selectedScenery && game.placements.find((p) => p.id === selectedItem),
    button = $("item-guest-camera");
  button.hidden = !p || !byItem(p.item)?.actions.includes("ride");
  $("item-attraction-camera").hidden = button.hidden;
  $("item-attraction-camera").disabled = !p || !isBuilt(p);
  if (button.hidden) return;
  const guests = world?.rideGuests(p.id) || [];
  button.disabled = !guests.length;
  button.textContent = guests.length
    ? "📷 Камера гостя · " + guests.length
    : "📷 Камера гостя · ждёт котика";
}
$("item-guest-camera").onclick = () => {
  if (!world?.followRideGuest(selectedItem)) {
    updateGuestCamera();
    return;
  }
  $("item-dialog").close();
  $("map").scrollIntoView({ block: "start", behavior: "smooth" });
};
$("item-attraction-camera").onclick = () => {
  if (!world?.inspectAttraction(selectedItem)) return;
  $("item-dialog").close();
  $("map").scrollIntoView({ block: "start", behavior: "smooth" });
};
setInterval(() => {
  if ($("item-dialog").open) updateGuestCamera();
}, 500);
function inspectScenery(id) {
  $("spa-bar-actions").hidden = true;
  $("item-move").hidden = false;
  if (busy || buildMode) return;
  const record = game.scenery.find((r) => r.id === id);
  if (!record || !game.unlocked.includes(record.biome)) return;
  selectedItem = id;
  selectedScenery = true;
  $("item-guest-camera").hidden = $("item-attraction-camera").hidden = true;
  $("item-icon").textContent = byScenery(record.type).icon;
  $("item-name").textContent = sceneryName(record);
  $("item-description").textContent =
    "Частичка вашего острова. Её можно повернуть, перенести на свободное место или на другой открытый остров.";
  $("item-construction").textContent = record.stored
    ? "В коллекции декораций"
    : byBiome(record.biome).name;
  $("item-note").textContent =
    "Перемещение бесплатно. Новое положение сохраняется сразу.";
  $("item-store").disabled = false;
  $("item-store").hidden = !!record.stored;
  $("item-move").textContent = record.stored
    ? "Вернуть на остров"
    : "Переставить";
  open("item-dialog");
}
function showScenery() {
  if (buildMode || busy) {
    toast("Сначала завершите текущее действие.");
    return;
  }
  const focused = world?.getFocused() || "moon";
  $("scenery-list").replaceChildren();
  const records = game.scenery
    .filter((r) => game.unlocked.includes(r.biome))
    .sort(
      (a, b) =>
        (a.biome === focused ? -1 : 0) - (b.biome === focused ? -1 : 0) ||
        a.biome.localeCompare(b.biome),
    );
  for (const record of records) {
    const button = document.createElement("button");
    button.className = "scenery-row";
    button.dataset.scenery = record.id;
    const icon = document.createElement("span");
    icon.textContent = byScenery(record.type).icon;
    const text = document.createElement("span");
    text.textContent = sceneryName(record);
    const small = document.createElement("small");
    small.textContent =
      (record.stored ? "В коллекции · " : "") + byBiome(record.biome).name;
    text.append(small);
    button.append(icon, text);
    button.onclick = () => {
      world?.focus(record.biome);
      inspectScenery(record.id);
    };
    $("scenery-list").append(button);
  }
  open("scenery-dialog");
}
$("scenery-open").onclick = showScenery;
$("item-move").onclick = () => {
  const p = (selectedScenery ? game.scenery : game.placements).find(
    (p) => p.id === selectedItem,
  );
  $("item-dialog").close();
  if (p)
    beginPlacement(selectedScenery ? p.type : p.item, p.id, selectedScenery);
};
$("item-store").onclick = () => {
  try {
    commit(
      selectedScenery
        ? storeScenery(game, selectedItem)
        : storeItem(game, selectedItem),
    );
    $("item-dialog").close();
    toast(
      selectedScenery
        ? "Декорация в коллекции. Вернуть её можно кнопкой «Декор»."
        : "Предмет вернулся в сумку. Можно разместить его в другом месте.",
    );
  } catch (error) {
    toast(error.message);
  }
};
try {
  await restoreSculptCache();
  world = createWorld($("map"), game, {
    canSimulateLeisure: () =>
      cloud.simulationOwner && cloud.editable && !cloud.conflict,
    isHeroBusy: () => busy || !!buildMode,
    onLeisureComplete: (id, visit, result) => {
      if (!cloud.simulationOwner || !cloud.editable || cloud.conflict) return;
      try {
        if (id === "chichi" && result?.completed)
          effects(
            {
              leisure: true,
              mood: "happy",
              action: visit.offer.action,
              activityId: visit.offer.id,
              thought: "Пригода у вільний час",
            },
            "ai",
            result,
          );
        const next = completeLeisure(
          game,
          id,
          visit.day,
          visit.index,
          visit.offer.biome,
        );
        if (next !== game) commit(next);
      } catch (error) {
        $("save-state").textContent = error.message;
      }
    },
    canDragCat: (id = "chichi") =>
      cloud.editable && !cloud.conflict && (id !== "chichi" || !busy),
    onPreview: previewChanged,
    onSelectItem: inspect,
    onSelectCourt: showCourt,
    onSelectJobCity: (id) => cityUI.open(id),
    onCityDrive: (id, car, point) => {
      try {
        commit(startCatDrive(pauseCatCareer(game, id), id, car, point));
        toast("Котик сідає за кермо");
      } catch (e) {
        toast(e.message);
      }
    },
    onJobAttendance: (id, job, active) => {
      if (!cloud.simulationOwner || cloud.conflict) return;
      queueAttendance(id, job, active);
    },
    onCityTripDone: (id, trip, position) => {
      if (!cloud.simulationOwner || cloud.conflict) return;
      try {
        const next = finishCatDrive(game, id, trip, position);
        if (next !== game) commit(next, false);
      } catch (e) {
        $("save-state").textContent = e.message;
      }
    },
    onSelectBikiniFriend: showBikiniFriend,
    onCourtOrder: (id) => manualActivity({ activityId: id }),
    onSelectScenery: inspectScenery,
    onSelectBowl: () => showBowl(),
    onSelectSpaBar: () => showSpaBar(),
    onSpaVisit: (receipt) => {
      if (
        !cloud.editable ||
        cloud.conflict ||
        (!receipt.manual && !cloud.simulationOwner)
      )
        return;
      try {
        commit(completeSpaVisit(game, receipt));
      } catch (error) {
        $("save-state").textContent = error.message;
      }
    },
    onCollectIncome: collectBusiness,
    onResidentDrop: (id, selection, biome, point) => {
      if (!cloud.editable || cloud.conflict) return false;
      if (game.jobCity?.profiles[id]) commit(pauseCatCareer(game, id), false);
      try {
        if (selection?.friendId === "chichi") {
          if (busy) {
            toast("Чичи зараз зайнята. Спробуйте після її пригоди.");
            return false;
          }
          commit(moveResidentToBiome(game, id, biome));
          if (!world.moveResident(id, biome, { nearChichi: true }))
            return false;
          return manualActivity({ friendId: id });
        }
        const decision = selection
          ? manualInteraction(worldSnapshot(game), selection, "happy")
          : null;
        commit(moveResidentToBiome(game, id, biome));
        const started = decision
          ? world.performResident(id, decision)
          : world.moveResident(id, biome, point);
        if (!started)
          toast("Зараз тут зайнято. Оберіть інший предмет або вільне місце.");
        return started;
      } catch (error) {
        toast(error.message);
        return false;
      }
    },
    onResidentAction: (id, decision) => {
      if (!cloud.editable || cloud.conflict) return;
      try {
        commit(completeResidentAction(game, id, decision));
      } catch (error) {
        toast(error.message);
      }
    },
    onResidentSwam: (id) => {
      if (!cloud.simulationOwner) return;
      try {
        commit(residentSwam(game, id));
      } catch (error) {
        $("save-state").textContent = error.message;
      }
    },
    onResidentAte: (id) => {
      if (!cloud.simulationOwner) return;
      try {
        if (!bowlPortions(game)) return false;
        commit(eatFromBowl(game, id).game);
        return true;
      } catch (error) {
        $("save-state").textContent = error.message;
        return false;
      }
    },
    onLockedBiome: (id) => showShop("lands", byBiome(id).name),
    onSelectIsland: (id) => showIsland(id),
    onCatDrop: (selection) => {
      if (selection?.unavailable) {
        toast(
          "Этот предмет ещё строится. Чичи сможет пользоваться им, когда он будет готов.",
        );
        return false;
      }
      if (selection) return manualActivity(selection);
      toast(
        "Перетащите Чичи на игрушку, готовый аттракцион, ферму или к другому котику.",
      );
      return false;
    },
    onReaction: (text) => ($("bubble").textContent = text),
    onCameraMode: (enabled, target) => {
      const chichi = enabled && target?.id === "chichi";
      $("chichi-camera").setAttribute("aria-pressed", String(chichi));
      $("camera-random-cat").setAttribute(
        "aria-pressed",
        String(enabled && !chichi),
      );
      $("camera-random-cat").title = enabled
        ? "Сейчас: " + target.name + " · нажмите для другого котика"
        : "Приблизиться к случайному котику и следовать за ним";
      $("chichi-camera-label").textContent = chichi
        ? "Повернути звичайний огляд світу"
        : "Камера Чичі · ближче до мордочки";
      $("camera-follow-exit").hidden = !enabled;
    },
    onFocus: (id, overview) => {
      $("biome-name").textContent = overview
        ? "Мир чудес · " + BIOMES.length + " острова"
        : byBiome(id).name;
      renderBiomes();
    },
  });
  $("world-loading").remove();
  scheduleSculptCache();
} catch (error) {
  console.error("3D rendering unavailable:", error.message);
  $("world-loading").textContent =
    "3D недоступно на этом устройстве. Уход, ИИ и магазин продолжают работать.";
  const fallback = document.createElement("span");
  fallback.className = "fallback-cat";
  fallback.id = "fallback-cat";
  fallback.textContent = "🐈";
  $("map").append(fallback);
}
$("camera-home").onclick = () => world?.focus("moon");
$("camera-all").onclick = () => world?.overview();
$("camera-island").onclick = () => world?.islandOverview();
$("camera-random-cat").onclick = () => world?.followRandomCat();
$("zoom-in").onclick = () => world?.zoom(-5);
$("zoom-out").onclick = () => world?.zoom(5);
$("chichi-camera").onclick = () => {
  world?.followChichi();
  $("care-dialog").close();
  $("map").scrollIntoView({
    block: "start",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
};
$("camera-follow-exit").onclick = () => world?.followChichi(false);
function renderBowl() {
  const portions = bowlPortions(game);
  $("bowl-summary").textContent = portions
    ? portions +
      " порций из " +
      BOWL_CAPACITY +
      ". Соседи подходят к миске, когда голодны. Чичи можно перетащить к ней."
    : "Миска пустая. Соберите готовый урожай на ферме и положите его сюда.";
  $("bowl-stock").replaceChildren();
  const available = CROPS.filter((c) => (game.farm.stock[c.id] || 0) > 0);
  for (const crop of available) {
    const row = document.createElement("div");
    row.className = "bowl-stock-row";
    const label = document.createElement("span");
    label.textContent = crop.icon + " " + crop.name;
    const small = document.createElement("small");
    small.textContent =
      "На складе: " +
      game.farm.stock[crop.id] +
      " · 1 урожай = " +
      foodYield(crop) +
      " порций";
    label.append(small);
    row.append(label);
    for (const quantity of [1, 3])
      if (game.farm.stock[crop.id] >= quantity) {
        const button = document.createElement("button");
        button.className = "primary";
        button.textContent = "Добавить " + quantity;
        button.dataset.feedcrop = crop.id;
        button.dataset.quantity = quantity;
        button.onclick = () => {
          try {
            commit(fillBowl(game, crop.id, quantity));
            toast("Урожай в миске. Котики смогут поесть.");
          } catch (error) {
            toast(error.message);
          }
        };
        row.append(button);
      }
    $("bowl-stock").append(row);
  }
  if (!available.length) {
    const empty = document.createElement("p");
    empty.className = "dialog-copy";
    empty.textContent =
      "На складе нет урожая. На стартовых грядках уже ждёт пшеница: перетащите туда Чичи, чтобы собрать её.";
    $("bowl-stock").append(empty);
  }
}
function showBowl() {
  renderBowl();
  open("bowl-dialog");
}
$("bowl-open").onclick = showBowl;
$("bowl-farm").onclick = () => showFarm();
$("cloud-save-open").onclick = () => {
  $("recovery-code").value =
    cloud.token || "Код недоступен: разрешите сохранение в браузере.";
  $("account-code").value = storage.getItem("chichi-account-code") || "1427";
  open("cloud-save-dialog");
};
async function connectAccount() {
  if (busy || buildMode) {
    toast("Сначала завершите действие.");
    return;
  }
  for (const id of ["account-login"]) $(id).disabled = true;
  try {
    let token;
    try {
      token = await cloud.account("login", $("account-code").value);
    } catch (error) {
      if (!error.message.includes("пока не создан")) throw error;
      try {
        token = await cloud.account("create", $("account-code").value);
      } catch (createError) {
        if (!createError.message.includes("уже связан")) throw createError;
        token = await cloud.account("login", $("account-code").value);
      }
    }
    if (token === cloud.token) {
      await syncShared();
      toast("Вы в общем мире. На втором телефоне введите этот же код.");
    } else {
      await cloud.releaseEditor();
      await cloud.recover(token, (raw) => {
        cloud.archive(game);
        const restored = loadGame({
          getItem: (key) => (key === SAVE_KEY ? JSON.stringify(raw) : null),
        });
        if (!saveGame(storage, restored))
          throw Error("Не удалось записать мир. Текущая копия сохранена.");
      });
      location.reload();
    }
  } catch (e) {
    toast(e.message);
  } finally {
    for (const id of ["account-login"]) $(id).disabled = false;
  }
}

$("account-login").onclick = () => connectAccount();
$("cloud-load-latest").onclick = async () => {
  if (busy || buildMode) return toast("Сначала завершите действие.");
  try {
    await cloud.recover(cloud.token, (raw) => {
      cloud.archive(game);
      installRemote(raw);
    });
    location.reload();
  } catch (e) {
    toast(e.message);
  }
};
$("account-archive").onclick = () => {
  try {
    const archived = JSON.parse(
      storage.getItem("chichi-world-archives") || "[]",
    )[0];
    if (!archived)
      return toast("При смене мира здесь появится его отдельная копия.");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(archived.game)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "chichi-previous-world.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    toast("Не удалось скачать прежний мир.");
  }
};
$("account-open").onclick = () => $("cloud-save-open").click();
$("recovery-copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(cloud.token);
    toast("Код скопирован. Сохраните его у себя.");
  } catch {
    $("recovery-code").select();
    toast("Выделенный код можно скопировать вручную.");
  }
};
$("cloud-retry").onclick = () => {
  cloud.flush();
};
$("recovery-restore").onclick = async () => {
  if (busy || buildMode) {
    toast("Сначала завершите текущее действие.");
    return;
  }
  $("recovery-restore").disabled = true;
  try {
    const raw = await cloud.recover($("recovery-enter").value, (raw) => {
        const restored = loadGame({
          getItem: (key) => (key === SAVE_KEY ? JSON.stringify(raw) : null),
        });
        cloud.archive(game);
        if (!saveGame(storage, restored))
          throw Error(
            "Не удалось записать восстановленный мир. Текущий мир сохранён.",
          );
      }),
      restored = loadGame({
        getItem: (key) => (key === SAVE_KEY ? JSON.stringify(raw) : null),
      });
    game = restored;
    location.reload();
  } catch (error) {
    toast(error.message);
  } finally {
    $("recovery-restore").disabled = false;
  }
};
function effects(decision, source = "ai", result = {}) {
  let next = structuredClone(game),
    message = null;
  const action = decision.action || "explore";
  if (action === "farm") {
    const cells = next.farm.fields[decision.activityId] || [];
    if (cells.some((c) => c.crop && Date.now() >= c.readyAt)) {
      const harvested = harvestField(next, decision.activityId);
      next = harvested.game;
      message =
        "Чичи собрала урожай: " +
        harvested.count +
        ". Его можно продать или положить в общую миску.";
    } else {
      const empty = cells.findIndex((c) => !c.crop);
      if (empty >= 0) {
        const selected = CROPS.find((c) => c.id === farmCrop);
        const crop =
          source === "ai" &&
          (!selected ||
            !next.unlocked.includes(selected.biome) ||
            selected.seed > next.coins)
            ? CROPS.filter(
                (c) => next.unlocked.includes(c.biome) && c.seed <= next.coins,
              ).sort((a, b) => a.seed - b.seed)[0]
            : selected;
        if (!crop)
          throw Error(
            "Не хватает монет на семена. Соберите доход бизнеса или выберите другое занятие.",
          );
        next = plantCrop(next, decision.activityId, empty, crop.id);
        message = "Чичи посадила " + crop.name + ".";
      } else message = "Урожай ещё растёт.";
    }
  }
  if (action === "meet" && result.completed) {
    const intent =
      result.socialKind ||
      encounterKind(next, decision.friendId, decision.socialIntent);
    next = recordSocialEncounter(next, decision.friendId, intent, source);
    decision = { ...decision, socialIntent: intent };
    const r = next.social.relationships[decision.friendId],
      n = NEIGHBORS.find((n) => n.id === decision.friendId);
    message =
      n.name +
      " · " +
      stageLabel(relationshipStage(r, next.social.bestFriendId === n.id)) +
      " · " +
      r.meetings +
      " встреч";
  }
  if (action === "party" && result.completed)
    for (const id of result.participantIds || [])
      next = recordSocialEncounter(next, id, "party", source);
  if (!result.spaVisit && ["play", "ride", "party", "swim"].includes(action)) {
    next.cat.energy = clamp(next.cat.energy - 6);
    next.cat.hunger = clamp(next.cat.hunger + 5);
    next.cat.happiness = clamp(next.cat.happiness + 12);
  }
  if (action === "meet") {
    next.cat.happiness = clamp(next.cat.happiness + 8);
    next.cat.energy = clamp(next.cat.energy - 2);
  }
  if (result.spaVisit) next = completeSpaVisit(next, result.spaVisit);
  else {
    if (action === "eat") next = eatFromBowl(next).game;
    if (action === "rest") {
      if (decision.leisure) next.cat.energy = clamp(next.cat.energy + 24);
      else next = startRest(next, decision.activityId);
    }
  }
  next = recordInteraction(next, decision, source);
  if (result.completed && source !== "care") next = adventureXP(next);
  const reward = attentionReward(next, Date.now(), source !== "care");
  commit(reward.game);
  if (message) toast(message);
  else if (reward.amount)
    toast("За совместное приключение +" + reward.amount + " ✦");
}
function validateDecision(value) {
  if (
    !value ||
    !["sleep", "crazy hungry", "happy"].includes(value.mood) ||
    typeof value.thought !== "string"
  )
    throw Error("ИИ вернул некорректное решение.");
  return { ...value, ...resolveInteraction(worldSnapshot(game), value) };
}

async function decide(demo = false, manualDecision = null, routine = false) {
  if (!cloud.editable || cloud.conflict) {
    toast("Дождитесь синхронизации в аккаунте перед приключением.");
    return;
  }
  if (busy) return;
  if (buildMode) {
    toast("Сначала завершите или отмените размещение.");
    return;
  }
  if (!demo && !manualDecision && !configured) {
    $("status").textContent =
      "Cloudflare AI пока не подключён. Демо доступно отдельно.";
    return;
  }
  busy = true;
  for (const id of ["toggle", "demo"]) $(id).disabled = true;
  $("toggle").textContent = "Чичи выбирает приключение…";
  try {
    let decision;
    if (manualDecision) {
      decision = manualDecision;
    } else if (demo) {
      const mood =
        game.cat.energy < 30
          ? "sleep"
          : game.cat.hunger > 60
            ? "crazy hungry"
            : "happy";
      const snapshot = worldSnapshot(game);
      const objects = snapshot.activities.filter(
        (a) => !HOME_OBJECTS.some((o) => o.id === a.id),
      );
      if (mood === "happy" && steps % 3 === 2 && snapshot.friends.length) {
        decision = manualInteraction(
          snapshot,
          { friendId: snapshot.friends[steps % snapshot.friends.length].id },
          mood,
        );
      } else {
        const id =
          mood === "sleep"
            ? "chichi-bed"
            : mood === "crazy hungry" && bowlPortions(game) > 0
              ? "chichi-food"
              : objects[steps % objects.length]?.id || "chichi-bed";
        decision = manualInteraction(snapshot, { activityId: id }, mood);
      }
      decision.thought = "Демо: " + decision.thought;
    } else {
      $("status").textContent =
        "ИИ учитывает потребности, доступные чудеса и друзей…";
      const response = await fetch(api("/api/decide"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...game.cat, world: worldSnapshot(game) }),
        signal: AbortSignal.timeout(30000),
      });
      decision = await response.json();
      if (!response.ok)
        throw Error(decision.error || "Не удалось получить решение ИИ.");
    }
    decision = validateDecision(decision);
    const next = structuredClone(game);
    next.care.resting = null;
    next.cat.location = decision.target;
    next.cat.mood = decision.mood;
    commit(next);
    $("bubble").textContent = decision.thought;
    $("steps").textContent = ++steps + " решений";
    $("mood-badge").textContent =
      decision.mood +
      (routine
        ? " · повседневный уход"
        : manualDecision
          ? " · ручная команда"
          : demo
            ? " · демо"
            : " · выбор ИИ");
    $("mode").textContent = routine
      ? "Повседневный уход"
      : manualDecision
        ? "Ручная команда"
        : demo
          ? "Демо · без ИИ"
          : "Cloudflare AI";
    const actionNames = {
      explore: "Исследует",
      play: "Играет",
      ride: "Катается",
      swim: "Плавает",
      meet: "Знакомится",
      party: "На вечеринке",
      rest: "Отдыхает",
      eat: "Перекусывает",
      farm: "На ферме",
    };
    $("cat-activity").textContent = actionNames[decision.action || "explore"];
    $("toggle").textContent =
      "Чичи " +
      (actionNames[decision.action || "explore"] || "гуляет").toLowerCase() +
      "…";
    $("status").textContent = decision.thought;
    const li = document.createElement("li");
    li.textContent =
      (demo ? "Демо · " : decision.mood + " · ") + decision.thought;
    $("diary").prepend(li);
    while ($("diary").children.length > 4) $("diary").lastChild.remove();
    if ($("fallback-cat"))
      $("fallback-cat").textContent = {
        sleep: "😴",
        "crazy hungry": "🙀",
        happy: "😺",
      }[decision.mood];
    if (game.jobCity?.profiles.chichi)
      commit(pauseCatCareer(game, "chichi"), false);
    const result = await world?.perform(decision, {
      manualFriendDrop: !!manualDecision && !!decision.friendId,
    });
    if (result?.cancelled) {
      $("cat-activity").textContent = "Ждёт новое занятие";
      $("status").textContent =
        "Занятие отменено: выбранный предмет больше недоступен.";
      return;
    }
    effects(
      decision,
      routine ? "care" : manualDecision ? "manual" : demo ? "demo" : "ai",
      result,
    );
    $("status").textContent = routine
      ? "Чичи перекусила. Одна порция ушла из общей миски."
      : manualDecision
        ? "Чичи закончила занятие по вашей команде."
        : demo
          ? "Демо: выбор сделан локально без ИИ."
          : "Чичи решила! Настроение и занятие выбрал Cloudflare AI.";
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    busy = false;
    for (const id of ["toggle", "demo"]) $(id).disabled = false;
    $("toggle").textContent = buttonLabel;
    farmViewKey = "";
    if ($("farm-dialog").open) renderFarm();
    cloud.acceptSnapshot();
  }
}
$("toggle").onclick = () => decide();
$("demo").onclick = () => decide(true);
setInterval(() => {
  if (!document.hidden) world?.sync(game);
  if (!cloud.simulationOwner || cloud.conflict || document.hidden) {
    updateTimers();
    return;
  }
  renderRewards();
  const reward = claimRewards(game, Date.now(), true);
  if (reward.rewards.length) {
    try {
      commit(reward.game, false);
    } catch (error) {
      $("save-state").textContent = error.message;
      return;
    }
    toast(
      reward.rewards
        .map(
          (r) =>
            (r.type === "login" ? "За визит +" : "Почасовая награда +") +
            r.amount +
            " ✦",
        )
        .join(" · "),
    );
  }
  updateTimers();
}, 1000);
setInterval(() => {
  if (document.hidden || !cloud.simulationOwner || cloud.conflict) return;
  const next = advanceCare(game);
  if (next !== game)
    try {
      commit(next);
    } catch (error) {
      $("save-state").textContent = error.message;
    }
  if (
    !busy &&
    !buildMode &&
    !game.care.resting &&
    game.cat.hunger >= 50 &&
    bowlPortions(game) > 0 &&
    !document.querySelector("dialog[open]")
  ) {
    const decision = manualInteraction(
      worldSnapshot(game),
      { activityId: "chichi-food" },
      game.cat.mood,
    );
    decision.thought = "В общей миске есть урожай. Пойду тихонько перекушу.";
    decide(false, decision, true);
  }
}, 5000);
function installRemote(raw) {
  const restored = loadGame({
    getItem: (key) => (key === SAVE_KEY ? JSON.stringify(raw) : null),
  });
  if (!saveGame(storage, restored))
    throw Error("Не удалось записать общий мир на устройстве.");
  game = restored;
  world?.sync(game);
  renderGame();
  if ($("shop-dialog").open) renderShop();
  if ($("business-dialog").open) renderBusiness();
  if ($("farm-dialog").open) renderFarm();
  if ($("adoption-dialog").open) renderAdoption();
}
const syncShared = (claim = false) =>
  cloud.sync(installRemote, { canInstall: () => !busy && !buildMode, claim });
setInterval(() => {
  if (!document.hidden) syncShared();
}, 5000);
window.addEventListener("online", () => syncShared(true));
window.addEventListener("offline", () => {
  cloud.simulationOwner = false;
  cloudStatusChanged("offline");
});
window.addEventListener("pagehide", () => {
  if(cloud.simulationOwner)persist();
  cloud.releaseEditor();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if(cloud.simulationOwner)persist();
    cloud.releaseEditor();
  }
  else syncShared(true);
});
window.addEventListener("storage", (event) => {
  if (event.key === "chichi-recovery-code" && event.newValue !== cloud.token) {
    clearTimeout(cloud.timer);
    cloud.conflict = true;
    try {
      cloud.archive(game);
    } catch {}
    // Another tab changed the account. Do not write this tab's old world
    // into the new account's local primary snapshot.
    const reloadWhenIdle = () => {
      if (busy || buildMode) setTimeout(reloadWhenIdle, 300);
      else location.reload();
    };
    reloadWhenIdle();
    return;
  }
  // A second tab must get the cloud revision too, rather than writing with stale metadata.
  if (
    [SAVE_KEY, "chichi-cloud-save"].includes(event.key) &&
    !busy &&
    !buildMode
  )
    syncShared();
});
persist();
renderGame();
if (matchMedia("(max-width:600px)").matches)
  document.querySelector(".orbit-hint").textContent =
    "Чичи — к игрушке или котику · масштаб двумя пальцами";
if (firstRewards.rewards.length)
  toast(
    "Рады видеть вас! +" +
      firstRewards.rewards.reduce((n, r) => n + r.amount, 0) +
      " ✦",
  );
function countdown(timestamp) {
  const seconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
  if (!seconds) return "готово";
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds / 60) % 60);
  return (
    (hours ? hours + " ч " : "") + minutes + " мин " + (seconds % 60) + " с"
  );
}
function showFarm(id = null) {
  farmSelected = id || farmSelected;
  farmViewKey = "";
  renderFarm();
  open("farm-dialog");
}
function renderFarm() {
  const farms = game.placements.filter(
    (p) => byItem(p.item).category === "farm",
  );
  if (!farms.some((p) => p.id === farmSelected)) farmSelected = farms[0]?.id;
  const chosen = farms.find((p) => p.id === farmSelected),
    cells = game.farm.fields[farmSelected] || [];
  const key = JSON.stringify([
    farms.map((p) => [p.id, isBuilt(p)]),
    cells.map((c) => [c.crop, c.readyAt, c.crop && Date.now() >= c.readyAt]),
    game.coins,
    game.farm.stock,
    Object.entries(game.farm.jobs).map(([id, time]) => [
      id,
      Date.now() >= time,
    ]),
    game.unlocked,
    farmSelected,
  ]);
  if (key === farmViewKey) return;
  farmViewKey = key;
  $("farm-field").replaceChildren();
  for (const p of farms) {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent =
      byItem(p.item).name +
      " · " +
      byBiome(p.biome).name +
      (isBuilt(p) ? "" : " · строится");
    $("farm-field").append(option);
  }
  $("farm-field").value = farmSelected || "";
  $("farm-crop").replaceChildren();
  for (const crop of CROPS.filter((c) => game.unlocked.includes(c.biome))) {
    const option = document.createElement("option");
    option.value = crop.id;
    option.textContent =
      crop.icon +
      " " +
      crop.name +
      " · " +
      buildTimeLabel(crop.minutes) +
      " · семена " +
      crop.seed +
      " ✦";
    $("farm-crop").append(option);
  }
  if (!CROPS.some((c) => c.id === farmCrop && game.unlocked.includes(c.biome)))
    farmCrop = "wheat";
  $("farm-crop").value = farmCrop;
  $("farm-command").disabled = busy || !chosen || !isBuilt(chosen);
  $("farm-plots").replaceChildren();
  if (!chosen) {
    const empty = document.createElement("p");
    empty.className = "shop-empty";
    empty.textContent = "Купите и разместите грядки, чтобы начать фермерство.";
    $("farm-plots").append(empty);
  } else if (!isBuilt(chosen)) {
    const empty = document.createElement("p");
    empty.className = "shop-empty";
    empty.dataset.until = chosen.readyAt;
    empty.textContent = "Ферма строится · " + countdown(chosen.readyAt);
    $("farm-plots").append(empty);
  } else
    for (let index = 0; index < 3; index++) {
      const cell = cells[index] || { crop: null, readyAt: 0 },
        crop = CROPS.find((c) => c.id === cell.crop),
        ready = cell.crop && Date.now() >= cell.readyAt;
      const card = document.createElement("article");
      card.className = "farm-plot" + (ready ? " ready" : "");
      const icon = document.createElement("span"),
        title = document.createElement("h3"),
        text = document.createElement("p"),
        button = document.createElement("button");
      icon.textContent = crop ? crop.icon : "🌱";
      title.textContent = crop ? crop.name : "Грядка " + (index + 1);
      text.textContent = crop
        ? ready
          ? "Урожай созрел!"
          : "Растёт · " + countdown(cell.readyAt)
        : "Здесь можно посадить что-то вкусное.";
      if (crop && !ready) text.dataset.until = cell.readyAt;
      button.textContent = crop
        ? ready
          ? "Чичи, собрать!"
          : "Созревает…"
        : "Посадить · " + CROPS.find((c) => c.id === farmCrop).seed + " ✦";
      button.disabled = (!!crop && !ready) || busy;
      button.onclick = () => {
        try {
          if (ready) manualFarm(farmSelected);
          else commit(plantCrop(game, farmSelected, index, farmCrop));
        } catch (error) {
          toast(error.message);
        }
      };
      card.append(icon, title, text, button);
      $("farm-plots").append(card);
    }
  const stock = Object.entries(game.farm.stock)
    .filter(([id, qty]) => qty > 0)
    .map(
      ([id, qty]) =>
        (CROPS.find((c) => c.id === id)?.name ||
          JOBS.find((j) => j.resource === id)?.name ||
          id) +
        " ×" +
        qty,
    );
  const receipt = game.farm.sales?.at(-1);
  $("farm-stock-text").textContent =
    (stock.length ? stock.join(" · ") : "Склад пуст. Соберите урожай.") +
    (receipt
      ? " · Последняя продажа: +" +
        money(receipt.value) +
        " ✦, начислено и сохранено"
      : "");
  $("farm-level").textContent =
    "Фермерский уровень " +
    (1 + Math.floor(game.farm.harvests / 10)) +
    " · Собрано " +
    game.farm.harvests +
    " урожаев";
  $("farm-sell").textContent = "Продать всё · " + stockValue(game) + " ✦";
  $("farm-sell").disabled = busy || stockValue(game) === 0;
  $("farm-jobs").replaceChildren();
  for (const job of JOBS) {
    const unlocked = job.biomes.some((id) => game.unlocked.includes(id)),
      until = game.farm.jobs[job.id] || 0;
    const button = document.createElement("button");
    button.className = "job-card";
    button.disabled = !unlocked || Date.now() < until;
    const title = document.createElement("b"),
      text = document.createElement("small");
    title.textContent = job.icon + " " + job.name;
    text.textContent = !unlocked
      ? "Откроется: " + byBiome(job.biomes[0]).name
      : Date.now() < until
        ? countdown(until)
        : "Собрать ресурс · стоимость " + job.value + " ✦";
    if (unlocked && Date.now() < until) text.dataset.until = until;
    button.append(title, text);
    button.onclick = () => {
      try {
        commit(gatherResource(game, job.id));
        toast(job.name + ": ресурс добавлен на склад.");
      } catch (error) {
        toast(error.message);
      }
    };
    $("farm-jobs").append(button);
  }
}
function manualActivity(selection) {
  if (busy) {
    toast("Чичи уже выбирает или занимается приключением.");
    return false;
  }
  try {
    const decision = manualInteraction(
      worldSnapshot(game),
      selection,
      game.cat.mood,
    );
    for (const dialog of document.querySelectorAll("dialog[open]"))
      dialog.close();
    decide(false, decision);
    return true;
  } catch (error) {
    toast(error.message);
    return false;
  }
}
function manualFarm(id = null) {
  const farm = game.placements.find(
    (p) =>
      (id ? p.id === id : byItem(p.item).category === "farm") && isBuilt(p),
  );
  if (!farm) {
    toast("Нужна готовая ферма.");
    return;
  }
  manualActivity({ activityId: farm.id });
}

function updateTimers() {
  if ($("island-dialog").open) renderIslandProjects();
  for (const node of document.querySelectorAll("[data-until]"))
    node.textContent = countdown(Number(node.dataset.until));
  if ($("farm-dialog").open) renderFarm();
  if ($("item-dialog").open && !selectedScenery) {
    const p = game.placements.find((p) => p.id === selectedItem);
    if (p) {
      $("item-construction").textContent = isBuilt(p)
        ? byItem(p.item).rarity + " · Постройка готова"
        : "Строится · осталось " + countdown(p.readyAt);
      $("item-store").disabled = !isBuilt(p);
    }
  }
}
$("farm-open").onclick = () => showFarm();
$("farm-field").onchange = (e) => {
  farmSelected = e.target.value;
  farmViewKey = "";
  renderFarm();
};
$("farm-crop").onchange = (e) => {
  farmCrop = e.target.value;
  farmViewKey = "";
  renderFarm();
};
$("farm-command").onclick = () => manualFarm(farmSelected);
$("farm-sell").onclick = () => {
  if (busy) {
    toast("Дождитесь, пока Чичи закончит собирать урожай.");
    return;
  }
  try {
    const sale = sellHarvest(game);
    commit(sale.game);
    toast("Урожай продан! +" + sale.value + " ✦");
  } catch (error) {
    toast(error.message);
  }
};
$("save-export").onclick = () => {
  const file = new Blob([JSON.stringify(game, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(file),
    link = document.createElement("a");
  link.href = url;
  link.download = "chichi-save.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("save-import").onclick = () => $("save-file").click();
$("save-file").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200000) throw Error("Файл сохранения слишком большой.");
    const content = await file.text(),
      raw = JSON.parse(content);
    if (raw.version !== 2 || !Number.isSafeInteger(raw.coins) || raw.coins < 0)
      throw Error("Это не сохранение Чичи.");
    const restored = loadGame({
      getItem: (key) => (key === SAVE_KEY ? content : null),
    });
    commit(restored);
    location.reload();
  } catch (error) {
    toast(error.message);
  } finally {
    e.target.value = "";
  }
};

try {
  const response = await fetch(api("/api/status"));
  if (!response.ok) throw Error();
  ({ configured } = await response.json());
  $("mode").textContent = configured ? "Cloudflare AI" : "ИИ не подключён";
  $("status").textContent = configured
    ? "Чичи выбирает настроение и занятия сама. Нажмите кнопку."
    : "Cloudflare AI пока не подключён. Можно посмотреть отдельное демо.";
} catch {
  $("mode").textContent = "ИИ не подключён";
  $("status").textContent =
    "Не удалось подключиться к Cloudflare AI. Демо доступно отдельно.";
}

function showAdoption(id = null) {
  adoptionCenterId = id || adoptionCenters(game)[0]?.id;
  renderAdoption();
  open("adoption-dialog");
  prepareCatPortraits(ADOPTION_CATS.map(catAppearance), (id, src) => {
    const image = document.querySelector(`[data-adopt-portrait="${id}"]`);
    if (image) {
      image.src = src;
      image.classList.remove("portrait-loading");
    }
  }).catch(() => {});
}
function renderAdoption() {
  const centers = adoptionCenters(game);
  if (!centers.some((c) => c.id === adoptionCenterId))
    adoptionCenterId = centers[0]?.id;
  const query = $("adoption-search").value.trim().toLocaleLowerCase("ru");
  const collection = $("adoption-filter").value;
  const viewKey = JSON.stringify([
    query,
    collection,
    adoptionCenterId,
    centers.map((c) => c.id),
    game.coins,
    game.progression.xp,
    game.adoption.cats,
  ]);
  if (viewKey === adoptionViewKey) return;
  adoptionViewKey = viewKey;
  $("adoption-note").textContent = centers.length
    ? "Усыновление — навсегда. Котик появится у центра, начнёт знакомиться, играть и есть из общей миски."
    : "Сначала купите Cat Adoption Center в магазине и дождитесь окончания стройки.";
  $("adoption-build").hidden = !!centers.length;
  $("adoption-manage").hidden = !centers.length;
  $("adoption-centers").replaceChildren();
  for (const p of centers) {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = "Центр · " + byBiome(p.biome).name;
    $("adoption-centers").append(option);
  }
  $("adoption-centers").value = adoptionCenterId || "";
  $("adoption-centers").hidden = centers.length < 2;
  $("adoption-grid").replaceChildren();
  for (const cat of ADOPTION_CATS.filter(
    (c) =>
      (collection === "all" ||
        (collection === "tiny" && c.tiny) ||
        (collection === "adult" && !c.tiny) ||
        (collection === "plump" &&
          ["giant", "colossal"].includes(catAppearance(c).build)) ||
        c.collection === collection) &&
      (
        c.name +
        " " +
        BREEDS[c.breed].name +
        " " +
        c.personality +
        " " +
        (c.rarity || "")
      )
        .toLocaleLowerCase("ru")
        .includes(query),
  ).sort((a, b) => a.requiredLevel - b.requiredLevel || a.price - b.price)) {
    const owned = game.adoption.cats.some((c) => c.id === cat.id),
      locked = levelRequirement(game, cat.requiredLevel);
    const card = document.createElement("article");
    card.className = "adopt-card" + (cat.magic ? " adopt-magic" : "");
    const image = document.createElement("img");
    image.dataset.adoptPortrait = cat.id;
    image.alt = cat.name + " · " + BREEDS[cat.breed].name;
    const portraitReady = catPortraits.has(cat.id);
    image.classList.toggle("portrait-loading", !portraitReady);
    image.loading = "lazy";
    image.decoding = "async";
    if (portraitReady) image.src = catPortraits.get(cat.id);
    const title = document.createElement("h3"),
      type = document.createElement("small"),
      text = document.createElement("p"),
      button = document.createElement("button");
    title.textContent = cat.name;
    title.append(catSexBadge(cat));
    type.textContent =
      (cat.tiny ? "Малыш · " : "") +
      (cat.rarity ? cat.rarity + " · " : "") +
      BREEDS[cat.breed].name +
      " · уровень " +
      cat.requiredLevel;
    text.textContent = cat.personality;
    button.className = "primary";
    button.dataset.adopt = cat.id;
    button.textContent = owned
      ? "Уже дома ♥"
      : locked
        ? "Уровень " + cat.requiredLevel
        : "Усыновить · " + money(cat.price) + " ✦";
    button.disabled =
      owned || !!locked || !adoptionCenterId || game.coins < cat.price;
    button.onclick = () => {
      try {
        commit(adoptCat(game, cat.id, adoptionCenterId));
        toast(cat.name + " теперь с нами ♥");
      } catch (e) {
        toast(e.message);
      }
    };
    card.append(image, title, type, text, button);
    $("adoption-grid").append(card);
  }
}
$("adoption-open").onclick = () => showAdoption();
$("adoption-build").onclick = () => showShop("social", "Adoption");
$("adoption-centers").onchange = (e) => {
  adoptionCenterId = e.target.value;
};
$("adoption-search").oninput = renderAdoption;
$("adoption-filter").onchange = () => {
  renderAdoption();
  $("adoption-dialog").scrollTop = 0;
};
function showIsland(id) {
  selectedIsland = id;
  const owned = game.unlocked.includes(id);
  $("island-title").textContent = byBiome(id).name;
  $("island-summary").textContent = owned
    ? "Отправьте Чичи и всех доступных котов на этот остров. Они будут добираться и гулять здесь; знакомство и дружба развиваются отдельно."
    : "Вы рассматриваете закрытый остров. Его можно открыть в разделе «Острова» магазина, когда накопите монеты и выполните условия.";
  if (id === "clockwork")
    $("island-summary").textContent = owned
      ? "Хрюшки и бассейны уже ждут котиков. Все четыре аттракциона включены в остров: строительство начинается автоматически и продолжается, пока сайт закрыт."
      : "Превью показывает готовый парк. После открытия здесь автоматически начнут строиться все четыре аттракциона — без отдельных покупок. Хрюшки и купание доступны сразу.";
  if (id === "foodcourt")
    $("island-summary").textContent = owned
      ? "Кофейня и кинотеатр уже открыты. Нажмите на свободную площадку, чтобы построить бургерную, бабл-ти или пекарню. В работающем заведении можно заглянуть внутрь и позвать Чичи."
      : "Большой котячий фуд-корт: пять заведений, террасы, кино под открытым небом. Откроется с 6 уровня.";
  renderIslandProjects();
  $("island-gather").disabled = !owned || busy || !!buildMode;
  open("island-dialog");
}
function renderIslandProjects() {
  const container = $("island-projects"),
    projects = islandProjects(game, selectedIsland);
  if (!container) return;
  container.hidden = !projects.length;
  const key = projects.map((p) => p.id).join(",");
  if (container.dataset.projects !== key) {
    container.replaceChildren();
    container.dataset.projects = key;
    for (const p of projects) {
      const row = document.createElement("article"),
        title = document.createElement("strong"),
        status = document.createElement("span"),
        progress = document.createElement("progress"),
        button = document.createElement("button");
      row.className = "island-project";
      row.dataset.project = p.id;
      title.textContent = p.icon + " " + p.name;
      status.className = "project-status";
      progress.max = 1;
      progress.setAttribute("aria-label", p.name + ": строительство");
      button.className = "soft";
      button.textContent = "Покататься";
      button.onclick = () => {
        $("island-dialog").close();
        if (courtObject(p.id)) showCourt(p.id);
        else manualActivity({ activityId: p.id });
      };
      row.append(title, status, progress, button);
      container.append(row);
    }
  }
  for (const p of projects) {
    const row = container.querySelector('[data-project="' + p.id + '"]');
    if (courtObject(p.id)) {
      row.querySelector(".project-status").textContent = p.unstarted
        ? "Площадка · " + money(p.price) + " ✦"
        : p.built
          ? "Открыто · доход в монетах и XP"
          : "Строится · " +
            Math.floor(p.progress * 100) +
            "% · ещё " +
            countdown(p.readyAt);
      row.querySelector("progress").value = p.progress;
      const button = row.querySelector("button");
      button.textContent = p.unstarted
        ? "Построить"
        : p.built
          ? "Зайти"
          : "Строительство";
      button.disabled = busy || !!buildMode;
      continue;
    }
    row.querySelector(".project-status").textContent = p.built
      ? "Готово · можно кататься"
      : "Строится · " +
        Math.floor(p.progress * 100) +
        "% · ещё " +
        countdown(p.readyAt);
    row.querySelector("progress").value = p.progress;
    row.querySelector("button").disabled = !p.built || busy || !!buildMode;
  }
}
$("island-open").onclick = () => showIsland(world?.getFocused() || "moon");
$("island-gather").onclick = () => {
  if (busy || buildMode) return;
  try {
    commit(gatherCats(game, selectedIsland));
    world?.gather(selectedIsland);
    $("island-dialog").close();
    toast("Все котики отправляются в " + byBiome(selectedIsland).name + " 🐾");
  } catch (e) {
    toast(e.message);
  }
};
function renderBuilderBoost() {
  $("diamonds").textContent = money(game.diamonds || 0);
  const until = builderBoostUntil(game);
  $("builder-boost-status").textContent = until
    ? "Котики-строители ×10 · осталось " + countdown(until)
    : "8 💎: котики строят и бегают в 10 раз быстрее целый час";
  $("builder-boost-buy").textContent = until
    ? "Ускорение уже действует"
    : "Ускорить стройки ×10 · 1 час · " + BUILDER_BOOST_COST + " 💎";
  $("builder-boost-buy").disabled =
    !!until ||
    (game.diamonds || 0) < BUILDER_BOOST_COST ||
    !cloud.editable ||
    !!cloud.conflict;
  $("diamonds-open").classList.toggle("boost-active", !!until);
  $("builder-boost-hud").hidden = !until;
  $("builder-boost-hud").textContent = until
    ? "💎 Строители ×10 · " + countdown(until)
    : "";
}
$("diamonds-open").onclick = () => {
  renderBusiness();
  open("business-dialog");
};
$("builder-boost-buy").onclick = () => {
  try {
    commit(activateBuilderBoost(game));
    cloud.flush();
    toast("Алмазный рывок! Котики светятся и строят ×10 целый час 💎🐾");
  } catch (error) {
    toast(error.message);
  }
};
$("diamond-mine-shop").onclick = () => {
  $("business-dialog").close();
  showShop("business", "Алмазная шахта");
};
setInterval(() => {
  if (!document.hidden) renderBuilderBoost();
}, 1000);
function collectBusiness(id) {
  try {
    const result = collectIncome(game, id);
    commit(result.game);
    toast(
      "Кошачий доход +" +
        money(result.amount) +
        (result.currency === "diamonds" ? " 💎" : " ✦") +
        " · +" +
        result.xp +
        " XP",
    );
  } catch (e) {
    toast(e.message);
  }
}
function renderBusiness() {
  $("business-grid").replaceChildren();
  const venues = businessVenues(game);
  const incomeNow = Date.now(),
    amounts = new Map(
      venues.map((p) => [p.id, incomeForVenue(game, p, incomeNow)]),
    );
  const ready = venues.filter((p) => isBuilt(p)),
    total = venues
      .filter((p) => incomeCurrency(p.item) === "coins")
      .reduce((n, p) => n + amounts.get(p.id), 0),
    gems = venues
      .filter((p) => incomeCurrency(p.item) === "diamonds")
      .reduce((n, p) => n + amounts.get(p.id), 0);
  $("business-summary").textContent =
    `${ready.length} работают · ${money(ready.filter((p) => incomeCurrency(p.item) === "coins").reduce((n, p) => n + revenueRate(p.item, businessLevel(game, p.id)), 0))} ✦/ч · ${ready.reduce((n, p) => n + businessXP(p.item, businessLevel(game, p.id)), 0)} XP/ч · в кассах ${money(total)} ✦ и ${money(gems)} 💎`;
  $("business-collect-all").disabled = !(total || gems);
  renderBuilderBoost();
  $("business-note").textContent =
    "Бизнес и готовые аттракционы приносят чистую прибыль даже в ваше отсутствие. Касса хранит до " +
    BUSINESS_CAP_HOURS +
    " часов дохода. Каждый бизнес и аттракцион даёт XP при сборе без дневного лимита, до максимального уровня 30. Дробные части XP сохраняются до следующего сбора. Нажмите монетку над постройкой или соберите здесь.";
  for (const p of venues) {
    const item = byItem(p.item),
      amount = amounts.get(p.id),
      level = businessLevel(game, p.id);
    const row = document.createElement("article");
    row.className = "business-row";
    const title = document.createElement("h3"),
      description = document.createElement("p"),
      button = document.createElement("button");
    title.textContent = item.icon + " " + item.name + " · ур. " + level;
    description.textContent = isBuilt(p)
      ? money(revenueRate(p.item, level)) +
        " " +
        incomeSymbol(p.item) +
        "/ч · " +
        businessXP(p.item, level) +
        " XP/ч · " +
        byBiome(p.biome).name
      : "Строится · " + countdown(p.readyAt);
    button.className = "primary";
    button.dataset.collect = p.id;
    button.textContent = amount
      ? "Собрать " + money(amount) + " " + incomeSymbol(p.item)
      : incomeCurrency(p.item) === "diamonds"
        ? "Алмазы копятся"
        : "Монетки копятся";
    button.disabled = !amount;
    button.onclick = () => collectBusiness(p.id);
    row.append(title, description, button);
    const show = document.createElement("button");
    show.className = "quiet business-show";
    show.textContent = "Показать на острове ↗";
    show.onclick = () => {
      $("business-dialog").close();
      world?.focus(p.biome);
      $("map").scrollIntoView({ block: "start", behavior: "smooth" });
    };
    row.append(show);
    const stars = document.createElement("p"),
      detail = document.createElement("p");
    stars.className = "business-stars";
    stars.textContent =
      "★".repeat(level) +
      "☆".repeat(BUSINESS_LEVELS.length - level) +
      " · " +
      BUSINESS_LEVELS[level - 1].name;
    row.append(stars);
    if (level < BUSINESS_LEVELS.length) {
      const cost = businessUpgradeCost(p.item, level),
        upgrade = document.createElement("button");
      detail.className = "business-upgrade-detail";
      detail.textContent =
        "Следующий уровень: " +
        money(revenueRate(p.item, level + 1)) +
        " " +
        incomeSymbol(p.item) +
        "/ч · " +
        businessXP(p.item, level + 1) +
        " XP/ч. " +
        BUSINESS_LEVELS[level].decor +
        ".";
      upgrade.className = "primary business-upgrade";
      upgrade.dataset.upgrade = p.id;
      upgrade.textContent =
        "Улучшить до ур. " + (level + 1) + " · " + money(cost) + " ✦";
      upgrade.disabled =
        !isBuilt(p) || game.coins < cost || !cloud.editable || !!cloud.conflict;
      upgrade.onclick = () => {
        try {
          const result = upgradeBusiness(game, p.id);
          commit(result.game);
          toast(
            item.name +
              " · уровень " +
              result.level +
              "! Больше монет, XP и красоты ✨",
          );
        } catch (error) {
          toast(error.message);
        }
      };
      row.append(detail, upgrade);
    } else {
      detail.textContent =
        "Максимальный уровень · " + BUSINESS_LEVELS[level - 1].decor;
      row.append(detail);
    }
    $("business-grid").append(row);
  }
  if (!venues.length)
    $("business-grid").textContent =
      "Начните с урожайной лавочки: уровень 1, 180 монет, стройка 5 минут. Кофейня доступна с уровня 2. Здесь появятся доход и XP всех ваших построек.";
}
$("business-collect-all").onclick = () => {
  try {
    const result = collectAllIncome(game);
    commit(result.game);
    toast(
      `Собрано из ${result.count} касс: +${money(result.amount)} ✦ · +${money(result.diamonds)} 💎 · +${result.xp} XP`,
    );
  } catch (e) {
    toast(e.message);
  }
};
$("business-open").onclick = () => {
  renderBusiness();
  open("business-dialog");
};
$("business-shop").onclick = () => showShop("business");
setInterval(() => {
  if ($("business-dialog").open) renderBusiness();
}, 5000);

$("adoption-manage").onclick = () => {
  if (adoptionCenterId) inspect(adoptionCenterId, true);
};
