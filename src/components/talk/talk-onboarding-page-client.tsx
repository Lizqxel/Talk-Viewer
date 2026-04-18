"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  FilePlus2,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { publishScriptActivityHighlightByApi, updateTalkByApi } from "@/lib/talk-portal-api";
import {
  type Talk,
  type TalkDifficulty,
  type TalkNode,
  type TalkProduct,
  type TalkScene,
} from "@/types/talk";

const TALK_ID_LENGTH = 16;
const TALK_ID_MAX_ATTEMPTS = 40;
const DEFAULT_PRODUCT: TalkProduct = "hikari";
const UNSET_SCENE = "" as TalkScene;
const UNSET_DIFFICULTY = "" as TalkDifficulty;

interface OnboardingDraft {
  talkId: string;
  title: string;
  categoryName: string;
  summary: string;
}

function normalizeSlugValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDateLabel(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toErrorMessage(caught: unknown) {
  if (caught instanceof Error) {
    return caught.message;
  }

  return String(caught);
}

function formatUserLabel(name: string | undefined, email: string | undefined) {
  const normalizedName = String(name ?? "").trim();
  const normalizedEmail = String(email ?? "").trim();

  if (normalizedName && normalizedEmail) {
    return `${normalizedName} (${normalizedEmail})`;
  }

  return normalizedName || normalizedEmail || "unknown";
}

function buildTalkEditorHref(talkId: string) {
  return `/talks/editor?talkId=${encodeURIComponent(talkId)}`;
}

function createRandomDigits(length: number) {
  if (length <= 0) {
    return "";
  }

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => String(byte % 10)).join("");
  }

  return Array.from({ length }, () => String(Math.floor(Math.random() * 10))).join("");
}

function createUniqueNumericTalkId(existingIds: Set<string>) {
  for (let attempt = 0; attempt < TALK_ID_MAX_ATTEMPTS; attempt += 1) {
    const timestampPart = String(Date.now()).slice(-10);
    const randomPart = createRandomDigits(Math.max(0, TALK_ID_LENGTH - timestampPart.length));
    const candidate = `${timestampPart}${randomPart}`.slice(0, TALK_ID_LENGTH);

    if (candidate && !existingIds.has(candidate)) {
      return candidate;
    }
  }

  const fallback = `${Date.now()}${createRandomDigits(8)}`.replace(/\D/g, "");
  return fallback.slice(0, TALK_ID_LENGTH).padEnd(TALK_ID_LENGTH, "0");
}

function createInitialDraft(existingIds: Set<string>): OnboardingDraft {
  return {
    talkId: createUniqueNumericTalkId(existingIds),
    title: "",
    categoryName: "",
    summary: "",
  };
}

function createBootstrapNode(talkId: string, summary: string): TalkNode {
  const nodeId = `node-${talkId}`;
  const normalizedSummary = summary.trim() || "編集画面で本文を入力してください";

  return {
    id: nodeId,
    title: "導入ノード",
    kind: "opening",
    lines: [normalizedSummary],
    readAloudScript: [normalizedSummary],
    intent: "編集画面で更新してください",
    ngExamples: [],
    tips: [],
    nextNodeIds: [],
  };
}

