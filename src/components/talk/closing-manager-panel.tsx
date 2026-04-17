"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { useClosingDashboardContext } from "@/components/shared/closing-dashboard-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClosingManagerPanel() {
  const { data } = useTalkBootstrapContext();
  const {
    snapshot,
    ptPerClosing,
    rank,
    closingRate,
    monthlyLevel,
    monthlyTitle,
    isInactive,
    adminAlerts,
    isLoading,
    isRecording,
    error,
    recordClosing,
  } = useClosingDashboardContext();

  const hasAdminAlerts = data?.user?.isAdmin && adminAlerts.length > 0;
  const closingRateLabel = `${(closingRate * 100).toFixed(1)}%`;
  const ptPerClosingLabel = ptPerClosing.toFixed(2);
  const lastClosingLabel = useMemo(() => {
    if (!snapshot.lastClosingAt) {
      return "未記録";
    }

    const date = new Date(snapshot.lastClosingAt);
    if (!Number.isFinite(date.getTime())) {
      return "未記録";
    }

    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [snapshot.lastClosingAt]);

  return (
    <Card className="border-border/80 bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold">クロージング管理</CardTitle>
        <p className="text-xs text-muted-foreground">
          クロージング文言を話したタイミングで「クロージングした」を押してください。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">本日クロージング回数</p>
            <p className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">{snapshot.todayClosingCount}回</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">クロージング単価 (PT/回)</p>
            <p className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              {ptPerClosingLabel} ({rank})
            </p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">全件クロージング率</p>
            <p className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{closingRateLabel}</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">月間累計</p>
            <p className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">{snapshot.monthlyClosingCount}回</p>
            <p className="text-xs text-muted-foreground">
              Lv.{monthlyLevel} / {monthlyTitle}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">本日獲得PT</p>
            <p className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{snapshot.todayAcquiredPt.toFixed(2)}pt</p>
          </div>
          <div className="rounded-lg border bg-muted/25 p-4">
            <p className="text-sm text-muted-foreground">本日対話数</p>
            <p className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{snapshot.todayDialogCount}件</p>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="h-14 w-full text-base font-semibold md:hidden md:h-16 md:text-lg"
          disabled={isRecording || !data?.user?.canEdit}
          onClick={() => {
            void recordClosing();
          }}
        >
          {isRecording ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          クロージングした
        </Button>

        {!data?.user?.canEdit ? (
          <p className="text-xs text-muted-foreground">
            クロージング記録には編集権限が必要です（Editorsシートの can_edit=true / is_active=true）。
          </p>
        ) : null}

        <div className="rounded-lg border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
          最終クロージング時刻: {lastClosingLabel}
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">クロージング指標を取得中...</p> : null}
        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

        {isInactive ? (
          <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive md:text-base">
            ⚠ 15分間クロージングなし
          </div>
        ) : null}

        {hasAdminAlerts ? (
          <div className="rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3">
            <p className="text-sm font-semibold text-destructive">⚠ 管理者向け未稼働アラート</p>
            <ul className="mt-2 space-y-1 text-sm text-destructive">
              {adminAlerts.slice(0, 5).map((item) => (
                <li key={item.userEmail}>
                  {item.userName ? `${item.userName} (${item.userEmail})` : item.userEmail} : {item.minutesWithoutClosing.toFixed(0)}分
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}