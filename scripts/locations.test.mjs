import test from "node:test";
import assert from "node:assert/strict";
import { locationKeyFor, locationLabelFor, locationOptions } from "../dist/locations.mjs";

test("location identity stays stable across languages and repeated events", () => {
  const event = { venue: { de: "Bergstation", it: "Stazione a monte", en: "Mountain station" } };
  const key = locationKeyFor(event);
  for (const language of ["de", "it", "en"]) {
    assert.equal(locationOptions([event], language)[0].key, key);
    assert.equal(locationLabelFor(event, language), event.venue[language]);
  }
  assert.equal(locationKeyFor({ venue: " K1  " }), locationKeyFor({ venue: "k1" }));
});

test("location options aggregate venues, count events and translate fallback places", () => {
  const events = [{ venue: "K1" }, { venue: "K1" }, { venue: "Hexenkessel" }, { place: "Ortisei" }];
  const options = locationOptions(events, "de", (place) => place === "Ortisei" ? "St. Ulrich" : place);
  assert.deepEqual(options.map(({ label, count }) => [label, count]), [["Hexenkessel", 1], ["K1", 2], ["St. Ulrich", 1]]);
  assert.equal(locationKeyFor({ place: "Ortisei" }), options[2].key);
});

test("filtering the valley limits locations without altering the source records", () => {
  const events = [{ venue: "K1", valley: "kronplatz" }, { venue: "Hexenkessel", valley: "ahrntal" }];
  const options = locationOptions(events.filter((event) => event.valley === "ahrntal"), "it");
  assert.equal(options.length, 1);
  assert.equal(options[0].label, "Hexenkessel");
  assert.equal(events.length, 2);
});
