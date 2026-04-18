"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { upsertDailyHighlightByApi } from "@/lib/talk-portal-api";
import { cn } from "@/lib/utils";
import { type DailyHighlight } from "@/types/talk";

type HighlightDraft = {
  clientKey: string;
  id: string;
  title: string;
  detail: string;
  persisted: boolean;
};

function createDraftFromHighlight(item: DailyHighlight, index: number): HighlightDraft {
  return {
    clientKey: `existing-${item.id}-${index}`,
    id: item.id,
    title: item.title,
    detail: item.detail,
    persisted: true,
  };
}

function createNewDraft(sequence: number): HighlightDraft {
  const id = `highlight-${Date.now()}-${sequence}`;

  return {
    clientKey: `new-${id}`,
    id,
    title: "",
    detail: "",
    persisted: false,
  };
}

function reorderDrafts(drafts: HighlightDraft[], fromKey: string, toKey: string) {
  const fromIndex = drafts.findIndex((item) => item.clientKey === fromKey);
  const toIndex = drafts.findIndex((item) => item.clientKey === toKey);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return drafts;
  }

  const next = drafts.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function getFailureMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  return String(value);
}

export function DailyHighlightsPageClient() {
  const { data, error, isLoading, reload } = useTalkBootstrapContext();

  const [drafts, setDrafts] = useState<HighlightDraft[]>([]);
  const [removedPersistedDrafts, setRemovedPersistedDrafts] = useState<HighlightDraft[]>([]);
  const [draftSequence, setDraftSequence] = useState(1);

  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const canEditHighlights = Boolean(data?.user?.canEdit || data?.user?.isAdmin);

  useEffect(() => {
    if (!data) {
      return;
    }

    setDrafts(data.dailyHighlights.map((item, index) => createDraftFromHighlight(item, index)));
    setRemovedPersistedDrafts([]);
    setDragOverKey(null);
    setDraggingKey(null);
    setSaveError(null);
  }, [data]);

  const hasEmptyDraft = useMemo(() => {
    return drafts.some((item) => item.title.trim().length === 0 || item.detail.trim().length === 0);
  }, [drafts]);

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  if (!canEditHighlights) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            編集権限がありません
          </CardTitle>
          <CardDescription>このタブは編集者以上のみ表示されます。Editors シートで can_edit を TRUE に設定してください。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleAddDraft = () => {
    setDrafts((prev) => [...prev, createNewDraft(draftSequence)]);
    setDraftSequence((prev) => prev + 1);
    setSaveError(null);
    setSaveMessage(null);
  };

  const updateDraft = (clientKey: string, patch: Partial<HighlightDraft>) => {
    setDrafts((prev) => prev.map((item) => (item.clientKey === clientKey ? { ...item, ...patch } : item)));
    setSaveError(null);
    setSaveMessage(null);
  };

  const moveDraftByOffset = (clientKey: string, offset: number) => {
    setDrafts((prev) => {
      const fromIndex = prev.findIndex((item) => item.clientKey === clientKey);
      if (fromIndex < 0) {
        return prev;
      }

      const toIndex = fromIndex + offset;
      if (toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }

      const next = prev.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setSaveMessage(null);
  };

  const handleRemoveDraft = (clientKey: string) => {
    const target = drafts.find((item) => item.clientKey === clientKey);
    if (!target) {
      return;
    }

    if (target.persisted) {
      setRemovedPersistedDrafts((prev) => {
        const withoutSameId = prev.filter((item) => item.id !== target.id);
        return [...withoutSameId, target];
      });
    }

    setDrafts((prev) => prev.filter((item) => item.clientKey !== clientKey));
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleSaveAll = async () => {
    if (hasEmptyDraft) {
      setSaveError("タイトルと本文が空の項目があります。入力してから保存してください。");
      return;
    }

    const duplicateId = (() => {
      const idMap = new Set<string>();
      for (const item of drafts) {
        const normalized = item.id.trim();
        if (!normalized) {
          return "IDが空の項目があります。";
        }
        if (idMap.has(normalized)) {
          return `IDが重複しています: ${normalized}`;
        }
        idMap.add(normalized);
      }
      return null;
    })();

    if (duplicateId) {
      setSaveError(duplicateId);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      for (let index = 0; index < drafts.length; index += 1) {
        const item = drafts[index];
        await upsertDailyHighlightByApi({
          id: item.id.trim(),
          title: item.title.trim(),
          detail: item.detail.trim(),
          sortOrder: index + 1,
          isActive: true,
        });
      }

      for (const item of removedPersistedDrafts) {
        await upsertDailyHighlightByApi({
          id: item.id,
          title: item.title,
          detail: item.detail,
          sortOrder: 9999,
          isActive: false,
        });
      }

      const reloadError = await reload();
      if (reloadError) {
        setSaveError(`保存は完了しましたが、再取得に失敗しました: ${reloadError.message}`);
        setSaveMessage("重要情報を保存しました。");
        return;
      }

      setRemovedPersistedDrafts([]);
      setSaveMessage("重要情報を更新しました。");
    } catch (caught) {
      setSaveError(getFailureMessage(caught));
      setSaveMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-900/10 bg-card/90 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-zinc-900">
                <Sparkles className="size-5 text-primary" aria-hidden="true" />
                重要情報管理
              </CardTitle>
              <CardDescription>
                複数の重要情報を編集し、ドラッグ操作で表示順を入れ替えられます。
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 border-zinc-900/20 bg-white">
              <Link href="/">ホームで確認</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-zinc-900/20 bg-muted/40">ドラッグで並び替え</Badge>
            <Badge variant="outline" className="border-zinc-900/20 bg-muted/40">複数件を一括保存</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleAddDraft}>
              <Plus className="size-4" aria-hidden="true" />
              重要情報を追加
            </Button>
            <Button type="button" size="sm" className="h-8" onClick={() => void handleSaveAll()} disabled={isSaving || hasEmptyDraft}>
              {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isSaving ? "保存中..." : "変更を保存"}
            </Button>
          </div>

          {saveError ? (
            <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-700">{saveError}</p>
          ) : null}
          {saveMessage ? (
            <p className="rounded-md border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{saveMessage}</p>
          ) : null}

          {drafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-900/20 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              重要情報がまだありません。右上の「重要情報を追加」から作成してください。
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((item, index) => {
                const isDragTarget = dragOverKey === item.clientKey && draggingKey !== item.clientKey;

                return (
                  <div
                    key={item.clientKey}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggingKey && draggingKey !== item.clientKey) {
                        setDragOverKey(item.clientKey);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!draggingKey || draggingKey === item.clientKey) {
                        return;
                      }

                      setDrafts((prev) => reorderDrafts(prev, draggingKey, item.clientKey));
                      setDraggingKey(null);
                      setDragOverKey(null);
                      setSaveMessage(null);
                    }}
                    className={cn(
                      "rounded-xl border bg-white/90 transition-colors",
                      isDragTarget ? "border-primary bg-primary/5" : "border-zinc-900/15",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-900/10 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", item.clientKey);
                            setDraggingKey(item.clientKey);
                          }}
                          onDragEnd={() => {
                            setDraggingKey(null);
                            setDragOverKey(null);
                          }}
                          aria-label="並び替え用ドラッグハンドル"
                          title="ドラッグして並び替え"
                          className="inline-flex size-7 cursor-grab items-center justify-center rounded-md border border-zinc-900/15 bg-zinc-50 text-zinc-600 active:cursor-grabbing"
                        >
                          <GripVertical className="size-4" aria-hidden="true" />
                        </button>
                        <Badge variant="outline" className="border-zinc-900/20 bg-muted/40 text-zinc-700">#{index + 1}</Badge>
                        <span className="truncate text-xs text-muted-foreground">ID: {item.id}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => {
                            moveDraftByOffset(item.clientKey, -1);
                          }}
                          disabled={index === 0}
                          aria-label="上へ移動"
                        >
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => {
                            moveDraftByOffset(item.clientKey, 1);
                          }}
                          disabled={index === drafts.length - 1}
                          aria-label="下へ移動"
                        >
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => {
                            handleRemoveDraft(item.clientKey);
                          }}
                          aria-label="削除"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 px-3 py-3">
                      <div className="grid gap-2">
                        <label className="space-y-1">
                          <span className="text-xs font-semibold text-zinc-700">タイトル</span>
                          <Input
                            value={item.title}
                            onChange={(event) => {
                              updateDraft(item.clientKey, { title: event.target.value });
                            }}
                            placeholder="例: 本日の重要情報"
                          />
                        </label>
                      </div>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-zinc-700">本文</span>
                        <textarea
                          value={item.detail}
                          onChange={(event) => {
                            updateDraft(item.clientKey, { detail: event.target.value });
                          }}
                          rows={3}
                          className="min-h-[90px] w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          placeholder="ホームに表示する重要情報を入力してください"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
