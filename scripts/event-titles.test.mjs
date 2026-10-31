import test from "node:test";
import assert from "node:assert/strict";
import { officialEventTitle } from "../dist/event-titles.mjs";
import { fetchLocalizedTitles } from "./localized-titles.mjs";

test("official event names never get translated without a source variant", () => {
  for (const language of ["it", "de", "en"]) {
    assert.equal(officialEventTitle({ title: "K1 Season Opening" }, language), "K1 Season Opening");
  }
});
test("one source-published name is reused in every interface language", () => {
  const event = { title: "Short name", titles: { it: "Original Event Name", de: "Original Event Name" } };
  assert.equal(officialEventTitle(event, "en"), "Original Event Name");
});
test("different official source variants follow the interface language", () => {
  const event = { title: "Sfilata dei Krampus", titles: { it: "Sfilata dei Krampus", de: "Krampuslauf im Ahrntal" } };
  assert.equal(officialEventTitle(event, "de"), "Krampuslauf im Ahrntal");
  assert.equal(officialEventTitle(event, "en"), "Sfilata dei Krampus");
});

test("verified language counterparts work without automatic hreflang links", async () => {
  const titles = await fetchLocalizedTitles({
    html: "<h1>Sfilata dei Krampus</h1>",
    pageUrl: "https://example.org/it/event",
    titleSources: { de: "https://example.org/de/event" },
    fetchHtml: async (url) => {
      assert.equal(url, "https://example.org/de/event");
      return "<h1>Krampuslauf im Ahrntal</h1>";
    },
  });
  assert.deepEqual(titles, { de: "Krampuslauf im Ahrntal" });
});
