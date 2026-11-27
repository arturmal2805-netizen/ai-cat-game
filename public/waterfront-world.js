import * as T from "three";
import { waterfrontLocalLighting } from "./waterfront-lighting.js";
import { cityClock } from "./jobcity-system.js";
import {
  WATERFRONT as W,
  WATERFRONT_VIEWS,
  waterfrontOrigin,
  waterfrontActivity,
} from "./waterfront-data.js";
import { waterfrontModelSteps } from "./waterfront-model.js";
import {
  waterfrontWalkable,
  waterfrontCameraClear,
} from "./waterfront-navigation.js";
import { createWaterfrontRuntime } from "./waterfront-runtime.js";
import { createWaterfrontEffects } from "./waterfront-effects.js";
import { byBiome, NEIGHBORS } from "./game-data.js";
import { createCat, animateCat, reactCat, disposeCat } from "./cat-model.js";
import { catAppearance } from "./cat-breeds.js";
export function createWaterfrontWorld({
  scene,
  container,
  getGame,
  getActors,
  getFocused,
  getOverview,
  prepare,
  prepareModel,
  registerCat = () => {},
  canSimulate = () => true,
  canBuild = () => true,
  canInvite = () => false,
  prepareHero = () => true,
  onPlayerStart = () => false,
  onViewChange = () => {},
  hold = () => {},
  reserve = () => true,
  onPark = () => {},
  onComplete = () => {},
  onCamera = () => {},
  onExit = () => {},
  onError = () => {},
}) {
  const origin = waterfrontOrigin(byBiome("autumn").center),
    abort = new AbortController(),
    staff = [];
  let root = null,
    pending = null,
    runtime = null,
    effects = null,
    disposed = false,
    inspection = false,
    selected = null,
    lastInvite = 0,
    nextTry = 0,
    request = 0,
    pendingHero = false,
    wantPlayer = false,
    playerStarted = false,
    jumpHeld = false,
    firstPerson = false;
  const access = document.createElement("button");
  access.className = "venue-access waterfront-access";
  access.dataset.venue = "waterfront";
  access.title = access.ariaLabel = "Набережна · ресторан і батут";
  access.innerHTML =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 24h26M6 24V13q10-15 20 0v11M9 17h14M12 24v-7m8 7v-7M16 4v5M4 28q3-2 6 0t6 0 6 0 6 0"/></svg>';
  access.hidden = true;
  (container.querySelector(".map-controls") || container).append(access);
  const panel = document.createElement("div");
  panel.className = "waterfront-panel";
  panel.hidden = true;
  const header = document.createElement("strong");
  header.textContent = "Лагуна · набережна";
  panel.append(header);
  function button(text, click, label) {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = click;
    if (label) b.setAttribute("aria-label", label);
    panel.append(b);
    return b;
  }
  const call = button(
    "🐈 Позвати Чічі",
    () => void invite("chichi", "waterfront-dine"),
  );
  const all = button("🐾 Вільні котики", () => void inviteAll());
  const allTrampoline = button(
    "🐾 Усі вільні + Чічі на батут",
    () => void inviteAllTrampoline(),
  );
  allTrampoline.dataset.waterfrontAllTrampoline = "";
  const playerButton = button(
    "🎮 Керувати стрибками Чічі",
    () => void controlPlayer(),
  );
  playerButton.dataset.waterfrontPlayer = "";
  const viewButton = button("🐈 Від третьої особи · V", () => {
    if (!playerStarted) {
      firstPerson = false;
      void controlPlayer();
      return;
    }
    toggleView();
  });
  viewButton.dataset.waterfrontFirstPerson = "";
  const viewToggle = document.createElement("button");
  viewToggle.className = "waterfront-view-toggle";
  viewToggle.textContent = "3 ↔ 1";
  viewToggle.setAttribute("aria-label", "Перемкнути перше або третє лице");
  viewToggle.hidden = true;
  viewToggle.onclick = () => toggleView();
  container.append(viewToggle);
  function toggleView() {
    firstPerson = !firstPerson;
    onViewChange();
    viewButton.textContent = firstPerson
      ? "👁 Від очей Чічі · V"
      : "🐈 Від третьої особи · V";
    return firstPerson;
  }
  const jumpButton = document.createElement("button");
  jumpButton.className = "waterfront-jump";
  jumpButton.textContent = "Стрибок ↑";
  jumpButton.setAttribute("aria-label", "Стрибати на батуті дедалі вище");
  const diveControl = document.createElement("button");
  diveControl.className = "waterfront-dive-control";
  diveControl.dataset.waterfrontDive = "";
  diveControl.textContent = "У воду ↗";
  diveControl.setAttribute("aria-label", "Стрибнути з батута у воду");
  diveControl.hidden = true;
  const diveAction = () => !diveControl.disabled && runtime?.divePlayer();
  diveControl.onclick = diveAction;
  // A touch following a camera drag need not synthesize a click. Use the real
  // bounded tap release, retaining native click activation for mouse/keyboard.
  let diveTouch = null;
  diveControl.onpointerdown = (e) => {
    if (e.pointerType !== "touch" || diveControl.disabled || diveTouch) return;
    diveTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
    diveControl.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  diveControl.onpointerup = (e) => {
    if (diveTouch?.id !== e.pointerId) return;
    const start = diveTouch;
    diveTouch = null;
    e.preventDefault();
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 12) diveAction();
  };
  const cancelDiveTouch = (e) => {
    if (diveTouch?.id === e.pointerId) diveTouch = null;
  };
  diveControl.onpointercancel = diveControl.onlostpointercapture = cancelDiveTouch;
  container.append(diveControl);
  jumpButton.hidden = true;
  container.append(jumpButton);
  jumpButton.onpointerdown = (e) => {
    if (!playerStarted) return;
    e.preventDefault();
    jumpButton.setPointerCapture?.(e.pointerId);
    jumpHeld = true;
  };
  for (const key of ["pointerup", "pointercancel", "lostpointercapture"])
    jumpButton.addEventListener(key, () => {
      jumpHeld = false;
    });
  const footer = container.querySelector(".world-bottom");
  function layoutPlayerControls() {
    const rect = container.getBoundingClientRect(),
      vp = window.visualViewport,
      bottom = Math.min(
        rect.bottom,
        (vp?.offsetTop ?? 0) + (vp?.height ?? window.innerHeight),
      ),
      f = footer?.getBoundingClientRect(),
      offset = Math.max(0, rect.bottom - bottom),
      clearance =
        f && f.top < bottom && f.bottom > 0
          ? Math.max(84, bottom - f.top + 8)
          : 84;
    for (const b of [jumpButton, viewToggle])
      b.style.bottom = offset + clearance + 14 + "px";
    diveControl.style.bottom = offset + clearance + 82 + "px";
  }
  const controlsResize =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(layoutPlayerControls)
      : null;
  controlsResize?.observe(container);
  if (footer) controlsResize?.observe(footer);
  window.addEventListener("resize", layoutPlayerControls);
  window.addEventListener("scroll", layoutPlayerControls, true);
  window.visualViewport?.addEventListener("resize", layoutPlayerControls);
  window.visualViewport?.addEventListener("scroll", layoutPlayerControls);
  layoutPlayerControls();
  for (const view of WATERFRONT_VIEWS) {
    const b = button(view.name, () => void inspect(view.id));
    b.dataset.waterfrontView = view.id;
  }
  const bounce = button(
    "🐾 Чічі · батут",
    () => void invite("chichi", "waterfront-bounce"),
  );
  const dive = button("💦 Чічі · стрибок у воду", () =>
    playerStarted
      ? runtime?.divePlayer()
      : void invite("chichi", "waterfront-dive"),
  );
  button("Вийти з огляду", () => exit(true));
  container.append(panel);
  access.onclick = () => (inspection ? exit(true) : void inspect("overview"));
  function* staffSteps() {
    for (let i = 0; i < 2; i++) {
      yield;
      const cat = createCat("happy", {
          detail: "npc",
          ...catAppearance(NEIGHBORS[i]),
        }),
        carrier = new T.Group();
      carrier.add(cat);
      carrier.position.set(
        origin.x + (i ? 22 : 0),
        i ? W.y + WATERFRONT_FOOT : W.y + 1.7,
        origin.z + (i ? 45 : -43),
      );
      carrier.userData.biomeId = "autumn";
      registerCat(cat);
      staff.push({ cat, carrier, role: i ? "host" : "barista" });
    }
  }
  async function ensure() {
    if (disposed) return null;
    if (pending) return pending;
    if (root) return root;
    pending = (async () => {
      let model;
      try {
        model = await prepare(waterfrontModelSteps(), abort.signal);
        model.position.set(origin.x, 0, origin.z);
        model.userData.biomeId = "autumn";
        const localLights = [];
        for (const [key, material] of Object.entries(model.userData.materials))
          if (
            !["glass", "floorGlass", "pile", "water"].includes(key) &&
            material.isMeshStandardMaterial
          )
            localLights.push(waterfrontLocalLighting(material, origin));
        model.userData.localLights = localLights;
        effects = createWaterfrontEffects(model);
        await prepareModel(model);
        if (disposed) {
          effects.dispose();
          disposeModel(model);
          return null;
        }
        await prepare(staffSteps(), abort.signal);
        for (const s of staff) {
          await prepareModel(s.carrier);
          if (disposed) break;
        }
        if (disposed) {
          effects.dispose();
          disposeModel(model);
          return null;
        }
        model.updateWorldMatrix(true, true);
        root = model;
        scene.add(root);
        for (const s of staff) scene.add(s.carrier);
        runtime = createWaterfrontRuntime({
          origin,
          getActors,
          getTrampoline: () => root.userData.trampoline,
          effects,
          canSimulate,
          onPark,
          onComplete,
        });
        if (selected)
          root.userData.restaurant.userData.roof.visible =
            !WATERFRONT_VIEWS.find((v) => v.id === selected)?.inside;
        return root;
      } catch (error) {
        if (!disposed) onError("Набережна: " + error.message);
        if (model && !root) disposeModel(model);
        return null;
      } finally {
        pending = null;
      }
    })();
    return pending;
  }
  function disposeModel(model) {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    model.traverse((o) => {
      if (o.geometry && !o.geometry.userData.sharedScenery)
        geometries.add(o.geometry);
      for (const m of (Array.isArray(o.material)
        ? o.material
        : [o.material]
      ).filter(Boolean)) {
        materials.add(m);
        for (const key of ["map", "normalMap", "roughnessMap"])
          if (m[key] && !m[key].userData.sharedScenery) textures.add(m[key]);
      }
    });
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    /* shared coral/surface maps are owned by their existing cache */ model.removeFromParent();
  }
  async function inspect(id = "overview") {
    if (!getGame().unlocked.includes("autumn")) return false;
    const view =
        WATERFRONT_VIEWS.find((v) => v.id === id) || WATERFRONT_VIEWS[0],
      token = ++request,
      entering = !inspection;
    onCamera(view, entering, origin);
    inspection = true;
    selected = view.id;
    allTrampoline.hidden = playerButton.hidden = ![
      "trampoline",
      "jumps",
    ].includes(selected);
    panel.hidden = false;
    access.setAttribute("aria-pressed", "true");
    for (const b of panel.querySelectorAll("[data-waterfront-view]"))
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.waterfrontView === selected),
      );
    if (root) root.userData.restaurant.userData.roof.visible = !view.inside;
    const model = await ensure();
    return !!model && !disposed && token === request;
  }
  function exit(restore = false) {
    request++;
    if (!inspection) return;
    inspection = false;
    selected = null;
    panel.hidden = true;
    allTrampoline.hidden = playerButton.hidden = true;
    access.setAttribute("aria-pressed", "false");
    if (root) root.userData.restaurant.userData.roof.visible = true;
    onExit(restore);
  }
  async function invite(id, activityId) {
    if (!canSimulate() || !canInvite(id)) {
      onError("Котик зараз зайнятий. Запроси після роботи або відпочинку.");
      return false;
    }
    if (!(await ensure()) || !canSimulate() || !canInvite(id)) return false;
    if (runtime?.unsafe(id)) {
      onError("Дочекайся безпечного завершення стрибка або виходу з води.");
      return false;
    }
    if (runtime.has(id)) runtime.cancel(id);
    if (!reserve(id)) return false;
    if (!runtime.start(id, activityId, { invite: true })) {
      onPark(id, getActors().find((a) => a.id === id)?.position);
      return false;
    }
    lastInvite++;
    onError(
      id === "chichi"
        ? "Кличу Чічі на набережну. Після прибуття вона піде до заняття."
        : "Котик прямує на набережну.",
    );
    return true;
  }
  async function inviteAll() {
    if (!(await ensure())) return;
    let n = 0;
    for (const a of getActors()) {
      if (a.id === "chichi" || runtime.visits.size >= W.capacity) continue;
      if (
        canInvite(a.id) &&
        (await invite(
          a.id,
          [
            "waterfront-dine",
            "waterfront-glass",
            "waterfront-terrace",
            "waterfront-bounce",
            "waterfront-dive",
            "waterfront-walk",
          ][n++ % 6],
        ))
      ) {
      }
    }
    onError(
      n ? "Запрошено вільних котиків: " + n : "Зараз вільних котиків немає.",
    );
  }
  async function tryHero() {
    if (!pendingHero || !runtime || !canSimulate()) return false;
    if (runtime.has("chichi")) {
      // A takeover of an existing visit owns its pending safe handoff too.
      // Do not defer until an airborne cat has already begun its exit route.
      if (wantPlayer) {
        if (!runtime.requestPlayer()) return false;
        pendingHero = false;
        return true;
      }
      if (!prepareHero()) return false;
      runtime.redirect("chichi", "waterfront-bounce");
      pendingHero = false;
      return true;
    }
    if (!prepareHero()) return false;
    if (
      !canInvite("chichi", { force: true }) ||
      !reserve("chichi", { force: true })
    )
      return false;
    if (
      !runtime.start("chichi", "waterfront-bounce", {
        invite: true,
        enqueue: true,
      })
    )
      return false;
    pendingHero = false;
    if (wantPlayer) runtime.requestPlayer();
    return true;
  }
  async function inviteAllTrampoline() {
    if (!canSimulate() || !(await ensure())) return false;
    pendingHero = true;
    await tryHero();
    let n = runtime.has("chichi") ? 1 : 0;
    for (const a of getActors()) {
      if (a.id === "chichi" || runtime.has(a.id) || !canInvite(a.id)) continue;
      if (!reserve(a.id)) continue;
      if (
        runtime.start(a.id, "waterfront-bounce", {
          invite: true,
          enqueue: true,
        })
      )
        n++;
      else onPark(a.id, a.position);
    }
    onError(
      "На батут запрошено: " +
        n +
        (pendingHero
          ? " · Чічі приєднається після безпечного переходу."
          : ". Чічі теж іде."),
    );
    return true;
  }
  async function controlPlayer() {
    if (!canSimulate() || !(await ensure())) return false;
    wantPlayer = true;
    firstPerson = false;
    onViewChange();
    pendingHero = true;
    await tryHero();
    onError(
      "Чічі йде на батут. WASD — рух; утримуй пробіл або «Стрибок», щоб стрибати щоразу вище.",
    );
    return true;
  }
  const local = (p) => ({ x: p.x - origin.x, y: p.y, z: p.z - origin.z });
  return {
    origin,
    ensure,
    inspect,
    exit,
    invite,
    inviteAll,
    inviteAllTrampoline,
    controlPlayer,
    get playerRequested() { return wantPlayer; },
    get playerControlled() {
      return (
        canSimulate() &&
        wantPlayer &&
        !!runtime?.ownsPlayer &&
        (playerStarted || runtime.playerReady)
      );
    },
    get firstPerson() {
      return firstPerson;
    },
    toggleView,
    playerTransport(input) {
      if (!canSimulate() || !wantPlayer || !runtime?.ownsPlayer) return null;
      return runtime.playerInput({
        ...input,
        firstPerson,
        jump: input.jump || jumpHeld,
      });
    },
    releasePlayer() {
      wantPlayer = false;
      playerStarted = false;
      jumpHeld = false;
      runtime?.releasePlayer();
    },
    pick(raycaster) {
      if (!root?.visible) return false;
      const ray = raycaster.ray
          .clone()
          .applyMatrix4(root.matrixWorld.clone().invert()),
        point = new T.Vector3();
      if (
        !ray.intersectPlane(
          new T.Plane(new T.Vector3(0, 1, 0), -W.trampoline.y),
          point,
        ) ||
        Math.hypot(point.x - W.trampoline.x, point.z - W.trampoline.z) >
          W.trampoline.radius
      )
        return false;
      void inspect("trampoline");
      return true;
    },
    get root() {
      return root;
    },
    get ready() {
      return !!root && !!runtime;
    },
    get runtime() {
      return runtime;
    },
    get inspection() {
      return inspection;
    },
    get selected() {
      return selected;
    },
    get pending() {
      return !!pending;
    },
    has: (id) => runtime?.has(id) || false,
    frame: (id) => runtime?.frame(id) || null,
    unsafe: (id) => runtime?.unsafe(id) || false,
    cancel: (id) => runtime?.cancel(id) ?? true,
    safePosition: (id) => runtime?.safePosition(id),
    arrival(slot = 0) {
      return new T.Vector3(
        origin.x + W.arrival.x + (slot % 2) * 2,
        W.y + 0.012,
        origin.z + W.arrival.z + Math.floor(slot / 2) * 2,
      );
    },
    startReady(id, activityId, ticket) {
      return runtime?.start(id, activityId, { ticket }) || false;
    },
    support(p, radius) {
      if (!root) return null;
      const q = local(p);
      if (Math.abs(q.y - W.y) > 1.5 && Math.abs(q.y - W.trampoline.y) > 1.5)
        return null;
      const s = waterfrontWalkable(q, radius);
      return s
        ? {
            biome: "autumn",
            y:
              s.kind === "net"
                ? root.userData.trampoline.userData.height(
                    q.x - W.trampoline.x,
                    q.z - W.trampoline.z,
                    runtime.animationTime,
                  ) + 0.012
                : s.y,
          }
        : null;
    },
    cameraClear(a, b) {
      return !root || waterfrontCameraClear(local(a), local(b));
    },
    update(dt, time, reduced = false) {
      const active = getFocused() === "autumn",
        unlocked = getGame().unlocked.includes("autumn"),
        visible = active || getOverview();
      access.hidden = !active || !unlocked;
      if (
        active &&
        unlocked &&
        !root &&
        !pending &&
        time > nextTry &&
        canBuild()
      ) {
        nextTry = time + 40;
        void ensure();
      }
      if (!root) return;
      root.visible = visible;
      if (pendingHero) void tryHero();
      runtime?.update(dt, time);
      for (const id of runtime?.visits.keys() || []) hold(id);
      if (
        wantPlayer &&
        runtime?.playerReady &&
        !playerStarted &&
        runtime.frame("chichi")?.phase === "player"
      )
        playerStarted = onPlayerStart();
      jumpButton.hidden =
        viewToggle.hidden =
        diveControl.hidden =
          !playerStarted;
      diveControl.disabled =
        !canSimulate() ||
        !["player", "player-land"].includes(runtime?.frame("chichi")?.phase);
      viewToggle.disabled = !canSimulate();
      jumpButton.disabled = !canSimulate();
      allTrampoline.hidden = playerButton.hidden =
        !inspection || !["trampoline", "jumps"].includes(selected);
      if (visible) {
        const minute = getGame().jobCity
            ? cityClock(getGame().jobCity).minute
            : 720,
          night =
            minute < 360 || minute > 1140
              ? 1
              : minute > 1020
                ? (minute - 1020) / 120
                : 0;
        for (const light of root.userData.localLights || [])
          light.update(time, night);
        root.userData.update(time, reduced);
      }
      effects?.update(time, dt, visible);
      for (const s of staff) {
        s.carrier.visible = visible;
        if (!visible) continue;
        animateCat(s.cat, time, false, reduced);
        reactCat(
          s.cat,
          {
            ride: true,
            paw:
              s.role === "barista" ? 0.18 + Math.sin(time * 1.9) * 0.08 : 0.1,
            headYaw: Math.sin(time * 0.4) * 0.12,
            headPitch: 0.08,
          },
          reduced,
        );
      }
      call.disabled = !canSimulate() || !!runtime?.has("chichi");
      all.disabled = !canSimulate() || !!pending;
      bounce.disabled = dive.disabled =
        !canSimulate() || !!runtime?.unsafe("chichi");
    },
    dispose() {
      disposed = true;
      abort.abort();
      runtime?.dispose();
      effects?.dispose();
      controlsResize?.disconnect();
      window.removeEventListener("resize", layoutPlayerControls);
      window.removeEventListener("scroll", layoutPlayerControls, true);
      window.visualViewport?.removeEventListener(
        "resize",
        layoutPlayerControls,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        layoutPlayerControls,
      );
      access.remove();
      jumpButton.remove();
      diveControl.remove();
      viewToggle.remove();
      panel.remove();
      for (const s of staff) {
        s.carrier.removeFromParent();
        disposeCat(s.cat);
      }
      if (root) disposeModel(root);
    },
    diagnostics() {
      return {
        ready: !!runtime,
        selected,
        visits: [...(runtime?.visits.values() || [])].map((v) => ({
          id: v.id,
          phase: v.phase,
          activity: v.activity.id,
          slot: v.slot,
          position: v.frame.position.toArray(),
        })),
        tables: root?.userData.tableCount,
        glassPanels: root?.userData.glassPanels,
        staff: staff.length,
        invited: lastInvite,
        pendingHero,
        player: runtime?.player,
        playerStarted,
        active: [...(runtime?.visits.values() || [])].filter((v) => v.active)
          .length,
        queued: [...(runtime?.visits.values() || [])].filter((v) => !v.active)
          .length,
      };
    },
  };
}
const WATERFRONT_FOOT = 0.012;
