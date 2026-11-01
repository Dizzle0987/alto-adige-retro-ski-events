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

test("location options aggregate named venues and translate named ski facilities", () => {
  const events = [{ venue: "K1" }, { venue: "K1" }, { venue: "Hexenkessel" }, { place: "Area sciistica di Watles" }];
  const options = locationOptions(events, "de", (place) => place === "Area sciistica di Watles" ? "Skigebiet Watles" : place);
  assert.deepEqual(options.map(({ label, count }) => [label, count]), [["Hexenkessel", 1], ["K1", 2], ["Skigebiet Watles", 1]]);
  assert.equal(locationKeyFor(events[3]), options[2].key);
});

test("geography, addresses and generic venues are never location options", () => {
  const events = [
    { place: "Ortisei" }, { place: "Selva di Val Gardena · rifugi e centro paese" },
    { place: "Str. Mëisules 145 · Selva di Val Gardena" }, { place: "Ortisei · Str. Rezia 1" },
    { place: "Dobbiaco / Toblach · area 3 Cime" }, {},
    { venue: { de: "Veranstaltungssaal", it: "Sala manifestazioni", en: "Event hall" }, place: "San Vigilio" },
    { venue: "Str. Rezia 1" }, { venue: "Hütten und Dorfzentrum" },
  ];
  const original = structuredClone(events);
  assert.deepEqual(locationOptions(events, "de"), []);
  for (const event of events) {
    assert.equal(locationKeyFor(event), null);
    assert.equal(locationLabelFor(event, "de"), "");
  }
  assert.deepEqual(events, original);
});

test("filtering the valley limits locations without altering the source records", () => {
  const events = [{ venue: "K1", valley: "kronplatz" }, { venue: "Hexenkessel", valley: "ahrntal" }];
  const options = locationOptions(events.filter((event) => event.valley === "ahrntal"), "it");
  assert.equal(options.length, 1);
  assert.equal(options[0].label, "Hexenkessel");
  assert.equal(events.length, 2);
});
