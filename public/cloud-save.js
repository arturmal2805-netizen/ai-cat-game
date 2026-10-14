const TOKEN_KEY = "chichi-recovery-code",
  META_KEY = "chichi-cloud-save";
export class CloudBackup {
  constructor({
    storage,
    base = "",
    fetcher = globalThis.fetch.bind(globalThis),
    onStatus = () => {},
    delay = 100,
  }) {
    this.storage = storage;
    this.fetcher = fetcher;
    this.onStatus = onStatus;
    this.delay = delay;
    this.url = new URL(
      base ? "/api/save" : "./api/save",
      base || location.href,
    ).href;
    this.revision = 0;
    this.pending = null;
    this.retryEntry = null;
    this.running = false;
    this.timer = null;
    this.conflict = false;
    try {
      this.token = storage.getItem(TOKEN_KEY);
      if (!/^[a-f0-9]{64}$/.test(this.token || "")) {
        this.createdToken = true;
        this.token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
        storage.setItem(TOKEN_KEY, this.token);
        if (storage.getItem(TOKEN_KEY) !== this.token)
          throw Error("Recovery code not saved");
      }
      let meta = {};
      if (!this.createdToken) {
        try {
          meta = JSON.parse(storage.getItem(META_KEY) || "{}");
        } catch {
          meta = { dirty: true };
        }
        if (!meta || typeof meta !== "object") meta = { dirty: true };
      }
      this.revision = Number.isSafeInteger(meta.revision)
        ? Math.max(0, meta.revision)
        : 0;
      this.dirty = !!meta.dirty;
      this.inflightId =
        typeof meta.inflightId === "string" ? meta.inflightId : null;
    } catch {
      this.token = null;
      this.onStatus("local");
    }
  }
  metadata(dirty) {
    this.dirty = dirty;
    try {
      this.storage.setItem(
        META_KEY,
        JSON.stringify({
          revision: this.revision,
          dirty,
          inflightId: this.inflightId,
        }),
      );
    } catch {}
  }
  async load({ token = this.token, force = false } = {}) {
    if (!token) return null;
    this.loading = true;
    try {
      const r = await this.fetcher(this.url, {
        headers: { "X-Chichi-Save-Token": token },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw Error("Cloud unavailable");
      const data = await r.json();
      if (!Number.isSafeInteger(data.revision) || data.revision < 0)
        throw Error("Invalid cloud revision");
      if (!force && data.revision < this.revision) return null;
      if (force && !data.game) return null;
      const acknowledged =
        this.dirty &&
        data.lastMutationId === this.inflightId &&
        data.revision === this.revision + 1;
      if (
        !force &&
        this.dirty &&
        data.revision > this.revision &&
        !acknowledged
      ) {
        this.conflict = true;
        this.onStatus("conflict");
        return null;
      }
      if (force) {
        this.storage.setItem(TOKEN_KEY, token);
        this.token = token;
        this.conflict = false;
      }
      const newer = data.revision > this.revision && !acknowledged;
      this.revision = data.revision;
      if (acknowledged) this.inflightId = null;
      if (force || !this.dirty) this.metadata(false);
      this.onStatus("ready");
      return data.game && (force || newer) ? data.game : null;
    } catch {
      this.onStatus("offline");
      return null;
    } finally {
      this.loading = false;
    }
  }
  enqueue(game) {
    if (!this.token) return;
    this.pending = {
      game: structuredClone(game),
      mutationId: crypto.randomUUID(),
    };
    this.metadata(true);
    this.onStatus(this.conflict ? "conflict" : "pending");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.delay);
  }
  async flush() {
    if (
      this.running ||
      this.loading ||
      this.conflict ||
      (!this.pending && !this.retryEntry) ||
      !this.token
    )
      return;
    clearTimeout(this.timer);
    this.running = true;
    try {
      while ((this.pending || this.retryEntry) && !this.conflict) {
        const entry = this.retryEntry || this.pending;
        if (this.retryEntry) this.retryEntry = null;
        else this.pending = null;
        this.inflightId = entry.mutationId;
        this.metadata(true);
        let response;
        try {
          response = await this.fetcher(this.url, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Chichi-Save-Token": this.token,
            },
            body: JSON.stringify({ expectedRevision: this.revision, ...entry }),
            signal: AbortSignal.timeout(8000),
          });
          if (response.status === 409) {
            this.conflict = true;
            this.retryEntry = entry;
            this.onStatus("conflict");
            break;
          }
          if (!response.ok) throw Error("offline");
          const value = await response.json();
          if (value.revision !== this.revision + 1) throw Error("offline");
          this.revision = value.revision;
          this.inflightId = null;
          this.metadata(!!this.pending);
          this.onStatus(this.pending ? "pending" : "saved", value.savedAt);
        } catch {
          this.retryEntry = entry;
          throw Error("offline");
        }
      }
    } catch {
      this.onStatus("offline");
    } finally {
      this.running = false;
    }
  }
  async recover(code, install = () => {}) {
    if (!/^[a-f0-9]{64}$/.test(code.trim()))
      throw Error("Проверьте код восстановления.");
    clearTimeout(this.timer);
    if (this.running) throw Error("Дождитесь текущего сохранения.");
    if (this.loading) throw Error("Дождитесь текущей синхронизации.");
    const response = await this.fetcher(this.url, {
      headers: { "X-Chichi-Save-Token": code.trim() },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error("Облако недоступно. Попробуйте ещё раз.");
    const data = await response.json();
    if (!data.game || !Number.isSafeInteger(data.revision) || data.revision < 1)
      throw Error("Сохранение по этому коду пока не найдено.");
    const oldToken = this.token;
    try {
      this.storage.setItem(TOKEN_KEY, code.trim());
      if (this.storage.getItem(TOKEN_KEY) !== code.trim())
        throw Error("Код не сохранён на устройстве.");
      install(data.game);
    } catch (error) {
      try {
        this.storage.setItem(TOKEN_KEY, oldToken);
      } catch {}
      throw error;
    }
    this.token = code.trim();
    this.revision = data.revision;
    this.inflightId = null;
    this.conflict = false;
    this.pending = null;
    this.retryEntry = null;
    this.metadata(false);
    this.onStatus("saved", data.savedAt);
    return data.game;
  }
}
