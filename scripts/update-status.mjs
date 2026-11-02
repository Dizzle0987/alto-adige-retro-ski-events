import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { calendarState } from "../dist/calendar.mjs";

export const romeClock = (now = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday: parts.weekday };
};

export const shouldRunUpdate = ({ eventName, data, now = new Date() }) => {
  if (eventName === "workflow_dispatch") return true;
  const clock = romeClock(now);
  return eventName === "schedule" && ["Mon", "Wed", "Thu"].includes(clock.weekday)
    && clock.hour >= 8 && data.lastScheduledCheckDate !== clock.date;
};

const eventContent = (events) => JSON.stringify([...events].sort((a, b) => a.id.localeCompare(b.id)),
  (key, value) => key === "checkedAt" ? undefined : value);

export const finalizeUpdate = (data, baseline, { now = new Date(), scheduled = false, mode = "web" } = {}) => {
  const date = romeClock(now).date;
  const { archiveCutoff } = calendarState(now);
  const remainingIds = new Set(data.events.map((event) => event.id));
  // Ignore only automatic expiry of absent archive entries, not edits to retained
  // records or removal of an event still inside the archive window.
  const comparableBaseline = baseline.events.filter((event) => remainingIds.has(event.id)
    || !event.end || event.end >= archiveCutoff);
  const changed = eventContent(data.events) !== eventContent(comparableBaseline);
  return { ...data, lastChecked: date,
    lastWebCheckAt: mode === "replay" ? baseline.lastWebCheckAt : now.toISOString(),
    lastModified: changed ? date : baseline.lastModified || baseline.lastChecked,
    ...(scheduled ? { lastScheduledCheckDate: date } : {}),
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = JSON.parse(await readFile("dist/events.json", "utf8"));
  if (process.argv[2] === "gate") {
    console.log(`run=${shouldRunUpdate({ eventName: process.env.GITHUB_EVENT_NAME, data })}`);
  } else if (process.argv[2] === "finalize") {
    const baseline = JSON.parse(await readFile(process.env.UPDATE_BASELINE_PATH, "utf8"));
    const updated = finalizeUpdate(data, baseline, { scheduled: process.env.GITHUB_EVENT_NAME === "schedule", mode: process.env.UPDATE_MODE || "live" });
    await writeFile("dist/events.json", `${JSON.stringify(updated, null, 2)}\n`);
  } else throw new Error("Expected gate or finalize");
}
