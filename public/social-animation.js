const ease = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const heading = (a, b, t) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
export const SOCIAL_RIDE_CHANCE = 0.37;
export function chooseSocialRide(random = Math.random) {
  return random() < SOCIAL_RIDE_CHANCE;
}
function measures(model) {
  const d = model?.userData || {},
    a = d.anatomy || {},
    b = d.build || {},
    s = model?.scale?.x || 0.63;
  return {
    s,
    front:
      s *
      Math.max(
        1.02,
        (a.bodyLength || 0.585) * (b.length || 1) + 0.2,
        (a.bodyX || 0.405) * (b.width || 1) + 0.13,
      ),
    side: s * Math.max(0.57, (a.bodyX || 0.405) * (b.width || 1) + 0.13),
    back: s * ((a.bodyY || 0.79) + (a.bodyHeight || 0.43)),
  };
}
// Dimensions come from the existing rig, including kittens and colossal cats.
// The larger cat carries the smaller one. No model or appearance is changed.
export function socialContext(heroModel, friendModel, { ride = false } = {}) {
  const h = measures(heroModel),
    f = measures(friendModel),
    carrier = h.front * h.side > f.front * f.side ? "hero" : "friend",
    rider = carrier === "hero" ? f : h,
    c = carrier === "hero" ? h : f;
  return {
    gap: h.front + f.front + 0.24,
    sideGap: h.side + f.side + 0.17,
    orbit: Math.max(1.4, h.front + f.front + 0.18),
    ride,
    carrier,
    seat: c.back + 0.075 - rider.s * 0.04,
    riderZ: -c.s * 0.35,
  };
}
export const socialDuration = (kind) =>
  kind === "piggyback" ? 18 : kind === "play" ? 14 : kind === "greet" ? 8 : 10;
