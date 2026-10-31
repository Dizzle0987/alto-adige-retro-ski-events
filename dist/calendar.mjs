export const calendarState = (now = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const year = Number(parts.year);
  // From May onward, look ahead to the next winter; through April, show the current winter.
  const seasonStart = Number(parts.month) >= 5 ? year : year - 1;
  const cutoff = new Date(`${today}T12:00:00Z`);
  cutoff.setUTCFullYear(year - 1);
  return {
    today,
    localMinute: `${today}T${parts.hour}:${parts.minute}`,
    archiveCutoff: cutoff.toISOString().slice(0, 10),
    season: `${seasonStart}/${String(seasonStart + 1).slice(-2)}`,
    seasonStart,
    seasonEnd: seasonStart + 1,
  };
};

export const eventPeriod = (event, calendar) => {
  const today = typeof calendar === "string" ? calendar : calendar.today;
  const now = typeof calendar === "string" ? null : calendar.localMinute;
  const validTime = (value) => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const startTime = validTime(event.hours?.start) ? event.hours.start : null;
  const endTime = validTime(event.hours?.end) ? event.hours.end : null;
  let endDate = event.endsAtDate || event.end;
  if (!event.endsAtDate && startTime && endTime && event.start === event.end && (event.hours?.overnight || endTime <= startTime)) {
    const date = new Date(`${event.end}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    endDate = date.toISOString().slice(0, 10);
  }
  if (endDate < today || (now && endTime && now >= `${endDate}T${endTime}`)) return "past";
  if (event.start > today) return "upcoming";
  // Only claim "ongoing" with a confirmed start and end, using the venue's timezone.
  if (now && startTime && endTime && now >= `${event.start}T${startTime}` && now < `${endDate}T${endTime}`) return "ongoing";
  return "today";
};
