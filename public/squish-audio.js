// Warehouse-only original procedural sounds. Muted by default; no connection to
// slide audio, saved settings, network assets or a global audio context.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const materialType = (id) =>
  typeof id === "string" && id.startsWith("slime") ? "slime" : id;
const EMPTY = Object.freeze([]);
const MATERIALS = new Set([
  "jelly",
  "foam",
  "cloud",
  "butter",
  "slime",
  "crunchy",
]);

// Fixed artistic voice recipes; gains are deliberately quiet. Times are seconds
// and frequencies Hz. Noise uses one shared deterministic mono buffer.
export const SQUISH_AUDIO_EVENTS = Object.freeze({
  "jelly-impact": Object.freeze({
    source: "sine",
    duration: 0.64,
    attack: 0.008,
    gain: 0.034,
    hz: 205,
    endHz: 62,
  }),
  "jelly-wobble": Object.freeze({
    source: "sine",
    duration: 0.4,
    attack: 0.012,
    gain: 0.012,
    hz: 108,
    endHz: 76,
  }),
  "foam-pressure": Object.freeze({
    source: "noise",
    duration: 0.48,
    attack: 0.09,
    gain: 0.014,
    filter: "lowpass",
    hz: 620,
    endHz: 360,
  }),
  "cloud-rustle": Object.freeze({
    source: "noise",
    duration: 0.38,
    attack: 0.075,
    gain: 0.011,
    filter: "highpass",
    hz: 1550,
    endHz: 2200,
  }),
  "butter-fracture": Object.freeze({
    source: "noise",
    duration: 0.21,
    attack: 0.003,
    gain: 0.019,
    filter: "bandpass",
    hz: 950,
    endHz: 1650,
    bursts: 4,
  }),
  "slime-stretch": Object.freeze({
    source: "triangle",
    duration: 0.32,
    attack: 0.045,
    gain: 0.014,
    hz: 83,
    endHz: 49,
  }),
  "slime-release": Object.freeze({
    source: "triangle",
    duration: 0.19,
    attack: 0.004,
    gain: 0.025,
    hz: 155,
    endHz: 43,
  }),
  "crunchy-beads": Object.freeze({
    source: "noise",
    duration: 0.18,
    attack: 0.002,
    gain: 0.018,
    filter: "highpass",
    hz: 2400,
    endHz: 1750,
    bursts: 6,
  }),
});

