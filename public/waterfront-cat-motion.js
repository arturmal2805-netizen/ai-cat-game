// A local procedural layer on the approved native rig. Geometry, anatomy and
// the original animation library are unchanged for every other venue.
export function applyWaterfrontCatMotion(cat, frame, time, reduced = false) {
  if (!frame || reduced) return;
  const d = cat.userData,
    m = frame.motion || {},
    phase = frame.phase,
    flight = phase === "bounce" || phase === "dive",
    v = Math.max(-1, Math.min(1, (m.velocityY || 0) / 24));
  if (flight) {
    const arc = Math.sin(Math.PI * (m.flight || 0)),
      bank = phase === "dive" ? 0.17 : 0.05;
    d.body.rotation.x += v * bank;
    d.head.rotation.x -= v * bank * 0.65;
    d.ears[0].rotation.x += arc * 0.09;
    d.ears[1].rotation.x += arc * 0.09;
    d.tail.rotation.x += Math.sin(time * 2) * 0.045 + v * 0.12;
    for (const [i, leg] of d.legs.entries()) {
      const front = leg.position.z > 0,
        fold = arc * (front ? 0.19 : -0.15);
      leg.rotation.x += fold;
      const joints = d.legJoints?.[i];
      if (joints) {
        joints.knee.rotation.x += Math.abs(fold) * 0.7;
        joints.ankle.rotation.x -= Math.abs(fold) * 0.4;
      }
    }
  }
  if (phase === "compress") {
    const w = m.compression || 0;
    d.head.rotation.x -= w * 0.07;
    d.tail.rotation.z += w * 0.12;
  }
  if (phase === "land" || phase === "player-land") {
    const settle = Math.exp(-(m.age || 0) * 11);
    d.head.rotation.x += settle * 0.08;
    d.ears[0].rotation.x += settle * 0.08;
    d.ears[1].rotation.x += settle * 0.08;
  }
  if (phase === "swim" || phase === "splash") {
    d.head.rotation.x -= 0.04;
    d.tail.rotation.y += Math.sin(time * 3.2) * 0.1;
  }
}
