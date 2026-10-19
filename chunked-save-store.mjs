// Durable Object values are finite. Split large snapshots into byte chunks in
// the SAME transaction rather than limiting the number of purchased houses.
// Small/old saves retain their original representation and need no migration.
const CHUNK_BYTES = 60000;
const INLINE_BYTES = 512 * 1024;
function adapter(raw) {
  return {
    async get(key) {
      const value = await raw.get(key);
      if (value?.__chichiSnapshotChunks !== 1) return value;
      const bytes = new Uint8Array(value.bytes);
      let offset = 0;
      for (const part of value.keys) {
        const chunk = await raw.get(part);
        if (
          !(chunk instanceof Uint8Array) ||
          offset + chunk.length > bytes.length
        )
          throw Error("Incomplete save snapshot");
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      if (offset !== bytes.length) throw Error("Incomplete save snapshot");
      return JSON.parse(new TextDecoder().decode(bytes));
    },
    async put(key, value) {
      const old = await raw.get(key),
        bytes = new TextEncoder().encode(JSON.stringify(value));
      if (bytes.length <= INLINE_BYTES) await raw.put(key, value);
      else {
        const prefix = key + ":snapshot:" + crypto.randomUUID(),
          keys = [];
        for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
          const part = prefix + ":" + keys.length;
          await raw.put(part, bytes.slice(i, i + CHUNK_BYTES));
          keys.push(part);
        }
        await raw.put(key, {
          __chichiSnapshotChunks: 1,
          bytes: bytes.length,
          keys,
        });
      }
      if (old?.__chichiSnapshotChunks === 1 && raw.delete)
        await raw.delete(old.keys);
    },
  };
}
export function chunkedSaveStorage(storage) {
  return {
    ...adapter(storage),
    transaction: (fn) => storage.transaction((raw) => fn(adapter(raw))),
  };
}
