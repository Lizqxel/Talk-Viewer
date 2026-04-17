"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  calculateClosingRate,
  calculateMonthlyLevel,
  calculatePtPerClosing,
  createInitialClosingSnapshot,
  CLOSING_UPDATED_EVENT,
  emitClosingMetricsUpdated,
  incrementClosingSnapshot,
  type ClosingDashboardSnapshot,
  type ClosingInactivityAlert,
  isInactiveForAlert,
  normalizeClosingSnapshotByDate,
  resolveClosingRank,
  resolveMonthlyTitle,
} from "@/lib/closing-metrics";
import {
  fetchClosingDashboardByApi,
  fetchClosingInactivityAlertsByApi,
  recordClosingByApi,
  TalkPortalApiError,
  updateClosingStatsByApi,
} from "@/lib/talk-portal-api";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";

const CLOSING_SNAPSHOT_FALLBACK_STORAGE_KEY = "closing-dashboard-snapshot-fallback-v1";

type ClosingDashboardContextValue = {
  snapshot: ClosingDashboardSnapshot;
  ptPerClosing: number;
  closingRate: number;
  rank: "S" | "A" | "B" | "C" | "D";
  monthlyLevel: number;
  monthlyTitle: string;
  isInactive: boolean;
  adminAlerts: ClosingInactivityAlert[];
  error: TalkPortalApiError | null;
  isLoading: boolean;
  isRecording: boolean;
  isRecordingPt: boolean;
  reload: () => Promise<void>;
  recordClosing: () => Promise<void>;
  recordAcquiredPt: (deltaPt?: number) => Promise<void>;
};

const ClosingDashboardContext = createContext<ClosingDashboardContextValue | null>(null);

interface ClosingDashboardProviderProps {
  children: React.ReactNode;
}

function toApiError(caught: unknown) {
  if (caught instanceof TalkPortalApiError) {
    return caught;
  }

  return new TalkPortalApiError(String(caught), 500, "UNKNOWN_ERROR");
}

function isLocalFallbackEligible(error: TalkPortalApiError) {
  return (
    error.code === "NETWORK_ERROR" ||
    error.code === "AUTH_REDIRECT" ||
    error.code === "INVALID_JSON" ||
    error.code === "HTTP_ERROR" ||
    error.code === "POST_NETWORK_ERROR" ||
    error.code === "JSONP_TIMEOUT" ||
    error.code === "JSONP_LOAD_ERROR"
  );
}

function loadFallbackSnapshot(now: Date): ClosingDashboardSnapshot {
  if (typeof window === "undefined") {
    return createInitialClosingSnapshot(now);
  }

  try {
    const raw = window.localStorage.getItem(CLOSING_SNAPSHOT_FALLBACK_STORAGE_KEY);
    if (!raw) {
      return createInitialClosingSnapshot(now);
    }

    const parsed = JSON.parse(raw) as Partial<ClosingDashboardSnapshot>;
    const snapshot: ClosingDashboardSnapshot = {
      dayKey: typeof parsed.dayKey === "string" ? parsed.dayKey : createInitialClosingSnapshot(now).dayKey,
      monthKey:
        typeof parsed.monthKey === "string" ? parsed.monthKey : createInitialClosingSnapshot(now).monthKey,
      todayClosingCount: Number.isFinite(parsed.todayClosingCount) ? Number(parsed.todayClosingCount) : 0,
      todayAcquiredPt: Number.isFinite(parsed.todayAcquiredPt) ? Number(parsed.todayAcquiredPt) : 0,
      todayDialogCount: Number.isFinite(parsed.todayDialogCount) ? Number(parsed.todayDialogCount) : 0,
      monthlyClosingCount: Number.isFinite(parsed.monthlyClosingCount) ? Number(parsed.monthlyClosingCount) : 0,
      lastClosingAt: typeof parsed.lastClosingAt === "string" ? parsed.lastClosingAt : null,
    };

    return normalizeClosingSnapshotByDate(snapshot, now);
  } catch {
    return createInitialClosingSnapshot(now);
  }
}

function saveFallbackSnapshot(snapshot: ClosingDashboardSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLOSING_SNAPSHOT_FALLBACK_STORAGE_KEY, JSON.stringify(snapshot));
}

