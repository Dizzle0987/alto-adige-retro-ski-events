import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseSocialDates, parseSocialTimes, assessInstagramPost, officialInstagramSource, sameSocialEvent, mergeSocialAnnouncement } from "./social-events.mjs";
import { freeBudgetDecision } from "./apify-budget.mjs";

const publishedAt = "2026-10-20T10:00:00Z";
for (const caption of ["Retro Party 20.11.2026", "Retro Party 20/11/2026", "Retro Party 11/20/2026", "Retro Party 2026-11-20", "Retro Party 20 novembre 2026", "Retro Party 20. November 2026", "Retro Party November 20th, 2026", "Retro Party 𝟐𝟎.𝟏𝟏.𝟐𝟎𝟐𝟔"]) {
  test(`same date: ${caption}`, () => assert.equal(parseSocialDates(caption, publishedAt).start, "2026-11-20"));
}
test("multiday numeric range", () => assert.deepEqual(
  Object.values(parseSocialDates("Retro Party 20.–21.11.2026", publishedAt)).slice(1, 3), ["2026-11-20", "2026-11-21"]));
test("named English range", () => assert.equal(parseSocialDates("Retro Party November 20–21, 2026", publishedAt).end, "2026-11-21"));
test("named German range", () => assert.equal(parseSocialDates("Retro Party 20.–21. November 2026", publishedAt).end, "2026-11-21"));
test("missing year rolls into next January", () => assert.equal(parseSocialDates("Retro Party 2 gennaio", "2026-12-20T10:00:00Z").start, "2027-01-02"));
for (const caption of ["Retro Party 31 novembre 2026", "Retro Party November 31st", "Retro Party 29 febbraio 2027", "Retro Party 03/04/2027", "Retro Party 20.11.25", "Retro Party 20 novembre e 27 novembre", "Retro Party next Saturday", "Throwback Retro Party 20 novembre 2026", "Retro Party Vorverkauf 20.11.2026", "Retro Party sabato 20.11.2026"]) {
  test(`hold uncertain date: ${caption}`, () => assert.equal(parseSocialDates(caption, publishedAt).status, "review"));
}
test("relative date follows publication in Rome", () => assert.equal(parseSocialDates("Retro Party domani", "2026-10-20T23:30:00Z").start, "2026-10-22"));
test("relative date conflicts with explicit date", () => assert.equal(parseSocialDates("Retro Party domani 20 novembre 2026", publishedAt).reason, "relative-date-conflict"));
test("missing publication timestamp is not epoch", () => assert.equal(parseSocialDates("Retro Party domani", null).status, "review"));
test("hours do not become dates", () => assert.equal(parseSocialDates("Retro Party 20.11.2026 ab 18.00 Uhr", publishedAt).start, "2026-11-20"));
test("overnight times", () => assert.deepEqual(parseSocialTimes("18:00 bis 03:00 Uhr"), { start: "18:00", end: "03:00", overnight: true }));
test("AM PM times", () => assert.deepEqual(parseSocialTimes("6 pm to 3 am"), { start: "18:00", end: "03:00", overnight: true }));
test("multiple indoor/outdoor schedules are not flattened", () => assert.equal(parseSocialTimes("Outdoor 18:00 bis 00:00 Uhr Indoor 18:00 bis 03:00 Uhr"), null));
const sources = [{ id: "venue", name: "K1", url: "https://www.instagram.com/k1.kronplatz/", venue: "K1 Reischach", venueAliases: ["K1"], autoPublish: true }];
const item = { ownerUsername: "k1.kronplatz", ownerId: "123", url: "https://www.instagram.com/p/Example/", timestamp: publishedAt, caption: "Retro Party\n20.11.2026", locationName: "K1 Reischach" };
test("official post with date and no hour is publishable", () => {
  const result = assessInstagramPost(item, sources);
  assert.equal(result.status, "confirmed"); assert.equal(result.hours, null); assert.equal(result.evidence.ownerId, "123");
});
test("private author cannot use official input URL as fallback", () => assert.equal(assessInstagramPost({ ...item, ownerUsername: "random.person", inputUrl: sources[0].url }, sources).reason, "unverified-author"));
test("missing author rejected", () => assert.equal(officialInstagramSource({ ...item, ownerUsername: undefined, inputUrl: sources[0].url }, sources), null));
test("pinned author ID mismatch rejected", () => assert.equal(officialInstagramSource(item, [{ ...sources[0], ownerId: "999" }]), null));
test("wrong profile input rejected", () => assert.equal(officialInstagramSource({ ...item, inputUrl: "https://www.instagram.com/other/" }, sources), null));
test("lookalike host rejected", () => assert.equal(assessInstagramPost({ ...item, url: "https://instagram.com.example.org/p/Example/" }, sources).status, "rejected"));
test("collaborations reviewed", () => assert.equal(assessInstagramPost({ ...item, coauthorProducers: [{ id: "other" }] }, sources).reason, "repost-or-collaboration"));
test("other venue reviewed", () => assert.equal(assessInstagramPost({ ...item, locationName: "Elsewhere" }, sources).reason, "venue-conflict"));
test("official account promoting another venue is held", () => assert.equal(assessInstagramPost({ ...item, caption: "Retro Party at Other Bar\n20.11.2026", locationName: undefined }, sources).reason, "explicit-venue-needs-review"));
test("account identity alone cannot establish the venue", () => assert.equal(assessInstagramPost({ ...item, locationName: undefined }, sources).reason, "missing-venue-evidence"));
test("regional tourism profile cannot assume an event venue", () => assert.equal(assessInstagramPost(item, [{ ...sources[0], autoPublish: false }]).reason, "venue-not-verified"));
test("promotional post without date stays out", () => assert.equal(assessInstagramPost({ ...item, caption: "Best après ski party vibes!" }, sources).status, "review"));
test("duplicate announcement adds hours without duplicating evidence", () => {
  const candidate = assessInstagramPost({ ...item, caption: "Retro Party\n20.11.2026 ab 18:00 Uhr" }, sources);
  const event = { title: "Retro Party", start: candidate.start, end: candidate.end, socialSourceId: "venue", provenance: [candidate.evidence] };
  assert.equal(sameSocialEvent(event, candidate), true);
  const merged = mergeSocialAnnouncement(event, candidate);
  assert.equal(merged.hours.start, "18:00"); assert.equal(merged.provenance.length, 1);
  assert.equal(sameSocialEvent({ ...event, socialSourceId: "different-venue" }, candidate), false);
});
test("historical K1 captions: invalid date held, exact date extracted", async () => {
  const data = JSON.parse(await readFile(new URL("../data/event-candidates.json", import.meta.url), "utf8"));
  const bad = data.candidates.find((entry) => entry.excerpt?.includes("November 31st"));
  const good = data.candidates.find((entry) => entry.excerpt?.includes("𝟑𝟏.𝟏𝟎.𝟐𝟎𝟐𝟔"));
  if (bad) assert.equal(parseSocialDates(bad.excerpt, bad.publishedAt).status, "review");
  if (good) assert.equal(parseSocialDates(good.excerpt, good.publishedAt).start, "2026-10-31");
});
const free = { plan: { tier: "FREE", monthlyBasePriceUsd: 0, monthlyUsageCreditsUsd: 5 } };
test("free credit allowed with reserve", () => assert.equal(freeBudgetDecision(free, { totalUsageCreditsUsdAfterVolumeDiscount: 2 }).allowed, true));
test("credit reserve prevents new actor", () => assert.equal(freeBudgetDecision(free, { totalUsageCreditsUsdAfterVolumeDiscount: 3.9 }).allowed, false));
test("unknown budget and paid plans fail closed", () => {
  assert.equal(freeBudgetDecision(free, {}).allowed, false);
  assert.equal(freeBudgetDecision({ plan: { tier: "STARTER", monthlyBasePriceUsd: 19 } }, {}).allowed, false);
});
