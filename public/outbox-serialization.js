// Preserve the released JSON journal format byte-for-byte. A queued snapshot
// and the local merge base can refer to the same owned copy: encode it once per
// write, without delaying or removing the synchronous durable write/read-back.
export function serializeOutbox(box) {
  const snapshots = new WeakMap();
  function snapshot(value) {
    if (value && typeof value === "object") {
      if (snapshots.has(value)) return snapshots.get(value);
      const json = JSON.stringify(value);
      snapshots.set(value, json);
      return json;
    }
    return JSON.stringify(value);
  }
  function object(value, encode) {
    const fields = [];
    for (const key of Object.keys(value)) {
      const json = encode(key, value[key]);
      if (json !== undefined) fields.push(JSON.stringify(key) + ":" + json);
    }
    return "{" + fields.join(",") + "}";
  }
  function entry(value) {
    if (!value || typeof value !== "object") return JSON.stringify(value);
    return object(value, (key, v) =>
      key === "game" || key === "baseGame" ? snapshot(v) : JSON.stringify(v),
    );
  }
  return object(box, (key, value) =>
    key === "localGame" || key === "remoteGame"
      ? snapshot(value)
      : key === "pending" || key === "retryEntry"
        ? entry(value)
        : JSON.stringify(value),
  );
}
