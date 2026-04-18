"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, DatabaseZap, Loader2, ShieldAlert, TriangleAlert } from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listMockTalkMigrationCandidates,
  migrateMockTalksToSheet,
  type TalkMigrationCandidate,
  type TalkMigrationReport,
} from "@/lib/talk-migration";

function getFailureMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  return String(value);
}

function formatUserLabel(name: string | undefined, email: string | undefined) {
  const normalizedName = String(name ?? "").trim();
  const normalizedEmail = String(email ?? "").trim();

  if (normalizedName && normalizedEmail) {
    return `${normalizedName} (${normalizedEmail})`;
  }

  return normalizedName || normalizedEmail || "unknown";
}

function parseTalkIdsParam(value: string | null) {
  if (!value) {
    return [];
  }

  const uniqueTalkIds = new Set<string>();

  for (const token of value.split(",")) {
    const normalized = token.trim();
    if (!normalized) {
      continue;
    }

    uniqueTalkIds.add(normalized);
  }

  return Array.from(uniqueTalkIds);
}

export function TalkMigrationPageClient() {
  const { data, error, isLoading, reload } = useTalkBootstrapContext();

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<string | null>(null);
  const [migrationTargetLabel, setMigrationTargetLabel] = useState("一括投入");
  const [failedTalkIds, setFailedTalkIds] = useState<string[]>([]);

  const [candidateTalks, setCandidateTalks] = useState<TalkMigrationCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [selectedTalkId, setSelectedTalkId] = useState("");

  const [autoRunRequested, setAutoRunRequested] = useState(false);
  const [autoRunTargetTalkIds, setAutoRunTargetTalkIds] = useState<string[] | undefined>(undefined);
  const hasAutoRunRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setAutoRunRequested(params.get("autorun") === "1");

    const talkIdsParam = parseTalkIdsParam(params.get("talkIds"));
    const singleTalkIdParam = (params.get("talkId") ?? "").trim();
    const requestedTalkIds =
      talkIdsParam.length > 0
        ? talkIdsParam
        : singleTalkIdParam
          ? [singleTalkIdParam]
          : [];

    setAutoRunTargetTalkIds(requestedTalkIds.length > 0 ? requestedTalkIds : undefined);

    if (requestedTalkIds.length === 1) {
      setSelectedTalkId(requestedTalkIds[0]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      setIsLoadingCandidates(true);
      setCandidateError(null);

      try {
        const candidates = await listMockTalkMigrationCandidates();
        if (cancelled) {
          return;
        }

        setCandidateTalks(candidates);
        setSelectedTalkId((current) => {
          if (current.trim()) {
            return current;
          }

          return candidates[0]?.id ?? "";
        });
      } catch (caught) {
        if (cancelled) {
          return;
        }

        setCandidateError(getFailureMessage(caught));
      } finally {
        if (!cancelled) {
          setIsLoadingCandidates(false);
        }
      }
    };

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  const runMigration = useCallback(async (targetTalkIds?: string[]) => {
    const normalizedTalkIds = (targetTalkIds ?? []).map((talkId) => talkId.trim()).filter(Boolean);
    const isTargeted = normalizedTalkIds.length > 0;

    const targetLabel = isTargeted
      ? normalizedTalkIds.length === 1
        ? `指定投入（${normalizedTalkIds[0]}）`
        : `指定投入（${normalizedTalkIds.length}件）`
      : "一括投入";

    setIsMigrating(true);
    setMigrationTargetLabel(targetLabel);
    setMigrationMessage(null);
    setMigrationError(null);
    setMigrationProgress(null);
    setFailedTalkIds([]);

    try {
      const report: TalkMigrationReport = await migrateMockTalksToSheet({
        talkIds: isTargeted ? normalizedTalkIds : undefined,
        onProgress: (progress) => {
          setMigrationProgress(`${progress.index}/${progress.total}: ${progress.talkId}`);
        },
      });

      if (report.failed > 0) {
        setFailedTalkIds(report.failures.map((item) => item.talkId));
        setMigrationError(
          `${targetLabel}は一部失敗しました（成功 ${report.success} / 失敗 ${report.failed}）。最初のエラー: ${report.failures[0]?.message ?? "unknown"}`,
        );
      } else {
        setMigrationMessage(`${targetLabel}が完了しました（${report.success}件）。`);
      }

      await reload();
    } catch (caught) {
      setMigrationError(getFailureMessage(caught));
    } finally {
      setIsMigrating(false);
      setMigrationProgress(null);
    }
  }, [reload]);

  const runSelectedMigration = useCallback(() => {
    const talkId = selectedTalkId.trim();

    if (!talkId) {
      setMigrationError("投入対象のトークIDを入力してください。");
      return;
    }

    void runMigration([talkId]);
  }, [runMigration, selectedTalkId]);

  const runAllMigration = useCallback(() => {
    void runMigration();
  }, [runMigration]);

  useEffect(() => {
    if (!autoRunRequested || hasAutoRunRef.current || !data?.user?.canEdit || isLoadingCandidates) {
      return;
    }

    hasAutoRunRef.current = true;
    void runMigration(autoRunTargetTalkIds);
  }, [autoRunRequested, autoRunTargetTalkIds, data?.user?.canEdit, isLoadingCandidates, runMigration]);

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  const selectedTalk = candidateTalks.find((candidate) => candidate.id === selectedTalkId.trim());

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
          <p className="text-sm text-muted-foreground">
            現在ブランチのモックトーク（{candidateTalks.length}件）を Apps Script doPost 経由で投入します。
          </p>
          <p className="mt-1 text-xs text-muted-foreground">実行ユーザー: {formatUserLabel(data.user?.name, data.user?.email)}</p>
        </div>
      </div>

      <Card className="border-border/80 bg-card">
        <CardHeader>
          <CardTitle className="text-base">実行</CardTitle>
          <CardDescription>
            {autoRunRequested
              ? autoRunTargetTalkIds && autoRunTargetTalkIds.length > 0
                ? "autorun=1 と talkId / talkIds が指定されているため、対象トークのみ自動実行します。"
                : "autorun=1 が指定されているため、ページ表示時に一度だけ全件実行します。"
              : "トークIDを指定して単体投入、または全件投入を実行できます。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="migration-target-talk-id" className="text-xs font-medium text-foreground">
              投入対象トークID
            </label>
            <Input
              id="migration-target-talk-id"
              list="migration-target-talk-ids"
              value={selectedTalkId}
              onChange={(event) => setSelectedTalkId(event.target.value)}
              placeholder="例: hikari-kojin-standard"
              disabled={isMigrating || isLoadingCandidates}
            />
            <datalist id="migration-target-talk-ids">
              {candidateTalks.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              直接入力も可能です。URLで自動実行する場合は /talks/migrate?autorun=1&amp;talkId=&lt;ID&gt; を使います。
            </p>
            {selectedTalk ? (
              <p className="text-xs text-muted-foreground">選択中: {selectedTalk.title}</p>
            ) : null}
            {candidateError ? <p className="text-xs text-destructive">候補取得エラー: {candidateError}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runSelectedMigration} disabled={isMigrating || !selectedTalkId.trim()}>
              {isMigrating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <DatabaseZap className="size-4" aria-hidden="true" />}
              指定トークを投入
            </Button>
            <Button type="button" variant="outline" onClick={runAllMigration} disabled={isMigrating}>
              全件投入を実行
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">実行モード: {migrationTargetLabel}</p>

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
