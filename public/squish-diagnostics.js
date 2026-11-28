import * as T from "three";
const restVolumes = new WeakMap();
function bodyVolume(geometry, positions) {
  const index = geometry.index?.array;
  let volume = 0;
  for (let i = 0; i < (index?.length || positions.length / 3); i += 3) {
    const a = (index ? index[i] : i) * 3,
      b = (index ? index[i + 1] : i + 1) * 3,
      c = (index ? index[i + 2] : i + 2) * 3;
    volume +=
      positions[a] *
        (positions[b + 1] * positions[c + 2] -
          positions[b + 2] * positions[c + 1]) +
      positions[a + 1] *
        (positions[b + 2] * positions[c] - positions[b] * positions[c + 2]) +
      positions[a + 2] *
        (positions[b] * positions[c + 1] - positions[b + 1] * positions[c]);
  }
  return Math.abs(volume / 6);
}

// Opt-in measurements: actual rendered vertices and the same raycast surface
// that supports the native paws. No invented visual-similarity or device FPS.
export function measureSquish(toy) {
  const u = toy.userData,
    s = u.solver,
    contacts = [];
  let maxDisplacement = 0,
    activeNodes = 0,
    sumDepth = 0;
  const body = u.meshes[0].geometry.attributes.position.array;
  const original = u.sources[0];
  const geometry = u.meshes[0].geometry;
  if (!restVolumes.has(geometry))
    restVolumes.set(geometry, bodyVolume(geometry, original));
  const initialVolume = restVolumes.get(geometry),
    currentVolume = bodyVolume(geometry, body);
  for (let i = 0; i < body.length; i += 3)
    maxDisplacement = Math.max(
      maxDisplacement,
      Math.hypot(
        body[i] - original[i],
        body[i + 1] - original[i + 1],
        body[i + 2] - original[i + 2],
      ),
    );
  for (const value of s.contactField) if (value > 0.001) activeNodes++;
  toy.updateWorldMatrix(true, true);
  for (const [id, c] of s.contacts) {
    const p = toy.localToWorld(new T.Vector3(...c.point));
    const hit = u.surfaceInfo(p.x, p.z);
    if (!hit) continue;
    const local = toy.worldToLocal(hit.point.clone());
    const depth = Math.max(0, u.restSurfaceHeight(local.x, local.z) - local.y);
    sumDepth += depth;
    contacts.push({
      id,
      point: hit.point.toArray(),
      normal: hit.normal.toArray(),
      force: c.force,
      supportShare: c.supportShare,
      duration: c.physicalLoad ? c.dynamic.contactDuration : c.duration,
      contactStartTime: c.dynamic.contactStartTime,
      impactImpulse: c.dynamic.impactImpulse,
      impactEvents: c.dynamic.impactEvents,
      accumulatedCreep: c.dynamic.accumulatedCreep,
      accumulatedPlasticStrain: c.dynamic.accumulatedPlasticStrain,
      targetEquilibriumDepth: c.dynamic.equilibriumDepth,
      sinkVelocity: c.dynamic.sinkVelocity,
      contactArea: c.contactArea,
      physicalLoad: c.physicalLoad,
      radius: c.radius,
      footprintRadius: c.footprintRadius,
      penetration: c.penetration,
      depth,
      compressionRatio:
        depth / Math.max(0.001, u.restSurfaceHeight(local.x, local.z)),
      collider: hit.collider,
      kind: c.kind,
      twist: c.twist,
      targetCompressionRatio: c.targetCompressionRatio || null,
      velocity: Array.from(c.velocity),
    });
  }
  return {
    material: u.material,
    contacts,
    activePaws: contacts.filter(
      (c) => c.kind === "paw" || c.id.includes(":paw:"),
    ).length,
    supportForce: contacts.reduce((sum, c) => sum + c.force, 0),
    meanContactDepth: sumDepth / Math.max(1, contacts.length),
    maxContactDepth: Math.max(0, ...contacts.map((c) => c.depth)),
    maxVertexDisplacement: maxDisplacement,
    renderedBodyVolume: currentVolume,
    renderedBodyVolumeRatio:
      initialVolume > 1e-9 ? currentVolume / initialVolume : null,
    volumeMethod:
      "signed triangles of the actual main body; giant overlapping primitives are not a union-volume measurement",
    meshUpdated: u.meshRevision === s.revision,
    activeNodes,
    stiffness: s.profile.elasticity,
    compliance: s.profile.compliance,
    viscosity: s.dynamicProfile.viscosity,
    creepRate: s.dynamicProfile.creepRate,
    elasticRecovery: s.dynamicProfile.elasticRecovery,
    materialClass: s.dynamicProfile.materialClass,
    timestep: 1 / 60,
    meshVersion: u.meshes[0].geometry.attributes.position.version,
    colliderGeometry: u.meshes[0].geometry.uuid,
    colliderFollowsRender: true,
    recoveryActive: !s.sleeping && !s.contacts.size,
    solver: s.diagnostics(),
    lod: u.physicsLOD?.level || (s.sleeping ? "STATIC" : "HERO"),
    units:
      "game metres/seconds; force calibrated to an effective game mass, not laboratory measurements",
  };
}

