import * as T from "three";
import { createCat, animateCat, reactCat, disposeCat } from "./cat-model.js";
import { applyAtollSit } from "./atoll-slide-acting.js";
import { createSquishToy } from "./squish-model.js";
import { createSquishCatContacts } from "./squish-cat-contacts.js";
import { measureSquish } from "./squish-diagnostics.js";
import { WAREHOUSE_ACCESS as A } from "./warehouse-access-data.js";

// The actual interior root is A.foot + .36 above its authored floor.
export const SQUISH_TEST_FLOOR_Y = A.floor - (A.foot + 0.36);
export const SQUISH_TEST_CARRIER_GROUND_Y = SQUISH_TEST_FLOOR_Y + 0.012;

export const SQUISH_TEST_STATES = Object.freeze({
  foam: ["NORMAL", "PAW PRESS", "DEEP COMPRESSION", "SLOW RECOVERY"],
  jelly: ["NORMAL", "COMPRESSION", "WOBBLE", "RECOVERY"],
  slime: ["REST", "STRETCH", "TWIST / STRANDS", "MERGE / RELAX"],
  butter: ["INTACT", "STRONG COMPRESSION", "CRACKS", "LOCAL FRACTURE"],
  cloud: ["FLUFFY REST", "SOFT SINK", "WIDE COMPRESSION", "SLOW RECOVERY"],
});
// Developer-only diagnostic bench, explicitly requested by V19. It never
// replaces a live toy/native actor, never mutates game saves or zone anchors.
// Five real solver models and ONE original-factory native rig, fixed seed/step.
export function createSquishTestScene({
  parent,
  container,
  environment,
  onCamera,
}) {
  const root = new T.Group();
  root.name = "V19 developer test bench · temporary";
  root.position.set(0, 0, -165);
  parent.add(root);
  const toys = Object.keys(SQUISH_TEST_STATES).map((material, i) => {
    const toy = createSquishToy({ material, shape: "cat" });
    toy.position.x = (i - 2) * 10;
    toy.userData.testId = "v19-test-" + material;
    toy.traverse((o) => {
      if (o.isMesh && o.material.isMeshStandardMaterial) {
        o.material.envMap = environment;
        o.material.envMapIntensity = material === "jelly" ? 1.5 : 1.05;
      }
    });
    root.add(toy);
    return toy;
  });
  // Developer-only supports terminate at each actual rendered rest bottom.
  // These five instances never attach to production toys or sector anchors.
  const plinthGeometry = new T.CylinderGeometry(3.4, 3.55, 1, 48),
    plinthMaterial = new T.MeshStandardMaterial({
      color: 0xf6eadc,
      roughness: 0.35,
      metalness: 0.25,
    }),
    plinths = new T.InstancedMesh(plinthGeometry, plinthMaterial, toys.length),
    plinthMatrix = new T.Matrix4();
  plinths.name = "Developer bench · five floor-supported plinths";
  plinths.castShadow = plinths.receiveShadow = true;
  for (let i = 0; i < toys.length; i++) {
    const toy = toys[i],
      source = toy.userData.sources[0];
    let bottom = Infinity;
    for (let j = 1; j < source.length; j += 3)
      bottom = Math.min(bottom, source[j]);
    const height = bottom - SQUISH_TEST_FLOOR_Y;
    plinthMatrix.makeScale(1, height, 1);
    plinthMatrix.setPosition(
      toy.position.x,
      SQUISH_TEST_FLOOR_Y + height / 2,
      0,
    );
    plinths.setMatrixAt(i, plinthMatrix);
  }
  plinths.instanceMatrix.needsUpdate = true;
  root.add(plinths);
  function refreshNativeWorld() {
    // updateWorldMatrix alone skips SkinnedMesh.updateMatrixWorld's attached
    // bindMatrixInverse refresh. CPU picking must match the next native draw.
    root.updateWorldMatrix(true, false);
    root.updateMatrixWorld(true);
  }
  const actor = createCat("happy"),
    carrier = new T.Group();
  carrier.add(actor);
  root.add(carrier);
  const contacts = createSquishCatContacts();
  const document = container.ownerDocument;
  const panel = document.createElement("div");
  panel.dataset.squishTest = "";
  panel.style.cssText =
    "position:absolute;left:8px;top:90px;max-width:85%;padding:8px;border-radius:10px;background:#1e163ce8;color:#fff;z-index:28;display:flex;gap:5px;flex-wrap:wrap";
  const label = document.createElement("strong");
  label.textContent = "V19 · тест фізики (тимчасовий стенд)";
  panel.append(label);
  let selected = "foam",
    time = 0,
    accumulator = 0,
    playing = false,
    steps = 0,
    temporal = null;
  const button = (text, action, key) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = action;
    if (key) b.dataset.squishTestAction = key;
    panel.append(b);
    return b;
  };
  for (const id of Object.keys(SQUISH_TEST_STATES))
    button(id, () => select(id), id);
  button("▶ / Ⅱ", () => (playing = !playing), "play");
  button("↺", () => reset(), "reset");
  const status = document.createElement("span");
  panel.append(status);
  container.append(panel);
  function selectedToy() {
    return toys.find((t) => t.userData.material === selected);
  }
  function focus() {
    const p = selectedToy().getWorldPosition(new T.Vector3());
    onCamera({
      eye: [p.x + 6, p.y + 5.8, p.z + 9],
      target: [p.x, p.y + 2.4, p.z],
      fov: 48,
      far: 20000,
    });
  }
  function reset() {
    temporal = null;
    contacts.clear();
    for (const toy of toys) toy.userData.reset();
    time = 0;
    steps = 0;
    accumulator = 0;
    actor.visible = false;
    carrier.visible = true;
  }
  function select(material) {
    if (!SQUISH_TEST_STATES[material]) return false;
    reset();
    selected = material;
    focus();
    return true;
  }
  // Optional deterministic V22 audit mode: a static original-factory native
  // pose loads the same five actual cage/render meshes continuously. Times are
  // measured physics steps, never authored depth or carrier-height curves.
  function temporalPose() {
    const toy = selectedToy();
    contacts.restoreFrame();
    animateCat(actor, 0, false, false);
    reactCat(actor, { ride: true }, false);
    applyAtollSit(actor, { ride: true }, false);
    actor.visible = true;
    carrier.rotation.y = 0.1;
    if (temporal.loading) {
      const world = root.localToWorld(new T.Vector3(toy.position.x, 0, 0));
      const surface = toy.userData.surface(world.x, world.z);
      const local = root.worldToLocal(
        new T.Vector3(world.x, surface ?? world.y, world.z),
      );
      carrier.position.set(toy.position.x, local.y + 0.012, 0);
      refreshNativeWorld();
      contacts.collect(
        "v22-temporal-native",
        actor,
        carrier,
        toy,
        time,
        false,
        { state: "ManualWalk", blend: 1, impact: 0 },
      );
    } else {
      const age = time - temporal.releaseTime;
      carrier.position.set(
        toy.position.x,
        Math.max(
          SQUISH_TEST_CARRIER_GROUND_Y,
          temporal.releaseY + 3.8 * age - 4.905 * age * age,
        ),
        Math.min(4.5, age * 3),
      );
      if (carrier.position.y > SQUISH_TEST_CARRIER_GROUND_Y + 1e-6)
        reactCat(actor, { ride: true, paw: 0.2, hindTuck: 0.15 }, false);
      refreshNativeWorld();
    }
  }
  function fixedTemporal() {
    time += 1 / 60;
    steps++;
    temporalPose();
    contacts.flush(1 / 60, toys);
    status.textContent = `${selected}: V22 ${temporal.loading ? "STATIC NATIVE LOAD" : "RELEASE / RECOVERY"} · ${time.toFixed(2)}s`;
  }
  function startTemporal(material) {
    if (!select(material)) return false;
    temporal = { loading: true, releaseTime: null, releaseY: 0 };
    temporalPose();
    // Register actual original skinned paw contacts at t=0, without advancing
    // a fixed step. The first captured frame is the true undeformed cage.
    contacts.flush(0, toys);
    return true;
  }
  function releaseTemporal() {
    if (!temporal || !temporal.loading) return false;
    temporal.loading = false;
    temporal.releaseTime = time;
    temporal.releaseY = carrier.position.y;
    contacts.clear();
    return true;
  }
  function fixed() {
    if (temporal) {
      fixedTemporal();
      return;
    }
    const toy = selectedToy(),
      u = toy.userData,
      s = u.solver;
    time += 1 / 60;
    steps++;
    contacts.restoreFrame();
    const state = time < 1 ? 0 : time < 3 ? 1 : time < 5 ? 2 : 3;
    status.textContent = `${selected}: ${SQUISH_TEST_STATES[selected][state]} · ${time.toFixed(2)}s`;
    animateCat(actor, time, false, false);
    carrier.position.set(toy.position.x, 0.012, 0);
    carrier.rotation.y = 0.1;
    let grounded = time >= 1 && time < 5;
    let reaction = { ride: true },
      acting = { state: "PawPress", blend: 1 };
    if (selected === "foam" || selected === "cloud") {
      const body = time >= 3 && time < 5;
      reaction = body
        ? { ride: true, waterProne: 0.75, eyeClose: 0.65 }
        : { ride: true };
      acting = {
        state: body ? "RelaxedSquishRest" : "DoublePawPress",
        blend: 1,
        bodyContact: body,
      };
    }
    if (selected === "jelly" && time >= 1 && time < 5) {
      const phase = (time - 1) % 1.2,
        vy = 4.905,
        flight = Math.max(0, phase - 0.2);
      const height = Math.max(0, vy * flight - 4.905 * flight * flight);
      grounded = phase < 0.2 || height < 0.025;
      carrier.position.y += height;
      acting = { state: "JellyBounce", blend: 1, impact: grounded ? vy : 0 };
    }
    if (selected === "slime" && time >= 1 && time < 5) {
      const twist = time >= 3,
        angle = Math.max(0, time - 3) * 0.65;
      s.setContact("test-grip", {
        kind: twist ? "twist" : "stretch",
        point: [0.8, 3.1, 0.4],
        displacement: [0.6, Math.min(1.5, (time - 1) * 0.75), 0.3],
        twist: twist ? angle : 0,
        force: 100,
        radius: 1.1,
        duration: time - 1,
      });
      acting = { state: twist ? "SquishTwist" : "SlimeStretch", blend: 1 };
    } else s.release("test-grip");
    if (selected === "butter" && time >= 1 && time < 5) {
      s.setContact("test-pressure", {
        kind: "press",
        point: [0, 3.1, 0.45],
        displacement: [0.15, -Math.min(0.95, (time - 1) * 0.3), 0.08],
        force: 125,
        radius: 1.25,
        duration: time - 1,
      });
    } else s.release("test-pressure");
    if (time >= 5) {
      // One native model physically leaves along a true gravity arc. It never
      // writes a teleport into player state; this is an isolated test actor.
      const age = Math.min(1.2, time - 5),
        top =
          u.surface(
            toy.getWorldPosition(new T.Vector3()).x,
            toy.getWorldPosition(new T.Vector3()).z,
          ) - toy.getWorldPosition(new T.Vector3()).y;
      carrier.position.z = age * 4;
      carrier.position.y = Math.max(0, top + 3 * age - 4.905 * age * age);
      actor.visible = time < 7;
      if (selected === "slime") u.coalescence?.merge();
    } else {
      actor.visible = time >= 1;
      const p = root.localToWorld(new T.Vector3(toy.position.x, 0, 0));
      const top = u.surface(p.x, p.z);
      const local = root.worldToLocal(new T.Vector3(p.x, top ?? p.y, p.z));
      carrier.position.y += local.y;
    }
    reactCat(actor, reaction, false);
    applyAtollSit(actor, reaction, false);
    refreshNativeWorld();
    if (grounded)
      contacts.collect(
        "v19-test-native",
        actor,
        carrier,
        toy,
        time,
        false,
        acting,
      );
    contacts.flush(1 / 60, toys);
  }
  reset();
  return {
    root,
    toys,
    actor,
    carrier,
    select,
    reset,
    focus,
    startTemporal,
    releaseTemporal,
    setPlaying(value) {
      playing = !!value;
    },
    advanceFixed(frames) {
      for (let i = 0; i < Math.min(6000, Math.max(0, frames)); i++) fixed();
    },
    update(dt) {
      root.visible = parent.visible;
      panel.hidden = !root.visible;
      if (!playing || !root.visible) return;
      accumulator += Math.min(0.1, dt);
      let n = 0;
      while (accumulator >= 1 / 60 && n++ < 6) {
        accumulator -= 1 / 60;
        fixed();
      }
    },
    get diagnostics() {
      return {
        seed: 4419,
        fixedStep: 1 / 60,
        steps,
        time,
        selected,
        playing,
        floor: {
          localY: SQUISH_TEST_FLOOR_Y,
          worldY: root.localToWorld(new T.Vector3(0, SQUISH_TEST_FLOOR_Y, 0)).y,
          carrierGroundLocalY: SQUISH_TEST_CARRIER_GROUND_Y,
        },
        temporal: temporal
          ? { ...temporal, actorPosition: carrier.position.toArray() }
          : null,
        nativePaws: contacts.diagnostics,
        nativeActor:
          "original createCat factory; isolated temporary test actor, not player replacement",
        materials: toys.map(measureSquish),
      };
    },
    dispose() {
      contacts.clear();
      disposeCat(actor);
      for (const toy of toys) toy.userData.dispose();
      plinthGeometry.dispose();
      plinthMaterial.dispose();
      root.removeFromParent();
      panel.remove();
    },
  };
}
