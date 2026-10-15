import * as THREE from "three";
import { animateCat } from "../public/cat-model.js";

// Bake the actual live rig, rather than maintaining a second approximate rig.
// Scale tracks also carry blinks into GLB viewers (glTF has no visibility track).
export function catAnimations(model) {
  const d = model.userData;
  const bindings = [
    [model, "scale"],
    [model, "position"],
    [d.body, "scale"],
    [d.chest, "scale"],
    [d.head, "position"],
    [d.body, "position"],
    [d.chest, "position"],
    [d.head, "quaternion"],
    [d.tail, "quaternion"],
    [d.tailTip, "quaternion"],
    [d.jaw, "quaternion"],
    [d.jaw, "position"],
    [d.mouth, "scale"],
    ...d.ears.map((n) => [n, "quaternion"]),
    ...d.eyes.map((n) => [n, "scale"]),
    ...d.closedEyes.map((n) => [n, "scale"]),
    ...d.pupils.map((n) => [n, "position"]),
    ...(d.legJoints || []).flatMap((j) => [
      [j.knee, "quaternion"],
      [j.ankle, "quaternion"],
    ]),
  ];
  function sample(name, duration, walking, nodes) {
    const times = [],
      values = nodes.map(() => []),
      count = Math.round(duration * 60);
    for (let i = 0; i <= count; i++) {
      const time = (i / count) * duration;
      times.push(time);
      animateCat(model, time, walking);
      for (let n = 0; n < nodes.length; n++)
        values[n].push(...nodes[n][0][nodes[n][1]].toArray());
    }
    // Blend the end of nonperiodic micro-motions back over half a second.
    // Blink and gait are naturally periodic; all clips end at their first pose.
    const tracks = nodes.map(([node, property], i) => {
      const size = property === "quaternion" ? 4 : 3;
      const first = values[i].slice(0, size),
        lastStart = Math.max(
          0,
          count - Math.round(Math.min(0.5, duration * 0.25) * 60),
        );
      for (let frame = lastStart; frame <= count; frame++) {
        const t = (frame - lastStart) / (count - lastStart),
          weight = t * t * (3 - 2 * t);
        if (property === "quaternion") {
          const q = new THREE.Quaternion().fromArray(values[i], frame * size);
          q.slerp(new THREE.Quaternion().fromArray(first), weight).toArray(
            values[i],
            frame * size,
          );
        } else
          for (let component = 0; component < size; component++)
            values[i][frame * size + component] = THREE.MathUtils.lerp(
              values[i][frame * size + component],
              first[component],
              weight,
            );
      }
      const Track =
        property === "quaternion"
          ? THREE.QuaternionKeyframeTrack
          : THREE.VectorKeyframeTrack;
      return new Track(`${node.name}.${property}`, times, values[i]);
    });
    return new THREE.AnimationClip(name, duration, tracks);
  }
  const idle = sample("MoodLoop", 4.8, false, bindings);
  const walk = sample("Walk", Math.PI / 5, true, [
    ...d.legs.flatMap((n) => [
      [n, "quaternion"],
      [n, "position"],
    ]),
    ...(d.legJoints || []).flatMap((j) => [
      [j.knee, "quaternion"],
      [j.ankle, "quaternion"],
    ]),
  ]);
  // Export the resting mood, not the last sampled step of the walking clip.
  animateCat(model, 0, false);
  return [idle, walk];
}
