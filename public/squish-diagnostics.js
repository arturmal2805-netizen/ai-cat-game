import * as T from "three";

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
      duration: c.duration,
      radius: c.radius,
      footprintRadius: c.footprintRadius,
      penetration: c.penetration,
      depth,
      compressionRatio:
        depth / Math.max(0.001, u.restSurfaceHeight(local.x, local.z)),
      collider: hit.collider,
      kind: c.kind,
    });
  }
  return {
    material: u.material,
    contacts,
    activePaws: contacts.filter((c) => c.kind === "paw").length,
    supportForce: contacts.reduce((sum, c) => sum + c.force, 0),
    meanContactDepth: sumDepth / Math.max(1, contacts.length),
    maxContactDepth: Math.max(0, ...contacts.map((c) => c.depth)),
    maxVertexDisplacement: maxDisplacement,
    activeNodes,
    stiffness: s.profile.elasticity,
    compliance: s.profile.compliance,
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
  container.append(table);
  let elapsed = 1,
    last = [];
  const matrix = new T.Matrix4();
  return {
    update(dt) {
      const interior = getInterior();
      group.visible = !!interior?.visible;
      table.hidden = !group.visible;
      if (!group.visible || (elapsed += dt) < 0.2) return;
      elapsed = 0;
      last = interior.userData.toys
        .filter(
          (t) => t.userData.solver.contacts.size || !t.userData.solver.sleeping,
        )
        .map(measureSquish);
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
RECOVERY ACTIVE: ${d.recoveryActive ? "YES" : "NO"} | SOLVER: ${d.solver.lastPhysicsMs.toFixed(2)}ms | LOD: ${d.lod}`,
        )
        .join("\n\n");
    },
    get measurements() {
      return last;
    },
    dispose() {
      group.removeFromParent();
      table.remove();
      geometry.dispose();
      red.dispose();
      green.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    },
  };
}
