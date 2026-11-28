import test from "node:test";
import assert from "node:assert/strict";
import {
  createSquishAudio,
  createSquishAudioEventSampler,
  SQUISH_AUDIO_EVENTS,
} from "../public/squish-audio.js";
const measure = (material = "jelly", id = "toy") => ({
  id,
  material,
  maxContactDepth: 0,
  contacts: [],
  solver: {
    contacts: 0,
    impactEvents: 0,
    totalImpactImpulse: 0,
    accumulatedCreep: 0,
    maxDeformation: 0,
  },
});
const land = (m, impulse = 35) => {
  m.solver.impactEvents += 4;
  m.solver.totalImpactImpulse += impulse;
};
function fakeAudio() {
  const stats = {
    contexts: 0,
    nodes: 0,
    buffers: 0,
    closed: 0,
    started: 0,
    stopped: 0,
    resumed: 0,
    sources: [],
  };
  class Parameter {
    setValueAtTime() {}
    linearRampToValueAtTime() {}
    exponentialRampToValueAtTime() {}
  }
  class Node {
    constructor() {
      stats.nodes++;
      this.frequency = new Parameter();
      this.gain = new Parameter();
      this.onended = null;
      this.disconnected = false;
    }
    connect() {}
    disconnect() {
      this.disconnected = true;
    }
    start() {
      stats.started++;
    }
    stop() {
      stats.stopped++;
    }
  }
  class Context {
    constructor() {
      stats.contexts++;
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.state = "running";
      this.destination = {};
    }
    resume() {
      stats.resumed++;
      this.state = "running";
      return Promise.resolve();
    }
    close() {
      stats.closed++;
      this.state = "closed";
      return Promise.resolve();
    }
    createGain() {
      return new Node();
    }
    createBiquadFilter() {
      return new Node();
    }
    createOscillator() {
      const n = new Node();
      stats.sources.push(n);
      return n;
    }
    createBufferSource() {
      const n = new Node();
      stats.sources.push(n);
      return n;
    }
    createBuffer(channels, length) {
      stats.buffers++;
      const data = new Float32Array(length);
      return {
        getChannelData() {
          return data;
        },
      };
    }
  }
  const listeners = new Map(),
    element = {
      addEventListener(name, fn) {
        listeners.set(name, fn);
      },
      removeEventListener(name, fn) {
        if (listeners.get(name) === fn) listeners.delete(name);
      },
      emit(name, event = { isTrusted: true }) {
        listeners.get(name)?.(event);
      },
    };
  const audioWindow = {
    AudioContext: Context,
    performance: { now: () => 0 },
    navigator: { userActivation: { isActive: false } },
  };
  return {
    stats,
    element,
    audioWindow,
    listeners,
    endAll() {
      for (const n of stats.sources) n.onended?.();
    },
  };
}

test("pure sampler consumes each real landing once and stays silent on constant static state", () => {
  const sample = createSquishAudioEventSampler(),
    m = measure();
  assert.equal(sample.sample(1 / 60, [m]), null);
  land(m);
  const event = sample.sample(0.4, [m]);
  assert.equal(event.kind, "jelly-impact");
  assert.equal(event.impactImpulse, 35);
  for (let i = 0; i < 600; i++) assert.equal(sample.sample(1 / 60, [m]), null);
  assert.equal(sample.diagnostics.emitted, 1);
  land(m, 70);
  assert.equal(sample.sample(0.4, [m]).impactImpulse, 70);
  assert.equal(sample.sample(0, [m]), null);
  assert.equal(sample.sample(NaN, [m]), null);
});

test("wobble requires a measured post-impact reversal and emits at most once", () => {
  const sample = createSquishAudioEventSampler(),
    m = measure();
  sample.sample(0.1, [m]);
  land(m);
  m.maxContactDepth = 0.1;
  assert.equal(sample.sample(0.4, [m]).kind, "jelly-impact");
  m.maxContactDepth = 0.15;
  assert.equal(sample.sample(0.2, [m]), null);
  m.maxContactDepth = 0.1;
  assert.equal(sample.sample(0.3, [m]).kind, "jelly-wobble");
  for (let i = 0; i < 10; i++) {
    m.maxContactDepth = i % 2 ? 0.2 : 0.1;
    assert.equal(sample.sample(0.5, [m]), null);
  }
});