export function TalkOnboardingPageClient() {
  const { data, error, isLoading, reload } = useTalkBootstrapContext();
  const canCreateTalk = Boolean(data?.user?.canEdit || data?.user?.isAdmin);

  const existingTalkIds = useMemo(
    () => new Set((data?.talks ?? []).map((talk) => String(talk.id))),
    [data],
  );

  const [draft, setDraft] = useState<OnboardingDraft>({
    talkId: "",
    title: "",
    categoryName: "",
    summary: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdTalkId, setCreatedTalkId] = useState<string | null>(null);

  useEffect(() => {
    if (!data || draft.talkId) {
      return;
    }

    setDraft(createInitialDraft(existingTalkIds));
  }, [data, draft.talkId, existingTalkIds]);

  const updateDraft = <K extends keyof OnboardingDraft>(
    key: K,
    value: OnboardingDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
    setSaveError(null);
    setCreatedTalkId(null);
  };

  const regenerateTalkId = () => {
    updateDraft("talkId", createUniqueNumericTalkId(existingTalkIds));
  };

  const resetDraft = () => {
    setDraft(createInitialDraft(existingTalkIds));
    setSaveMessage(null);
    setSaveError(null);
    setCreatedTalkId(null);
  };

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  if (!canCreateTalk) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            導入権限がありません
          </CardTitle>
          <CardDescription>
            編集者または管理者アカウントでログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/talks">トーク一覧へ戻る</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaveError(null);
    setSaveMessage(null);

    const normalizedTalkId = draft.talkId.trim();
    if (!normalizedTalkId || !/^\d+$/.test(normalizedTalkId)) {
      setSaveError("トークIDの採番に失敗しました。再生成してください。");
      return;
    }

    if (existingTalkIds.has(normalizedTalkId)) {
      setDraft((prev) => ({
        ...prev,
        talkId: createUniqueNumericTalkId(existingTalkIds),
      }));
      setSaveError("トークIDが重複したため再生成しました。もう一度保存してください。");
      return;
    }

    if (!draft.title.trim()) {
      setSaveError("トークタイトルを入力してください");
      return;
    }

    if (!draft.categoryName.trim()) {
      setSaveError("カテゴリ名を入力してください");
      return;
    }

    if (!draft.summary.trim()) {
      setSaveError("補足情報の概要を入力してください");
      return;
    }

    const normalizedCategoryId = normalizeSlugValue(draft.categoryName) || `category-${normalizedTalkId}`;
    const bootstrapNode = createBootstrapNode(normalizedTalkId, draft.summary);

    const nextTalk: Talk = {
      id: normalizedTalkId,
      title: draft.title.trim(),
      categoryId: normalizedCategoryId,
      categoryName: draft.categoryName.trim(),
      product: DEFAULT_PRODUCT,
      scene: UNSET_SCENE,
      summary: draft.summary.trim(),
      targetPersona: "未設定",
      difficulty: UNSET_DIFFICULTY,
      tags: [],
      updatedAt: formatDateLabel(new Date()),
      detailLayout: "script-flow",
      rootNodeIds: [bootstrapNode.id],
      nodes: [bootstrapNode],
    };

    setIsSaving(true);

    try {
      const result = await updateTalkByApi(nextTalk);
      let notificationError: string | null = null;

      try {
        await publishScriptActivityHighlightByApi({
          action: "created",
          talkId: nextTalk.id,
          talkTitle: nextTalk.title,
          actorEmail: formatUserLabel(data.user?.name, data.user?.email),
        });
      } catch (caught) {
        notificationError = toErrorMessage(caught);
      }

      const saveBaseMessage = result.revision
        ? `導入しました（revision: ${result.revision}, transport: ${result.transport}）`
        : `導入しました（transport: ${result.transport}）`;

      setCreatedTalkId(nextTalk.id);
      setSaveMessage(
        notificationError
          ? `${saveBaseMessage}（通知の反映に失敗しました）`
          : `${saveBaseMessage}（ホームの重要情報に通知しました）`,
      );

      if (notificationError) {
        setSaveError(`導入は完了しましたが、通知の反映に失敗しました: ${notificationError}`);
      }

      await reload();
    } catch (caught) {
      setSaveError(toErrorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              <FilePlus2 className="size-6 text-primary" aria-hidden="true" />
              新スクリプト導入
            </h1>
            <p className="text-sm text-muted-foreground">
              必要項目のみ入力して導入します。ノード構成は編集画面で設定してください。
            </p>
          </div>
          <Badge variant="secondary">編集者: {formatUserLabel(data.user?.name, data.user?.email)}</Badge>
        </div>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">トーク情報</CardTitle>
          <CardDescription>
            トークIDは数字で自動採番します。必要に応じて再生成できます。
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <section className="space-y-3 rounded-lg border border-border/70 p-3">
            <h3 className="text-sm font-semibold">必須情報</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">トークID（自動採番）</label>
              <div className="flex flex-wrap items-center gap-2">
                <Input value={draft.talkId} readOnly className="max-w-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={regenerateTalkId}
                  disabled={isSaving}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  再生成
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">トークタイトル</label>
              <Input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="例: ガス法人向け導入トーク"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">カテゴリ名</label>
              <Input
                value={draft.categoryName}
                onChange={(event) => updateDraft("categoryName", event.target.value)}
                placeholder="例: ガス（法人向け）"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">補足情報の概要</label>
              <textarea
                value={draft.summary}
                onChange={(event) => updateDraft("summary", event.target.value)}
                placeholder="このトークの狙いを簡潔に入力"
                className="min-h-28 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              導入して保存
            </Button>
            <Button type="button" variant="outline" disabled={isSaving} onClick={resetDraft}>
              入力をリセット
            </Button>
          </div>

          {saveMessage ? (
            <p className="flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {saveMessage}
            </p>
          ) : null}

          {saveError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {saveError}
            </p>
          ) : null}

          {createdTalkId ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild variant="outline">
                <Link href={buildTalkEditorHref(createdTalkId)}>編集画面を開く</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/talks">トーク一覧へ戻る</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
