export const CLOSING_UPDATED_EVENT = "closing-metrics-updated";
export const INACTIVE_ALERT_MS = 15 * 60 * 1000;

export type ClosingRank = "S" | "A" | "B" | "C" | "D";

export type ClosingDashboardSnapshot = {
  dayKey: string;
  monthKey: string;
  todayClosingCount: number;
  todayAcquiredPt: number;
  todayDialogCount: number;
  monthlyClosingCount: number;
  lastClosingAt: string | null;
};

export type ClosingInactivityAlert = {
  userEmail: string;
  userName?: string;
  minutesWithoutClosing: number;
  lastClosingAt: string | null;
};

export type ClosingRankRule = {
  rank: ClosingRank;
  min: number;
};

export type ClosingTitleRule = {
  minLevel: number;
  title: string;
};

export const CLOSING_RANK_RULES: ClosingRankRule[] = [
  { rank: "S", min: 1.5 },
  { rank: "A", min: 1.0 },
  { rank: "B", min: 0.7 },
  { rank: "C", min: 0.4 },
  { rank: "D", min: 0 },
];

export const MONTHLY_LEVEL_STEP = 80;

export const CLOSING_TITLE_RULES: ClosingTitleRule[] = [
  { minLevel: 10, title: "クロージング上級者" },
  { minLevel: 7, title: "クロージング中級者" },
  { minLevel: 4, title: "クロージング初級者" },
  { minLevel: 1, title: "クロージング入門者" },
];

export function formatDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function createInitialClosingSnapshot(now: Date = new Date()): ClosingDashboardSnapshot {
  return {
    dayKey: formatDayKey(now),
    monthKey: formatMonthKey(now),
    todayClosingCount: 0,
    todayAcquiredPt: 0,
    todayDialogCount: 0,
    monthlyClosingCount: 0,
    lastClosingAt: null,
  };
}

export function normalizeClosingSnapshotByDate(
  snapshot: ClosingDashboardSnapshot,
  now: Date = new Date(),
): ClosingDashboardSnapshot {
  const nextDayKey = formatDayKey(now);
  const nextMonthKey = formatMonthKey(now);

  const isNewMonth = snapshot.monthKey !== nextMonthKey;
  const isNewDay = snapshot.dayKey !== nextDayKey;

  if (!isNewMonth && !isNewDay) {
    return snapshot;
  }

  return {
    ...snapshot,
    dayKey: nextDayKey,
    monthKey: nextMonthKey,
    todayClosingCount: isNewDay ? 0 : snapshot.todayClosingCount,
    todayAcquiredPt: isNewDay ? 0 : snapshot.todayAcquiredPt,
    todayDialogCount: isNewDay ? 0 : snapshot.todayDialogCount,
    monthlyClosingCount: isNewMonth ? 0 : snapshot.monthlyClosingCount,
  };
}

export function incrementClosingSnapshot(
  snapshot: ClosingDashboardSnapshot,
  now: Date = new Date(),
): ClosingDashboardSnapshot {
  const normalized = normalizeClosingSnapshotByDate(snapshot, now);

  return {
    ...normalized,
    todayClosingCount: normalized.todayClosingCount + 1,
    monthlyClosingCount: normalized.monthlyClosingCount + 1,
    lastClosingAt: now.toISOString(),
  };
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

export function calculatePtPerClosing(snapshot: ClosingDashboardSnapshot): number {
  return safeDivide(snapshot.todayAcquiredPt, snapshot.todayClosingCount);
}

export function calculateClosingRate(snapshot: ClosingDashboardSnapshot): number {
  return safeDivide(snapshot.todayClosingCount, snapshot.todayDialogCount);
}

export function resolveClosingRank(ptPerClosing: number): ClosingRank {
  const normalized = Number.isFinite(ptPerClosing) ? ptPerClosing : 0;

  for (const rule of CLOSING_RANK_RULES) {
    if (normalized >= rule.min) {
      return rule.rank;
    }
  }

  return "D";
}

export function calculateMonthlyLevel(monthlyClosingCount: number): number {
  const normalized = Math.max(0, Math.floor(monthlyClosingCount));
  return Math.floor(normalized / MONTHLY_LEVEL_STEP) + 1;
}

export function resolveMonthlyTitle(level: number): string {
  for (const rule of CLOSING_TITLE_RULES) {
    if (level >= rule.minLevel) {
      return rule.title;
    }
  }

  return "クロージング入門者";
}

export function isInactiveForAlert(snapshot: ClosingDashboardSnapshot, nowMs = Date.now()): boolean {
  if (!snapshot.lastClosingAt) {
    return false;
  }

  const lastMs = new Date(snapshot.lastClosingAt).getTime();
  if (!Number.isFinite(lastMs)) {
    return false;
  }

  return nowMs - lastMs >= INACTIVE_ALERT_MS;
}

export function emitClosingMetricsUpdated(snapshot: ClosingDashboardSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<ClosingDashboardSnapshot>(CLOSING_UPDATED_EVENT, { detail: snapshot }));
}