function pose(x, z, yaw) {
  return {
    x,
    z,
    yaw,
    jump: 0,
    paw: 0,
    crouch: 0,
    headPitch: 0,
    headRoll: 0,
    tailSway: 0,
    running: false,
  };
}
export function socialFrame(
  time,
  kind = "greet",
  reduced = false,
  context = {},
) {
  const c = {
    gap: 1.6,
    sideGap: 1.1,
    orbit: 1.5,
    carrier: "friend",
    seat: 0.83,
    riderZ: -0.1,
    ...context,
  };
  const hello = ease(time / 1.8),
    hero = pose(
      mix(c.gap, c.gap / 2, hello),
      0,
      heading(c.heroYaw ?? -Math.PI / 2, -Math.PI / 2, ease(time / 0.8)),
    ),
    friend = pose(
      mix(0, -c.gap / 2, hello),
      0,
      heading(c.friendYaw ?? Math.PI / 2, Math.PI / 2, ease(time / 0.8)),
    );
  if (reduced) {
    hero.yaw = -Math.PI / 2;
    friend.yaw = Math.PI / 2;
    hero.x = c.gap / 2;
    friend.x = -c.gap / 2;
    return { hero, friend, phase: "together", hearts: true };
  }
  let phase = "hello";
  hero.running = friend.running = time < 1.8;
  if (kind === "piggyback") {
    const carrier = c.carrier === "hero" ? hero : friend,
      rider = c.carrier === "hero" ? friend : hero;
    const side = c.carrier === "hero" ? -1 : 1,
      stand = side * c.sideGap;
    // Settle side by side, hop up onto the shoulder, trot a small loop, then
    // hop onto the ground. The rider stays in the carrier's local coordinates.
    const join = ease(time / 2);
    carrier.x = mix(carrier.x, 0, join);
    carrier.z = 0;
    carrier.yaw = heading(
      c.carrier === "hero"
        ? (c.heroYaw ?? -Math.PI / 2)
        : (c.friendYaw ?? Math.PI / 2),
      0,
      join,
    );
    carrier.running = false;
    rider.x = mix(rider.x, stand, join);
    rider.z = 0;
    rider.yaw = heading(
      c.carrier === "hero"
        ? (c.friendYaw ?? Math.PI / 2)
        : (c.heroYaw ?? -Math.PI / 2),
      0,
      join,
    );
    rider.running = time < 2;
    if (time >= 2) {
      const mount = ease((time - 2) / 1.5),
        dismount = ease((time - 15.3) / 1.6),
        aboard = mount * (1 - dismount);
      const travel = Math.max(0, Math.min(1, (time - 4) / 10.6)),
        radius = c.orbit * 0.65;
      // Integral of a closed circular route; zero velocity at either end.
      const u = ease(travel),
        angle = u * Math.PI * 2;
      carrier.x = radius * (1 - Math.cos(angle));
      carrier.z = radius * Math.sin(angle);
      carrier.yaw = angle;
      carrier.running = time > 4 && time < 14.6;
      carrier.crouch = time < 3.7 ? 0.16 * Math.sin(mount * Math.PI) : 0.035;
      const bounce = carrier.running ? Math.sin((time - 4) * 10) * 0.025 : 0;
      carrier.jump = bounce;
      const lx = stand * (1 - aboard),
        lz = c.riderZ * aboard;
      rider.x =
        carrier.x + Math.cos(carrier.yaw) * lx + Math.sin(carrier.yaw) * lz;
      rider.z =
        carrier.z - Math.sin(carrier.yaw) * lx + Math.cos(carrier.yaw) * lz;
      rider.yaw = carrier.yaw;
      rider.jump =
        c.seat * aboard +
        bounce * aboard +
        (time < 3.5
          ? Math.sin(mount * Math.PI) * 0.28
          : Math.sin(dismount * Math.PI) * 0.24);
      rider.crouch = aboard * 0.12;
      rider.paw = aboard * 0.34;
      rider.headPitch = -0.1 * aboard;
      rider.headRoll = Math.sin(time * 3) * 0.07 * aboard;
      rider.tailSway = Math.sin(time * 4) * 0.22 * aboard;
      rider.running = false;
      carrier.tailSway = Math.sin(time * 3) * 0.14;
      phase = time < 3.5 ? "mount" : time < 15.3 ? "piggyback" : "dismount";
    }
  } else if (kind === "play" && time > 2) {
    const t = time - 2,
      u = Math.max(0, Math.min(1, t / 12)),
      a = ease(u) * Math.PI * 4;
    const radius = mix(
      c.gap / 2,
      Math.max(c.gap / 2, c.orbit),
      Math.sin(u * Math.PI),
    );
    phase = t % 4 < 2 ? "chase" : "pounce";
    for (const [p, offset] of [
      [hero, 0],
      [friend, Math.PI],
    ]) {
      const angle = a + offset;
      p.x = Math.cos(angle) * radius;
      p.z = Math.sin(angle) * radius;
      p.yaw = heading(
        offset === 0 ? -Math.PI / 2 : Math.PI / 2,
        -angle,
        ease(t / 0.75),
      );
      p.running = u < 0.95;
      p.jump =
        phase === "pounce"
          ? Math.max(0, Math.sin(((t % 4) - 2) * Math.PI)) *
            0.23 *
            Math.sin(u * Math.PI)
          : 0;
      p.paw = p.jump * 1.6;
      p.tailSway = Math.sin(time * 3) * 0.15;
    }
  } else if (time > 2) {
    const close = kind === "cuddle" || kind === "best_friend",
      t = time - 2;
    phase = close ? "nuzzle" : "greet";
    if (close) {
      const turn = ease(t / 0.8),
        settle = ease((t - 0.8) / 0.8);
      hero.x = mix(hero.x, c.sideGap / 2, settle);
      friend.x = mix(friend.x, -c.sideGap / 2, settle);
      hero.yaw = mix(-Math.PI / 2, 0, turn);
      friend.yaw = mix(Math.PI / 2, 0, turn);
      hero.headRoll = -0.12 * turn;
      friend.headRoll = 0.12 * turn;
      hero.crouch = friend.crouch = 0.08 * turn;
    } else {
      hero.paw = Math.max(0, Math.sin(t * 1.5)) * 0.52;
      friend.paw = Math.max(0, Math.sin(t * 1.5 - 1.3)) * 0.42;
      hero.headPitch = Math.sin(t * 1.3) * 0.08;
      friend.headPitch = Math.sin(t * 1.3 + 0.8) * 0.08;
    }
    hero.tailSway = Math.sin(time * 2) * 0.2;
    friend.tailSway = -Math.sin(time * 2) * 0.2;
    hero.running = friend.running = false;
  }
  return { hero, friend, phase, hearts: time > 2 };
}
