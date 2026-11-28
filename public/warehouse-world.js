import { createWarehouseThirdPersonCamera } from "./squish-manual-camera.js";
import { createSquishNavigation } from "./squish-navigation.js";
import { createSquishManual } from "./squish-manual.js";
import { createSquishCatVisits } from "./squish-cat-visits.js";
import { createSquishCatContacts } from "./squish-cat-contacts.js";
import { createSquishPlayer } from "./squish-player.js";
import {
  warehouseSquishSteps,
  SQUISH_PROTOTYPE_ANCHOR,
  SQUISH_DEMONSTRATORS,
} from "./warehouse-squish.js";
import * as T from "three";
import { byBiome } from "./game-data.js";
import { WAREHOUSE as W } from "./mosasaur-expansion-data.js";
import { WAREHOUSE_ACCESS as A } from "./warehouse-access-data.js";
import { warehouseFleetSteps } from "./warehouse-shuttle-models.js";
import { createWarehouseVisits } from "./warehouse-visit-runtime.js";
// A shared, bounded fleet. Visitors keep their original native carrier and rig.
export function createWarehouseWorld({
  scene,
  container,
  getGame,
  getActors,
  getFocused,
  getOverview,
  getModel,
  prepare,
  prepareModel,
  canSimulate,
  canInvite,
  reserve,
  hold,
  onPark,
  onComplete,
  onManualReady,
  onReleaseManual,
  onInspect,
  onInteriorCamera = () => {},
  canvas,
  camera,
  look,
  onError,
}) {
  const b = byBiome("autumn"),
    origin = { x: b.center[0], z: b.center[1] },
    abort = new AbortController();
  let selectedMaterial = "jelly",
    interior = null,
    interiorPending = null,
    fleet = null,
    pending = null,
    disposed = false,
    opened = false,
    pendingManualReturn = false,
    jumpHeld = false,
    nextTry = 0;
  const panel = document.createElement("div");
  panel.className = "waterfront-panel warehouse-panel";
  panel.hidden = true;
  const title = document.createElement("strong");
  title.textContent = "Warehouse · субмарини";
  panel.append(title);
  const button = (text, action, key) => {
    const e = document.createElement("button");
    e.textContent = text;
    e.onclick = action;
    if (key) e.dataset[key] = "";
    panel.append(e);
    return e;
  };
  const call = button(
    "🐈 Відправити Чічі до Warehouse",
    () => void invite("chichi"),
    "warehouseCall",
  );
  const control = button(
    "🎮 Керувати Чічі після прибуття",
    () => requestManual(),
    "warehouseControl",
  );
  const back = button(
    "↩ Повернути Чічі на берег",
    () => {
      onReleaseManual();
      releaseManual(true);
    },
    "warehouseReturn",
  );
  const jumpButton = document.createElement("button");
  jumpButton.textContent = "🐾 ↑";
  jumpButton.hidden = true;
  jumpButton.dataset.warehouseJump = "";
  jumpButton.setAttribute("aria-label", "Стрибнути (Space)");
  jumpButton.style.cssText =
    "position:absolute;right:18px;bottom:160px;min-width:48px;min-height:48px;border:1px solid #e8bf7a;border-radius:14px;background:#412b52;color:#fff4df;z-index:12";
  container.append(jumpButton);
  container.ownerDocument.defaultView?.addEventListener(
    "blur",
    () => (jumpHeld = false),
    { signal: abort.signal },
  );
  jumpButton.onpointerdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    jumpButton.setPointerCapture?.(e.pointerId);
    jumpHeld = true;
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    jumpButton.addEventListener(type, () => (jumpHeld = false), {
      signal: abort.signal,
    });
  const status = document.createElement("small");
  status.setAttribute("role", "status");
  status.style.color = "#e8d8ad";
  status.style.display = "block";
  status.style.lineHeight = "1.4";
  panel.append(status);
  button("Закрити", () => exit());
  container.append(panel);
  const inspectInterior = button(
    "✨ Squish Warehouse",
    () => void openInterior(),
    "warehouseInterior",
  );
  const squishPlayer = createSquishPlayer({
    canvas,
    camera,
    getInterior: () => interior,
    container,
  });
  const squishVisits = createSquishCatVisits({
      getInterior: () => interior,
      origin,
    }),
    pawContacts = createSquishCatContacts();
  button(
    "🐈 Чічі: розім’яти сквиш",
    async () => {
      if (!(await openInterior())) return;
      if (!runtime.has("chichi") && !(await invite("chichi"))) return;
      runtime.get("chichi").squishWanted = true;
      runtime.get("chichi").squishMaterialWanted = selectedMaterial;
    },
    "warehouseSquishCat",
  );
  button(
    "З’єднати слайми",
    async () => {
      if (await openInterior("slime"))
        interior.userData.toys
          .find((t) => t.userData.material === "slime")
          .userData.coalescence.merge();
    },
    "squishMerge",
  );
  button(
    "Розділити слайми",
    async () => {
      if (await openInterior("slime"))
        interior.userData.toys
          .find((t) => t.userData.material === "slime")
          .userData.coalescence.split();
    },
    "squishSplit",
  );
  button(
    "Оновити сквиш",
    () => {
      squishPlayer.release();
      interior?.userData.toys
        .find(
          (t) =>
            (t.userData.sectorId || t.userData.material) === selectedMaterial,
        )
        ?.userData.reset();
    },
    "squishReset",
  );
  button(
    "Огляд усього залу",
    async () => {
      if (await openInterior())
        onInteriorCamera({
          eye: [
            SQUISH_PROTOTYPE_ANCHOR.x + 90,
            SQUISH_PROTOTYPE_ANCHOR.y + 59,
            SQUISH_PROTOTYPE_ANCHOR.z + 28,
          ],
          target: [
            SQUISH_PROTOTYPE_ANCHOR.x,
            SQUISH_PROTOTYPE_ANCHOR.y + 9,
            SQUISH_PROTOTYPE_ANCHOR.z - 62,
          ],
          fov: 60,
        });
    },
    "squishOverview",
  );
  const seat = new T.Vector3();
  for (const d of SQUISH_DEMONSTRATORS) {
    const b = button(d.name, () => void openInterior(d.id));
    b.dataset.squishZone = d.id;
  }
  async function ensureInterior() {
    if (!(await ensure()) || disposed) return false;
    if (!interior) {
      if (!interiorPending)
        interiorPending = (async () => {
          const m = await prepare(warehouseSquishSteps(origin), abort.signal);
          await prepareModel(m);
          if (disposed) {
            m.userData.dispose();
            return;
          }
          interior = m;
          scene.add(m);
        })().finally(() => (interiorPending = null));
      await interiorPending;
    }
    if (!interior) return false;
    return !!interior;
  }
  async function openInterior(material = selectedMaterial) {
    selectedMaterial = material;
    if (!(await ensureInterior())) return false;
    squishPlayer.show(true);
    const d =
      SQUISH_DEMONSTRATORS.find((d) => d.id === material) ||
      SQUISH_DEMONSTRATORS[0];
    const giant = material === "giant",
      fit = Math.max(1, 0.95 / Math.max(0.2, camera.aspect)),
      targetY = giant ? 4 : 4;
    onInteriorCamera({
      eye: [
        SQUISH_PROTOTYPE_ANCHOR.x + d.x + (giant ? 16 : 12) * fit,
        SQUISH_PROTOTYPE_ANCHOR.y +
          targetY +
          ((giant ? 14 : 10) - targetY) * fit,
        SQUISH_PROTOTYPE_ANCHOR.z + d.z - 2 + (giant ? 26 : 20) * fit,
      ],
      target: [
        SQUISH_PROTOTYPE_ANCHOR.x + d.x,
        SQUISH_PROTOTYPE_ANCHOR.y + targetY,
        SQUISH_PROTOTYPE_ANCHOR.z + d.z - 2,
      ],
      fov: 52,
    });
    return true;
  }
  const runtime = createWarehouseVisits({
    onVisitStep: squishVisits.update,
    onVisitUnsafe: (v) => squishVisits.unsafe(v.id),
    origin,
    getActors,
    canSimulate,
    onPark,
    onComplete,
    onManualReady,
    onBoatPose: (pose, time) => {
      const m = fleet?.userData.boats[pose.slot];
      if (!m) return;
      m.position.set(pose.x, pose.y, pose.z);
      m.rotation.set(-(pose.pitch || 0), pose.yaw || 0, 0, "YXZ");
      m.userData.update(time, pose.speed, pose.open);
      const ramp = fleet.userData.ramps[pose.slot];
      if (ramp)
        ramp.visible =
          Math.hypot(
            pose.x - (A.departure.x + pose.slot * 14),
            pose.z - A.departure.z,
          ) < 1 && pose.open > 0.1;
      const dockRamp = fleet.userData.dockRamps[pose.slot];
      if (dockRamp)
        dockRamp.visible =
          Math.hypot(
            pose.x - (A.dock.x + (pose.slot - 1) * 14),
            pose.z - A.dock.z,
          ) < 1 &&
          ["leaving-boat", "return-boarding"].includes(
            runtime.get(pose.id)?.phase,
          );
      m.updateWorldMatrix(true, false);
    },
    getSeat: (pose) => {
      const m = fleet?.userData.boats[pose.slot];
      if (!m) return { x: pose.x, y: pose.y - 0.55, z: pose.z + 0.25 };
      seat.copy(m.userData.seat);
      m.localToWorld(seat);
      return { x: seat.x - origin.x, y: seat.y, z: seat.z - origin.z };
    },
    onDoorPose: (outer, inner, water, time) =>
      getModel()?.userData.entry?.userData.update(outer, inner, water, time),
  });
  async function ensure() {
    if (disposed) return false;
    if (fleet) return true;
    if (pending) return pending;
    if (!getModel()) return false;
    pending = (async () => {
      let model;
      try {
        model = await prepare(warehouseFleetSteps(origin), abort.signal);
        await prepareModel(model);
        if (disposed) {
          model.userData.dispose();
          return false;
        }
        fleet = model;
        fleet.userData.biomeId = "autumn";
        scene.add(fleet);
        return true;
      } catch (e) {
        model?.userData.dispose();
        if (!disposed) onError("Warehouse: " + e.message);
        return false;
      } finally {
        pending = null;
      }
    })();
    return pending;
  }
  async function invite(id) {
    if (!canSimulate() || !canInvite(id)) {
      onError("Дочекайся безпечного завершення поточного переходу.");
      return false;
    }
    if (!(await ensure()) || disposed || !canSimulate() || !canInvite(id))
      return false;
    if (runtime.has(id)) return true;
    if (!reserve(id)) return false;
    const ok = runtime.start(id);
    if (ok)
      onError(
        "Чічі прямує до причалу. Субмарина доставить її до входу Warehouse.",
      );
    return ok;
  }
  function requestManual() {
    if (runtime.has("chichi")) {
      const returning = [
        "lobby-return",
        "airlock-out",
        "return-boarding",
        "inbound",
        "disembark",
      ].includes(runtime.get("chichi")?.phase);
      squishVisits.cancel("chichi");
      runtime.requestManual();
      onError(
        returning
          ? "Керування увімкнеться на березі після завершення зворотного рейсу."
          : "Керування увімкнеться після безпечного прибуття до Warehouse.",
      );
      return true;
    }
    return invite("chichi").then((ok) => ok && runtime.requestManual());
  }
  function exit() {
    squishPlayer.show(false);
    opened = false;
    panel.hidden = true;
    if (!runtime.manual) runtime.releaseManual();
  }
  const local = (p) => ({ x: p.x - origin.x, y: p.y, z: p.z - origin.z });
  function insideFloor(p, radius = 0.6) {
    if (!getModel()) return false;
    const q = local(p),
      sx = W.width / 240,
      sz = W.depth / 120,
      dx = Math.max(0, Math.abs(q.x - W.x) - 60 * sx),
      dz = Math.abs(q.z - W.z),
      rx = 59.4 * sx - radius,
      rz = 59.4 * sz - radius,
      inside = (dx / rx) ** 2 + (dz / rz) ** 2 < 1;
    const corridor =
      Math.abs(q.x - W.x) < 4 - radius && q.z >= A.lobby.z && q.z <= A.inside.z;
    return inside || corridor;
  }
  const navigation = createSquishNavigation({
    getInterior: () => interior,
    floor: A.foot,
    inside: insideFloor,
  });
  const manualPhysics = createSquishManual({
    getActor: () => getActors().find((a) => a.id === "chichi"),
    getNavigation: () => navigation,
    isActive: () => runtime.manual === "chichi",
    getRadius: () => getActors().find((a) => a.id === "chichi")?.radius || 0.6,
    floor: A.foot,
  });
  const thirdPersonCamera = createWarehouseThirdPersonCamera({
    canvas,
    camera,
    look,
    getActor: () => getActors().find((a) => a.id === "chichi"),
    isActive: () => runtime.manual === "chichi",
    clear: cameraClear,
  });
  function support(p, radius = 0.6, from = null) {
    return navigation.support(p, radius, from);
  }
  function releaseManual(returning = false) {
    pendingManualReturn ||= returning;
    if (runtime.manual === "chichi" && !manualPhysics.requestRelease())
      return false;
    runtime.releaseManual();
    manualPhysics.reset();
    thirdPersonCamera.reset();
    if (pendingManualReturn) {
      runtime.cancel("chichi");
      pendingManualReturn = false;
    }
    return true;
  }
  function cameraClear(a, b) {
    if (!navigation.cameraClear(a, b)) return false;
    const qa = local(a),
      qb = local(b);
    if (Math.min(qa.y, qb.y) < A.floor + 0.1) return false;
    const margin = 0.2;
    if (
      Math.max(Math.abs(qa.x - W.x), Math.abs(qb.x - W.x)) <
        W.width / 2 - 120 - margin &&
      Math.max(Math.abs(qa.z - W.z), Math.abs(qb.z - W.z)) <
        W.depth / 2 - 12 - margin
    )
      return true;
    return !support(a, 0) || !!support(b, 0);
  }
  return {
    applyCatPose(id, model, carrier, time, reduced) {
      const f =
        id === "chichi" && runtime.manual === "chichi"
          ? manualPhysics.frame
          : runtime.frame(id);
      if (f?.squish)
        pawContacts.collect(
          id,
          model,
          carrier,
          f.squish.toy,
          f.squish.age,
          reduced,
          f.squish,
        );
    },
    finalizeFrame(dt) {
      if (interior?.visible) pawContacts.flush(dt, interior.userData.toys);
      else pawContacts.clear();
    },
    get pawDiagnostics() {
      return pawContacts.diagnostics;
    },
    origin,
    ensure,
    openInterior,
    get interior() {
      return interior;
    },
    invite,
    requestManual,
    exit,
    support,
    cameraClear,
    runtime,
    pick(raycaster) {
      const model = getModel();
      if (!model || !model.visible) return false;
      const b = new T.Box3().setFromObject(model);
      if (!raycaster.ray.intersectsBox(b)) return false;
      if (!raycaster.intersectObject(model, true).length) return false;
      onInspect();
      return true;
    },
    get ready() {
      return !!fleet;
    },
    get manual() {
      return runtime.manual === "chichi";
    },
    get inspection() {
      return opened;
    },
    open() {
      opened = true;
      panel.hidden = false;
    },
    has: runtime.has,
    frame: runtime.frame,
    unsafe: (id) =>
      runtime.unsafe(id) || (id === "chichi" && manualPhysics.airborne),
    cancel: (id) =>
      id === "chichi" && runtime.manual === "chichi"
        ? releaseManual(true)
        : runtime.cancel(id),
    safePosition: runtime.safePosition,
    releaseManual,
    thirdPersonCamera,
    playerTransport: (input) =>
      manualPhysics.transport({ ...input, jump: input.jump || jumpHeld }),
    arrival: () =>
      new T.Vector3(origin.x + A.shore.x, A.shore.y, origin.z + A.shore.z),
    startReady: (id, activityId, ticket) =>
      runtime.start(id, activityId, { ticket }),
    update(dt, time) {
      pawContacts.restoreFrame();
      const active = getFocused() === "autumn",
        visible = active || getOverview();
      if (!active) exit();
      if (
        active &&
        getGame().unlocked.includes("autumn") &&
        !fleet &&
        !pending &&
        getModel() &&
        time > nextTry
      ) {
        nextTry = time + 30;
        void ensure();
      }
      if (fleet) fleet.visible = visible;
      if (
        fleet &&
        !interior &&
        !interiorPending &&
        [...runtime.visits.values()].some((v) =>
          ["airlock-in", "lobby-walk", "visit"].includes(v.phase),
        )
      )
        void ensureInterior();
      runtime.update(dt, time);
      if (canSimulate()) manualPhysics.update(dt);
      if (manualPhysics.releasing) {
        const f = manualPhysics.frame,
          v = runtime.get("chichi");
        if (f && v) {
          v.frame.position.copy(f.position);
          v.frame.yaw = f.yaw;
          v.frame.walking = f.walking;
          v.frame.reaction = f.reaction;
          v.frame.squish = f.squish;
        }
        if (manualPhysics.safeToRelease) {
          runtime.releaseManual();
          manualPhysics.reset();
          thirdPersonCamera.reset();
          if (pendingManualReturn) {
            runtime.cancel("chichi");
            pendingManualReturn = false;
          }
        }
      }
      jumpButton.hidden = runtime.manual !== "chichi";
      jumpButton.disabled = manualPhysics.releasing || !canSimulate();
      if (runtime.manual === "chichi") squishPlayer.show(false);
      if (interior) {
        interior.visible = visible;
        if (active) squishPlayer.update(dt);
      }
      for (const id of runtime.visits.keys()) hold(id);
      const entry = getModel()?.userData.entry;
      if (entry) {
        const s = entry.userData.state;
        entry.userData.update(s.outer, s.inner, s.water, time);
      }
      call.disabled = !canSimulate() || runtime.has("chichi");
      control.disabled = back.disabled =
        !canSimulate() || !runtime.has("chichi");
      const phase = runtime.get("chichi")?.phase;
      status.textContent = phase
        ? ["outbound", "inbound"].includes(phase)
          ? "Субмарина в дорозі"
          : phase === "visit"
            ? "Чічі у Warehouse"
            : phase.startsWith("airlock")
              ? "Прохід через герметичний вхід"
              : "Посадка та перехід"
        : "3 субмарини · проїзд безкоштовний";
    },
    dispose() {
      disposed = true;
      abort.abort();
      runtime.dispose();
      pawContacts.clear();
      squishVisits.clear();
      squishPlayer.dispose();
      manualPhysics.reset();
      thirdPersonCamera.dispose();
      jumpButton.remove();
      interior?.userData.dispose();
      fleet?.userData.dispose();
      panel.remove();
    },
    diagnostics() {
      return {
        ready: !!fleet,
        manual: runtime.manual,
        visits: [...runtime.visits.values()].map((v) => ({
          id: v.id,
          phase: v.phase,
          position: v.frame.position.toArray(),
          boat: v.boat,
        })),
        boats: runtime.boats.map((b) => ({ ...b })),
      };
    },
  };
}
