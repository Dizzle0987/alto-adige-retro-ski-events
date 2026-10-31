// Only source-published variants may change an event's official name.
export const officialEventTitle = (event, language) => {
  const variants = Object.values(event.titles || {}).filter((title) => typeof title === "string" && title.trim());
  const unique = [...new Set(variants)];
  if (unique.length === 1) return unique[0];
  return event.titles?.[language] || event.title;
};
