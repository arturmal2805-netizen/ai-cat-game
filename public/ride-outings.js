// Local resident autonomy uses the existing physical interaction runtime.
// It never invents a paid action or writes a second save format.
export function createRideOutings() {
  let next = 0,
    cursor = 0;
  const tried = new Map(),
    used = new Map();
  return {
    step(now, { cats, objects, visits, reserved, blocked, start }) {
      if (now < next || visits.size >= 3) return null;
      next = now + 1400;
      const residents = [...cats.values()];
      for (let j = 0; j < residents.length; j++) {
        const n = residents[(cursor + j) % residents.length],
          id = n.profile.id;
        if (now < (tried.get(id) || 0) || blocked(n)) continue;
        tried.set(id, now + 6500);
        let chosen = null,
          score = Infinity;
        for (const g of objects.values()) {
          const d = g.userData;
          if (
            !d.built ||
            !d.rideFrame ||
            !d.slideWater ||
            d.placement?.biome !== n.profile.biome ||
            reserved(d.placementId)
          )
            continue;
          const candidate =
            (used.get(d.placementId) || -1000000) +
            g.position.distanceTo(n.carrier.position) * 5;
          if (candidate < score) {
            score = candidate;
            chosen = g;
          }
        }
        if (
          chosen &&
          start(id, {
            mood: "happy",
            action: "ride",
            activityId: chosen.userData.placementId,
            thought: "Прокачусь на водной горке!",
          })
        ) {
          used.set(chosen.userData.placementId, now);
          tried.set(id, now + 55000);
          cursor = (cursor + j + 1) % residents.length;
          return { catId: id, activityId: chosen.userData.placementId };
        }
      }
      return null;
    },
  };
}
