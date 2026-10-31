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

test("unknown start never claims an event is happening now; a start alone is sufficient", () => {
  const calendar = calendarState(new Date("2026-10-31T20:00:00+01:00"));
  assert.equal(eventPeriod({ start: party.start, end: party.end }, calendar), "today");
  assert.equal(eventPeriod({ start: party.start, end: party.end, hours: { start: "18:00" } }, calendar), "ongoing");
});

const giggeralm = { start: "2026-10-31", end: "2026-10-31", hours: { start: "20:00" } };
for (const [instant, expected] of [
  ["2026-10-30T21:00:00+01:00", "upcoming"],
  ["2026-10-31T19:59:00+01:00", "today"],
  ["2026-10-31T20:00:00+01:00", "ongoing"],
  ["2026-11-01T00:01:00+01:00", "ongoing"],
  ["2026-11-01T05:59:00+01:00", "ongoing"],
  ["2026-11-01T06:00:00+01:00", "past"],
]) test(`start-only evening ${instant}: ${expected}`, () => {
  assert.equal(eventPeriod(giggeralm, calendarState(new Date(instant))), expected);
  assert.deepEqual(giggeralm.hours, { start: "20:00" });
});

test("daytime event without finish uses midnight rather than an invented public end", () => {
  const event = { start: party.start, end: party.end, hours: { start: "10:00" } };
  assert.equal(eventPeriod(event, calendarState(new Date("2026-10-31T10:00:00+01:00"))), "ongoing");
  assert.equal(eventPeriod(event, calendarState(new Date("2026-11-01T00:00:00+01:00"))), "past");
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