function assertClosingPersisted(
  before: ClosingDashboardSnapshot,
  after: ClosingDashboardSnapshot,
) {
  if (before.dayKey !== after.dayKey) {
    return;
  }

  const didIncreaseToday = after.todayClosingCount >= before.todayClosingCount + 1;

  if (!didIncreaseToday) {
    throw new TalkPortalApiError(
      "クロージング回数が保存後に増えていません。Apps Script の Webアプリを最新コードで再デプロイし、NEXT_PUBLIC_TALK_API_URL をその /exec URL に更新してください。",
      500,
      "CLOSING_WRITE_NOT_CONFIRMED",
    );
  }
}

function assertPtPersisted(
  before: ClosingDashboardSnapshot,
  after: ClosingDashboardSnapshot,
  expectedDelta: number,
) {
  if (before.dayKey !== after.dayKey) {
    return;
  }

  const minimumExpected = before.todayAcquiredPt + expectedDelta;

  if (after.todayAcquiredPt + Number.EPSILON < minimumExpected) {
    throw new TalkPortalApiError(
      "本日獲得PTが保存後に増えていません。Apps Script の Webアプリを最新コードで再デプロイし、NEXT_PUBLIC_TALK_API_URL をその /exec URL に更新してください。",
      500,
      "PT_WRITE_NOT_CONFIRMED",
    );
  }
}

