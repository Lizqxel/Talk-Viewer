const jaDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Tokyo",
});

const jaDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Tokyo",
});

function hasTimeInformation(input: string) {
  return /\d{1,2}:\d{2}/.test(input);
}

function parseDate(value: string | Date) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function formatJapaneseDateTime(value: string | Date | null | undefined, fallback = "-") {
  if (!value) {
    return fallback;
  }

  const source = typeof value === "string" ? value.trim() : value;
  if (!source) {
    return fallback;
  }

  const parsed = parseDate(source);
  if (!parsed) {
    return typeof source === "string" ? source : fallback;
  }

  if (typeof source === "string" && !hasTimeInformation(source)) {
    return jaDateFormatter.format(parsed);
  }

  return jaDateTimeFormatter.format(parsed);
}