import test from "node:test";
import assert from "node:assert/strict";
import { shouldRunUpdate, finalizeUpdate } from "./update-status.mjs";
const run = (iso, data = {}) => shouldRunUpdate({ eventName: "schedule", now: new Date(iso), data });

test("winter and summer triggers tolerate delay but skip early runs", () => {
  assert.equal(run("2026-11-02T06:17:00Z"), false);
  assert.equal(run("2026-11-02T07:17:00Z"), true);
  assert.equal(run("2026-11-02T11:40:00Z"), true);
  assert.equal(run("2027-07-05T06:17:00Z"), true);
  assert.equal(run("2027-07-05T07:17:00Z", { lastScheduledCheckDate: "2027-07-05" }), false);
  assert.equal(run("2026-11-03T07:17:00Z"), false);
});
test("manual requests remain possible after an automatic check", () => {
  assert.equal(shouldRunUpdate({ eventName: "workflow_dispatch", data: { lastScheduledCheckDate: "2026-11-02" } }), true);
});
test("successful unchanged checks update freshness but not event modification date", () => {
  const baseline = { lastChecked: "2026-10-31", events: [{ id: "k1", title: "Opening", checkedAt: "2026-10-31" }] };
  const data = { ...baseline, events: [{ ...baseline.events[0], checkedAt: "2026-11-02" }] };
  const result = finalizeUpdate(data, baseline, { now: new Date("2026-11-02T09:00:00Z"), scheduled: true });
  assert.equal(result.lastModified, "2026-10-31");
  assert.equal(result.lastWebCheckAt, "2026-11-02T09:00:00.000Z");
  assert.equal(result.lastScheduledCheckDate, "2026-11-02");
  assert.equal(run("2026-11-02T12:00:00Z", result), false);
});
test("event edits update modification date; replay never claims a fresh web check", () => {
  const baseline = { lastChecked: "2026-10-31", lastWebCheckAt: "2026-10-31T10:00:00Z", events: [{ id: "k1", title: "Opening" }] };
  const result = finalizeUpdate({ ...baseline, events: [{ id: "k1", title: "New title" }] }, baseline, { now: new Date("2026-11-02T09:00:00Z"), mode: "replay" });
  assert.equal(result.lastModified, "2026-11-02");
  assert.equal(result.lastWebCheckAt, baseline.lastWebCheckAt);
});

test("rolling archive expiry does not count as an event modification", () => {
  const current = { id: "k1", title: "Opening", end: "2026-11-20" };
  const expired = { id: "winklparade", end: "2025-10-31" };
  const baseline = { lastChecked: "2026-10-31", lastModified: "2026-10-30", events: [expired, current] };
  const now = new Date("2026-11-02T09:00:00Z");
  const result = finalizeUpdate({ events: [current] }, baseline, { now });
  assert.equal(result.lastModified, "2026-10-30");
  assert.equal(result.lastChecked, "2026-11-02");
  assert.equal(result.events.length, 1);
  assert.equal(finalizeUpdate({ events: [{ ...current, title: "Changed" }] }, baseline, { now }).lastModified, "2026-11-02");
  assert.equal(finalizeUpdate({ events: [current, { id: "new", end: "2026-12-01" }] }, baseline, { now }).lastModified, "2026-11-02");
});

test("removal within the archive, including the cutoff boundary, still counts", () => {
  for (const end of ["2025-11-02", "2026-11-20"]) {
    const baseline = { lastModified: "2026-10-31", events: [{ id: "removed", end }] };
    assert.equal(finalizeUpdate({ events: [] }, baseline, { now: new Date("2026-11-02T09:00:00Z") }).lastModified, "2026-11-02");
  }
});
