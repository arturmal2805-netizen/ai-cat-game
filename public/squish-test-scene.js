import * as T from "three";
import { createCat, animateCat, reactCat, disposeCat } from "./cat-model.js";
import { applyAtollSit } from "./atoll-slide-acting.js";
import { createSquishToy } from "./squish-model.js";
import { createSquishCatContacts } from "./squish-cat-contacts.js";
import { measureSquish } from "./squish-diagnostics.js";

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
        o.material.envMapIntensity = 1.05;
      }
    });
    root.add(toy);
    return toy;
  });
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
    steps = 0;
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
  function fixed() {
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
        angle = (time - 3) * 1.5;
      s.setContact("test-grip", {
        kind: twist ? "twist" : "stretch",
        point: [0.8, 3.1, 0.4],
        displacement: twist
          ? [Math.sin(angle) * 1.4, 1.3, Math.cos(angle) * 1.4]
          : [0.6, (time - 1) * 0.9, 0.3],
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
    root.updateWorldMatrix(true, true);
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
      root.removeFromParent();
      panel.remove();
    },
  };
}