// One reusable state per stable toy ID and at most 16 actual contacts per toy.
// Existing measurements may be passed directly, but provide `id: toy.uuid` when
// more than one toy shares a material. `butter` and `crunchy` are the respective
// existing effect diagnostics. No pressure/timer alone can invent a fracture.
export function createSquishAudioEventSampler({
  maxToys = 32,
  cooldown = 0.34,
} = {}) {
  const states = new Map();
  let time = 0,
    nextEvent = 0,
    serial = 0,
    frame = 0;
  const globalCooldown = Math.max(1 / 3, cooldown);
  function reset() {
    states.clear();
    nextEvent = time;
  }
  function sample(dt, measurements = EMPTY, visible = true) {
    if (!(dt > 0) || !Number.isFinite(dt)) return null;
    time += Math.min(dt, 1);
    frame++;
    if (!visible) {
      reset();
      return null;
    }
    let best = null,
      bestKind = null,
      bestStrength = 0,
      bestPriority = 0,
      bestContact = null,
      bestImpulse = 0;
    for (const m of measurements) {
      if (!m) continue;
      const solver = m.solver;
      if (!solver) continue;
      const material = materialType(m.material || solver.materialId);
      if (!MATERIALS.has(material)) continue;
      const id =
        m.id ?? m.squishId ?? m.toyId ?? m.material ?? solver.materialId;
      if (id === undefined) continue;
      const contacts = Array.isArray(m.contacts)
        ? m.contacts
        : solver.dynamicContacts || EMPTY;
      const contactCount = contacts.length || finite(solver.contacts);
      const creep = Math.max(0, finite(solver.accumulatedCreep));
      const compression = Math.max(
        0,
        finite(m.maxContactDepth, finite(solver.maxDeformation)),
      );
      const impulse = Math.max(0, finite(solver.totalImpactImpulse));
      const impactCount = Math.max(0, finite(solver.impactEvents));
      const butter = m.butter || m.effects?.butter;
      const damage = Math.max(0, finite(butter?.maxSurfaceDamage));
      const cracked = Math.max(0, finite(butter?.crackedVertices));
      const detached = Math.max(0, finite(butter?.detached));
      const crunchy = m.crunchy || m.effects?.crunchy;
      const collisions = Math.max(0, finite(crunchy?.collisions));
      const energy = Math.max(0, finite(crunchy?.energy));
      let state = states.get(id);
      if (!state) {
        // The first observation is a baseline: enabling audio never replays an old
        // landing, crack or stored imprint. New toys have bounded retained state.
        if (states.size >= maxToys) continue;
        state = {
          id,
          material,
          contacts: new Map(),
          contactCount,
          creep,
          compression,
          impulse,
          impactCount,
          damage,
          cracked,
          detached,
          collisions,
          lastCreep: creep,
          lastDamage: damage,
          velocity: 0,
          lastEvent: -Infinity,
          wobbleUntil: 0,
          wobblePending: false,
          seen: frame,
        };
        states.set(id, state);
      }
      state.seen = frame;
      let releasedCreep = 0,
        releasedId = null;
      for (const c of contacts) {
        const key = c.id ?? c.contactId;
        if (key === undefined) continue;
        let contact = state.contacts.get(key);
        if (!contact) {
          if (state.contacts.size >= 16) continue;
          contact = { seen: frame, creep: 0 };
          state.contacts.set(key, contact);
        }
        contact.seen = frame;
        contact.creep = Math.max(
          0,
          finite(
            c.accumulatedCreep,
            finite(c.dynamic?.accumulatedCreep, creep),
          ),
        );
      }
      for (const [key, contact] of state.contacts) {
        if (contact.seen === frame) continue;
        if (contact.creep > releasedCreep) {
          releasedCreep = contact.creep;
          releasedId = key;
        }
        state.contacts.delete(key);
      }
      const velocity = (compression - state.compression) / dt;
      const impulseDelta = Math.max(0, impulse - state.impulse);
      const landing = impactCount > state.impactCount && impulseDelta > 0;
      const creepDelta = creep - state.lastCreep;
      let kind = null,
        strength = 0,
        priority = 0,
        contactId = null;
      if (landing) {
        kind =
          material === "jelly"
            ? "jelly-impact"
            : material === "foam"
              ? "foam-pressure"
              : material === "cloud"
                ? "cloud-rustle"
                : material === "crunchy"
                  ? "crunchy-beads"
                  : material === "slime"
                    ? "slime-stretch"
                    : null;
        strength = clamp(Math.sqrt(impulseDelta / 35), 0.15, 1);
        priority = 3;
      }
      if (
        material === "butter" &&
        (detached > state.detached ||
          (cracked > 0 &&
            damage > 0.2 &&
            (state.cracked === 0 || damage - state.lastDamage >= 0.12)))
      ) {
        kind = "butter-fracture";
        strength = clamp(0.2 + damage * 0.8, 0.2, 1);
        priority = 4;
      } else if (material === "slime" && releasedCreep > 0.012) {
        kind = "slime-release";
        strength = clamp(releasedCreep * 3, 0.15, 1);
        priority = 3;
        contactId = releasedId;
      } else if (
        !kind &&
        material === "crunchy" &&
        collisions > state.collisions &&
        energy > 1e-4 &&
        contactCount > 0
      ) {
        kind = "crunchy-beads";
        strength = clamp(Math.sqrt(energy) * 0.4, 0.1, 0.8);
        priority = 2;
      } else if (
        !kind &&
        contactCount > 0 &&
        creepDelta > 0.015 &&
        creep > state.creep + 1e-7
      ) {
        kind =
          material === "foam"
            ? "foam-pressure"
            : material === "cloud"
              ? "cloud-rustle"
              : material === "slime"
                ? "slime-stretch"
                : null;
        strength = clamp(
          creepDelta * 8 + Math.max(0, velocity) * 0.15,
          0.08,
          0.65,
        );
        priority = 1;
      } else if (
        !kind &&
        material === "jelly" &&
        state.wobblePending &&
        time <= state.wobbleUntil &&
        state.velocity > 0.002 &&
        velocity < -0.002 &&
        compression > 0.02
      ) {
        kind = "jelly-wobble";
        strength = clamp(Math.abs(velocity) * 0.3, 0.08, 0.5);
        priority = 1;
      }
      if (time > state.wobbleUntil) state.wobblePending = false;
      const localCooldown =
        material === "foam" || material === "cloud"
          ? 1
          : material === "slime"
            ? 0.65
            : 0.4;
      if (
        kind &&
        time >= nextEvent &&
        time - state.lastEvent >= localCooldown &&
        priority > bestPriority
      ) {
        best = state;
        bestKind = kind;
        bestStrength = strength;
        bestPriority = priority;
        bestContact = contactId;
        bestImpulse = impulseDelta;
      }
      // Always consume event counters, including events dropped by the sound
      // budget. A later quiet frame must not replay a burst of old impacts.
      state.creep = creep;
      state.compression = compression;
      state.impulse = impulse;
      state.impactCount = impactCount;
      state.damage = damage;
      state.cracked = cracked;
      state.detached = detached;
      state.collisions = collisions;
      state.contactCount = contactCount;
      state.velocity = velocity;
      if (creep < state.lastCreep) state.lastCreep = creep;
      if (damage < state.lastDamage) state.lastDamage = damage;
    }
    // Reclaim absent toys without a second owning object cache.
    for (const [id, state] of states)
      if (state.seen !== frame) states.delete(id);
    if (!best) return null;
    best.lastEvent = time;
    best.lastCreep = best.creep;
    best.lastDamage = best.damage;
    if (bestKind === "jelly-impact") {
      best.wobblePending = true;
      best.wobbleUntil = time + 2.5;
    }
    if (bestKind === "jelly-wobble") best.wobblePending = false;
    nextEvent = time + globalCooldown;
    return {
      serial: ++serial,
      time,
      toyId: best.id,
      material: best.material,
      kind: bestKind,
      intensity: bestStrength,
      contactId: bestContact,
      impactImpulse: bestImpulse,
      accumulatedCreep: best.creep,
      damage: best.damage,
    };
  }
  return {
    sample,
    reset,
    get diagnostics() {
      return { trackedToys: states.size, time, emitted: serial };
    },
  };
}