export function ClosingDashboardProvider({ children }: ClosingDashboardProviderProps) {
  const { data } = useTalkBootstrapContext();
  const [snapshot, setSnapshot] = useState<ClosingDashboardSnapshot>(() => loadFallbackSnapshot(new Date()));
  const [adminAlerts, setAdminAlerts] = useState<ClosingInactivityAlert[]>([]);
  const [error, setError] = useState<TalkPortalApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPt, setIsRecordingPt] = useState(false);

  const reload = useCallback(async () => {
    const nextSnapshot = await fetchClosingDashboardByApi();
    const normalized = normalizeClosingSnapshotByDate(nextSnapshot, new Date());
    setSnapshot(normalized);
    saveFallbackSnapshot(normalized);
    emitClosingMetricsUpdated(normalized);
  }, []);

  const reloadAdminAlerts = useCallback(async () => {
    if (!data?.user?.isAdmin) {
      setAdminAlerts([]);
      return;
    }

    const rows = await fetchClosingInactivityAlertsByApi();
    setAdminAlerts(rows);
  }, [data?.user?.isAdmin]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        await reload();
        await reloadAdminAlerts();
        if (!cancelled) {
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(toApiError(caught));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [reload, reloadAdminAlerts]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          await reload();
          await reloadAdminAlerts();
          setError(null);
        } catch (caught) {
          setError(toApiError(caught));
        }
      })();
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [reload, reloadAdminAlerts]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<ClosingDashboardSnapshot>;
      if (custom.detail) {
        setSnapshot(normalizeClosingSnapshotByDate(custom.detail, new Date()));
      }
    };

    window.addEventListener(CLOSING_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(CLOSING_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const recordClosing = useCallback(async () => {
    if (!data?.user?.canEdit) {
      setError(
        new TalkPortalApiError(
          "編集権限がありません。Editorsシートで can_edit=true / is_active=true を確認してください。",
          403,
          "FORBIDDEN_EDITOR",
        ),
      );
      return;
    }

    setIsRecording(true);
    const previousSnapshot = snapshot;

    const optimisticSnapshot = incrementClosingSnapshot(snapshot, new Date());
    setSnapshot(optimisticSnapshot);
    saveFallbackSnapshot(optimisticSnapshot);
    emitClosingMetricsUpdated(optimisticSnapshot);

    try {
      const result = await recordClosingByApi();
      const normalized = normalizeClosingSnapshotByDate(result.snapshot, new Date());
      assertClosingPersisted(previousSnapshot, normalized);
      setSnapshot(normalized);
      saveFallbackSnapshot(normalized);
      emitClosingMetricsUpdated(normalized);
      setError(null);

      if (data?.user?.isAdmin) {
        await reloadAdminAlerts();
      }
    } catch (caught) {
      const baseError = toApiError(caught);

      if (isLocalFallbackEligible(baseError)) {
        setError(
          new TalkPortalApiError(
            `${baseError.message}（通信要因のため、表示は一時的にローカル状態です）`,
            baseError.status,
            baseError.code,
          ),
        );
      } else {
        setError(baseError);
        try {
          await reload();
        } catch {
          // Keep current error when resync also fails.
        }
      }
    } finally {
      setIsRecording(false);
    }
  }, [data?.user?.canEdit, data?.user?.isAdmin, reload, reloadAdminAlerts, snapshot]);

  const recordAcquiredPt = useCallback(async (deltaPt = 1) => {
    if (!data?.user?.canEdit) {
      setError(
        new TalkPortalApiError(
          "編集権限がありません。Editorsシートで can_edit=true / is_active=true を確認してください。",
          403,
          "FORBIDDEN_EDITOR",
        ),
      );
      return;
    }

    const safeDelta = Number.isFinite(deltaPt) ? Math.max(0, deltaPt) : 0;
    if (safeDelta <= 0) {
      return;
    }

    setIsRecordingPt(true);

    const beforeSnapshot = normalizeClosingSnapshotByDate(snapshot, new Date());
    const optimisticSnapshot: ClosingDashboardSnapshot = {
      ...beforeSnapshot,
      todayAcquiredPt: beforeSnapshot.todayAcquiredPt + safeDelta,
    };

    setSnapshot(optimisticSnapshot);
    saveFallbackSnapshot(optimisticSnapshot);
    emitClosingMetricsUpdated(optimisticSnapshot);

    try {
      const result = await updateClosingStatsByApi({
        mode: "delta",
        deltaAcquiredPt: safeDelta,
      });
      const normalized = normalizeClosingSnapshotByDate(result.snapshot, new Date());
      assertPtPersisted(beforeSnapshot, normalized, safeDelta);
      setSnapshot(normalized);
      saveFallbackSnapshot(normalized);
      emitClosingMetricsUpdated(normalized);
      setError(null);

      if (data?.user?.isAdmin) {
        await reloadAdminAlerts();
      }
    } catch (caught) {
      const baseError = toApiError(caught);

      if (isLocalFallbackEligible(baseError)) {
        setError(
          new TalkPortalApiError(
            `${baseError.message}（通信要因のため、表示は一時的にローカル状態です）`,
            baseError.status,
            baseError.code,
          ),
        );
      } else {
        setError(baseError);
        try {
          await reload();
        } catch {
          // Keep current error when resync also fails.
        }
      }
    } finally {
      setIsRecordingPt(false);
    }
  }, [data?.user?.canEdit, data?.user?.isAdmin, reload, reloadAdminAlerts, snapshot]);

  const ptPerClosing = calculatePtPerClosing(snapshot);
  const closingRate = calculateClosingRate(snapshot);
  const rank = resolveClosingRank(ptPerClosing);
  const monthlyLevel = calculateMonthlyLevel(snapshot.monthlyClosingCount);
  const monthlyTitle = resolveMonthlyTitle(monthlyLevel);
  const isInactive = isInactiveForAlert(snapshot, Date.now());

  const value = useMemo<ClosingDashboardContextValue>(() => {
    return {
      snapshot,
      ptPerClosing,
      closingRate,
      rank,
      monthlyLevel,
      monthlyTitle,
      isInactive,
      adminAlerts,
      error,
      isLoading,
      isRecording,
      isRecordingPt,
      reload,
      recordClosing,
      recordAcquiredPt,
    };
  }, [
    adminAlerts,
    closingRate,
    error,
    isInactive,
    isLoading,
    isRecording,
    isRecordingPt,
    monthlyLevel,
    monthlyTitle,
    ptPerClosing,
    rank,
    recordAcquiredPt,
    recordClosing,
    reload,
    snapshot,
  ]);

  return (
    <ClosingDashboardContext.Provider value={value}>
      {children}
    </ClosingDashboardContext.Provider>
  );
}

export function useClosingDashboardContext() {
  const context = useContext(ClosingDashboardContext);

  if (!context) {
    throw new Error("useClosingDashboardContext must be used within ClosingDashboardProvider");
  }

  return context;
}
