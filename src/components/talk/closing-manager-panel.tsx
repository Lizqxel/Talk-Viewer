"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CLOSING_UPDATED_EVENT,
  INACTIVE_ALERT_MS,
  type ClosingMetrics,
  incrementClosingCount,
  loadClosingMetrics,
  normalizeByDate,
  saveClosingMetrics,
} from "@/lib/closing-metrics";

export function ClosingManagerPanel() {
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

  const handleClosing = () => {
    const next = incrementClosingCount(new Date());
    setMetrics(next);
    setNowMs(Date.now());
  };

  return (
    <Card className="border-border/80 bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">クロージング管理</CardTitle>
        <p className="text-xs text-muted-foreground">
          クロージング文言を話したタイミングで「クロージングした」を押してください。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">本日クロージング回数</p>
            <p className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">{metrics.todayCount}回</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">月間累計</p>
            <p className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">{metrics.monthlyCount}回</p>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="h-14 w-full text-base font-semibold md:hidden md:h-16 md:text-lg"
          onClick={handleClosing}
        >
          クロージングした
        </Button>

        {isInactive ? (
          <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive md:text-base">
            ⚠ 15分間クロージングなし
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}