const ease = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
export const socialDuration = (kind) =>
  kind === "play" ? 14 : kind === "greet" ? 8 : 10;
export function socialFrame(time, kind = "greet", reduced = false) {
  const hello = ease(time / 1.8),
    hero = {
      x: mix(0, 0.45, hello),
      z: mix(0.8, 0, hello),
      yaw: -Math.PI / 2,
      jump: 0,
      paw: 0,
      crouch: 0,
      running: time < 1.8,
    },
    friend = {
      x: mix(0, -0.45, hello),
      z: 0,
      yaw: Math.PI / 2,
      jump: 0,
      paw: 0,
      crouch: 0,
      running: time < 1.8,
    };
  if (reduced) {
    hero.x = 0.45;
    hero.z = 0;
    friend.x = -0.45;
    hero.running = friend.running = false;
    return { hero, friend, phase: "together", hearts: true };
  }
  let phase = "hello";
  if (kind === "play" && time > 2) {
    const t = time - 2,
      a = t * 1.6,
      blend = ease(t / 0.8);
    phase = t % 4 < 2 ? "chase" : "pounce";
    for (const [p, offset] of [
      [hero, 0],
      [friend, 1.1],
    ]) {
      p.x = mix(p.x, Math.sin(a + offset) * 1.25, blend);
      p.z = mix(p.z, Math.cos(a + offset) * 1.05, blend);
      p.yaw = Math.atan2(
        Math.cos(a + offset) * 1.25,
        -Math.sin(a + offset) * 1.05,
      );
      p.running = true;
      p.jump =
        phase === "pounce"
          ? Math.max(0, Math.sin(((t % 4) - 2) * Math.PI)) * 0.22
          : 0;
      p.paw = phase === "pounce" ? p.jump * 2 : 0;
    }
  } else if (time > 2) {
    phase = kind === "cuddle" || kind === "best_friend" ? "nuzzle" : "relax";
    const pulse = Math.sin(time * 1.2) * 0.025;
    hero.x = 0.42 + pulse;
    friend.x = -0.42 - pulse;
    hero.crouch = friend.crouch = kind === "relax" ? 0.12 : 0.055;
    hero.paw = kind === "greet" ? Math.max(0, Math.sin(time * 1.2)) * 0.18 : 0;
    hero.running = friend.running = false;
  }
  return { hero, friend, phase, hearts: time > 2 };
}
