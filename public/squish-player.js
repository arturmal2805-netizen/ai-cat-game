import * as T from "three";
// Explicit venue-only interaction mode. Ordinary camera gestures stay native.
export function createSquishPlayer({ canvas, camera, getInterior, container }) {
  const abort = new AbortController(),
    ray = new T.Raycaster(),
    pointer = new T.Vector2(),
    local = new T.Vector3(),
    normal = new T.Vector3(),
    plane = new T.Plane(),
    hitPoint = new T.Vector3(),
    start = new T.Vector3(),
    target = new T.Vector3();
  let mode = null,
    active = null;
  const bar = document.createElement("div");
  bar.className = "squish-actions";
  bar.hidden = true;
  bar.style.cssText =
    "position:absolute;left:50%;bottom:90px;transform:translateX(-50%);display:none;gap:5px;max-width:90%;flex-wrap:wrap;justify-content:center;z-index:8";
  const buttons = [];
  for (const [id, label] of [
    ["press", "Лапкою"],
    ["hold", "Тримати"],
    ["drag", "Зсунути"],
    ["stretch", "Тягнути"],
    ["twist", "Крутити"],
    ["knead", "Розминати"],
    ["release", "Відпустити"],
    [null, "Камера"],
  ]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.squishMode = id || "camera";
    b.style.cssText =
      "min-height:44px;border:1px solid #e8bf7a;border-radius:12px;padding:7px 10px;color:#fff4df;background:#412b52";
    b.onclick = () => {
      release();
      mode = id === "release" ? null : id;
      for (const e of buttons) e.setAttribute("aria-pressed", String(e === b));
    };
    bar.append(b);
    buttons.push(b);
  }
  const pressureLabel = document.createElement("label");
  pressureLabel.textContent = "Сила ";
  pressureLabel.style.cssText =
    "color:#fff4df;display:flex;align-items:center;font-size:12px";
  const pressure = document.createElement("input");
  pressure.type = "range";
  pressure.min = ".25";
  pressure.max = "1.6";
  pressure.step = ".05";
  pressure.value = ".85";
  pressure.dataset.squishPressure = "";
  pressure.setAttribute("aria-label", "Сила натискання");
  pressure.style.cssText = "width:82px;min-height:44px;accent-color:#eac27f";
  pressure.addEventListener("input", () => {
    if (active?.lastEvent) apply(active.lastEvent);
  });
  pressureLabel.append(pressure);
  bar.append(pressureLabel);
  container.append(bar);
  const cast = (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
  };
  function release() {
    if (active) {
      active.toy.userData.solver.release("player");
      try {
        canvas.releasePointerCapture(active.pointer);
      } catch {}
      active = null;
    }
  }
  const stop = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      const interior = getInterior();
      if (!mode || !interior?.visible || e.button !== 0) return;
      cast(e);
      const hits = ray.intersectObjects(
        interior.userData.toys.flatMap((t) => t.userData.pickMeshes),
        false,
      );
      if (!hits.length) return;
      const hit = hits[0],
        toy = interior.userData.toys.find((t) =>
          t.children.includes(hit.object),
        );
      if (!toy) return;
      stop(e);
      local.copy(hit.point);
      toy.worldToLocal(local);
      normal
        .copy(hit.face.normal)
        .applyMatrix3(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld))
        .normalize();
      plane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(target),
        hit.point,
      );
      start.copy(hit.point);
      // Contact points/displacements/normals all live in the toy's frame, even
      // if its containing group is rotated or scaled. Camera plane stays world.
      normal
        .applyMatrix3(
          new T.Matrix3().setFromMatrix4(toy.matrixWorld).transpose(),
        )
        .normalize();
      active = {
        toy,
        pointer: e.pointerId,
        point: toy.userData.restPoint(hit),
        grabLocal: local.clone(),
        normal: normal.clone(),
        startX: e.clientX,
        startY: e.clientY,
        age: 0,
      };
      canvas.setPointerCapture(e.pointerId);
      apply(e);
    },
    { capture: true, signal: abort.signal },
  );
  function apply(e) {
    if (!active) return;
    active.lastEvent = { clientX: e.clientX, clientY: e.clientY };
    const a = active,
      solver = a.toy.userData.solver,
      displacement = local.copy(a.grabLocal).sub(a.point).clone();
    let twist = 0;
    if (mode === "press" || mode === "hold" || mode === "knead") {
      const depth =
        mode === "knead"
          ? (0.45 + 0.25 * Math.sin(a.age * 6)) *
            (Number(pressure.value) / 0.85)
          : Number(pressure.value);
      displacement.addScaledVector(a.normal, -depth);
    } else if (mode === "stretch" || mode === "drag") {
      cast(e);
      if (ray.ray.intersectPlane(plane, hitPoint))
        displacement
          .copy(a.toy.worldToLocal(hitPoint.clone()))
          .sub(a.point)
          .clampLength(0, solver.profile.maximumDeformation);
      if (mode === "drag") {
        displacement
          .copy(a.toy.worldToLocal(hitPoint.clone()))
          .sub(a.grabLocal);
        displacement.addScaledVector(a.normal, -displacement.dot(a.normal));
        displacement.add(a.grabLocal).sub(a.point);
        displacement.addScaledVector(a.normal, -0.2);
      }
    } else {
      twist = T.MathUtils.clamp((e.clientX - a.startX) * 0.008, -1.1, 1.1);
      displacement.addScaledVector(a.normal, -0.3);
    }
    solver.setContact("player", {
      kind: mode,
      point: a.point.toArray(),
      normal: a.normal.toArray(),
      displacement: displacement.toArray(),
      radius: solver.profile.interactionRadius,
      force: 100 * (Number(pressure.value) / 0.85),
      duration: a.age,
      twist,
    });
  }
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!active || e.pointerId !== active.pointer) return;
      stop(e);
      apply(e);
    },
    { capture: true, signal: abort.signal },
  );
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(
      name,
      (e) => {
        if (!active || e.pointerId !== active.pointer) return;
        stop(e);
        release();
      },
      { capture: true, signal: abort.signal },
    );
  canvas.ownerDocument.defaultView?.addEventListener("blur", release, {
    signal: abort.signal,
  });
  return {
    release,
    show(value) {
      bar.hidden = !value;
      bar.style.display = value ? "flex" : "none";
      if (!value) {
        release();
        mode = null;
      }
    },
    update(dt) {
      if (active) {
        active.age += dt;
        if (active.lastEvent) apply(active.lastEvent);
      }
    },
    get active() {
      return active;
    },
    dispose() {
      release();
      abort.abort();
      bar.remove();
    },
  };
}
