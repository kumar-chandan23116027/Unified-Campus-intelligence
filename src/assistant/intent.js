export const SOURCE_KEYWORDS = {
  library: ["book", "borrow", "copy", "copies", "library", "manual", "read", "shelf", "title", "isbn"],
  cafeteria: ["breakfast", "cafe", "cafeteria", "dinner", "eat", "food", "lunch", "menu", "snack", "vegan", "calorie"],
  events: ["club", "event", "fest", "hackathon", "session", "tech fest", "today", "tomorrow", "volunteer", "workshop"],
  academics: ["academic", "attendance", "deadline", "exam", "handbook", "policy", "registration", "scholarship", "submission", "timetable"],
  hostel: ["hostel", "warden", "room", "occupancy", "laundry", "night out", "mess", "residence"]
};

export function detectIntents(message, availableSources) {
  const normalized = String(message || "").toLowerCase();
  const matched = availableSources.filter((source) => {
    const keywords = SOURCE_KEYWORDS[source.id] || [];
    return keywords.some((keyword) => normalized.includes(keyword));
  });

  if (matched.length > 0) return matched;
  return [];
}

export function isUnsupportedProvider(provider) {
  return !provider || !["openai", "azure-openai"].includes(provider.toLowerCase());
}