export function createSquishAudio(element, audioWindow = globalThis) {
  const sampler = createSquishAudioEventSampler();
  // Fixed four-slot voice bookkeeping. Nodes are allocated only for an event;
  // disabled, hidden, suspended and unchanged static frames create no audio work.
  const voices = Array.from({ length: 4 }, () => ({
    active: false,
    source: null,
    filter: null,
    gain: null,
  }));
  let context = null,
    noise = null,
    enabled = false,
    disposed = false,
    lastGesture = -Infinity;
  let events = 0,
    dropped = 0,
    wasVisible = true;
  const now = () => audioWindow.performance?.now?.() ?? Date.now();
  function finish(voice) {
    if (!voice.active) return;
    voice.active = false;
    if (voice.source) {
      voice.source.onended = null;
      voice.source.disconnect();
    }
    voice.filter?.disconnect();
    voice.gain?.disconnect();
    voice.source = voice.filter = voice.gain = null;
  }
  function stopVoices() {
    for (const voice of voices) {
      if (!voice.active) continue;
      const source = voice.source;
      source.onended = null;
      try {
        source.stop();
      } catch {}
      finish(voice);
    }
  }
  function unlock() {
    if (!enabled || disposed) return;
    const Audio = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!Audio) return;
    try {
      context ||= new Audio();
      if (context.state !== "running") context.resume()?.catch?.(() => {});
    } catch {}
  }
  function gesture(event) {
    if (event?.isTrusted === false) return;
    lastGesture = now();
    unlock();
  }
  element.addEventListener("pointerdown", gesture, {
    passive: true,
    capture: true,
  });
  element.addEventListener("keydown", gesture, { capture: true });
  function noiseBuffer() {
    if (noise) return noise;
    noise = context.createBuffer(
      1,
      Math.ceil(context.sampleRate),
      context.sampleRate,
    );
    const samples = noise.getChannelData(0);
    let seed = 0x51a17e;
    for (let i = 0; i < samples.length; i++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      samples[i] = (seed >>> 0) / 2147483648 - 1;
    }
    return noise;
  }
  function play(event) {
    const recipe = SQUISH_AUDIO_EVENTS[event.kind];
    if (!recipe || context?.state !== "running") return false;
    let voice = null;
    for (const slot of voices)
      if (!slot.active) {
        voice = slot;
        break;
      }
    if (!voice) {
      dropped++;
      return false;
    }
    const t = context.currentTime,
      duration = recipe.duration;
    try {
      voice.active = true;
      voice.gain = context.createGain();
      const gain = voice.gain.gain,
        peak = recipe.gain * clamp(event.intensity, 0.05, 1);
      gain.setValueAtTime(0.00001, t);
      gain.linearRampToValueAtTime(peak, t + recipe.attack);
      if (recipe.bursts) {
        for (let i = 1; i < recipe.bursts; i++) {
          const at = t + (duration * i) / recipe.bursts;
          gain.linearRampToValueAtTime(peak * 0.12, at - 0.006);
          gain.linearRampToValueAtTime(
            peak * (1 - (i / recipe.bursts) * 0.7),
            at,
          );
        }
      }
      gain.exponentialRampToValueAtTime(0.00001, t + duration);
      voice.gain.connect(context.destination);
      if (recipe.source === "noise") {
        const source = context.createBufferSource();
        voice.source = source;
        source.buffer = noiseBuffer();
        source.loop = true;
        voice.filter = context.createBiquadFilter();
        voice.filter.type = recipe.filter;
        voice.filter.frequency.setValueAtTime(recipe.hz, t);
        voice.filter.frequency.exponentialRampToValueAtTime(
          recipe.endHz,
          t + duration,
        );
        source.connect(voice.filter);
        voice.filter.connect(voice.gain);
      } else {
        const source = context.createOscillator();
        voice.source = source;
        source.type = recipe.source;
        source.frequency.setValueAtTime(
          recipe.hz * (0.85 + event.intensity * 0.3),
          t,
        );
        source.frequency.exponentialRampToValueAtTime(
          recipe.endHz,
          t + duration,
        );
        source.connect(voice.gain);
      }
      voice.source.onended = () => finish(voice);
      voice.source.start(t);
      voice.source.stop(t + duration + 0.01);
      events++;
      return true;
    } catch {
      if (voice.source) {
        voice.source.onended = null;
        try {
          voice.source.stop();
        } catch {}
      }
      finish(voice);
      return false;
    }
  }
  return {
    setEnabled(value) {
      if (disposed) return false;
      const next = !!value;
      if (next === enabled) return enabled;
      enabled = next;
      sampler.reset();
      if (!enabled) stopVoices();
      else if (
        audioWindow.navigator?.userActivation?.isActive ||
        now() - lastGesture < 500
      )
        unlock();
      return enabled;
    },
    update(dt, measurements = EMPTY, visible = true) {
      if (disposed || !enabled) return false;
      if (!visible) {
        if (wasVisible) {
          stopVoices();
          sampler.reset();
        }
        wasVisible = false;
        return false;
      }
      wasVisible = true;
      if (context?.state !== "running") return false;
      const event = sampler.sample(dt, measurements, true);
      return event ? play(event) : false;
    },
    get enabled() {
      return enabled;
    },
    get diagnostics() {
      let active = 0;
      for (const voice of voices) if (voice.active) active++;
      return {
        enabled,
        unlocked: context?.state === "running",
        activeVoices: active,
        maxVoices: 4,
        emitted: events,
        dropped,
        noiseBuffers: noise ? 1 : 0,
        disposed,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      stopVoices();
      sampler.reset();
      noise = null;
      element.removeEventListener("pointerdown", gesture, true);
      element.removeEventListener("keydown", gesture, true);
      try {
        context?.close()?.catch?.(() => {});
      } catch {}
      context = null;
    },
  };
}
