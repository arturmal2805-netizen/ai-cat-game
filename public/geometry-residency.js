// Buffer retirement is not destruction of the live model/animation owner.
const retiring = new WeakSet();
export function isGeometryBufferRetirement(geometry) {
  return retiring.has(geometry);
}
export function retireGeometryBuffers(geometry) {
  if (retiring.has(geometry)) return;
  retiring.add(geometry);
  try {
    geometry.dispose();
  } finally {
    retiring.delete(geometry);
  }
}

// Bound GPU geometry left behind while exploring the map. CPU geometry,
// materials, poses and save objects are retained; Three uploads identical
// attributes on the next actual draw. Colour AND shadow draws keep them alive.
export function createGeometryResidency(
  renderer,
  {
    budget = 192 * 1024 * 1024,
    grace = 10_000,
    clock = () => performance.now(),
  } = {},
) {
  const records = new Map(),
    owners = new Map();
  const native = renderer.renderBufferDirect;
  const stats = { bytes: 0, geometries: 0, evicted: 0, clockReads: 0 };
  let nextSweep = 0,
    disposed = false,
    lastFrame = -1,
    frameTime = 0;
  function attributes(geometry) {
    return new Set(
      [geometry.index, ...Object.values(geometry.attributes)]
        .filter(Boolean)
        .map((a) => (a.isInterleavedBufferAttribute ? a.data : a)),
    );
  }
  function forget(record) {
    if (!records.delete(record.geometry)) return;
    record.geometry.removeEventListener("dispose", record.onDispose);
    for (const attribute of record.attributes) {
      const users = owners.get(attribute);
      users.delete(record);
      if (!users.size) {
        stats.bytes -= attribute.array?.byteLength || 0;
        owners.delete(attribute);
      }
    }
    stats.geometries = records.size;
  }
  function touch(geometry) {
    let record = records.get(geometry);
    if (!record) {
      record = { geometry, attributes: attributes(geometry), used: 0 };
      record.onDispose = () => forget(record);
      geometry.addEventListener("dispose", record.onDispose);
      records.set(geometry, record);
      for (const attribute of record.attributes) {
        if (!owners.has(attribute)) {
          owners.set(attribute, new Set());
          stats.bytes += attribute.array?.byteLength || 0;
        }
        owners.get(attribute).add(record);
      }
      stats.geometries = records.size;
    }
    const frame = renderer.info?.render.frame;
    if (Number.isFinite(frame)) {
      if (frame !== lastFrame) {
        lastFrame = frame;
        frameTime = clock();
        stats.clockReads++;
      }
      record.used = frameTime;
    } else {
      record.used = clock();
      stats.clockReads++;
    }
  }
  function draw(...args) {
    if (!disposed && args[2]?.isBufferGeometry) touch(args[2]);
    return native.apply(this, args);
  }
  renderer.renderBufferDirect = draw;
  return {
    stats,
    retire: retireGeometryBuffers,
    sweep(now = clock()) {
      if (disposed || now < nextSweep) return;
      nextSweep = now + 1000;
      if (stats.bytes <= budget) return;
      const cutoff = now - grace,
        candidates = [...records.values()]
          .filter((r) => r.used < cutoff)
          .sort((a, b) => a.used - b.used),
        considered = new Set();
      const start = clock();
      for (const candidate of candidates) {
        if (stats.bytes <= budget || clock() - start > 2) break;
        if (considered.has(candidate) || !records.has(candidate.geometry))
          continue;
        // Three deletes shared attribute buffers when ANY owning geometry is
        // disposed. Retire the whole connected component, or leave it intact
        // when even one owner has recently been rendered.
        const group = new Set([candidate]);
        let safe = true;
        for (const record of group) {
          considered.add(record);
          if (record.used >= cutoff) {
            safe = false;
            break;
          }
          for (const attribute of record.attributes)
            for (const owner of owners.get(attribute) || []) group.add(owner);
        }
        if (!safe) continue;
        for (const record of group) {
          retireGeometryBuffers(record.geometry);
          stats.evicted++;
        }
      }
    },
    dispose() {
      disposed = true;
      if (renderer.renderBufferDirect === draw)
        renderer.renderBufferDirect = native;
      for (const record of [...records.values()]) forget(record);
    },
  };
}
