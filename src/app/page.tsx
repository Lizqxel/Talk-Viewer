"use client";

import {
  Link2,
  CheckCircle2,
  BellRing,
  Loader2,
  Megaphone,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BrandHero } from "@/components/home/brand-hero";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/motion/motion-primitives";
import { ApiFallbackNotice } from "@/components/shared/api-fallback-notice";
import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateMyDisplayNameByApi, updateMyLinkedEmailByApi } from "@/lib/talk-portal-api";

function toErrorMessage(caught: unknown) {
  if (caught instanceof Error) {
    return caught.message;
  }

  return String(caught);
}

export default function HomePage() {
  const { data, error, isLoading, isFallback, reload } = useTalkBootstrapContext();
  const canEditImportantInfo = Boolean(data?.user?.canEdit || data?.user?.isAdmin);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [linkedEmailDraft, setLinkedEmailDraft] = useState("");
  const [isSavingLinkedEmail, setIsSavingLinkedEmail] = useState(false);
  const [linkedEmailMessage, setLinkedEmailMessage] = useState<string | null>(null);
  const [linkedEmailError, setLinkedEmailError] = useState<string | null>(null);

  const currentUserEmail = data?.user?.email?.trim() ?? "";
  const currentRawEmail = data?.user?.rawEmail?.trim() ?? "";
  const currentLinkedEmail = data?.user?.linkedEmail?.trim() ?? "";
  const currentDisplayName = data?.user?.name?.trim() ?? "";

  useEffect(() => {
    if (!data) {
      return;
    }

    setDisplayNameDraft(data.user?.name ?? "");
    setLinkedEmailDraft(data.user?.linkedEmail ?? "");
  }, [data]);

  const normalizedDisplayNameDraft = useMemo(
    () => displayNameDraft.replace(/\s+/g, " ").trim(),
    [displayNameDraft],
  );

  const canSaveDisplayName =
    !isSavingDisplayName &&
    normalizedDisplayNameDraft.length <= 60 &&
    normalizedDisplayNameDraft !== currentDisplayName;

  const normalizedLinkedEmailDraft = useMemo(
    () => linkedEmailDraft.trim().toLowerCase(),
    [linkedEmailDraft],
  );

  const linkedEmailFormatValid = useMemo(() => {
    if (!normalizedLinkedEmailDraft) {
      return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedLinkedEmailDraft);
  }, [normalizedLinkedEmailDraft]);

  const canSaveLinkedEmail =
    !isSavingLinkedEmail &&
    linkedEmailFormatValid &&
    normalizedLinkedEmailDraft !== currentLinkedEmail;

  const needsLinkedEmailPrompt = !currentLinkedEmail;

  const currentUserLabel = useMemo(() => {
    if (!currentUserEmail) {
      return currentDisplayName || "unknown";
    }

    return currentDisplayName
      ? `${currentDisplayName} (${currentUserEmail})`
      : currentUserEmail;
  }, [currentDisplayName, currentUserEmail]);

  const featuredTalkCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data.featuredItems]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => {
        const talk = data.talks.find((talkItem) => talkItem.id === item.talkId);
        return talk ? { ...item, talk } : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [data]);

  const recentUpdateCards = useMemo(() => {
    if (!data) {
      return [];
    }

    const toTimestamp = (value: string) => {
      const timestamp = Date.parse(value);
      return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
    };

    return [...data.recentUpdates]
      .sort((a, b) => {
        const diff = toTimestamp(b.date) - toTimestamp(a.date);
        if (diff !== 0) {
          return diff;
        }

        return b.id.localeCompare(a.id);
      })
      .slice(0, 5);
  }, [data]);

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  const handleSaveDisplayName = async () => {
    setDisplayNameError(null);
    setDisplayNameMessage(null);

    if (normalizedDisplayNameDraft.length > 60) {
      setDisplayNameError("表示名は60文字以内で入力してください。");
      return;
    }

    setIsSavingDisplayName(true);

    try {
      const result = await updateMyDisplayNameByApi(displayNameDraft);
      const reloadError = await reload();

      setDisplayNameMessage(
        result.transport === "fetch"
          ? "表示名を更新しました。"
          : "表示名を更新しました（検証経由）。",
      );

      if (reloadError) {
        setDisplayNameError(`表示名の反映後データ再取得に失敗しました: ${reloadError.message}`);
      }
    } catch (caught) {
      setDisplayNameError(toErrorMessage(caught));
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handleSaveLinkedEmail = async () => {
    setLinkedEmailError(null);
    setLinkedEmailMessage(null);

    if (!linkedEmailFormatValid) {
      setLinkedEmailError("有効なメールアドレス形式で入力してください。");
      return;
    }

    setIsSavingLinkedEmail(true);

    try {
      const result = await updateMyLinkedEmailByApi(linkedEmailDraft);
      const reloadError = await reload();

      if (!normalizedLinkedEmailDraft) {
        setLinkedEmailMessage("社内メール連携を解除しました。");
      } else {
        setLinkedEmailMessage(
          result.transport === "fetch"
            ? "社内メール連携を更新しました。"
            : "社内メール連携を更新しました（検証経由）。",
        );
      }

      if (reloadError) {
        setLinkedEmailError(`連携反映後データ再取得に失敗しました: ${reloadError.message}`);
      }
    } catch (caught) {
      setLinkedEmailError(toErrorMessage(caught));
    } finally {
      setIsSavingLinkedEmail(false);
    }
  };

  return (
    <div className="space-y-8">
      {isFallback ? <ApiFallbackNotice onRetry={() => void reload()} reason={error?.message} /> : null}
      <BrandHero
        dailyHighlights={data.dailyHighlights}
        canEditImportantInfo={canEditImportantInfo}
      />

      <Reveal>
        <section className="relative -mt-2 overflow-hidden rounded-2xl border border-zinc-900/10 bg-card/75 p-4 backdrop-blur-sm md:p-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
          <p className="pl-2 text-sm text-muted-foreground">
            ここからは日常業務向けのポータル導線です。最短で台本に到達できるよう、利用頻度順で配置しています。
          </p>
        </section>
      </Reveal>

      <Reveal>
        <section>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-zinc-900/15 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-900">
                  <UserRound className="size-4 text-primary" aria-hidden="true" />
                  表示名設定
                </CardTitle>
                <CardDescription>自分の表示名を設定できます。未入力時はメールアドレス表示になります。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">ログイン中: {currentUserLabel}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={displayNameDraft}
                    onChange={(event) => {
                      setDisplayNameDraft(event.target.value);
                      setDisplayNameError(null);
                      setDisplayNameMessage(null);
                    }}
                    placeholder="例: 山田 太郎"
                    className="max-w-sm"
                    maxLength={60}
                    disabled={isSavingDisplayName}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSaveDisplayName()}
                    disabled={!canSaveDisplayName}
                  >
                    {isSavingDisplayName ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    保存
                  </Button>
                </div>
                {displayNameMessage ? (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {displayNameMessage}
                  </p>
                ) : null}
                {displayNameError ? (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <TriangleAlert className="size-4" aria-hidden="true" />
                    {displayNameError}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-zinc-900/15 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-900">
                  <Link2 className="size-4 text-primary" aria-hidden="true" />
                  社内メール連携
                </CardTitle>
                <CardDescription>
                  Googleで取得されたメールと別に、権限判定へ使う社内メールアドレスを連携できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {needsLinkedEmailPrompt ? (
                  <p className="rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    初回設定を推奨: 権限判定が想定どおりに反映されない場合は、社内メールを連携してください。
                  </p>
                ) : null}

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>現在の判定メール: {currentUserEmail || "未設定"}</p>
                  <p>Google取得メール: {currentRawEmail || "未取得"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={linkedEmailDraft}
                    onChange={(event) => {
                      setLinkedEmailDraft(event.target.value);
                      setLinkedEmailError(null);
                      setLinkedEmailMessage(null);
                    }}
                    placeholder="例: name@bb-connection.com"
                    className="max-w-sm"
                    disabled={isSavingLinkedEmail}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSaveLinkedEmail()}
                    disabled={!canSaveLinkedEmail}
                  >
                    {isSavingLinkedEmail ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    保存
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLinkedEmailDraft("");
                      setLinkedEmailError(null);
                      setLinkedEmailMessage(null);
                    }}
                    disabled={isSavingLinkedEmail || !currentLinkedEmail}
                  >
                    連携解除
                  </Button>
                </div>

                {linkedEmailMessage ? (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {linkedEmailMessage}
                  </p>
                ) : null}
                {linkedEmailError ? (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <TriangleAlert className="size-4" aria-hidden="true" />
                    {linkedEmailError}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </Reveal>

      <section>
        <SectionHeading title="よく使うトーク" description="日々の架電で迷わないための主要導線" />
        <StaggerGrid className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <StaggerItem className="h-full">
            <Card className="flex h-full flex-col overflow-hidden border-zinc-900/15 bg-card shadow-sm">
              <div className="bg-zinc-900 px-4 py-3 text-zinc-100 md:px-5">
                <p className="text-xs font-semibold tracking-[0.16em] text-zinc-300 uppercase">Today&apos;s Main Scripts</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <Megaphone className="size-4 text-primary" aria-hidden="true" />
                  重点トーク
                </p>
              </div>
              <CardHeader className="pb-3">
                <CardDescription>使用頻度・成果影響の高い順に3件を固定表示</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {featuredTalkCards.map((item, index) => {
                  const rank = String(index + 1).padStart(2, "0");
                  const sceneLabel = String(
                    data.sceneLabels[item.talk.scene] ?? item.talk.scene,
                  ).trim();
                  return (
                    <Link
                      key={item.id}
                      href={`/talks/detail?talkId=${encodeURIComponent(item.talk.id)}`}
                      className="group flex min-h-[104px] items-start gap-3 rounded-xl border border-zinc-900/10 bg-background px-3 py-3 transition-colors hover:border-primary/45 hover:bg-primary/5"
                    >
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-zinc-100">
                        {rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.talk.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="border-zinc-900/20 bg-muted/30">
                            {data.productLabels[item.talk.product] ?? item.talk.product}
                          </Badge>
                          {sceneLabel ? (
                            <Badge variant="outline" className="border-zinc-900/20 bg-muted/30">
                              {sceneLabel}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem className="h-full">
            <Card className="flex h-full flex-col border-zinc-900/15 bg-card shadow-sm">
              <div className="bg-zinc-900 px-4 py-2.5 text-zinc-100">
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase">Recent Updates</p>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-900">
                  <BellRing className="size-4 text-primary" aria-hidden="true" />
                  最近更新されたトーク
                </CardTitle>
                <CardDescription>更新点を短時間で把握</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {recentUpdateCards.length === 0 ? (
                  <div className="rounded-lg border border-zinc-900/12 bg-muted/20 px-3 py-3">
                    <p className="text-sm text-muted-foreground">最近の更新はまだありません。</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentUpdateCards.map((item) => {
                      const typeLabel =
                        item.type === "talk" ? "トーク" : item.type === "notice" ? "周知" : "システム";

                      const row = (
                        <div className="rounded-lg border border-zinc-900/12 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/45 hover:bg-primary/5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900">{item.title}</p>
                            <Badge variant="outline" className="shrink-0 border-zinc-900/20 bg-background text-[11px]">
                              {typeLabel}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                          <p className="mt-1.5 text-[11px] text-zinc-500">{item.date || "日付未設定"}</p>
                        </div>
                      );

                      if (!item.talkId) {
                        return <div key={item.id}>{row}</div>;
                      }

                      return (
                        <Link key={item.id} href={`/talks/detail?talkId=${encodeURIComponent(item.talkId)}`}>
                          {row}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section>
        <SectionHeading title="周知一覧" description="運用ルールやお知らせを横断で確認" />
        <StaggerGrid className="grid gap-4 md:grid-cols-3">
          <StaggerItem className="h-full md:col-span-3">
            <Card className="flex h-full flex-col overflow-hidden border-zinc-900/15 bg-card shadow-sm">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground">ここには周知一覧が入ります</p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerGrid>
      </section>
    </div>
  );
}
