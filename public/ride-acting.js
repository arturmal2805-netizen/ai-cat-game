// Choreography follows the real seat, never a second approximate ride path.
// Sample each authored type once; active riders only interpolate a small table.
// No model, texture, particle buffer, saved mood or carrier transform is changed.
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (x, a, b) => {
  const u = clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};
const profiles = new Map();
const STRIDE = 10;
const mixRow = (rows, i, u, j) =>
  rows[i * STRIDE + j] * (1 - u) + rows[(i + 1) * STRIDE + j] * u;
const active = new Set([
  "ride",
  "slide",
  "vortex",
  "drain",
  "flight",
  "splash",
]);

export function sampleRideActing(frame, duration, impacts = []) {
  const count = Math.min(512, Math.max(96, Math.ceil(duration * 24))),
    dt = duration / count,
    frames = Array.from({ length: count + 1 }, (_, i) => frame(i * dt)),
    rows = new Float32Array((count + 1) * STRIDE),
    ground = Math.min(0.16, ...frames.map((f) => f.position[1]));
  let maxSpeed = 0,
    maxHeight = 0;
  for (let i = 0; i <= count; i++) {
    const f = frames[i],
      // Never measure velocity through an authored boarding/reset discontinuity.
      before = i > 0 && frames[i - 1].phase === f.phase ? i - 1 : i,
      after = i < count && frames[i + 1].phase === f.phase ? i + 1 : i,
      a = frames[before],
      b = frames[after],
      delta = Math.max(dt, (after - before) * dt),
      dx = b.position[0] - a.position[0],
      dy = b.position[1] - a.position[1],
      dz = b.position[2] - a.position[2],
      travel = Math.hypot(dx, dy, dz),
      speed = Math.min(80, travel / delta),
      yaw = (b.yaw || 0) - (a.yaw || 0),
      turn = clamp(
        (speed * Math.atan2(Math.sin(yaw), Math.cos(yaw))) / delta / 14,
        -1,
        1,
      ),
      height = Math.max(0, f.position[1] - ground),
      future = frames[Math.min(count, i + Math.max(1, Math.round(0.5 / dt)))],
      lookDown = clamp((f.position[1] - future.position[1]) / 5),
      climbing = ["climb", "lift", "anticipation"].includes(f.phase),
      weight = active.has(f.phase) ? 1 : climbing ? 0.4 : 0,
      k = i * STRIDE;
    rows.set(
      [
        speed,
        height,
        travel > 1e-6 ? dy / travel : 0,
        turn,
        lookDown,
        weight,
        f.phase === "flight" ? 1 : 0,
        climbing ? 1 : 0,
        f.walking ? 1 : 0,
        0,
      ],
      k,
    );
    if (weight >= 1) maxSpeed = Math.max(maxSpeed, speed);
    maxHeight = Math.max(maxHeight, height);
  }
  for (let i = 1; i < count; i++)
    rows[i * STRIDE + 9] = clamp(
      (rows[(i + 1) * STRIDE] - rows[(i - 1) * STRIDE]) / (dt * 36),
      -1,
      1,
    );
  // A short symmetric filter preserves deterministic seeking while avoiding
  // a pose pop at lift/launch/drain boundaries. No temporal state to accumulate.
  for (let pass = 0; pass < 2; pass++) {
    const source = rows.slice();
    for (let i = 1; i < count; i++)
      for (let j = 0; j < STRIDE; j++)
        rows[i * STRIDE + j] =
          source[i * STRIDE + j] * 0.5 +
          (source[(i - 1) * STRIDE + j] + source[(i + 1) * STRIDE + j]) * 0.25;
  }
  return {
    duration,
    count,
    rows,
    maxSpeed,
    maxHeight,
    impacts: impacts.map((e) => e.time),
  };
}

