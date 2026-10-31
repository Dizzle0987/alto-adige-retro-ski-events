import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchLocalizedTitles } from "./localized-titles.mjs";
import { calendarState } from "../dist/calendar.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const eventsPath = path.join(repositoryRoot, "dist", "events.json");
const offline = process.env.AUTO_UPDATE_OFFLINE === "1";
const monthLabels = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];

const todayInRome = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const cleanText = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const titleScore = (expected, candidate) => {
  const expectedTokens = new Set(cleanText(expected).split(" ").filter((token) => token.length > 2));
  const candidateTokens = new Set(cleanText(candidate).split(" ").filter((token) => token.length > 2));
  if (!expectedTokens.size || !candidateTokens.size) return 0;
  const matches = [...expectedTokens].filter((token) => candidateTokens.has(token)).length;
  return matches / expectedTokens.size;
};

const isEventType = (type) => {
  const types = Array.isArray(type) ? type : [type];
  return types.some((value) => typeof value === "string" && value.toLowerCase() === "event");
};

const collectEvents = (value, results = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvents(item, results));
  } else if (value && typeof value === "object") {
    if (isEventType(value["@type"])) results.push(value);
    Object.values(value).forEach((item) => collectEvents(item, results));
  }
  return results;
};

const parseJsonLdEvents = (html) => {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const events = [];
  for (const script of scripts) {
    try {
      collectEvents(JSON.parse(script[1].trim()), events);
    } catch {
      // Ignore malformed metadata and retain the last verified event data.
    }
  }
  return events;
};

const isoDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const labelsFor = (startIso, endIso) => {
  const start = new Date(`${startIso}T12:00:00Z`);
  const end = new Date(`${endIso}T12:00:00Z`);
  const startDay = String(start.getUTCDate()).padStart(2, "0");
  const endDay = String(end.getUTCDate()).padStart(2, "0");
  const startMonth = monthLabels[start.getUTCMonth()];
  const endMonth = monthLabels[end.getUTCMonth()];
  const sameDay = startIso === endIso;
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return {
    dateLabel: sameDay ? startDay : `${startDay}–${endDay}`,
    monthLabel: sameMonth ? startMonth : `${startMonth}/${endMonth}`,
    year: start.getUTCFullYear() === end.getUTCFullYear()
      ? String(start.getUTCFullYear())
      : `${start.getUTCFullYear()}/${String(end.getUTCFullYear()).slice(-2)}`
  };
};

const fetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "RetroSkiEventsBot/1.0 (+https://github.com/Dizzle0987/alto-adige-retro-ski-events)",
      "accept-language": "it-IT,it;q=0.9,de;q=0.8,en;q=0.7"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { html: await response.text(), url: response.url };
};

const sourceUpdate = async (event, today) => {
  // Listing/homepage titles belong to the website, not to its event announcements.
  // These events are rediscovered by the HTML adapters instead.
  if (event.websiteExtraction) return { event, verified: false, changed: false };
  const page = await fetchPage(event.source);
  const html = page.html;
  const localizedTitles = await fetchLocalizedTitles({
    html,
    pageUrl: page.url,
    fetchHtml: async (url) => (await fetchPage(url)).html
  });
  const titles = { ...(event.titles || {}), ...localizedTitles };
  const titlesChanged = JSON.stringify(titles) !== JSON.stringify(event.titles || {});
  const eventWithTitles = Object.keys(titles).length ? { ...event, titles } : event;
  const candidates = parseJsonLdEvents(html)
    .map((candidate) => ({
      candidate,
      start: isoDate(candidate.startDate),
      end: isoDate(candidate.endDate || candidate.startDate),
      score: titleScore(event.title, candidate.name || "")
    }))
    .filter((item) => item.start && item.end && item.end >= today && item.score >= 0.34)
    .sort((a, b) => b.score - a.score || a.start.localeCompare(b.start));

  if (!candidates.length) return { event: eventWithTitles, verified: true, changed: titlesChanged };
  const best = candidates[0];
  const updated = {
    ...eventWithTitles,
    start: best.start,
    end: best.end,
    ...labelsFor(best.start, best.end)
  };
  return {
    event: updated,
    verified: true,
    changed: titlesChanged || updated.start !== event.start || updated.end !== event.end
  };
};

const data = JSON.parse(await readFile(eventsPath, "utf8"));
const today = todayInRome();
const { archiveCutoff } = calendarState();
let verified = 0;
let changed = 0;
let unavailable = 0;
const refreshedEvents = [];

for (const event of data.events) {
  if (event.end < archiveCutoff) continue;
  if (event.end < today) {
    refreshedEvents.push(event);
    continue;
  }
  if (offline) {
    refreshedEvents.push(event);
    continue;
  }
  try {
    const result = await sourceUpdate(event, today);
    refreshedEvents.push(result.event);
    verified += result.verified ? 1 : 0;
    changed += result.changed ? 1 : 0;
  } catch (error) {
    unavailable += 1;
    refreshedEvents.push(event);
    console.warn(`[source unavailable] ${event.id}: ${error.message}`);
  }
}

data.lastChecked = today;
data.events = refreshedEvents.sort((a, b) => a.start.localeCompare(b.start));
await writeFile(eventsPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Checked ${data.events.length} events: verified=${verified}, changes=${changed}, unavailable=${unavailable}, last_checked=${today}`);
