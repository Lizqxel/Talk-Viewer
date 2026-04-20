"use client";

import Link from "next/link";
import { ArrowRight, BellRing, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  compareScriptActivityHighlightIdDesc,
  isScriptActivityHighlightId,
} from "@/lib/script-activity-highlight";
import { cn } from "@/lib/utils";
import { type DailyHighlight } from "@/types/talk";

interface BrandHeroProps {
  dailyHighlights: DailyHighlight[];
  canEditImportantInfo: boolean;
}

const FALLBACK_IMPORTANT_HIGHLIGHT: DailyHighlight = {
  id: "highlight-important-default",
  title: "本日の重要情報",
  detail: "ここには本日の重要情報が入ります",
};

const HOME_NOTIFICATION_SEEN_STORAGE_KEY = "talk-viewer:home-notification-seen";

function readSeenHomeNotificationSignature() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(HOME_NOTIFICATION_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeenHomeNotificationSignature(signature: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(HOME_NOTIFICATION_SEEN_STORAGE_KEY, signature);
  } catch {
    // Ignore storage failures to keep hero rendering stable.
  }
}

export function BrandHero({ dailyHighlights, canEditImportantInfo }: BrandHeroProps) {
  const resolvedHighlights = useMemo(() => {
    const list = dailyHighlights
      .map((item) => {
        return {
          id: item.id,
          title: item.title.trim(),
          detail: item.detail.trim(),
        };
      })
      .filter((item) => item.title.length > 0 && item.detail.length > 0);

    return list.length > 0 ? list : [FALLBACK_IMPORTANT_HIGHLIGHT];
  }, [dailyHighlights]);

  const importantHighlights = useMemo(() => {
    const list = resolvedHighlights.filter((item) => !isScriptActivityHighlightId(item.id));
    return list.length > 0 ? list : [FALLBACK_IMPORTANT_HIGHLIGHT];
  }, [resolvedHighlights]);

  const editNotificationHighlights = useMemo(() => {
    const list = resolvedHighlights.filter((item) => isScriptActivityHighlightId(item.id));
    if (list.length === 0) {
      return [];
    }

    return [...list].sort((a, b) => compareScriptActivityHighlightIdDesc(a.id, b.id));
  }, [resolvedHighlights]);

  const shouldScrollableImportant = importantHighlights.length >= 4;
  const shouldScrollableEditNotifications = editNotificationHighlights.length >= 4;
  const latestScriptActivityHighlight = editNotificationHighlights[0] ?? null;

  const latestNotificationSignature = useMemo(() => {
    if (!latestScriptActivityHighlight) {
      return null;
    }

    return `${latestScriptActivityHighlight.id}:${latestScriptActivityHighlight.title}:${latestScriptActivityHighlight.detail}`;
  }, [latestScriptActivityHighlight]);

  const [openedSeenSignature, setOpenedSeenSignature] = useState<string | null>(() =>
    readSeenHomeNotificationSignature(),
  );
  const [activeTab, setActiveTab] = useState<"important" | "edit">("important");

  const hasUnreadEditNotification = Boolean(
    latestNotificationSignature && openedSeenSignature !== latestNotificationSignature,
  );

  const handleOpenImportantTab = () => {
    setActiveTab("important");
  };

  const handleOpenEditTab = () => {
    setActiveTab("edit");

    if (!latestNotificationSignature || openedSeenSignature === latestNotificationSignature) {
      return;
    }

    writeSeenHomeNotificationSignature(latestNotificationSignature);
    setOpenedSeenSignature(latestNotificationSignature);
  };

  return (
    <section className="home-hero-frame relative min-h-[88vh] overflow-hidden rounded-3xl border border-zinc-900/15 xl:min-h-[92vh]">
      <div className="home-hero-base absolute inset-0" aria-hidden="true" />
      <div className="home-hero-mesh absolute inset-0" aria-hidden="true" />

      <div className="home-hero-geo-left absolute -left-22 top-8 h-[88vh] w-[46vw]" aria-hidden="true" />
      <div className="home-hero-geo-top absolute -top-12 right-[16%] h-36 w-[42vw]" aria-hidden="true" />
      <div className="home-hero-geo-black absolute right-[-12vw] top-[22%] h-[34vh] w-[56vw]" aria-hidden="true" />
      <div className="home-hero-geo-bottom absolute -bottom-16 right-[10%] h-56 w-[36vw]" aria-hidden="true" />

      <div className="relative z-10 flex min-h-[88vh] flex-col justify-center p-5 md:p-8 xl:min-h-[92vh] xl:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="max-w-4xl space-y-5">
            <Badge variant="outline" className="border-zinc-900/25 bg-white/55 text-zinc-700 backdrop-blur-sm">
              BB CONNECTION TALK PORTAL
            </Badge>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.07] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)] md:text-6xl xl:text-7xl">
              人と会話が響き合い、
              <br />
              成果を
              <span className="ml-3 inline-flex bg-primary px-3 py-1 text-zinc-900">再現性</span>
              にする。
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-zinc-100/95 md:text-lg">
              社内向けトーク資産を、毎日見るホームとして最適化。
              枝分かれトークと更新情報を一画面に束ね、実務で迷わない導線に整えます。
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="h-10 bg-zinc-900 text-zinc-50 shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800"
              >
                <Link href="/talks" className="inline-flex items-center gap-2">
                  トークを確認する
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-10 border-zinc-900/30 bg-primary text-zinc-900 transition-all hover:-translate-y-0.5 hover:bg-primary/85"
              >
                <Link href="/talks?category=hikari-objection">切り返しカテゴリへ</Link>
              </Button>
            </div>
          </div>

          <Card
            className={cn(
              "home-hero-float-card relative ml-auto w-full max-w-md border-zinc-900/20 bg-white/88 shadow-[0_16px_34px_rgba(0,0,0,0.24)] backdrop-blur-md",
              hasUnreadEditNotification ? "ring-2 ring-red-400/75" : null,
            )}
          >
            <CardHeader className="border-b border-zinc-900/10 pb-3">
              <CardTitle className="flex items-center justify-between gap-3 text-base text-zinc-900">
                <span className="inline-flex items-center gap-2">
                  <BellRing className="size-4 text-primary" aria-hidden="true" />
                  本日の重要情報
                </span>
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-zinc-100">LIVE</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="inline-flex w-full rounded-lg border border-zinc-900/12 bg-muted/25 p-1">
                <button
                  type="button"
                  onClick={handleOpenImportantTab}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                    activeTab === "important"
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900",
                  )}
                  aria-pressed={activeTab === "important"}
                >
                  重要情報
                </button>
                <button
                  type="button"
                  onClick={handleOpenEditTab}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                    activeTab === "edit"
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900",
                  )}
                  aria-pressed={activeTab === "edit"}
                >
                  編集通知
                  {hasUnreadEditNotification ? (
                    <span className="size-2 rounded-full bg-red-500" aria-hidden="true" />
                  ) : null}
                </button>
              </div>

              {activeTab === "important" ? (
                <>
                  <div className={cn("space-y-2", shouldScrollableImportant ? "max-h-64 overflow-y-auto pr-1" : null)}>
                    {importantHighlights.map((item, index) => {
                      return (
                        <div
                          key={item.id || `home-important-${index}`}
                          className={cn(
                            "relative rounded-lg px-3 py-2.5",
                            index === 0
                              ? "border border-primary/35 bg-primary/14"
                              : "border border-zinc-900/12 bg-white/80",
                          )}
                        >
                          <p className="text-xs font-semibold tracking-[0.08em] text-zinc-700 uppercase">{item.title}</p>
                          <p className="mt-1.5 text-sm font-semibold text-zinc-900">{item.detail}</p>
                        </div>
                      );
                    })}
                  </div>

                  {shouldScrollableImportant ? <p className="text-[11px] text-zinc-600">件数が多いため、カード内をスクロールして確認できます。</p> : null}
                </>
              ) : (
                <>
                  {editNotificationHighlights.length === 0 ? (
                    <div className="rounded-lg border border-zinc-900/12 bg-white/80 px-3 py-2.5">
                      <p className="text-sm text-zinc-700">編集通知はまだありません。</p>
                    </div>
                  ) : (
                    <div className={cn("space-y-2", shouldScrollableEditNotifications ? "max-h-64 overflow-y-auto pr-1" : null)}>
                      {editNotificationHighlights.map((item, index) => {
                        const isUnreadNotification =
                          hasUnreadEditNotification && item.id === latestScriptActivityHighlight?.id;

                        return (
                          <div
                            key={item.id || `home-edit-notification-${index}`}
                            className={cn(
                              "relative rounded-lg border border-zinc-900/12 bg-white/80 px-3 py-2.5",
                              index === 0 ? "border-zinc-900/18" : null,
                              isUnreadNotification ? "border-red-400/75 bg-red-50/80" : null,
                            )}
                          >
                            {isUnreadNotification ? (
                              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
                            ) : null}
                            <p className="text-xs font-semibold tracking-[0.08em] text-zinc-700 uppercase">{item.title}</p>
                            <p className="mt-1.5 text-sm font-semibold text-zinc-900">{item.detail}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {shouldScrollableEditNotifications ? <p className="text-[11px] text-zinc-600">件数が多いため、カード内をスクロールして確認できます。</p> : null}
                </>
              )}

              {canEditImportantInfo ? (
                <div className="rounded-lg border border-zinc-900/12 bg-white/80 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-zinc-700">編集は左サイドバーの「重要情報管理」タブから行えます。</p>
                  <Button asChild size="sm" variant="outline" className="mt-2 h-8 border-zinc-900/30 bg-white text-zinc-900 hover:bg-zinc-50">
                    <Link href="/admin/highlights" className="inline-flex items-center gap-1.5">
                      重要情報管理へ
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
