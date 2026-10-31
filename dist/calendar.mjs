export const calendarState = (now = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const year = Number(parts.year);
  // From May onward, look ahead to the next winter; through April, show the current winter.
  const seasonStart = Number(parts.month) >= 5 ? year : year - 1;
  const cutoff = new Date(`${today}T12:00:00Z`);
  cutoff.setUTCFullYear(year - 1);
  return {
    today,
    archiveCutoff: cutoff.toISOString().slice(0, 10),
    season: `${seasonStart}/${String(seasonStart + 1).slice(-2)}`,
    seasonStart,
    seasonEnd: seasonStart + 1,
  };
};

export const eventPeriod = (event, today) => event.end < today
  ? "past" : event.start <= today ? "ongoing" : "upcoming";
