import { kittenCacheSnapshot, installKittenCache } from "./chichi-sculpt.js";

// This optional database contains reproducible graphics only. It never reads,
// changes or deletes the account, saved world or cloud outbox.
// The build fingerprints the complete model-construction dependency graph.
// An unrelated UI/island/save patch must not invalidate identical cat buffers.
const version = typeof __CHICHI_SCULPT_VERSION__ === "string"
  ? __CHICHI_SCULPT_VERSION__ : "development";
let database;
function openCache() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return (database ||= new Promise((resolve) => {
    const request = indexedDB.open("chichi-graphics", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("sculpt");
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = request.onblocked = () => resolve(null);
  }));
}
export async function restoreSculptCache() {
  let active = true,
    timer;
  const restore = (async () => {
    try {
      const db = await openCache();
      if (!db || !active) return false;
      const record = await new Promise((resolve) => {
        const request = db
          .transaction("sculpt")
          .objectStore("sculpt")
          .get("active");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      return (
        active &&
        record?.version === version &&
        installKittenCache(record.snapshot)
      );
    } catch {
      return false;
    }
  })();
  const result = await Promise.race([
    restore,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), 800);
    }),
  ]);
  active = false;
  clearTimeout(timer);
  return !!result;
}
export async function storeSculptCache() {
  try {
    const db = await openCache();
    if (!db) return false;
    const snapshot = kittenCacheSnapshot();
    let bytes = 0;
    // Keep the most useful first-created hero buffers. Cache misses always run
    // the original sculpt rather than substituting a cheaper model.
    for (const name of ["surfaces", "fur"])
      snapshot[name] = snapshot[name].filter(([, g]) => {
        const size = Object.values(g.attributes).reduce(
          (n, a) => n + a.array.byteLength,
          g.index?.byteLength || 0,
        );
        if (bytes + size > 24 * 1024 * 1024) return false;
        bytes += size;
        return true;
      });
    return await new Promise((resolve) => {
      const transaction = db.transaction("sculpt", "readwrite");
      transaction.objectStore("sculpt").put({ version, snapshot }, "active");
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = transaction.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}
export function scheduleSculptCache() {
  const save = () => {
    void storeSculptCache();
  };
  if (globalThis.requestIdleCallback)
    requestIdleCallback(save, { timeout: 3000 });
  else setTimeout(save, 700);
}
