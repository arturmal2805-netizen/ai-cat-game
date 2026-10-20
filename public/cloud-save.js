import { cloudSaveRequest } from "./save-transport.js";
import { serializeOutbox } from "./outbox-serialization.js";

const TOKEN_KEY = "chichi-recovery-code",
  META_KEY = "chichi-cloud-save";
export class CloudBackup {
  constructor({
    storage,
    base = "",
    fetcher = globalThis.fetch.bind(globalThis),
    onStatus = () => {},
    delay = 100,
    shared = false,
    cooperative = false,
    onSnapshot = () => false,
    onNotice = () => {},
    sessionStorage = globalThis.sessionStorage,
    onMode = () => {},
  }) {
    this.storage = storage;
    this.shared = shared;
    this.cooperative = cooperative;
    this.onSnapshot = onSnapshot;
    this.onNotice = onNotice;
    this.localGame = null;
    this.remoteGame = null;
    this.simulationOwner = false;
    this.onMode = onMode;
    this.editable = true;
    this.sessionId = crypto.randomUUID();
    try {
      const saved = sessionStorage?.getItem("chichi-editor-session");
      if (/^[a-zA-Z0-9-]{8,64}$/.test(saved || "")) this.sessionId = saved;
      else sessionStorage?.setItem("chichi-editor-session", this.sessionId);
    } catch {}
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
      this.clientId = storage.getItem("chichi-writer-id");
      if (!/^[a-zA-Z0-9-]{8,64}$/.test(this.clientId || "")) {
        this.clientId = crypto.randomUUID();
        storage.setItem("chichi-writer-id", this.clientId);
      }
      this.clientId = this.clientId.slice(0, 16) + "-" + this.sessionId;
      this.sequence = Math.max(
        0,
        Number(storage.getItem("chichi-write-sequence")) || 0,
      );
      let meta = {};
      if (!this.createdToken) {
        try {
          meta = JSON.parse(storage.getItem(META_KEY) || "{}");
        } catch {
          meta = { dirty: true };
        }
        if (!meta || typeof meta !== "object") meta = { dirty: true };
        if (meta.token && meta.token !== this.token) meta = {};
      }
      this.revision = Number.isSafeInteger(meta.revision)
        ? Math.max(0, meta.revision)
        : 0;
      this.dirty = !!meta.dirty;
      this.inflightId =
        typeof meta.inflightId === "string" ? meta.inflightId : null;
      if (this.cooperative) {
        try {
          const box = JSON.parse(
            storage.getItem("chichi-cloud-outbox") || "null",
          );
          if (box?.token === this.token) {
            this.pending = box.pending || null;
            this.retryEntry = box.retryEntry || null;
            this.localGame = box.localGame || null;
            this.remoteGame = box.remoteGame || null;
            this.sequence = Math.max(
              this.sequence,
              box.sequence || 0,
              this.pending?.sequence || 0,
              this.retryEntry?.sequence || 0,
            );
            const raw = JSON.parse(
              storage.getItem("chichi-world-v2") || "null",
            );
            // A crash between the primary local write and outbox write is recoverable.
            if (
              raw?.version === 2 &&
              Number.isSafeInteger(raw.coins) &&
              this.localGame &&
              JSON.stringify(raw) !== JSON.stringify(this.localGame)
            ) {
              const baseGame = this.pending?.baseGame || this.localGame;
              this.pending = {
                game: raw,
                baseGame,
                mutationId: crypto.randomUUID(),
                sequence: ++this.sequence,
                clientId: this.clientId,
              };
              this.localGame = structuredClone(raw);
              this.dirty = true;
            }
          }
        } catch {}
      }
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
          token: this.token,
          revision: this.revision,
          dirty,
          inflightId: this.inflightId,
        }),
      );
    } catch {}
  }
  async load({ token = this.token, force = false, deferInstall = false } = {}) {
    if (!token) return null;
    if (this.cooperative && !force && (this.pending || this.retryEntry))
      return null;
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
      if (this.cooperative && !force && (this.pending || this.retryEntry))
        return null;
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
      this.onStatus(this.editable ? "ready" : "watching");
      if (
        data.game &&
        (force ||
          newer ||
          (this.cooperative && (this.remoteGame || !this.localGame)))
      ) {
        if (this.cooperative && deferInstall) {
          this.remoteGame = structuredClone(data.game);
          this.saveOutbox();
        } else this.localGame = structuredClone(data.game);
        return data.game;
      }
      return null;
    } catch {
      this.onStatus("offline");
      return null;
    } finally {
      this.loading = false;
    }
  }
  enqueue(game) {
    if (!this.token || !this.editable || this.conflict) return;
    const snapshot = structuredClone(game);
    this.pending = {
      game: snapshot,
      mutationId: crypto.randomUUID(),
      ...(this.cooperative
        ? { sequence: ++this.sequence, clientId: this.clientId }
        : {}),
      ...(this.cooperative
        ? {
            baseGame: structuredClone(this.pending?.baseGame || this.localGame),
          }
        : {}),
    };
    this.localGame = snapshot;
    this.saveOutbox();
    this.metadata(true);
    this.onStatus(this.conflict ? "conflict" : "pending");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.delay);
  }
  async flush() {
    if (
      this.running ||
      !this.editable ||
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
        this.retryEntry = entry;
        if (!this.saveOutbox()) {
          this.onStatus("offline");
          break;
        }
        this.metadata(true);
        let response;
        try {
          const transport = await cloudSaveRequest({
            expectedRevision: this.revision,
            ...entry,
            ...(this.shared ? { sessionId: this.sessionId } : {}),
            ...(this.cooperative
              ? { cooperative: true, clientId: entry.clientId || this.clientId }
              : {}),
          });
          response = await this.fetcher(this.url, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Chichi-Save-Token": this.token,
              ...transport.headers,
            },
            body: transport.body,
            keepalive: transport.keepalive,
            signal: AbortSignal.timeout(8000),
          });
          if (response.status === 409 && this.cooperative) {
            const value = await response.json();
            if (value.game) {
              this.archive(this.localGame);
              // Only this rejected mutation is rolled back. A newer queued
              // action has its own merge base and must still reach the vault.
              this.retryEntry = null;
              this.revision = value.revision;
              this.inflightId = null;
              this.remoteGame = value.game;
              this.reconciling = true;
              this.saveOutbox();
              this.metadata(!!this.pending);
              this.acceptSnapshot();
              this.onNotice(
                value.error ||
                  "Мир обновлён с другого телефона. Повторите последнее действие.",
              );
              this.onStatus(this.pending ? "pending" : "saved");
              if (this.pending) continue;
              break;
            }
          }
          if (response.status === 409 || response.status === 423) {
            this.conflict = true;
            this.retryEntry = entry;
            this.onStatus("conflict");
            break;
          }
          if (!response.ok) throw Error("offline");
          const value = await response.json();
          if (
            !Number.isSafeInteger(value.revision) ||
            (this.cooperative
              ? value.revision < this.revision
              : value.revision !== this.revision + 1)
          )
            throw Error("offline");
          this.revision = value.revision;
          this.retryEntry = null;
          if (this.cooperative && value.game) this.remoteGame = value.game;
          this.saveOutbox();
          this.inflightId = null;
          this.metadata(!!this.pending);
          this.onStatus(this.pending ? "pending" : "saved", value.savedAt);
          if (!this.pending) this.acceptSnapshot();
          if (value.notice) this.onNotice(value.notice);
        } catch {
          this.retryEntry = entry;
          this.saveOutbox();
          throw Error("offline");
        }
      }
    } catch {
      this.simulationOwner = false;
      this.onStatus("offline");
    } finally {
      this.running = false;
    }
  }
  setEditable(value) {
    if (this.cooperative) value = true;
    this.editable = value;
    this.onMode(value);
  }
  assertEditable() {
    if (this.reconciling)
      throw Error(
        "Обновляем баланс с другого телефона. Повторите действие через секунду.",
      );
    if (this.conflict)
      throw Error(
        "Есть другая версия мира. Откройте «Аккаунт», чтобы безопасно загрузить её; ваша копия остаётся на устройстве.",
      );
    if (!this.editable)
      throw Error(
        "Вы наблюдаете за общим миром. Для игры нажмите «Играть здесь» в аккаунте.",
      );
  }
  async claimEditor() {
    if (!this.shared || !this.token) return true;
    if (this.conflict) return false;
    try {
      const r = await this.fetcher(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Chichi-Save-Token": this.token,
        },
        body: JSON.stringify({ action: "claim", sessionId: this.sessionId }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw Error("Session unavailable");
      const data = await r.json();
      this.simulationOwner = data.granted === true;
      this.setEditable(this.cooperative || data.granted === true);
      if (!this.editable) this.onStatus("watching");
      return this.simulationOwner;
    } catch {
      this.onStatus("offline");
      return false;
    }
  }
  async releaseEditor() {
    if (!this.shared || !this.token) return;
    await this.flush();
    if (this.pending || this.retryEntry || this.running) return;
    this.simulationOwner = false;
    this.setEditable(false);
    try {
      await this.fetcher(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Chichi-Save-Token": this.token,
        },
        body: JSON.stringify({ action: "release", sessionId: this.sessionId }),
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      });
      this.onStatus(this.cooperative ? "ready" : "watching");
    } catch {
      this.onStatus("offline");
    }
  }
  async sync(install, { canInstall = true, claim = false } = {}) {
    if (this.syncing || this.running || this.loading) return;
    this.syncing = true;
    try {
      if (this.editable) await this.flush();
      if (this.conflict) return;
      const canApply = () =>
        typeof canInstall === "function" ? canInstall() : canInstall;
      if (canApply()) this.acceptSnapshot(install);
      // The player may start dragging while GET is in flight. Until the
      // actual install, keep the local diff base paired with the visible game.
      if (!this.dirty && canApply()) {
        const raw = await this.load({ deferInstall: this.cooperative });
        if (raw) {
          if (this.cooperative) {
            if (canApply()) this.acceptSnapshot(install);
          } else {
            try {
              await install(raw);
            } catch {
              this.conflict = true;
              this.metadata(true);
              this.onStatus("conflict");
              return;
            }
          }
        }
      }
      if (this.editable || claim) await this.claimEditor();
    } finally {
      this.syncing = false;
    }
  }
  saveOutbox() {
    if (!this.cooperative) return true;
    try {
      const value = serializeOutbox({
        token: this.token,
        pending: this.pending,
        retryEntry: this.retryEntry,
        localGame: this.localGame,
        remoteGame: this.remoteGame,
        sequence: this.sequence,
      });
      this.storage.setItem("chichi-cloud-outbox", value);
      if (this.storage.getItem("chichi-cloud-outbox") !== value)
        throw Error("Outbox not saved");
      try {
        this.storage.setItem("chichi-write-sequence", String(this.sequence));
      } catch {}
      return true;
    } catch {
      this.onStatus("offline");
      return false;
    }
  }
  acceptSnapshot(install = this.onSnapshot) {
    if (!this.remoteGame || this.pending || this.retryEntry) return;
    try {
      if (install(this.remoteGame) === false) return;
      this.localGame = structuredClone(this.remoteGame);
      this.remoteGame = null;
      this.reconciling = false;
      this.saveOutbox();
    } catch {
      this.conflict = true;
      this.metadata(true);
      this.onStatus("conflict");
    }
  }
  archive(game) {
    const key = "chichi-world-archives";
    let old = [];
    try {
      old = JSON.parse(this.storage.getItem(key) || "[]");
    } catch {}
    if (!Array.isArray(old)) old = [];
    const value = JSON.stringify(
      [
        { game, token: this.token, at: Date.now(), revision: this.revision },
        ...old,
      ].slice(0, 5),
    );
    this.storage.setItem(key, value);
    if (this.storage.getItem(key) !== value)
      throw Error(
        "Не удалось сохранить отдельную копию текущего мира. Переход отменён.",
      );
  }
  async account(action, code) {
    if (action === "create") {
      this.assertEditable();
      await this.flush();
      if (this.dirty || !this.revision)
        throw Error(
          "Дождитесь подтверждения облачного сохранения текущего мира.",
        );
    }
    const url = new URL(this.url);
    url.pathname = url.pathname.replace(/save$/, "account");
    const r = await this.fetcher(url.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        code: code.trim(),
        ...(action === "create" ? { token: this.token } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const value = await r.json();
    if (!r.ok) throw Error(value.error || "Не удалось подключить аккаунт.");
    this.storage.setItem("chichi-account-code", code.trim());
    return value.token;
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
    if (this.shared) this.setEditable(false);
    this.revision = data.revision;
    this.inflightId = null;
    this.conflict = false;
    this.pending = null;
    this.retryEntry = null;
    this.localGame = structuredClone(data.game);
    this.remoteGame = null;
    this.reconciling = false;
    this.saveOutbox();
    this.metadata(false);
    this.onStatus("saved", data.savedAt);
    return data.game;
  }
}