export function createSquishDebug({ scene, container, getInterior, getPaws }) {
  const group = new T.Group();
  group.name = "Squish diagnostics (opt-in only)";
  group.renderOrder = 100;
  const geometry = new T.SphereGeometry(0.055, 8, 6);
  const red = new T.MeshBasicMaterial({ color: 0xff3d55, depthTest: false });
  const green = new T.MeshBasicMaterial({ color: 0x5cff88, depthTest: false });
  const markers = [
    new T.InstancedMesh(geometry, red, 32),
    new T.InstancedMesh(geometry, green, 32),
  ];
  markers.forEach((m) => {
    m.count = 0;
    m.frustumCulled = false;
    group.add(m);
  });
  const lineGeometry = new T.BufferGeometry();
  const positions = new Float32Array(32 * 12);
  lineGeometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  const lineMaterial = new T.LineBasicMaterial({
    color: 0xffdf58,
    depthTest: false,
  });
  const lines = new T.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;
  group.add(lines);
  scene.add(group);
  const table = document.createElement("pre");
  table.dataset.squishDebug = "";
  table.style.cssText =
    "position:absolute;left:8px;top:140px;max-width:90%;padding:8px;background:#101226de;color:#c4ffdb;font:11px monospace;pointer-events:none;z-index:30;white-space:pre-wrap";
  const graph = document.createElement("canvas");
  graph.width = 320;
  graph.height = 88;
  graph.dataset.squishCompressionGraph = "";
  graph.style.cssText =
    "position:absolute;left:8px;bottom:12px;z-index:30;pointer-events:none;background:#101226de";
  const context = graph.getContext("2d");
  container.append(table, graph);
  const history = new Map();
  let timeline = 0,
    fps = 60;
  let elapsed = 1,
    last = [];
  const matrix = new T.Matrix4();
  return {
    update(dt) {
      const interior = getInterior();
      group.visible = !!interior?.visible;
      table.hidden = graph.hidden = !group.visible;
      timeline += Number.isFinite(dt) ? Math.max(0, dt) : 0;
      if (dt > 0) fps += (1 / dt - fps) * 0.1;
      if (!group.visible || (elapsed += dt) < 0.2) return;
      elapsed = 0;
      last = interior.userData.toys
        .filter(
          (t) => t.userData.solver.contacts.size || !t.userData.solver.sleeping,
        )
        .map(measureSquish);
      if (context) {
        context.clearRect(0, 0, 320, 88);
        context.font = "10px monospace";
        context.fillStyle = "#e5f2ff";
        context.fillText("TIME → COMPRESSION DEPTH (m), last 24s", 6, 12);
        const colours = ["#ff8ccc", "#adf7c5", "#9ccbff", "#ffdb89", "#d4b2ff"];
        for (const [index, d] of last.entries()) {
          const key = d.material;
          const samples = history.get(key) || [];
          samples.push([
            timeline,
            d.maxContactDepth || d.maxVertexDisplacement,
          ]);
          while (samples.length > 121) samples.shift();
          history.set(key, samples);
          context.strokeStyle = colours[index % colours.length];
          context.beginPath();
          samples.forEach(([t, depth], i) => {
            const x = 6 + ((t - Math.max(0, timeline - 24)) / 24) * 308;
            const y = 80 - (Math.min(2, depth) / 2) * 60;
            if (i) context.lineTo(x, y);
            else context.moveTo(x, y);
          });
          context.stroke();
        }
        // Histories are diagnostic only and bounded to the real toy catalogue.
        if (history.size > 32) history.delete(history.keys().next().value);
      }
      let count = 0,
        li = 0;
      for (const d of last)
        for (const c of d.contacts) {
          if (count >= 32) break;
          matrix.makeTranslation(...c.point);
          markers[0].setMatrixAt(count++, matrix);
          for (const direction of [1, -1]) {
            positions.set(c.point, li);
            li += 3;
            positions.set(
              c.point.map((p, k) => p + c.normal[k] * 0.45 * direction),
              li,
            );
            li += 3;
          }
        }
      markers[0].count = count;
      markers[0].instanceMatrix.needsUpdate = true;
      let paws = 0;
      for (const p of getPaws()) {
        if (paws >= 32) break;
        matrix.makeTranslation(...p.point);
        markers[1].setMatrixAt(paws++, matrix);
      }
      markers[1].count = paws;
      markers[1].instanceMatrix.needsUpdate = true;
      lineGeometry.setDrawRange(0, li / 3);
      lineGeometry.attributes.position.needsUpdate = true;
      table.textContent = last
        .map(
          (
            d,
          ) => `${d.material} | CONTACT ACTIVE: ${d.contacts.length ? "YES" : "NO"}
ACTIVE PAWS: ${d.activePaws} | SUPPORT FORCE: ${d.supportForce.toFixed(2)} game units
CONTACT DEPTH: ${d.maxContactDepth.toFixed(3)}m | MAX VERTEX DISPLACEMENT: ${d.maxVertexDisplacement.toFixed(3)}m
ACTIVE NODES: ${d.activeNodes} | STIFFNESS: ${d.stiffness} | COMPLIANCE: ${d.compliance}
DT: ${d.timestep.toFixed(5)}s | MESH VERSION: ${d.meshVersion} | COLLIDER: actual rendered mesh
IMPACT IMPULSE: ${d.solver.totalImpactImpulse.toFixed(2)}N*s | CONTACT DURATION: ${Math.max(0, ...d.contacts.map((c) => c.duration)).toFixed(2)}s
TARGET EQUILIBRIUM DEPTH: ${Math.max(0, ...d.contacts.map((c) => c.targetEquilibriumDepth)).toFixed(3)}m | SINK VELOCITY: ${Math.max(0, ...d.contacts.map((c) => c.sinkVelocity)).toFixed(3)}m/s
VISCOSITY: ${d.viscosity}N*s/m | CREEP RATE: ${d.creepRate.toFixed(3)}/s | ELASTIC RECOVERY: ${d.elasticRecovery}
PLASTIC STRAIN: ${d.solver.plasticStrain.toFixed(3)} | CURRENT SUPPORT SURFACE: actual rendered triangles
RECOVERY ACTIVE: ${d.recoveryActive ? "YES" : "NO"} | SOLVER: ${d.solver.lastPhysicsMs.toFixed(2)}ms | LOD: ${d.lod} | FPS: ${fps.toFixed(1)}`,
        )
        .join("\n\n");
    },
    get measurements() {
      return last;
    },
    dispose() {
      group.removeFromParent();
      table.remove();
      graph.remove();
      history.clear();
      geometry.dispose();
      red.dispose();
      green.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    },
  };
}
