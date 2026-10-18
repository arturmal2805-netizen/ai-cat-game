import { test } from "node:test";
import assert from "node:assert/strict";
import { rideGuests } from "../public/ride-guests.js";
test("guest cameras select only live riders of the clicked attraction without touching their visits", () => {
  const visits = new Map([
      [
        "kitten",
        {
          phase: "activity",
          decision: { action: "ride", activityId: "slide" },
        },
      ],
      [
        "giant",
        {
          phase: "activity",
          decision: { action: "ride", activityId: "slide" },
        },
      ],
      [
        "walker",
        {
          phase: "approach",
          decision: { action: "ride", activityId: "slide" },
        },
      ],
      [
        "swimmer",
        {
          phase: "activity",
          decision: { action: "swim", activityId: "slide" },
        },
      ],
      [
        "other",
        {
          phase: "activity",
          decision: { action: "ride", activityId: "other-slide" },
        },
      ],
    ]),
    before = structuredClone(visits),
    operation = {
      stage: "activity",
      decision: { action: "ride", activityId: "slide" },
    };
  assert.deepEqual(rideGuests("slide", operation, visits), [
    "chichi",
    "kitten",
    "giant",
  ]);
  assert.deepEqual(rideGuests("other-slide", operation, visits), ["other"]);
  operation.stage = "travel";
  assert.deepEqual(rideGuests("slide", operation, visits), ["kitten", "giant"]);
  assert.deepEqual(visits, before);
  visits.delete("kitten");
  visits.delete("giant");
  assert.deepEqual(rideGuests("slide", operation, visits), []);
  assert.deepEqual(rideGuests("empty", null, new Map()), []);
});
