const smooth = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
});
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// A repeated little hunt: paw tap -> rolling ball -> chase -> crouch -> pounce.
// Coordinates are local to the toy, so rotating/moving it rotates the whole game.
export function yarnPlayFrame(time, reduced = false) {
  if (reduced)
    return {
      phase: "rest",
      ball: { x: 0, z: 0 },
      cat: { x: 0, z: -0.75 },
      yaw: 0,
      jump: 0,
      crouch: 0,
      paw: 0,
      running: false,
      roll: 0,
    };
  const cycle = 3.6,
    t = ((time % cycle) + cycle) % cycle,
    round = Math.floor(time / cycle);
  const left = { x: -0.6, z: -0.34 },
    right = { x: 0.6, z: 0.34 },
    from = round % 2 ? right : left,
    to = round % 2 ? left : right;
  const progress = smooth(Math.min(1, t / 1.65)),
    ball = mix(from, to, progress);
  const behind = {
    x: from.x - (to.x - from.x) * 0.65,
    z: from.z - (to.z - from.z) * 0.65,
  };
  let cat,
    phase,
    jump = 0,
    crouch = 0,
    paw = 0,
    running = false;
  if (t < 1.65) {
    const lag = smooth(Math.max(0, Math.min(1, (t - 0.25) / 1.4)));
    cat = mix(
      behind,
      { x: to.x - (to.x - from.x) * 0.65, z: to.z - (to.z - from.z) * 0.65 },
      lag,
    );
    phase = t < 0.4 ? "swat" : "chase";
    running = t >= 0.25;
    paw = t < 0.35 ? Math.sin((t / 0.35) * Math.PI) : 0;
  } else if (t < 2.25) {
    const u = (t - 1.65) / 0.6;
    cat = {
      x: to.x - (to.x - from.x) * 0.65,
      z: to.z - (to.z - from.z) * 0.65,
    };
    phase = "crouch";
    crouch = Math.sin((u * Math.PI) / 2) * 0.14;
  } else if (t < 2.9) {
    const u = (t - 2.25) / 0.65;
    cat = mix(
      { x: to.x - (to.x - from.x) * 0.65, z: to.z - (to.z - from.z) * 0.65 },
      { x: to.x - (to.x - from.x) * 0.55, z: to.z - (to.z - from.z) * 0.55 },
      smooth(u),
    );
    phase = "pounce";
    crouch = 0.14 * (1 - u);
    jump = Math.sin(u * Math.PI) * 0.65;
    paw = Math.sin(u * Math.PI) * 0.85;
  } else {
    const u = (t - 2.9) / 0.7;
    const angle =
      Math.atan2(from.x - to.x, from.z - to.z) + Math.PI * smooth(u);
    const radius = distance(from, to) * (0.55 + 0.1 * smooth(u));
    cat = {
      x: to.x + Math.sin(angle) * radius,
      z: to.z + Math.cos(angle) * radius,
    };
    phase = "turn";
    running = true;
  }
  return {
    phase,
    ball,
    cat,
    yaw: Math.atan2(ball.x - cat.x, ball.z - cat.z),
    jump,
    crouch,
    paw,
    running,
    roll: (round * distance(from, to) + distance(from, ball)) / 0.4,
  };
}
export function applyYarnFrame(group, frame) {
  group.userData.moving.position.set(frame.ball.x, 0.4, frame.ball.z);
  group.userData.moving.rotation.set(frame.roll * 0.42, 0, -frame.roll * 0.91);
  group.userData.yarnString?.position.set(frame.ball.x, 0, frame.ball.z);
}
export function resetYarn(group) {
  if (group?.userData.id !== "yarn") return;
  group.userData.playing = false;
  group.userData.moving.position.set(0, 0.4, 0);
  group.userData.moving.rotation.set(0, 0, 0);
  group.userData.yarnString?.position.set(0, 0, 0);
}
