import * as T from "three";
// Local manual physics adapter for the existing third-person controller. It
// neither replaces that camera nor changes global walking or persistent saves.
export function createSquishManual({
  getActor,
  getNavigation,
  isActive,
  getRadius,
  floor,
}) {
  let state = null,
    input = { forward: 0, side: 0, heading: 0, jump: false },
    lastJump = false,
    pendingJump = false,
    accumulator = 0,
    clock = 0,
    airborne = false,
    vy = 0,
    impact = 0,
    releasing = false,
    releaseVelocity = null,
    frame = null;
  const zero = { forward: 0, side: 0, heading: 0, jump: false };
  function ensure() {
    if (state) return;
    const a = getActor();
    if (!a) return;
    state = {
      x: a.position.x,
      y: a.position.y,
      z: a.position.z,
      yaw: a.yaw || 0,
    };
  }
  function sample() {
    if (!state) return null;
    const nav = getNavigation(),
      ground = nav.ground(state, getRadius());
    return {
      position: new T.Vector3(state.x, state.y, state.z),
      yaw: state.yaw,
      walking: !!frame?.walking,
      reaction: airborne
        ? {
            ride: true,
            paw: 0.23,
            hindTuck: 0.18,
            headPitch: vy > 0 ? -0.08 : 0.1,
          }
        : { ride: true, crouch: Math.min(0.13, impact * 0.018) },
      squish:
        !airborne && ground?.toy
          ? { toy: ground.toy, age: clock, state: "ManualWalk", impact }
          : null,
    };
  }
  function step(dt) {
    ensure();
    if (!state) return;
    const nav = getNavigation(),
      radius = getRadius(),
      h = 1 / 60;
    clock += h;
    impact *= Math.exp(-h * 12);
    const keys = releasing ? zero : input,
      heading = keys.heading ?? state.yaw,
      length = Math.max(1, Math.hypot(keys.forward, keys.side)),
      speed = 4,
      dx =
        ((Math.sin(heading) * keys.forward + Math.cos(heading) * keys.side) *
          speed) /
        length,
      dz =
        ((Math.cos(heading) * keys.forward - Math.sin(heading) * keys.side) *
          speed) /
        length;
    let ground = nav.ground(state, radius);
    if (releasing && !airborne && ground?.toy && !releaseVelocity) {
      const toy = ground.toy,
        p = toy.getWorldPosition(new T.Vector3()),
        to = {
          x: p.x,
          y: floor,
          z: p.z + toy.userData.solver.size[2] / 2 + 2.5,
        },
        launch = 6,
        dy = to.y - state.y,
        time = (launch + Math.sqrt(launch * launch - 2 * 9.81 * dy)) / 9.81;
      releaseVelocity = {
        x: (to.x - state.x) / time,
        z: (to.z - state.z) / time,
      };
      airborne = true;
      vy = launch;
    }
    if (!airborne && pendingJump && !releasing) {
      vy = 9.4;
      airborne = true;
      pendingJump = false;
    }
    const old = { ...state },
      vx = releaseVelocity?.x ?? dx,
      vz = releaseVelocity?.z ?? dz;
    for (const key of ["x", "z"]) {
      const candidate = {
          ...state,
          [key]: state[key] + (key === "x" ? vx : vz) * h,
        },
        hit = nav.ground(candidate, radius);
      if (!hit) continue;
      if (airborne) {
        if (hit.y <= state.y + 0.08 || hit.toy === ground?.toy)
          state[key] = candidate[key];
      } else {
        const support = nav.support(candidate, radius, state);
        if (support && Math.abs(support.y - state.y) <= 0.65) {
          state[key] = candidate[key];
          state.y = support.y;
        }
      }
    }
    ground = nav.ground(state, radius);
    if (airborne) {
      const prior = state.y;
      state.y += vy * h - 0.5 * 9.81 * h * h;
      vy -= 9.81 * h;
      if (
        ground &&
        vy <= 0 &&
        state.y <= ground.y &&
        prior >= ground.y - 0.05
      ) {
        impact = -vy;
        state.y = ground.y;
        vy = 0;
        airborne = false;
        releaseVelocity = null;
      }
    } else if (ground) {
      if (state.y - ground.y > 0.65) {
        airborne = true;
        vy = 0;
      } else state.y = ground.y;
    }
    if (!Number.isFinite(state.y) || state.y < floor - 3) {
      state = { ...old, y: ground?.y ?? floor };
      airborne = false;
      vy = 0;
      releaseVelocity = null;
    }
    const moved = Math.hypot(state.x - old.x, state.z - old.z);
    if (moved > 0.00001) {
      const yaw = Math.atan2(state.x - old.x, state.z - old.z);
      state.yaw +=
        Math.atan2(Math.sin(yaw - state.yaw), Math.cos(yaw - state.yaw)) *
        (1 - Math.exp(-h * 12));
    }
    frame = { walking: !airborne && moved > 0.0001 };
  }
  return {
    update(dt) {
      if (!isActive()) {
        state = null;
        frame = null;
        releasing = false;
        releaseVelocity = null;
        airborne = false;
        accumulator = 0;
        return;
      }
      accumulator += Math.min(0.1, Math.max(0, dt));
      let steps = 0;
      while (accumulator + 1e-9 >= 1 / 60 && steps++ < 6) {
        accumulator -= 1 / 60;
        step(1 / 60);
      }
    },
    transport(next) {
      if (!isActive()) return null;
      ensure();
      if (next.jump && !lastJump) pendingJump = true;
      lastJump = next.jump;
      input = next;
      return sample();
    },
    requestRelease() {
      releasing = true;
      input = zero;
      pendingJump = false;
      return (
        !airborne &&
        !getNavigation().ground(state || getActor().position, getRadius())?.toy
      );
    },
    get frame() {
      return sample();
    },
    get airborne() {
      return airborne;
    },
    get releasing() {
      return releasing;
    },
    get safeToRelease() {
      return (
        releasing &&
        !airborne &&
        state &&
        Math.abs(state.y - floor) < 0.1 &&
        !getNavigation().ground(state, getRadius())?.toy
      );
    },
    reset() {
      state = null;
      frame = null;
      airborne = false;
      vy = 0;
      impact = 0;
      accumulator = 0;
      pendingJump = false;
      lastJump = false;
      releasing = false;
      releaseVelocity = null;
    },
  };
}
