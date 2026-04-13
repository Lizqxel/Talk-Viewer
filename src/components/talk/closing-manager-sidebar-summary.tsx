"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CLOSING_UPDATED_EVENT,
  INACTIVE_ALERT_MS,
  type ClosingMetrics,
  loadClosingMetrics,
  normalizeByDate,
  saveClosingMetrics,
} from "@/lib/closing-metrics";

export function ClosingManagerSidebarSummary() {
  const [metrics, setMetrics] = useState<ClosingMetrics>(() => loadClosingMetrics(new Date()));
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    saveClosingMetrics(metrics);
  }, [metrics]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setNowMs(now.getTime());
      setMetrics((current) => normalizeByDate(current, now));
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<ClosingMetrics>;
      if (custom.detail) {
        setMetrics(custom.detail);
      }
      setNowMs(Date.now());
    };

    window.addEventListener(CLOSING_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(CLOSING_UPDATED_EVENT, onUpdated);
    };
  }, []);

  const isInactive = (() => {
    if (!metrics.lastClosingAt) {
      return false;
    }

    const last = new Date(metrics.lastClosingAt).getTime();
    if (!Number.isFinite(last)) {
      return false;
    }

    return nowMs - last >= INACTIVE_ALERT_MS;
  })();

  return (
    <Card className="mb-3 border-border/80 bg-card" size="sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold">クロージング管理</CardTitle>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          クロージング文言を話したタイミングで「クロージングした」を押してください。
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">本日クロージング回数</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{metrics.todayCount}回</p>
        </div>
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">月間累計</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{metrics.monthlyCount}回</p>
        </div>

        {isInactive ? (
          <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            ⚠ 15分間クロージングなし
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}