test("slow pressure uses accumulated material creep changes; Foam and Cloud retain distinct recipes", () => {
  for (const [material, kind] of [
    ["foam", "foam-pressure"],
    ["cloud", "cloud-rustle"],
  ]) {
    const sample = createSquishAudioEventSampler(),
      m = measure(material);
    m.contacts = [{ id: "paw", accumulatedCreep: 0 }];
    m.solver.contacts = 1;
    sample.sample(0.1, [m]);
    for (let i = 0; i < 20; i++) {
      m.solver.accumulatedCreep += 0.0005;
      assert.equal(sample.sample(0.02, [m]), null);
    }
    m.solver.accumulatedCreep = 0.03;
    const event = sample.sample(0.8, [m]);
    assert.equal(event.kind, kind);
    for (let i = 0; i < 300; i++)
      assert.equal(
        sample.sample(1 / 60, [m]),
        null,
        "standing unchanged is silent",
      );
  }
  assert.notDeepEqual(
    SQUISH_AUDIO_EVENTS["foam-pressure"],
    SQUISH_AUDIO_EVENTS["cloud-rustle"],
  );
});

test("Butter only crinkles after actual shell crack evidence and threshold progression", () => {
  const sample = createSquishAudioEventSampler(),
    m = measure("butter");
  sample.sample(0.1, [m]);
  land(m, 200);
  m.solver.damage = 1;
  assert.equal(
    sample.sample(0.5, [m]),
    null,
    "impact or coarse stress alone never invents fracture",
  );
  m.butter = { maxSurfaceDamage: 0.19, crackedVertices: 0, detached: 0 };
  assert.equal(sample.sample(0.5, [m]), null);
  m.butter.maxSurfaceDamage = 0.21;
  m.butter.crackedVertices = 3;
  assert.equal(sample.sample(0.5, [m]).kind, "butter-fracture");
  assert.equal(sample.sample(2, [m]), null, "same fracture cannot replay");
  m.butter.maxSurfaceDamage = 0.25;
  assert.equal(sample.sample(0.5, [m]), null, "minor damage jitter is silent");
  m.butter.maxSurfaceDamage = 0.4;
  assert.equal(sample.sample(0.5, [m]).kind, "butter-fracture");
  m.butter.detached = 1;
  assert.equal(sample.sample(0.5, [m]).kind, "butter-fracture");
});

test("Slime release tracks actual contact IDs and Crunchy uses actual filler collisions", () => {
  const sample = createSquishAudioEventSampler(),
    m = measure("slime-gooey");
  m.contacts = [
    { id: "left", accumulatedCreep: 0.2 },
    { id: "right", accumulatedCreep: 0.15 },
  ];
  m.solver.contacts = 2;
  sample.sample(0.1, [m]);
  m.contacts.pop();
  m.solver.contacts = 1;
  const event = sample.sample(0.7, [m]);
  assert.equal(event.kind, "slime-release");
  assert.equal(event.contactId, "right");
  for (let i = 0; i < 20; i++) assert.equal(sample.sample(0.1, [m]), null);
  m.contacts.length = 0;
  m.solver.contacts = 0;
  assert.equal(sample.sample(0.7, [m]).contactId, "left");
  const crunchy = measure("crunchy");
  crunchy.contacts = [{ id: "paw" }];
  crunchy.solver.contacts = 1;
  crunchy.crunchy = { collisions: 0, energy: 0 };
  sample.sample(0.5, [crunchy]);
  crunchy.crunchy.energy = 0.1;
  assert.equal(sample.sample(0.5, [crunchy]), null);
  crunchy.crunchy.collisions = 1;
  assert.equal(sample.sample(0.5, [crunchy]).kind, "crunchy-beads");
  assert.equal(sample.sample(0.5, [crunchy]), null);
});

test("global cooldown bounds simultaneous materials and drops old impacts rather than replaying a burst", () => {
  const sample = createSquishAudioEventSampler(),
    a = measure("jelly", "a"),
    b = measure("jelly", "b");
  sample.sample(0.01, [a, b]);
  land(a);
  land(b);
  assert(sample.sample(0.01, [a, b]));
  assert.equal(sample.sample(0.1, [a, b]), null);
  assert.equal(
    sample.sample(0.4, [a, b]),
    null,
    "second old impact was consumed",
  );
  let emitted = 0;
  for (let i = 0; i < 60; i++) {
    land(a);
    if (sample.sample(1 / 60, [a, b])) emitted++;
  }
  assert(emitted <= 3, "at most three event starts in a second");
  const bounded = createSquishAudioEventSampler({ maxToys: 2 });
  bounded.sample(0.1, [a, b, measure("foam", "third")]);
  assert.equal(bounded.diagnostics.trackedToys, 2);
  bounded.sample(0.1, []);
  assert.equal(bounded.diagnostics.trackedToys, 0);
});

