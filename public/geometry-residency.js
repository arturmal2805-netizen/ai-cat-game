// Buffer retirement is not destruction of the live model/animation owner.
const retiring = new WeakSet();
const timeGrace = new WeakSet();
// A camera can switch repeatedly between native and colony draw buffers.
// They are reusable working caches, not abandoned islands: retain the normal
// time grace rather than deleting them after just three intervening frames.
export function retainGeometryForGrace(geometry) {
  timeGrace.add(geometry);
  return geometry;
}
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
    idleFrames = 3,
    refaultGrace = 2_000,
    refaultBudget = 64 * 1024 * 1024,
    clock = () => performance.now(),
  } = {},
) {
  const records = new Map(),
    owners = new Map(),
    retired = new WeakMap();
  const native = renderer.renderBufferDirect;
  const stats = { bytes: 0, peakBytes: 0, geometries: 0, evicted: 0, clockReads: 0,
    refaults: 0, refaultBytes: 0, rapidRefaults: 0, rapidRefaultBytes: 0 };
  // Only buffers which actually returned after a policy eviction receive this
  // short working-set grace. Normal remote islands keep fast retirement. The
  // extra idle residency is capped; this is not an unbounded memory-budget bump.
  const refaultLimit = budget + Math.min(Math.max(0, refaultBudget), Math.max(0, budget / 3));
  let nextSweep = 0,
    disposed = false,
    frameRetirement = true,
    refaultProtection = true,
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
    if (!isGeometryBufferRetirement(record.geometry)) retired.delete(record.geometry);
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
    const frame = renderer.info?.render.frame;
    let used;
    if (Number.isFinite(frame)) {
      if (frame !== lastFrame) {
        lastFrame = frame;
        frameTime = clock();
        stats.clockReads++;
      }
      used = frameTime;
    } else {
      used = clock();
      stats.clockReads++;
    }
    let record = records.get(geometry);
    if (!record) {
      const previous = retired.get(geometry), before = stats.bytes;
      record = { geometry, attributes: attributes(geometry), used: 0, frame: -1,
        refaulting: previous !== undefined && used - previous <= grace,
        holdUntil: 0 };
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
      stats.peakBytes = Math.max(stats.peakBytes, stats.bytes);
      if (previous !== undefined) {
        const bytes = stats.bytes - before;
        stats.refaults++; stats.refaultBytes += bytes;
        if (record.refaulting) { stats.rapidRefaults++; stats.rapidRefaultBytes += bytes; }
        retired.delete(geometry);
      }
    }
    record.used = used;
    record.frame = Number.isFinite(frame) ? frame : -1;
    if (record.refaulting) record.holdUntil = used + refaultGrace;
  }
  function draw(...args) {
    if (!disposed && args[2]?.isBufferGeometry) touch(args[2]);
    return native.apply(this, args);
  }
  renderer.renderBufferDirect = draw;
  return {
    stats,
    retire: retireGeometryBuffers,
    // Private comparative QA can retain the released ten-second policy.
    setFrameRetirementEnabled(value) { frameRetirement = !!value; nextSweep = 0; },
    setRefaultProtectionEnabled(value) { refaultProtection = !!value; nextSweep = 0; },
    sweep(now = clock()) {
      if (disposed || now < nextSweep) return;
      if (stats.bytes <= budget) return;
      nextSweep = now + (frameRetirement ? 100 : 1000);
      const cutoff = now - grace,
        frame = renderer.info?.render.frame,
        idle = r => r.used < cutoff || (frameRetirement && !timeGrace.has(r.geometry) &&
          Number.isFinite(frame) && r.frame >= 0 && frame - r.frame >= idleFrames),
        held = r => refaultProtection && refaultLimit > budget && now < r.holdUntil,
        candidates = [...records.values()].filter(idle).sort((a, b) => a.used - b.used);
      const start = clock();
      // Reclaim cold scenery BEFORE breaking a learned camera working set.
      // Testing the total inside idle() used to sacrifice the oldest returning
      // buffer merely because an unrelated cold upload temporarily crossed the
      // allowance. Both passes share the original 2 ms cleanup budget.
      for (const pressure of [false, true]) {
        if (pressure && stats.bytes <= refaultLimit) break;
        const considered = new Set(), target = pressure ? refaultLimit : budget;
        for (const candidate of candidates) {
          if (stats.bytes <= target || clock() - start > 2) break;
          if (considered.has(candidate) || !records.has(candidate.geometry)) continue;
          // Three deletes shared attribute buffers when ANY owning geometry is
          // disposed. Retire the whole connected component only when safe.
          const group = new Set([candidate]);
          let safe = true;
          for (const record of group) {
            considered.add(record);
            if (!idle(record) || (!pressure && held(record))) {
              safe = false;
              break;
            }
            for (const attribute of record.attributes)
              for (const owner of owners.get(attribute) || []) group.add(owner);
          }
          if (!safe) continue;
          for (const record of group) {
            retired.set(record.geometry, now);
            retireGeometryBuffers(record.geometry);
            stats.evicted++;
          }
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
