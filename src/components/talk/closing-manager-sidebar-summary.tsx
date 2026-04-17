"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClosingDashboardContext } from "@/components/shared/closing-dashboard-provider";

export function ClosingManagerSidebarSummary() {
  const {
    snapshot,
    ptPerClosing,
    rank,
    closingRate,
    monthlyLevel,
    monthlyTitle,
    isInactive,
    isLoading,
    error,
  } = useClosingDashboardContext();

  const ptPerClosingLabel = ptPerClosing.toFixed(2);
  const closingRateLabel = `${(closingRate * 100).toFixed(1)}%`;

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
          <p className="mt-1 text-2xl font-bold tracking-tight">{snapshot.todayClosingCount}回</p>
        </div>
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">クロージング単価</p>
          <p className="mt-1 text-xl font-bold tracking-tight">
            {ptPerClosingLabel} ({rank})
          </p>
        </div>
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">全件クロージング率</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{closingRateLabel}</p>
        </div>
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs text-muted-foreground">月間累計</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{snapshot.monthlyClosingCount}回</p>
          <p className="text-[11px] text-muted-foreground">
            Lv.{monthlyLevel} / {monthlyTitle}
          </p>
        </div>

        {isLoading ? <p className="text-[11px] text-muted-foreground">読み込み中...</p> : null}
        {error ? <p className="text-[11px] text-destructive">{error.message}</p> : null}

        {isInactive ? (
          <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            ⚠ 15分間クロージングなし
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}