export function rideActingFrame(profile, elapsed, reduced = false, out = {}) {
  const time = clamp(
      Number.isFinite(elapsed) ? elapsed : 0,
      0,
      profile.duration,
    ),
    sample = (time / profile.duration) * profile.count,
    i = Math.min(profile.count - 1, Math.floor(sample)),
    u = sample - i,
    rows = profile.rows;
  const speed = mixRow(rows, i, u, 0),
    height = mixRow(rows, i, u, 1),
    fast = smooth(speed, 3, 25),
    steep = smooth(-mixRow(rows, i, u, 2), 0.12, 0.85),
    turn = mixRow(rows, i, u, 3),
    anticipation = mixRow(rows, i, u, 4),
    weight = reduced
      ? 0
      : mixRow(rows, i, u, 5) *
        smooth(time, 0, 0.18) *
        (1 - smooth(time, profile.duration - 0.25, profile.duration)),
    air = mixRow(rows, i, u, 6),
    climbing = mixRow(rows, i, u, 7),
    walking = mixRow(rows, i, u, 8),
    high = smooth(height, 2, 28),
    surge = Math.max(0, mixRow(rows, i, u, 9)),
    brake = Math.max(0, -mixRow(rows, i, u, 9));
  let hit = 0,
    shake = 0,
    joy = 0,
    blink = 0;
  for (const at of profile.impacts) {
    const age = time - at;
    if (age < 0 || age > 1.6) continue;
    const rise = smooth(age, 0, 0.08) * (1 - smooth(age, 1.2, 1.6));
    hit = Math.max(hit, rise * Math.exp(-age * 3.5));
    blink = Math.max(blink, rise * (1 - smooth(age, 0.12, 0.3)));
    shake += rise * Math.sin(age * 29) * Math.exp(-age * 3.3) * 0.14;
    joy = Math.max(joy, rise * (1 - Math.exp(-age * 4)) * Math.exp(-age * 1.5));
  }
  const grip =
      (fast * 0.48 + steep * 0.44 + Math.abs(turn) * 0.18 + brake * 0.18) *
      (1 - air),
    flutter = Math.sin(time * (4 + fast * 6));
  out.ride = true;
  out.weight = weight;
  out.speed = speed;
  out.height = height;
  out.turnForce = turn;
  out.crouch =
    weight *
    (0.025 + fast * 0.065 + steep * 0.05 + hit * 0.13) *
    (1 - air * 0.7);
  out.paw =
    weight * (1 - walking) * (air * 0.85 + joy * 0.15 + climbing * 0.045);
  out.pawSpread =
    weight * (1 - walking) * (0.04 + air * 0.25 + Math.abs(turn) * 0.1);
  out.grip = weight * (1 - walking) * grip;
  out.frontLift = weight * (1 - walking) * air * (0.36 + high * 0.16);
  out.hindTuck = weight * (1 - walking) * air * 0.35;
  out.headPitch =
    weight *
    (0.03 +
      anticipation * 0.16 +
      climbing * high * 0.13 -
      air * 0.14 +
      shake * 0.45 -
      surge * 0.04 +
      brake * 0.05);
  out.headRoll = weight * (-turn * 0.14 + shake);
  out.headYaw = weight * (turn * 0.13 + climbing * Math.sin(time * 1.7) * 0.07);
  out.bodyLean = weight * -turn * 0.09;
  out.bodyPitch =
    weight * (steep * 0.055 + hit * 0.07 + brake * 0.05 - surge * 0.025);
  out.earRelax = weight * (-fast * 0.24 + air * 0.06 + shake * 0.25);
  out.tailSway =
    weight *
    (flutter * (0.06 + fast * 0.07 + air * 0.12) + turn * 0.16 + shake * 0.6);
  out.tailTrail = weight * (-fast * 0.38 + air * 0.12);
  out.eyeClose =
    weight * clamp(fast * 0.22 * (1 - air) + blink * 0.98 + joy * 0.12, 0, 0.98);
  out.surprise =
    weight *
    clamp(air * (0.6 + high * 0.38) + anticipation * 0.2 + steep * 0.12);
  return out;
}

export function installRideActing(root) {
  const d = root.userData;
  if (!d.rideFrame || !d.duration || d.rideReaction) return root;
  const key = d.id + ":" + d.duration;
  if (!profiles.has(key))
    profiles.set(
      key,
      sampleRideActing(
        d.rideFrame,
        d.duration,
        d.slideWater?.events || d.route?.impacts || [],
      ),
    );
  const profile = profiles.get(key),
    scratch = {};
  d.rideActing = profile;
  d.rideReaction = (elapsed, reduced = false) =>
    rideActingFrame(profile, elapsed, reduced, scratch);
  return root;
}
