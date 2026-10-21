// Personal available coins, separate from player money and owned assets.
// Stable ties keep the podium from shuffling when only the clock changes.
export function richestCats(state) {
  return Object.values(state?.profiles || {})
    .filter(p => p && typeof p.id === "string" && Number.isFinite(p.coins) && p.coins >= 0)
    .sort((a, b) => b.coins - a.coins || (b.earnedTotal || 0) - (a.earnedTotal || 0) || a.id.localeCompare(b.id))
    .slice(0, 3);
}
