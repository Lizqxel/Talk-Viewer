"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, DatabaseZap, Loader2, ShieldAlert, TriangleAlert } from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTalkBootstrap } from "@/hooks/use-talk-bootstrap";
import { migrateMockTalksToSheet, type TalkMigrationReport } from "@/lib/talk-migration";

function getFailureMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  return String(value);
}

export function TalkMigrationPageClient() {
  const { data, error, isLoading, reload } = useTalkBootstrap({ fallbackToMock: false });

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<string | null>(null);
  const [failedTalkIds, setFailedTalkIds] = useState<string[]>([]);

  const [autoRunRequested, setAutoRunRequested] = useState(false);
  const hasAutoRunRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setAutoRunRequested(params.get("autorun") === "1");
  }, []);

  const runMigration = useCallback(async () => {
    setIsMigrating(true);
    setMigrationMessage(null);
    setMigrationError(null);
    setMigrationProgress(null);
    setFailedTalkIds([]);

    try {
      const report: TalkMigrationReport = await migrateMockTalksToSheet((progress) => {
        setMigrationProgress(`${progress.index}/${progress.total}: ${progress.talkId}`);
      });

      if (report.failed > 0) {
        setFailedTalkIds(report.failures.map((item) => item.talkId));
        setMigrationError(
          `一括投入は一部失敗しました（成功 ${report.success} / 失敗 ${report.failed}）。最初のエラー: ${report.failures[0]?.message ?? "unknown"}`,
        );
      } else {
        setMigrationMessage(`一括投入が完了しました（${report.success}件）。`);
      }

      await reload();
    } catch (caught) {
      setMigrationError(getFailureMessage(caught));
    } finally {
      setIsMigrating(false);
      setMigrationProgress(null);
    }
  }, [reload]);

  useEffect(() => {
    if (!autoRunRequested || hasAutoRunRef.current || !data?.user?.canEdit) {
      return;
    }

    hasAutoRunRef.current = true;
    void runMigration();
  }, [autoRunRequested, data?.user?.canEdit, runMigration]);

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  if (!data.user?.canEdit) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            一括投入の権限がありません
          </CardTitle>
          <CardDescription>Editors シートで can_edit と is_active を TRUE に設定したアカウントでログインしてください。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/talks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          トーク一覧へ戻る
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            <DatabaseZap className="size-6 text-primary" aria-hidden="true" />
            Talks シート一括投入
          </h1>
          <p className="text-sm text-muted-foreground">現在ブランチのモックトーク（2件）を Apps Script doPost 経由で投入します。</p>
          <p className="mt-1 text-xs text-muted-foreground">実行ユーザー: {data.user.email ?? "unknown"}</p>
        </div>
      </div>

      <Card className="border-border/80 bg-card">
        <CardHeader>
          <CardTitle className="text-base">実行</CardTitle>
          <CardDescription>
            {autoRunRequested
              ? "autorun=1 が指定されているため、ページ表示時に一度だけ自動実行します。"
              : "手動で一括投入を実行できます。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" onClick={() => void runMigration()} disabled={isMigrating}>
            {isMigrating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <DatabaseZap className="size-4" aria-hidden="true" />}
            一括投入を実行
          </Button>

          {migrationProgress ? <p className="text-xs text-muted-foreground">進行中: {migrationProgress}</p> : null}

          {migrationMessage ? (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {migrationMessage}
            </p>
          ) : null}

          {migrationError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {migrationError}
            </p>
          ) : null}

          {failedTalkIds.length > 0 ? (
            <p className="text-xs text-muted-foreground">失敗ID: {failedTalkIds.join(", ")}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
