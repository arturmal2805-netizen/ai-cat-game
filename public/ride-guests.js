// The live simulation owns these visits; camera selection never starts a ride,
// changes a reservation or writes the shared player save.
export function rideGuests(activityId, operation, visits) {
  const guests = [];
  if (
    operation?.stage === "activity" &&
    operation.decision?.action === "ride" &&
    operation.decision.activityId === activityId
  )
    guests.push("chichi");
  for (const [id, visit] of visits || [])
    if (
      visit.phase === "activity" &&
      visit.decision?.action === "ride" &&
      visit.decision.activityId === activityId
    )
      guests.push(id);
  return guests;
}