test("audio defaults to mute and needs a trusted gesture; idle updates allocate no audio nodes or buffers", () => {
  const f = fakeAudio(),
    audio = createSquishAudio(f.element, f.audioWindow),
    m = measure();
  for (let i = 0; i < 300; i++) {
    land(m);
    assert.equal(audio.update(1 / 60, [m], true), false);
  }
  assert.equal(f.stats.contexts, 0);
  assert.equal(f.stats.nodes, 0);
  audio.setEnabled(true);
  assert.equal(
    f.stats.contexts,
    0,
    "programmatic enable does not unlock autoplay",
  );
  f.element.emit("pointerdown", { isTrusted: false });
  assert.equal(f.stats.contexts, 0);
  f.element.emit("pointerdown");
  assert.equal(f.stats.contexts, 1);
  assert.equal(f.stats.buffers, 0);
  assert.equal(
    audio.update(0.1, [m]),
    false,
    "first observation baselines old impacts",
  );
  land(m);
  assert.equal(audio.update(0.4, [m]), true);
  assert.equal(f.stats.started, 1);
  const nodeCount = f.stats.nodes;
  for (let i = 0; i < 600; i++) assert.equal(audio.update(1 / 60, [m]), false);
  assert.equal(f.stats.nodes, nodeCount);
  assert.equal(f.stats.buffers, 0, "boing does not create a noise buffer");
  audio.setEnabled(false);
  assert.equal(audio.diagnostics.activeVoices, 0);
  land(m);
  assert.equal(audio.update(0.4, [m]), false);
  assert.equal(f.stats.started, 1);
  audio.dispose();
  assert.equal(f.stats.closed, 1);
  assert.equal(f.listeners.size, 0);
});

test("noise buffer is deterministic and shared; voice cap and complete disposal survive repeated impacts", () => {
  const f = fakeAudio(),
    audio = createSquishAudio(f.element, f.audioWindow),
    m = measure("foam");
  audio.setEnabled(true);
  f.element.emit("keydown");
  audio.update(0.1, [m]);
  land(m);
  assert(audio.update(1, [m]));
  f.endAll();
  land(m);
  assert(audio.update(1, [m]));
  assert.equal(f.stats.buffers, 1);
  assert.equal(f.stats.sources[0].buffer, f.stats.sources[1].buffer);
  const noise = f.stats.sources[0].buffer.getChannelData(0);
  assert(noise.some((x) => x !== 0));
  const other = fakeAudio(),
    second = createSquishAudio(other.element, other.audioWindow),
    copy = measure("foam");
  second.setEnabled(true);
  other.element.emit("pointerdown");
  second.update(0.1, [copy]);
  land(copy);
  second.update(1, [copy]);
  assert.deepEqual(noise, other.stats.sources[0].buffer.getChannelData(0));
  second.dispose();
  audio.dispose();
  const v = fakeAudio(),
    bounded = createSquishAudio(v.element, v.audioWindow),
    jelly = measure();
  bounded.setEnabled(true);
  v.element.emit("pointerdown");
  bounded.update(0.1, [jelly]);
  for (let i = 0; i < 7; i++) {
    land(jelly);
    bounded.update(0.5, [jelly]);
  }
  assert.equal(bounded.diagnostics.activeVoices, 4);
  assert.equal(v.stats.started, 4);
  assert.equal(bounded.diagnostics.dropped, 3);
  bounded.dispose();
  assert.equal(bounded.diagnostics.activeVoices, 0);
  assert.equal(v.listeners.size, 0);
  assert(v.stats.sources.every((s) => s.disconnected));
  assert.equal(v.stats.closed, 1);
  const nodes = v.stats.nodes;
  bounded.dispose();
  bounded.update(1, [jelly]);
  assert.equal(v.stats.nodes, nodes);
  assert.equal(v.stats.closed, 1);
});

test("hidden and re-enabled audio stops voices and baselines stale events without replay", () => {
  const f = fakeAudio(),
    audio = createSquishAudio(f.element, f.audioWindow),
    m = measure();
  audio.setEnabled(true);
  f.element.emit("pointerdown");
  audio.update(0.1, [m]);
  land(m);
  audio.update(0.4, [m]);
  assert.equal(audio.diagnostics.activeVoices, 1);
  audio.update(0.1, [m], false);
  assert.equal(audio.diagnostics.activeVoices, 0);
  land(m);
  audio.update(1, [m], false);
  assert.equal(audio.update(0.1, [m], true), false);
  assert.equal(f.stats.started, 1);
  audio.setEnabled(false);
  land(m);
  audio.setEnabled(true);
  assert.equal(audio.update(0.1, [m]), false);
  audio.dispose();
});
