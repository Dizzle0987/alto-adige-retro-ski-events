import test from "node:test";
import assert from "node:assert/strict";
import { extractWebsiteEvents } from "./website-events.mjs";
import { parseWebsiteDates } from "./social-events.mjs";
import { calendarState } from "../dist/calendar.mjs";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const source = { url: "https://example.com/events", venue: "Club · Valley", venueName: "Club" };
test("K1 text announcement has a season-anchored year, not the runtime year", () => {
  const result = extractWebsiteEvents(`<p>The opening hours for the 2026–27 season will be announced shortly (Season Opening: November 20–21).</p>`, { ...source, htmlAdapter: "k1-announcements" });
  assert.equal(result.events[0].start, "2026-11-20");
  assert.equal(result.events[0].end, "2026-11-21");
});
test("K1 never borrows a copyright year for undated opening", () => {
  assert.equal(extractWebsiteEvents("Season Opening: November 20–21. Copyright 2026", { ...source, htmlAdapter: "k1-announcements" }).events.length, 0);
});
const moritzino = (title, day = "06", month = "April", year = "2026", venue = "Club Moritzino") => `<div><h2 class="ect-list-title"><a href="/event/party">${title}</a></h2><div class="ect-list-date"><span class="ev-day">${day}</span><span class="ev-mo">${month}</span><span class="ev-yr">${year}</span></div><div class="ect-venue-details">${venue}</div></div><!-- event-loop-end -->`;
test("HTML calendar cards preserve separate dates and official titles", () => {
  const result = extractWebsiteEvents(moritzino("Vintage Party") + moritzino("Après Ski @ Club Moritzino", "25"), { ...source, htmlAdapter: "moritzino-calendar" });
  assert.deepEqual(result.events.map((event) => event.start), ["2026-04-06", "2026-04-25"]);
  assert.equal(result.events[0].title, "Vintage Party");
});
test("external gigs are not relocated to Moritzino", () => {
  assert.equal(extractWebsiteEvents(moritzino("DJ Party", "06", "April", "2026", "Duino-Aurisina"), { ...source, htmlAdapter: "moritzino-calendar" }).events.length, 0);
});
test("invalid calendar dates and foreign links cannot publish", () => {
  assert.equal(extractWebsiteEvents(moritzino("Vintage Party", "31", "April"), { ...source, htmlAdapter: "moritzino-calendar" }).events.length, 0);
  assert.equal(extractWebsiteEvents(moritzino("Vintage Party").replace('href="/event/party"', 'href="https://foreign.example/party"'), { ...source, htmlAdapter: "moritzino-calendar" }).events.length, 0);
});
test("Winklparade keeps the historical year and its starting time", () => {
  const result = extractWebsiteEvents("31.10.2025 // 18 Uhr // SAND IN TAUFERS, Musikpavillon <h4>Winklparade Madness 2025</h4>", { ...source, htmlAdapter: "winklparade-announcement" });
  assert.equal(result.events[0].start, "2025-10-31");
  assert.equal(result.events[0].hours.start, "18:00");
});
test("generic articles require a local explicit date and verified venue", () => {
  const html = `<footer>Copyright 2026</footer><article><h2>Retro Party</h2><p>20 November 2026</p></article>`;
  assert.equal(extractWebsiteEvents(html, source).events[0].start, "2026-11-20");
  assert.equal(extractWebsiteEvents(html, { url: source.url }).events.length, 0);
  assert.equal(extractWebsiteEvents(`<article><h2>Retro Party</h2></article><p>20 November 2026</p>`, source).events.length, 0);
});
test("ambiguous multi-event dates are held for review", () => {
  const result = extractWebsiteEvents(`<article><h2>Retro Party</h2>20 November 2026 and 27 November 2026</article>`, source);
  assert.equal(result.events.length, 0);
  assert.equal(result.review.length, 1);
});

test("website dates accept history but never infer years or relative dates", () => {
  assert.equal(parseWebsiteDates("20 November 2025").start, "2025-11-20");
  assert.notEqual(parseWebsiteDates("20 November").status, "confirmed");
  assert.notEqual(parseWebsiteDates("tomorrow").status, "confirmed");
  assert.notEqual(parseWebsiteDates("03/04/2026").status, "confirmed");
});

test("website pipeline imports only the rolling archive and is idempotent", async () => {
  const now = calendarState();
  const past = new Date(`${now.today}T12:00:00Z`);
  past.setUTCDate(past.getUTCDate() - 10);
  const old = new Date(past);
  old.setUTCFullYear(old.getUTCFullYear() - 2);
  const card = (date, name) => moritzino(name, String(date.getUTCDate()), new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(date), String(date.getUTCFullYear()));
  const server = createServer((request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(card(past, "Retro Party") + card(old, "Vintage Party"));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const root = await mkdtemp(path.join(tmpdir(), "retro-web-test-"));
    await Promise.all([mkdir(path.join(root, "dist")), mkdir(path.join(root, "data"))]);
    await writeFile(path.join(root, "dist/events.json"), JSON.stringify({ events: [] }));
    await writeFile(path.join(root, "data/discovery-sources.json"), JSON.stringify({ instagram: [], web: [{ ...source, id: "archive", name: "Official club", url: `http://127.0.0.1:${server.address().port}/events`, htmlAdapter: "moritzino-calendar", importArchive: true }] }));
    const run = async () => {
      await promisify(execFile)(process.execPath, [new URL("./discover-events.mjs", import.meta.url).pathname], { env: { ...process.env, APIFY_TOKEN: "", DISCOVERY_DATA_ROOT: root, AUTO_UPDATE_OFFLINE: "0", SOCIAL_REPLAY_PATH: "", APIFY_REPLAY_LAST: "0" } });
      return JSON.parse(await readFile(path.join(root, "dist/events.json"), "utf8"));
    };
    const first = await run();
    assert.equal(first.events.length, 1);
    assert.equal(first.events[0].start, past.toISOString().slice(0, 10));
    assert.deepEqual(await run(), first);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
