// Short expressions layer over the three saved AI moods; they never alter needs
// or the approved sculpt. Reuse one frame so the face camera adds no allocations.
export const CAT_EXPRESSIONS = [
  "curious",
  "delighted",
  "affectionate",
  "drowsy",
];
export const EXPRESSION_DURATION = 2.8;
export function expressionFrame(name, age, out = {}) {
  out.tilt = out.pitch = out.turn = out.ears = out.tail = out.paw = 0;
  out.eyes = 1;
  out.blep = 0;
  if (!CAT_EXPRESSIONS.includes(name) || age <= 0 || age >= EXPRESSION_DURATION)
    return out;
  const u = age / EXPRESSION_DURATION,
    envelope = Math.sin(Math.PI * u) ** 2,
    settle = Math.sin(Math.PI * Math.min(1, u * 2));
  if (name === "curious") {
    out.tilt = envelope * 0.16;
    out.turn = envelope * Math.sin(u * Math.PI * 2) * 0.12;
    out.pitch = -envelope * 0.055;
    out.eyes = 1 + envelope * 0.055;
    out.ears = envelope * 0.09;
  } else if (name === "delighted") {
    out.tilt = envelope * Math.sin(u * Math.PI * 2) * 0.07;
    out.pitch = -envelope * 0.06;
    out.eyes = 1 + settle * 0.065 - envelope * 0.2;
    out.ears = envelope * 0.08;
    out.paw = envelope * Math.sin(Math.PI * u) * 0.14;
    out.blep = envelope;
  } else if (name === "affectionate") {
    out.tilt = envelope * -0.12;
    out.pitch = envelope * 0.045;
    // A deliberate slow blink, separate from the normal quick reflex blink.
    out.eyes = 1 - Math.sin(Math.PI * u) ** 6 * 0.98;
    out.ears = -envelope * 0.035;
  } else {
    out.pitch = envelope * 0.09;
    out.tilt = envelope * 0.045;
    out.eyes = 1 - envelope * 0.5;
    out.ears = -envelope * 0.04;
  }
  out.tail = Math.sin(u * Math.PI * 3) * envelope * 0.11;
  return out;
}
