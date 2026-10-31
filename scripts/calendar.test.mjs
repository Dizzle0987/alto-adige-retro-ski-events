import test from "node:test";
import assert from "node:assert/strict";
import { calendarState, eventPeriod } from "../dist/calendar.mjs";

const party = { start: "2026-10-31", end: "2026-10-31", endsAtDate: "2026-11-01", hours: { start: "18:00", end: "03:00", overnight: true } };
for (const [instant, expected] of [
  ["2026-10-30T20:00:00+01:00", "upcoming"],
  ["2026-10-31T00:00:00+01:00", "today"],
  ["2026-10-31T17:59:00+01:00", "today"],
  ["2026-10-31T18:00:00+01:00", "ongoing"],
  ["2026-10-31T23:59:00+01:00", "ongoing"],
  ["2026-11-01T02:59:00+01:00", "ongoing"],
  ["2026-11-01T03:00:00+01:00", "past"],
]) test(`K1 ${instant}: ${expected}`, () => assert.equal(eventPeriod(party, calendarState(new Date(instant))), expected));

test("unknown hours or end time never claim the event is happening now", () => {
  const calendar = calendarState(new Date("2026-10-31T20:00:00+01:00"));
  assert.equal(eventPeriod({ start: party.start, end: party.end }, calendar), "today");
  assert.equal(eventPeriod({ start: party.start, end: party.end, hours: { start: "18:00" } }, calendar), "today");
});
test("same-day event moves to archive at its confirmed finish", () => {
  const event = { start: party.start, end: party.end, hours: { start: "10:00", end: "12:00" } };
  assert.equal(eventPeriod(event, calendarState(new Date("2026-10-31T11:59:00+01:00"))), "ongoing");
  assert.equal(eventPeriod(event, calendarState(new Date("2026-10-31T12:00:00+01:00"))), "past");
});
test("overnight ending can be inferred without an explicit end date", () => {
  const { endsAtDate, ...event } = party;
  assert.equal(eventPeriod(event, calendarState(new Date("2026-11-01T02:00:00+01:00"))), "ongoing");
});
test("calendar uses Rome time including summer time and midnight", () => {
  assert.equal(calendarState(new Date("2027-06-01T16:00:00Z")).localMinute, "2027-06-01T18:00");
  assert.equal(calendarState(new Date("2026-10-31T23:00:00Z")).localMinute, "2026-11-01T00:00");
});
