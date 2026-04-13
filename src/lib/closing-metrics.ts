export const CLOSING_STORAGE_KEY = "closing-manager-metrics-v1";
export const CLOSING_UPDATED_EVENT = "closing-metrics-updated";

export const INACTIVE_ALERT_MS = 1 * 60 * 1000;

export type ClosingMetrics = {
  dayKey: string;
  monthKey: string;
  todayCount: number;
  monthlyCount: number;
  lastClosingAt: string | null;
};

function formatDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function createInitialMetrics(now: Date): ClosingMetrics {
  return {
    dayKey: formatDayKey(now),
    monthKey: formatMonthKey(now),
    todayCount: 0,
    monthlyCount: 0,
    lastClosingAt: null,
  };
}

// 日付・月が変わったタイミングで値を正規化する。
export function normalizeByDate(metrics: ClosingMetrics, now: Date): ClosingMetrics {
  const nextDayKey = formatDayKey(now);
  const nextMonthKey = formatMonthKey(now);

  const isNewMonth = metrics.monthKey !== nextMonthKey;
  const isNewDay = metrics.dayKey !== nextDayKey;

  if (!isNewMonth && !isNewDay) {
    return metrics;
  }

  return {
    dayKey: nextDayKey,
    monthKey: nextMonthKey,
    todayCount: isNewDay ? 0 : metrics.todayCount,
    monthlyCount: isNewMonth ? 0 : metrics.monthlyCount,
    lastClosingAt: metrics.lastClosingAt,
  };
}

export function loadClosingMetrics(now: Date = new Date()): ClosingMetrics {
  if (typeof window === "undefined") {
    return createInitialMetrics(now);
  }

  try {
    const raw = window.localStorage.getItem(CLOSING_STORAGE_KEY);
    if (!raw) {
      return createInitialMetrics(now);
    }

    const parsed = JSON.parse(raw) as Partial<ClosingMetrics>;
    const base: ClosingMetrics = {
      dayKey: typeof parsed.dayKey === "string" ? parsed.dayKey : formatDayKey(now),
      monthKey: typeof parsed.monthKey === "string" ? parsed.monthKey : formatMonthKey(now),
      todayCount: Number.isFinite(parsed.todayCount) ? Number(parsed.todayCount) : 0,
      monthlyCount: Number.isFinite(parsed.monthlyCount) ? Number(parsed.monthlyCount) : 0,
      lastClosingAt: typeof parsed.lastClosingAt === "string" ? parsed.lastClosingAt : null,
    };

    return normalizeByDate(base, now);
  } catch {
    return createInitialMetrics(now);
  }
}

export function saveClosingMetrics(metrics: ClosingMetrics) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLOSING_STORAGE_KEY, JSON.stringify(metrics));
}

export function incrementClosingCount(now: Date = new Date()): ClosingMetrics {
  const normalized = normalizeByDate(loadClosingMetrics(now), now);
  const next: ClosingMetrics = {
    ...normalized,
    todayCount: normalized.todayCount + 1,
    monthlyCount: normalized.monthlyCount + 1,
    lastClosingAt: now.toISOString(),
  };

  saveClosingMetrics(next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CLOSING_UPDATED_EVENT, { detail: next }));
  }

  return next;
}