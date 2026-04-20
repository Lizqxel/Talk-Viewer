const SCRIPT_ACTIVITY_HIGHLIGHT_ID_PATTERN = /^script-activity-(\d{10,})/;
const LEGACY_HIGHLIGHT_TIMESTAMP = Number.MIN_SAFE_INTEGER;

export const SCRIPT_ACTIVITY_HIGHLIGHT_LEGACY_ID = "script-activity-latest";
export const SCRIPT_ACTIVITY_HIGHLIGHT_ID_PREFIX = "script-activity-";

export function isScriptActivityHighlightId(id: string) {
  const normalizedId = id.trim();

  return (
    normalizedId === SCRIPT_ACTIVITY_HIGHLIGHT_LEGACY_ID ||
    normalizedId.startsWith(SCRIPT_ACTIVITY_HIGHLIGHT_ID_PREFIX)
  );
}

export function extractScriptActivityHighlightTimestamp(id: string) {
  const normalizedId = id.trim();

  if (normalizedId === SCRIPT_ACTIVITY_HIGHLIGHT_LEGACY_ID) {
    return LEGACY_HIGHLIGHT_TIMESTAMP;
  }

  const matched = normalizedId.match(SCRIPT_ACTIVITY_HIGHLIGHT_ID_PATTERN);
  if (!matched) {
    return LEGACY_HIGHLIGHT_TIMESTAMP;
  }

  const timestamp = Number.parseInt(matched[1], 10);
  return Number.isFinite(timestamp) ? timestamp : LEGACY_HIGHLIGHT_TIMESTAMP;
}

export function compareScriptActivityHighlightIdDesc(a: string, b: string) {
  const timestampDiff =
    extractScriptActivityHighlightTimestamp(b) -
    extractScriptActivityHighlightTimestamp(a);
  if (timestampDiff !== 0) {
    return timestampDiff;
  }

  return b.localeCompare(a);
}

export function createScriptActivityHighlightId(occurredAt: Date) {
  const timestamp = occurredAt.getTime();
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${SCRIPT_ACTIVITY_HIGHLIGHT_ID_PREFIX}${timestamp}-${entropy}`;
}