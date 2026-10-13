import { apiBase } from "./config.js";
import { createWorld } from "./world.js";
import {
  BIOMES,
  CATALOG,
  CATEGORIES,
  NEIGHBORS,
  byItem,
  byBiome,
  ACTIONS,
  CROPS,
  JOBS,
  buildTimeLabel,
  biomeFeature,
} from "./game-data.js";
import {
  loadGame,
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
  befriend,
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
const $ = (id) => document.getElementById(id),
  api = (path) =>
    apiBase
      ? new URL(path, apiBase).href
      : new URL("." + path, location.href).href;
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
let game = loadGame(storage),
  busy = false,
  configured = false,
  steps = 0,
  world,
  buildMode = null,
  selectedItem = null,
  shopCategory = "all",
  previews = new Map(),
  previewsStarted = false,
  toastTimer,
  farmSelected = null,
  farmCrop = "wheat",
  farmViewKey = "";
const firstRewards = claimRewards(game, Date.now(), true);
game = firstRewards.game;
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
  const ok = saveGame(storage, game);
  $("save-state").textContent = ok
    ? "Прогресс сохраняется на этом устройстве"
    : "Сохранение недоступно. Прогресс сохранится только до закрытия страницы.";
}
function commit(next, syncWorld = true) {
  if (!saveGame(storage, next)) {
    $("save-state").textContent =
      "Сохранение не подтверждено. Изменение отменено.";
    throw Error(
      "Не удалось записать сохранение. Покупка или изменение не выполнены.",
    );
  }
  game = next;
  $("save-state").textContent =
    "Сохранено на этом устройстве · резервная копия включена";
  if (syncWorld) world?.sync(game);
  renderGame();
  if ($("shop-dialog").open) renderShop();
}
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
  for (const key of ["energy", "happiness"]) {
    $(key).value = game.cat[key];
    $(key + "-text").textContent = Math.round(game.cat[key]) + "%";
  }
  $("food").value = 100 - game.cat.hunger;
  $("food-text").textContent = Math.round(100 - game.cat.hunger) + "%";
  $("coins").textContent = money(game.coins);
  $("shop-coins").textContent = money(game.coins);
  $("bag-count").textContent = Object.values(game.inventory).reduce(
    (a, b) => a + b,
    0,
  );
  $("friend-count").textContent = Object.values(game.friendship).filter(
    (x) => x >= 30,
  ).length;
  for (const node of document.querySelectorAll("[data-mood]"))
    node.classList.toggle("active", node.dataset.mood === game.cat.mood);
  renderBiomes();
  renderNeighbors();
  renderRewards();
  if ($("farm-dialog").open) renderFarm();
}
function renderBiomes() {
  const active = world?.getFocused() || "moon";
  $("biome-nav").replaceChildren();
  for (const biome of BIOMES) {
    const owned = game.unlocked.includes(biome.id);
    const button = document.createElement("button");
    button.className = "biome-chip" + (active === biome.id ? " active" : "");
    button.setAttribute(
      "aria-label",
      (owned ? "Посмотреть " : "Открыть ") + biome.name,
    );
    const icon = document.createElement("span");
    icon.textContent = owned ? biome.icon : "🔒";
    const text = document.createElement("span");
    text.textContent = biome.name;
    const subtitle = document.createElement("small");
    subtitle.textContent = owned ? "Открыт" : money(biome.price) + " ✦";
    text.append(subtitle);
    button.append(icon, text);
    button.onclick = () => {
      if (owned) {
        world?.focus(biome.id);
        if (buildMode) {
          $("build-biome").value = biome.id;
          changeBuildBiome(biome.id);
        }
      } else showShop("lands", biome.name);
    };
    $("biome-nav").append(button);
  }
}
function friendLabel(value) {
  return value >= 75
    ? "Лучшие друзья"
    : value >= 30
      ? "Друзья"
      : value > 0
        ? "Уже знакомы"
        : "Ещё не знакомы";
}
function renderNeighbors() {
  const visible = NEIGHBORS.filter((n) => game.unlocked.includes(n.biome));
  $("neighbors").replaceChildren();
  $("friends-list").replaceChildren();
  for (const n of NEIGHBORS) {
    const value = game.friendship[n.id] || 0,
      unlocked = game.unlocked.includes(n.biome);
    const row = document.createElement("div");
    row.className = "friend-list-row" + (unlocked ? "" : " locked");
    const face = document.createElement("span");
    face.className = "neighbor-face";
    face.textContent = n.hat ? "🐱" : "🐈";
    face.style.setProperty(
      "--tint",
      "#" + n.color.toString(16).padStart(6, "0") + "44",
    );
    const content = document.createElement("div"),
      name = document.createElement("h3"),
      description = document.createElement("p");
    name.textContent = n.name;
    description.textContent = unlocked
      ? n.personality + " · " + friendLabel(value)
      : "Откройте " + byBiome(n.biome).name;
    const meter = document.createElement("div");
    meter.className = "friend-meter";
    const fill = document.createElement("i");
    fill.style.width = value + "%";
    meter.append(fill);
    content.append(name, description, meter);
    row.append(face, content);
    $("friends-list").append(row);
    if (unlocked) {
      const card = document.createElement("button");
      card.className = "neighbor";
      card.setAttribute("aria-label", "Дружба с " + n.name);
      const text = document.createElement("div"),
        h = document.createElement("h3"),
        p = document.createElement("p");
      h.textContent = n.name;
      p.textContent = friendLabel(value);
      text.append(h, p, meter.cloneNode(true));
      card.append(face.cloneNode(true), text);
      card.onclick = () => open("friends-dialog");
      $("neighbors").append(card);
    }
  }
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
  shopCategory = category;
  $("shop-search").value = search;
  renderShop();
  open("shop-dialog");
  if (!previewsStarted) {
    previewsStarted = true;
    previews = await catalogPreviews();
    if ($("shop-dialog").open) renderShop();
  }
}
function renderShop() {
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
            shopCategory === "all" ||
            (shopCategory === "bag" && game.inventory[i.id] > 0) ||
            i.category === shopCategory,
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
    if (!land && previews.has(entry.id)) {
      const img = document.createElement("img");
      img.src = previews.get(entry.id);
      img.alt = entry.name;
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
    if (land && !owned) {
      const requirement = biomeRequirement(game, entry.id);
      if (requirement) {
        text.textContent += " · " + requirement;
        button.disabled = true;
      }
    }
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
function beginPlacement(item, ignoreId = null) {
  if (busy) {
    toast("Сначала дождитесь приключения Чичи. Предмет остаётся в сумке.");
    return;
  }
  let biome = world?.getFocused() || "moon";
  if (!game.unlocked.includes(biome)) biome = "moon";
  const old = game.placements.find((p) => p.id === ignoreId);
  if (old) biome = old.biome;
  const space = old || findSpace(game, item, biome);
  if (!space) {
    toast("На этом острове тесно. Выберите другой открытый биом.");
    const candidate = game.unlocked.find((b) => findSpace(game, item, b));
    if (!candidate) return;
    biome = candidate;
  }
  const chosen = old || findSpace(game, item, biome);
  buildMode = {
    item,
    biome,
    x: chosen.x,
    z: chosen.z,
    rotation: old?.rotation || 0,
    ignoreId,
  };
  $("build-panel").hidden = false;
  $("build-title").textContent = byItem(item).name;
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
$("build-confirm").onclick = () => {
  if (!buildMode) return;
  try {
    const p = buildMode;
    commit(
      p.ignoreId
        ? moveItem(game, p.ignoreId, p.biome, p.x, p.z, p.rotation)
        : placeItem(game, p.item, p.biome, p.x, p.z, p.rotation),
    );
    const placed = p.ignoreId
      ? game.placements.find((item) => item.id === p.ignoreId)
      : game.placements.at(-1);
    cancelPlacement();
    toast(
      isBuilt(placed)
        ? "Готово! Предмет на новом месте, Чичи может его выбрать."
        : "Стройка началась! После завершения Чичи сможет выбрать предмет.",
    );
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
function inspect(id) {
  if (busy || buildMode) return;
  selectedItem = id;
  const placement = game.placements.find((p) => p.id === id);
  if (!placement) return;
  const item = byItem(placement.item);
  $("item-icon").textContent = item.icon;
  $("item-name").textContent = item.name;
  $("item-description").textContent = item.description;
  $("item-construction").textContent = isBuilt(placement)
    ? item.rarity + " · Постройка готова"
    : "Строится · осталось " + countdown(placement.readyAt);
  $("item-store").disabled = !isBuilt(placement);
  open("item-dialog");
}
$("item-move").onclick = () => {
  const p = game.placements.find((p) => p.id === selectedItem);
  $("item-dialog").close();
  if (p) beginPlacement(p.item, p.id);
};
$("item-store").onclick = () => {
  try {
    commit(storeItem(game, selectedItem));
    $("item-dialog").close();
    toast("Предмет вернулся в сумку. Можно разместить его в другом месте.");
  } catch (error) {
    toast(error.message);
  }
};
try {
  world = createWorld($("map"), game, {
    onPreview: previewChanged,
    onSelectItem: inspect,
    onLockedBiome: (id) => showShop("lands", byBiome(id).name),
    onFarmDrag: (id) => {
      if (id) manualFarm(id);
      else
        toast("Перетащите Чичи на готовую ферму или откройте раздел «Ферма».");
    },
    onReaction: (text) => ($("bubble").textContent = text),
    onFocus: (id, overview) => {
      $("biome-name").textContent = overview
        ? "Мир чудес · 24 острова"
        : byBiome(id).name;
      renderBiomes();
    },
  });
  $("world-loading").remove();
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
$("zoom-in").onclick = () => world?.zoom(-5);
$("zoom-out").onclick = () => world?.zoom(5);
function care(kind) {
  if (busy) return;
  const next = structuredClone(game);
  const before = JSON.stringify(next.cat);
  if (kind === "feed") {
    next.cat.hunger = clamp(next.cat.hunger - 35);
    next.cat.happiness = clamp(next.cat.happiness + 8);
  }
  if (kind === "play") {
    next.cat.happiness = clamp(next.cat.happiness + 22);
    next.cat.energy = clamp(next.cat.energy - 22);
    next.cat.hunger = clamp(next.cat.hunger + 15);
  }
  if (kind === "rest") {
    next.cat.energy = clamp(next.cat.energy + 28);
    next.cat.happiness = clamp(next.cat.happiness + 5);
  }
  const reward = attentionReward(
    next,
    Date.now(),
    before !== JSON.stringify(next.cat),
  );
  commit(reward.game, false);
  if (reward.amount) toast("За внимание к Чичи +" + reward.amount + " ✦");
  $("status").textContent =
    "Потребности изменились. Настроение по-прежнему выбирает ИИ.";
}
for (const kind of ["feed", "play", "rest"])
  $(kind).onclick = () => {
    try {
      care(kind);
    } catch (error) {
      toast(error.message);
    }
  };
function effects(decision) {
  if (decision.action === "farm") {
    const cells = game.farm.fields[decision.activityId] || [];
    if (cells.some((c) => c.crop && Date.now() >= c.readyAt)) {
      const harvest = harvestField(game, decision.activityId);
      commit(harvest.game);
      toast(
        "Чичи собрала урожай: " +
          harvest.count +
          ". Его можно продать в разделе «Ферма».",
      );
    } else {
      const empty = cells.findIndex((c) => !c.crop);
      if (empty >= 0) {
        commit(plantCrop(game, decision.activityId, empty, farmCrop));
        toast(
          "Чичи посадила " + CROPS.find((c) => c.id === farmCrop).name + ".",
        );
      } else toast("Чичи проверила грядки. Урожай ещё растёт.");
    }
  }

  let next = structuredClone(game);
  const action = decision.action || "explore";
  if (action === "meet") {
    next = befriend(next, decision.friendId, 15);
  }
  if (action === "party") {
    for (const n of NEIGHBORS.filter((n) =>
      next.unlocked.includes(n.biome),
    ).slice(0, 6))
      next = befriend(next, n.id, 8);
  }
  if (["play", "ride", "party"].includes(action)) {
    next.cat.energy = clamp(next.cat.energy - 6);
    next.cat.hunger = clamp(next.cat.hunger + 5);
    next.cat.happiness = clamp(next.cat.happiness + 12);
  }
  if (action === "meet") next.cat.happiness = clamp(next.cat.happiness + 8);
  if (action === "eat") {
    next.cat.hunger = clamp(next.cat.hunger - 18);
    next.cat.happiness = clamp(next.cat.happiness + 6);
  }
  if (action === "rest") next.cat.energy = clamp(next.cat.energy + 12);
  const reward = attentionReward(next);
  commit(reward.game, false);
  if (reward.amount)
    toast("За совместное приключение +" + reward.amount + " ✦");
}
function validateDecision(value) {
  if (
    !["home", "pond", "garden", "tree", "picnic"].includes(value.target) ||
    !["sleep", "crazy hungry", "happy"].includes(value.mood) ||
    typeof value.thought !== "string"
  )
    throw Error("ИИ вернул некорректное решение.");
  if (value.action && !ACTIONS.includes(value.action))
    throw Error("Неизвестное занятие.");
  if (["play", "ride", "party", "farm"].includes(value.action)) {
    const p = game.placements.find((p) => p.id === value.activityId);
    if (!p || !isBuilt(p) || !byItem(p.item).actions.includes(value.action))
      throw Error("Этот аттракцион больше недоступен. Повторите решение.");
  }
  if (
    value.action === "meet" &&
    !NEIGHBORS.some(
      (n) => n.id === value.friendId && game.unlocked.includes(n.biome),
    )
  )
    throw Error("Этот сосед пока недоступен.");
  return value;
}
async function decide(demo = false, manualDecision = null) {
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
  for (const id of ["toggle", "demo", "feed", "play", "rest"])
    $(id).disabled = true;
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
      const available = game.placements.filter((p) => isBuilt(p));
      const activity = available[steps % available.length];
      const neighbor = NEIGHBORS.filter((n) => game.unlocked.includes(n.biome))[
        steps % NEIGHBORS.filter((n) => game.unlocked.includes(n.biome)).length
      ];
      const action =
        mood === "sleep"
          ? "rest"
          : mood === "crazy hungry"
            ? "eat"
            : steps % 3 === 2
              ? "meet"
              : byItem(activity?.item)?.actions[0] || "explore";
      decision = {
        mood,
        target:
          mood === "sleep"
            ? "home"
            : mood === "crazy hungry"
              ? "picnic"
              : "garden",
        action,
        thought:
          "Демо: " +
          (action === "meet"
            ? "Пойду познакомлюсь с " + neighbor.name + "."
            : activity
              ? "Хочу посмотреть " + byItem(activity.item).name + "."
              : "Погуляю под звёздами."),
      };
      if (mood === "happy" && action !== "meet" && activity)
        decision.activityId = activity.id;
      if (action === "meet") decision.friendId = neighbor.id;
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
    validateDecision(decision);
    const next = structuredClone(game);
    next.cat.location = decision.target;
    next.cat.mood = decision.mood;
    commit(next, false);
    $("bubble").textContent = decision.thought;
    $("steps").textContent = ++steps + " решений";
    $("mood-badge").textContent =
      decision.mood +
      (manualDecision ? " · ручная команда" : demo ? " · демо" : " · выбор ИИ");
    $("mode").textContent = manualDecision
      ? "Ручная команда"
      : demo
        ? "Демо · без ИИ"
        : "Cloudflare AI";
    const actionNames = {
      explore: "Исследует",
      play: "Играет",
      ride: "Катается",
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
    await world?.perform(decision);
    effects(decision);
    $("status").textContent = manualDecision
      ? "Чичи поработала на ферме по вашей команде."
      : demo
        ? "Демо: выбор сделан локально без ИИ."
        : "Чичи решила! Настроение и занятие выбрал Cloudflare AI.";
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    busy = false;
    for (const id of ["toggle", "demo", "feed", "play", "rest"])
      $(id).disabled = false;
    $("toggle").textContent = buttonLabel;
    farmViewKey = "";
    if ($("farm-dialog").open) renderFarm();
  }
}
$("toggle").onclick = () => decide();
$("demo").onclick = () => decide(true);
setInterval(() => {
  renderRewards();
  const reward = claimRewards(game);
  if (reward.rewards.length) {
    try {
      commit(reward.game, false);
    } catch (error) {
      $("save-state").textContent = error.message;
      return;
    }
    toast("Почасовая награда +" + reward.rewards[0].amount + " ✦");
  }
  world?.sync(game);
  updateTimers();
}, 1000);
setInterval(() => {
  if (busy || document.hidden) return;
  const next = structuredClone(game);
  next.cat.hunger = clamp(next.cat.hunger + 1);
  next.cat.energy = clamp(
    next.cat.energy + (next.cat.mood === "sleep" ? 2 : -1),
  );
  next.cat.happiness = clamp(
    next.cat.happiness +
      (next.cat.hunger > 70 ? -2 : next.cat.mood === "sleep" ? 1 : -0.5),
  );
  try {
    commit(next, false);
  } catch (error) {
    $("save-state").textContent = error.message;
  }
}, 20000);
window.addEventListener("storage", (event) => {
  if (event.key === SAVE_KEY && !busy) {
    game = loadGame(storage);
    world?.sync(game);
    renderGame();
  }
});
persist();
renderGame();
if (matchMedia("(max-width:600px)").matches)
  document.querySelector(".orbit-hint").textContent =
    "Потяните · два пальца для масштаба";
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
  $("farm-stock-text").textContent = stock.length
    ? stock.join(" · ")
    : "Пока пусто. Соберите первый урожай.";
  $("farm-level").textContent =
    "Фермерский уровень " +
    (1 + Math.floor(game.farm.harvests / 10)) +
    " · Собрано " +
    game.farm.harvests +
    " урожаев";
  $("farm-sell").textContent = "Продать всё · " + stockValue(game) + " ✦";
  $("farm-sell").disabled = stockValue(game) === 0;
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
function manualFarm(id = null) {
  if (busy) {
    toast("Чичи уже занимается приключением.");
    return;
  }
  const farm = game.placements.find(
    (p) =>
      (id ? p.id === id : byItem(p.item).category === "farm") && isBuilt(p),
  );
  if (!farm) {
    toast("Нужна готовая ферма.");
    return;
  }
  for (const dialog of document.querySelectorAll("dialog[open]"))
    dialog.close();
  decide(false, {
    target: "garden",
    mood: game.cat.mood,
    action: "farm",
    activityId: farm.id,
    thought: "Пойду проверю грядки и соберу всё, что созрело!",
  });
}
function updateTimers() {
  for (const node of document.querySelectorAll("[data-until]"))
    node.textContent = countdown(Number(node.dataset.until));
  if ($("farm-dialog").open) renderFarm();
  if ($("item-dialog").open) {
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
