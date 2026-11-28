import * as T from "three";
// Contact markers are sampled from the approved SKINNED paw vertices. Original
// vertex buffers/anatomy are never edited. Native animateCat resets the small
// leg-height correction on the next frame and on cancellation.
const markers = new WeakMap();
function refresh(model) {
  model.updateWorldMatrix(true, false);
  model.updateMatrixWorld(true);
}
function pawMarkers(model) {
  if (markers.has(model)) return markers.get(model);
  const list = [];
  for (const [index, leg] of (model.userData.legs || []).entries()) {
    let mesh,
      vertex = 0,
      min = Infinity;
    leg.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        if (p.getY(i) < min) {
          min = p.getY(i);
          mesh = o;
          vertex = i;
        }
    });
    if (mesh)
      list.push({
        index,
        leg,
        mesh,
        vertex,
        point: new T.Vector3(),
        previous: new T.Vector3(),
        initialized: false,
      });
  }
  const body = model.userData.body;
  if (body?.isMesh) {
    let index = 0,
      min = Infinity;
    const p = body.geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      if (p.getY(i) < min) {
        min = p.getY(i);
        index = i;
      }
    list.body = { mesh: body, vertex: index, point: new T.Vector3() };
  }
  list.supportOffset = 0;
  markers.set(model, list);
  return list;
}
export function createSquishCatContacts() {
  const pending = [],
    activeKeys = new Map(),
    diagnostic = [],
    oriented = new Map();
  function restore(model) {
    const q = oriented.get(model);
    if (q) {
      model.quaternion.copy(q);
      oriented.delete(model);
    }
  }
  function restoreFrame() {
    for (const [model, q] of oriented) model.quaternion.copy(q);
    oriented.clear();
  }
  const measure = (p) => {
    p.mesh.getVertexPosition(p.vertex, p.point);
    p.mesh.localToWorld(p.point);
    return p.point;
  };
  function collect(id, model, carrier, toy, age, reduced = false, acting = {}) {
    restore(model);
    if (pending.length >= 8) return;
    const paws = pawMarkers(model);
    if (!paws.length) return;
    const state = acting.state || "AlternatingKnead",
      blend = acting.blend ?? 1;
    if (acting.bodyContact) carrier.position.y += paws.supportOffset;
    else if (state === "StandRelease") {
      if (paws.supportState !== state)
        paws.transitionOffset = paws.supportOffset;
      paws.supportOffset =
        (paws.transitionOffset || 0) * (acting.supportBlend || 0);
      carrier.position.y += paws.supportOffset;
    } else paws.supportOffset = 0;
    paws.supportState = state;
    for (const p of paws) {
      const front = p.leg.position.z > 0,
        left = p.leg.position.x < 0;
      let lift = 0;
      if (front && !reduced && !acting.bodyContact) {
        const phase =
          age * (state === "SoftKnead" ? 2.5 : 4.5) + (left ? 0 : Math.PI);
        if (["AlternatingKnead", "SoftKnead"].includes(state))
          lift = Math.max(0, Math.sin(phase)) * 0.12;
        else if (state === "PawPress")
          lift = left ? Math.max(0, Math.sin(age * 2.4)) * 0.14 : 0;
        else if (state === "DoublePawPress")
          lift = Math.max(0, Math.sin(age * 2.4)) * 0.12;
        else if (
          ["SlimePull", "SlimeStretch", "SlimeStickyPaw", "PawShake"].includes(
            state,
          )
        ) {
          lift =
            Math.max(
              0,
              Math.sin(
                age * (state === "PawShake" ? 20 : 1.7) + (left ? 0 : Math.PI),
              ),
            ) * 0.12;
          p.leg.rotation.x -= Math.sin(age * 1.7) * 0.13 * blend;
        } else if (["SquishTwist", "SlimeFold"].includes(state))
          p.leg.rotation.z +=
            (left ? 1 : -1) * Math.sin(age * 1.6) * 0.15 * blend;
      }
      p.swing = lift * blend;
      p.leg.position.y += p.swing;
    }
    refresh(model);
    pending.push({ id, model, carrier, toy, age, paws, acting });
  }
  function flush(dt, toys) {
    diagnostic.length = 0;
    const nextKeys = new Map();
    for (const v of pending) {
      if (v.acting.state === "ManualWalk") {
        const x = v.carrier.position.x,
          z = v.carrier.position.z,
          h = 0.28,
          centre = v.toy.userData.surface(x, z),
          xp = v.toy.userData.surface(x + h, z),
          xm = v.toy.userData.surface(x - h, z),
          zp = v.toy.userData.surface(x, z + h),
          zm = v.toy.userData.surface(x, z - h);
        if (centre !== null) {
          const dx =
              xp !== null && xm !== null
                ? (xp - xm) / (2 * h)
                : xp !== null
                  ? (xp - centre) / h
                  : xm !== null
                    ? (centre - xm) / h
                    : 0,
            dz =
              zp !== null && zm !== null
                ? (zp - zm) / (2 * h)
                : zp !== null
                  ? (zp - centre) / h
                  : zm !== null
                    ? (centre - zm) / h
                    : 0,
            normal = new T.Vector3(-dx, 1, -dz)
              .normalize()
              .applyQuaternion(
                v.carrier.getWorldQuaternion(new T.Quaternion()).invert(),
              ),
            tilt = new T.Quaternion().setFromUnitVectors(
              new T.Vector3(0, 1, 0),
              normal,
            ),
            angle = 2 * Math.acos(T.MathUtils.clamp(tilt.w, -1, 1));
          if (angle > 0.55) tilt.slerp(new T.Quaternion(), 1 - 0.55 / angle);
          oriented.set(v.model, v.model.quaternion.clone());
          v.model.quaternion.premultiply(tilt);
          refresh(v.model);
        }
      }
      const solver = v.toy.userData.solver,
        keys = nextKeys.get(solver) || [];
      nextKeys.set(solver, keys);
      if (v.acting.bodyContact && v.paws.body) {
        const b = v.paws.body;
        measure(b);
        const surface = v.toy.userData.surface(b.point.x, b.point.z);
        if (surface !== null) {
          const adjust = T.MathUtils.clamp(surface - b.point.y, -0.16, 0.16);
          v.paws.supportOffset += adjust;
          v.carrier.position.y += adjust;
          refresh(v.model);
          measure(b);
          const local = v.toy.worldToLocal(b.point.clone()),
            key = v.id + ":body";
          solver.setContact(key, {
            kind: "body",
            point: [
              local.x,
              v.toy.userData.restSurfaceHeight(local.x, local.z),
              local.z,
            ],
            displacement: [0, -0.5, 0],
            radius: 1,
            force: 8.5 * 9.81,
          });
          keys.push(key);
          diagnostic.push({
            id: v.id,
            kind: "body",
            point: b.point.toArray(),
            surface,
            error: b.point.y - surface,
            force: 8.5 * 9.81,
            material: v.toy.userData.material,
          });
        }
        continue;
      }
      let supports = 0;
      for (const p of v.paws) {
        measure(p);
        const h = v.toy.userData.surface(p.point.x, p.point.z);
        if (p.swing <= 0.04 && h !== null && p.point.y - h <= 0.13) supports++;
      }
      // Art-tuned 8.5 kg estimate, distributed among planted paws rather than
      // doubling/halving the cat's weight as its animation changes support.
      const supportedWeight = (8.5 * 9.81) / Math.max(1, supports);
      for (const p of v.paws) {
        measure(p);
        const hit = v.toy.userData.surfaceInfo(p.point.x, p.point.z);
        const target = hit?.y ?? null;
        if (p.swing > 0.04 || target === null || p.point.y - target > 0.13) {
          p.initialized = false;
          p.grip = null;
          continue;
        }
        const local = v.toy.worldToLocal(p.point.clone()),
          [sx, sy, sz] = solver.size,
          y = v.toy.userData.restSurfaceHeight(local.x, local.z),
          velocity = p.initialized
            ? p.point
                .clone()
                .sub(p.previous)
                .multiplyScalar(1 / Math.max(dt, 1 / 120))
            : new T.Vector3();
        p.contactAge = p.initialized ? (p.contactAge || 0) + dt : 0;
        p.previous.copy(p.point);
        p.initialized = true;
        const force = T.MathUtils.clamp(
            supportedWeight +
              Math.max(0, -velocity.y) * 10 +
              (v.acting.impact || 0) * 6,
            15,
            160,
          ),
          key = v.id + ":paw:" + p.index;
        // Continuous planted constraints preserve viscous filtering. Tangential
        // load follows actual toe movement, not an unrelated age-based sine.
        if (!p.grip || p.toy !== v.toy) p.grip = local.clone();
        p.toy = v.toy;
        const shear = local.clone().sub(p.grip);
        shear.y = 0;
        shear.clampLength(0, 0.38);
        p.force = force;
        const localNormal = hit.normal
          .clone()
          .applyMatrix3(
            new T.Matrix3().setFromMatrix4(v.toy.matrixWorld).transpose(),
          )
          .normalize();
        solver.setContact(key, {
          kind: ["SlimePull", "SlimeStretch", "SlimeStickyPaw"].includes(
            v.acting.state,
          )
            ? "stretch"
            : v.acting.state === "SquishTwist"
              ? "twist"
              : "paw",
          point: [p.grip.x, y, p.grip.z],
          normal: localNormal.toArray(),
          displacement: [
            shear.x - localNormal.x * 0.45,
            -localNormal.y * 0.45,
            shear.z - localNormal.z * 0.45,
          ],
          footprintRadius: Math.sqrt(0.035 / Math.PI) * 1.8,
          orientation: v.carrier.rotation.y,
          radius: 0.65,
          force,
          duration: p.contactAge,
          penetration: Math.max(0, target - p.point.y),
          supportShare: 1 / Math.max(1, supports),
          velocity: velocity.toArray(),
        });
        keys.push(key);
      }
    }
    for (const [solver, keys] of activeKeys)
      for (const key of keys)
        if (!nextKeys.get(solver)?.includes(key)) solver.release(key);
    activeKeys.clear();
    for (const [solver, keys] of nextKeys) activeKeys.set(solver, keys);
    for (const toy of toys) {
      toy.userData.solver.step(dt);
      toy.userData.update(dt);
    }
    for (const v of pending) {
      if (v.acting.bodyContact) {
        const body = v.paws.body;
        if (body) {
          measure(body);
          const target = v.toy.userData.surface(body.point.x, body.point.z);
          if (target !== null) {
            const adjust = T.MathUtils.clamp(
              target - body.point.y,
              -0.12,
              0.12,
            );
            v.paws.supportOffset += adjust;
            v.carrier.position.y += adjust;
            refresh(v.model);
            measure(body);
            const d = diagnostic.find(
              (d) => d.id === v.id && d.kind === "body",
            );
            if (d) {
              d.point = body.point.toArray();
              d.surface = target;
              d.error = body.point.y - target;
            }
          }
        }
        for (const p of v.paws) {
          p.initialized = false;
          p.grip = null;
        }
        continue;
      }
      let sum = 0,
        n = 0;
      for (const p of v.paws) {
        if (p.swing > 0.04) continue;
        measure(p);
        const y = v.toy.userData.surface(p.point.x, p.point.z);
        if (y !== null) {
          sum += y - p.point.y;
          n++;
        }
      }
      if (n) v.carrier.position.y += T.MathUtils.clamp(sum / n, -0.16, 0.16);
      refresh(v.model);
      for (const p of v.paws) {
        if (p.swing > 0.04) continue;
        measure(p);
        const y = v.toy.userData.surface(p.point.x, p.point.z);
        if (y === null) continue;
        const correction = T.MathUtils.clamp(y - p.point.y, -0.14, 0.14);
        p.leg.position.y +=
          correction / Math.max(0.1, v.model.getWorldScale(new T.Vector3()).y);
        refresh(v.model);
        measure(p);
        diagnostic.push({
          id: v.id,
          paw: p.index,
          point: p.point.toArray(),
          surface: y,
          error: p.point.y - y,
          contact: Math.abs(p.point.y - y) < 0.13,
          force: p.force ?? 22,
          area: 0.035,
          material: v.toy.userData.material,
        });
      }
    }
    pending.length = 0;
  }
  return {
    collect,
    flush,
    restoreFrame,
    get diagnostics() {
      return diagnostic;
    },
    clear() {
      restoreFrame();
      for (const [s, keys] of activeKeys)
        for (const key of keys) s.release(key);
      activeKeys.clear();
      pending.length = 0;
      diagnostic.length = 0;
    },
  };
}
