"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  FilePlus2,
  Loader2,
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
import { updateTalkByApi } from "@/lib/talk-portal-api";
import {
  type NodeKind,
  type Talk,
  type TalkDifficulty,
  type TalkNode,
  type TalkScene,
} from "@/types/talk";

const difficultyOptions: TalkDifficulty[] = ["初級", "中級", "上級"];
const nodeKindOptions: NodeKind[] = [
  "opening",
  "hearing",
  "proposal",
  "objection",
  "closing",
  "note",
];
const sceneOrder: TalkScene[] = [
  "kojin",
  "hojin",
  "objection",
  "remind",
  "reception",
  "negotiation",
];

interface OnboardingDraft {
  talkId: string;
  title: string;
  productCode: string;
  scene: TalkScene;
  categoryId: string;
  categoryName: string;
  summary: string;
  targetPersona: string;
  difficulty: TalkDifficulty;
  tags: string;
}

interface NodeDraft {
  key: string;
  id: string;
  title: string;
  kind: NodeKind;
  reactionLabel: string;
  lines: string;
  intent: string;
  ngExamples: string;
  tips: string;
  nextNodeIds: string;
}

type OnboardingPanel = "talk" | "node";

function normalizeSlugValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function splitTags(value: string) {
  return value
    .split(/[\n,、]/)
    .map((item) => item.trim())
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index);
}

function splitNodeIds(value: string) {
  return value
    .split(/[\n,、]/)
    .map((item) => normalizeSlugValue(item))
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index);
}

function formatDateLabel(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTalkEditorHref(talkId: string) {
  return `/talks/editor?talkId=${encodeURIComponent(talkId)}`;
}

function buildTalkIdSuggestion(draft: Pick<OnboardingDraft, "productCode" | "scene" | "title">) {
  const product = normalizeSlugValue(draft.productCode);
  const scene = normalizeSlugValue(draft.scene);
  const title = normalizeSlugValue(draft.title);

  if (!product || !scene) {
    return "";
  }

  const base = title ? `${product}-${scene}-${title}` : `${product}-${scene}-new`;
  return base.slice(0, 80).replace(/-$/, "");
}

function buildCategoryIdSuggestion(draft: Pick<OnboardingDraft, "productCode" | "scene">) {
  const product = normalizeSlugValue(draft.productCode);
  const scene = normalizeSlugValue(draft.scene);

  if (!product || !scene) {
    return "";
  }

  return `${product}-${scene}`;
}

function buildNodeIdSuggestion(baseTalkId: string, kind: NodeKind, existingIds: Set<string>) {
  const normalizedTalkId = normalizeSlugValue(baseTalkId);
  const base = normalizeSlugValue(
    normalizedTalkId ? `${normalizedTalkId}-${kind}` : kind,
  );

  if (!base) {
    return "";
  }

  if (!existingIds.has(base)) {
    return base;
  }

  let index = 2;
  while (existingIds.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

function createNodeKey() {
  return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createNodeDraft(seed?: Partial<Omit<NodeDraft, "key">>): NodeDraft {
  return {
    key: createNodeKey(),
    id: seed?.id ?? "",
    title: seed?.title ?? "導入トーク",
    kind: seed?.kind ?? "opening",
    reactionLabel: seed?.reactionLabel ?? "",
    lines:
      seed?.lines ??
      "お電話ありがとうございます。\n本日は新しいご案内でご連絡しました。",
    intent: seed?.intent ?? "相手に警戒されないよう短く目的を伝える",
    ngExamples: seed?.ngExamples ?? "唐突に契約の話を進める",
    tips: seed?.tips ?? "最初の5秒で安心感を作る",
    nextNodeIds: seed?.nextNodeIds ?? "",
  };
}

function createInitialDraft(): OnboardingDraft {
  return {
    talkId: "",
    title: "",
    productCode: "hikari",
    scene: "kojin",
    categoryId: "",
    categoryName: "",
    summary: "",
    targetPersona: "",
    difficulty: "初級",
    tags: "",
  };
}

function toErrorMessage(caught: unknown) {
  if (caught instanceof Error) {
    return caught.message;
  }

  return String(caught);
}

function arrayMove<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [target] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, target);
  return next;
}

export function TalkOnboardingPageClient() {
  const { data, error, isLoading, reload } = useTalkBootstrapContext();
  const canCreateTalk = Boolean(data?.user?.canEdit || data?.user?.isAdmin);

  const [draft, setDraft] = useState<OnboardingDraft>(() => createInitialDraft());
  const [nodeDrafts, setNodeDrafts] = useState<NodeDraft[]>(() => [createNodeDraft()]);
  const [selectedPanel, setSelectedPanel] = useState<OnboardingPanel>("talk");
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdTalkId, setCreatedTalkId] = useState<string | null>(null);

  useEffect(() => {
    if (nodeDrafts.length === 0) {
      return;
    }

    if (nodeDrafts.some((node) => node.key === selectedNodeKey)) {
      return;
    }

    setSelectedNodeKey(nodeDrafts[0].key);
  }, [nodeDrafts, selectedNodeKey]);

  const sceneOptions = useMemo(() => {
    if (!data) {
      return sceneOrder.map((scene) => ({ value: scene, label: scene }));
    }

    return sceneOrder.map((scene) => ({
      value: scene,
      label: data.sceneLabels[scene] ?? scene,
    }));
  }, [data]);

  const productCodeSuggestions = useMemo(() => {
    if (!data) {
      return [];
    }

    return Object.keys(data.productLabels).sort();
  }, [data]);

  const selectedNodeDraft =
    nodeDrafts.find((node) => node.key === selectedNodeKey) ?? nodeDrafts[0] ?? null;

  const selectedNodeIndex = selectedNodeDraft
    ? nodeDrafts.findIndex((node) => node.key === selectedNodeDraft.key)
    : -1;

  const suggestedTalkId = useMemo(
    () =>
      buildTalkIdSuggestion({
        productCode: draft.productCode,
        scene: draft.scene,
        title: draft.title,
      }),
    [draft.productCode, draft.scene, draft.title],
  );

  const suggestedCategoryId = useMemo(
    () =>
      buildCategoryIdSuggestion({
        productCode: draft.productCode,
        scene: draft.scene,
      }),
    [draft.productCode, draft.scene],
  );

  const suggestedNodeId = useMemo(() => {
    if (!selectedNodeDraft) {
      return "";
    }

    const occupied = new Set(
      nodeDrafts
        .filter((node) => node.key !== selectedNodeDraft.key)
        .map((node) => normalizeSlugValue(node.id))
        .filter((id) => Boolean(id)),
    );

    return buildNodeIdSuggestion(
      draft.talkId || suggestedTalkId,
      selectedNodeDraft.kind,
      occupied,
    );
  }, [draft.talkId, nodeDrafts, selectedNodeDraft, suggestedTalkId]);

  const updateDraft = <K extends keyof OnboardingDraft>(
    key: K,
    value: OnboardingDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
    setSaveError(null);
    setCreatedTalkId(null);
  };

  const updateNodeDraft = <K extends keyof NodeDraft>(
    nodeKey: string,
    key: K,
    value: NodeDraft[K],
  ) => {
    setNodeDrafts((prev) =>
      prev.map((node) =>
        node.key === nodeKey
          ? {
              ...node,
              [key]: value,
            }
          : node,
      ),
    );
    setSaveMessage(null);
    setSaveError(null);
    setCreatedTalkId(null);
  };

  const addNodeDraft = () => {
    const occupied = new Set(
      nodeDrafts
        .map((node) => normalizeSlugValue(node.id))
        .filter((id) => Boolean(id)),
    );

    const nextId = buildNodeIdSuggestion(
      draft.talkId || suggestedTalkId,
      "note",
      occupied,
    );

    const nextNode = createNodeDraft({
      id: nextId,
      title: `追加ノード${nodeDrafts.length + 1}`,
      kind: "note",
      lines: "",
      intent: "",
      ngExamples: "",
      tips: "",
      nextNodeIds: "",
    });

    setNodeDrafts((prev) => [...prev, nextNode]);
    setSelectedPanel("node");
    setSelectedNodeKey(nextNode.key);
    setSaveMessage(null);
    setSaveError(null);
    setCreatedTalkId(null);
  };

  const removeSelectedNodeDraft = () => {
    if (!selectedNodeDraft || nodeDrafts.length <= 1) {
      return;
    }

    setNodeDrafts((prev) => prev.filter((node) => node.key !== selectedNodeDraft.key));
    setSaveMessage(null);
    setSaveError(null);
    setCreatedTalkId(null);
  };

  const moveSelectedNode = (direction: -1 | 1) => {
    if (!selectedNodeDraft || selectedNodeIndex < 0) {
      return;
    }

    const nextIndex = selectedNodeIndex + direction;
    if (nextIndex < 0 || nextIndex >= nodeDrafts.length) {
      return;
    }

    setNodeDrafts((prev) => arrayMove(prev, selectedNodeIndex, nextIndex));
    setSaveMessage(null);
    setSaveError(null);
    setCreatedTalkId(null);
  };

  const resetDraft = () => {
    const initialNode = createNodeDraft();
    setDraft(createInitialDraft());
    setNodeDrafts([initialNode]);
    setSelectedPanel("talk");
    setSelectedNodeKey(initialNode.key);
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

    const normalizedTalkId = normalizeSlugValue(draft.talkId || suggestedTalkId);
    const normalizedProductCode = normalizeSlugValue(draft.productCode);
    const normalizedCategoryId = normalizeSlugValue(draft.categoryId || suggestedCategoryId);

    if (!normalizedTalkId) {
      setSaveError("トークIDを入力してください");
      return;
    }

    if (!draft.title.trim()) {
      setSaveError("トークタイトルを入力してください");
      return;
    }

    if (!normalizedProductCode) {
      setSaveError("商材コードを入力してください");
      return;
    }

    if (!normalizedCategoryId) {
      setSaveError("カテゴリIDを入力してください");
      return;
    }

    if (!draft.summary.trim()) {
      setSaveError("トーク概要を入力してください");
      return;
    }

    if (!draft.targetPersona.trim()) {
      setSaveError("想定ペルソナを入力してください");
      return;
    }

    if (nodeDrafts.length === 0) {
      setSaveError("ノードを1件以上追加してください");
      return;
    }

    const normalizedNodes: TalkNode[] = [];
    const nodeIdSet = new Set<string>();

    for (const [index, node] of nodeDrafts.entries()) {
      const nodeTitleForError = node.title.trim() || `ノード${index + 1}`;
      const normalizedNodeId = normalizeSlugValue(node.id);

      if (!normalizedNodeId) {
        setSaveError(`${nodeTitleForError}: ノードIDを入力してください`);
        return;
      }

      if (nodeIdSet.has(normalizedNodeId)) {
        setSaveError(`ノードIDが重複しています: ${normalizedNodeId}`);
        return;
      }

      const scriptLines = splitLines(node.lines);
      if (scriptLines.length === 0) {
        setSaveError(`${nodeTitleForError}: 本文を1行以上入力してください`);
        return;
      }

      const nodeIntent = node.intent.trim();
      if (!nodeIntent) {
        setSaveError(`${nodeTitleForError}: 意図を入力してください`);
        return;
      }

      const nextNodeIds = splitNodeIds(node.nextNodeIds);

      normalizedNodes.push({
        id: normalizedNodeId,
        title: node.title.trim(),
        kind: node.kind,
        reactionLabel: node.reactionLabel.trim() || undefined,
        lines: scriptLines,
        readAloudScript: [...scriptLines],
        intent: nodeIntent,
        ngExamples: splitLines(node.ngExamples),
        tips: splitLines(node.tips),
        nextNodeIds,
      });

      nodeIdSet.add(normalizedNodeId);
    }

    for (const node of normalizedNodes) {
      const unknownIds = node.nextNodeIds.filter((nextId) => !nodeIdSet.has(nextId));
      if (unknownIds.length > 0) {
        setSaveError(`${node.title}: 未登録の次ノードIDがあります (${unknownIds.join(", ")})`);
        return;
      }
    }

    const now = new Date();
    const nextTalk: Talk = {
      id: normalizedTalkId,
      title: draft.title.trim(),
      categoryId: normalizedCategoryId,
      categoryName: draft.categoryName.trim() || normalizedCategoryId,
      product: normalizedProductCode,
      scene: draft.scene,
      summary: draft.summary.trim(),
      targetPersona: draft.targetPersona.trim(),
      difficulty: draft.difficulty,
      tags: splitTags(draft.tags),
      updatedAt: formatDateLabel(now),
      detailLayout: "script-flow",
      rootNodeIds: [normalizedNodes[0].id],
      nodes: normalizedNodes,
    };

    setIsSaving(true);

    try {
      const result = await updateTalkByApi(nextTalk);
      setCreatedTalkId(nextTalk.id);
      setSaveMessage(
        result.revision
          ? `導入しました（revision: ${result.revision}, transport: ${result.transport}）`
          : `導入しました（transport: ${result.transport}）`,
      );
      await reload();
    } catch (caught) {
      setSaveError(toErrorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const resolvedTalkIdPreview = normalizeSlugValue(draft.talkId || suggestedTalkId);
  const resolvedRootNodePreview =
    normalizeSlugValue(nodeDrafts[0]?.id ?? "") || "未確定";

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
              新商材が発生したときに、複数ノードを含むトークを登録します。
            </p>
          </div>
          <Badge variant="secondary">編集者: {data.user?.email ?? "unknown"}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">セクション</CardTitle>
            <CardDescription>編集UIと同じ流れで入力対象を選択します。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedPanel === "talk"
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-background hover:bg-muted/50"
              }`}
              onClick={() => setSelectedPanel("talk")}
            >
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">setup</p>
              <p className="mt-1 text-sm font-medium leading-5">トーク情報</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {draft.title.trim() || "タイトル未入力"}
              </p>
            </button>

            <div className="space-y-2 rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">nodes</p>
                <Button type="button" size="xs" variant="outline" onClick={addNodeDraft}>
                  ノード追加
                </Button>
              </div>

              <div className="space-y-1.5">
                {nodeDrafts.map((node, index) => {
                  const isSelected = selectedPanel === "node" && node.key === selectedNodeKey;
                  const normalizedNodeId = normalizeSlugValue(node.id);

                  return (
                    <button
                      key={node.key}
                      type="button"
                      className={`w-full rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border/70 bg-background hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setSelectedPanel("node");
                        setSelectedNodeKey(node.key);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium leading-5">{node.title.trim() || `ノード${index + 1}`}</p>
                        {index === 0 ? <Badge variant="outline">ROOT</Badge> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {normalizedNodeId || "node-id 未入力"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <section className="space-y-2 rounded-lg border border-border/70 p-3">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">preview</h3>
              <p className="text-xs text-muted-foreground">talkId: {resolvedTalkIdPreview || "未確定"}</p>
              <p className="text-xs text-muted-foreground">rootNode: {resolvedRootNodePreview}</p>
              <p className="text-xs text-muted-foreground">ノード数: {nodeDrafts.length}</p>
            </section>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {selectedPanel === "talk" ? "トーク情報" : selectedNodeDraft?.title || "ノード未選択"}
                </CardTitle>
                <CardDescription>
                  {selectedPanel === "talk"
                    ? "編集UIと同じ感覚で、トーク全体の情報を先に確定します。"
                    : "ノードを追加しながら、IDと遷移先を構成できます。"}
                </CardDescription>
              </div>

              {selectedPanel === "talk" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateDraft("talkId", suggestedTalkId)}
                    disabled={!suggestedTalkId}
                  >
                    トークID候補
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateDraft("categoryId", suggestedCategoryId)}
                    disabled={!suggestedCategoryId}
                  >
                    カテゴリID候補
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!selectedNodeDraft || !suggestedNodeId) {
                        return;
                      }

                      updateNodeDraft(selectedNodeDraft.key, "id", suggestedNodeId);
                    }}
                    disabled={!selectedNodeDraft || !suggestedNodeId}
                  >
                    ノードID候補
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedNodeIndex <= 0}
                    onClick={() => moveSelectedNode(-1)}
                  >
                    上へ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedNodeIndex < 0 || selectedNodeIndex >= nodeDrafts.length - 1}
                    onClick={() => moveSelectedNode(1)}
                  >
                    下へ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNodeDraft}
                  >
                    追加
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={nodeDrafts.length <= 1}
                    onClick={removeSelectedNodeDraft}
                  >
                    削除
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {selectedPanel === "talk" ? (
              <>
                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">識別情報</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">トークID</label>
                      <Input
                        value={draft.talkId}
                        onChange={(event) => updateDraft("talkId", event.target.value)}
                        placeholder="例: gas-hojin-standard"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">トークタイトル</label>
                      <Input
                        value={draft.title}
                        onChange={(event) => updateDraft("title", event.target.value)}
                        placeholder="例: ガス法人向け導入トーク"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">商材コード</label>
                      <Input
                        list="product-code-suggestions"
                        value={draft.productCode}
                        onChange={(event) => updateDraft("productCode", event.target.value)}
                        placeholder="例: gas"
                      />
                      <datalist id="product-code-suggestions">
                        {productCodeSuggestions.map((code) => (
                          <option key={code} value={code} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">シーン</label>
                      <select
                        value={draft.scene}
                        onChange={(event) => updateDraft("scene", event.target.value as TalkScene)}
                        className="h-10 w-full rounded-md border border-border/70 bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        {sceneOptions.map((scene) => (
                          <option key={scene.value} value={scene.value}>
                            {scene.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">カテゴリID</label>
                      <Input
                        value={draft.categoryId}
                        onChange={(event) => updateDraft("categoryId", event.target.value)}
                        placeholder="例: gas-hojin"
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
                  </div>
                </section>

                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">補足情報</h3>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">概要</label>
                    <textarea
                      value={draft.summary}
                      onChange={(event) => updateDraft("summary", event.target.value)}
                      placeholder="このトークの狙いを簡潔に入力"
                      className="min-h-24 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">想定ペルソナ</label>
                      <Input
                        value={draft.targetPersona}
                        onChange={(event) => updateDraft("targetPersona", event.target.value)}
                        placeholder="例: 法人オフィス総務担当"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">難易度</label>
                      <select
                        value={draft.difficulty}
                        onChange={(event) =>
                          updateDraft("difficulty", event.target.value as TalkDifficulty)
                        }
                        className="h-10 w-full rounded-md border border-border/70 bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        {difficultyOptions.map((difficulty) => (
                          <option key={difficulty} value={difficulty}>
                            {difficulty}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">タグ（カンマ区切り）</label>
                    <Input
                      value={draft.tags}
                      onChange={(event) => updateDraft("tags", event.target.value)}
                      placeholder="例: 新商材, 初回案内"
                    />
                  </div>
                </section>
              </>
            ) : selectedNodeDraft ? (
              <>
                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">ノード情報</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">ノードID</label>
                      <Input
                        value={selectedNodeDraft.id}
                        onChange={(event) =>
                          updateNodeDraft(selectedNodeDraft.key, "id", event.target.value)
                        }
                        placeholder="例: gas-hojin-opening"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">ノード名</label>
                      <Input
                        value={selectedNodeDraft.title}
                        onChange={(event) =>
                          updateNodeDraft(selectedNodeDraft.key, "title", event.target.value)
                        }
                        placeholder="例: 導入トーク"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">種別</label>
                      <select
                        value={selectedNodeDraft.kind}
                        onChange={(event) =>
                          updateNodeDraft(
                            selectedNodeDraft.key,
                            "kind",
                            event.target.value as NodeKind,
                          )
                        }
                        className="h-10 w-full rounded-md border border-border/70 bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        {nodeKindOptions.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">反応ラベル（任意）</label>
                      <Input
                        value={selectedNodeDraft.reactionLabel}
                        onChange={(event) =>
                          updateNodeDraft(
                            selectedNodeDraft.key,
                            "reactionLabel",
                            event.target.value,
                          )
                        }
                        placeholder="例: 興味あり"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      次ノードID（カンマ区切り）
                    </label>
                    <Input
                      value={selectedNodeDraft.nextNodeIds}
                      onChange={(event) =>
                        updateNodeDraft(selectedNodeDraft.key, "nextNodeIds", event.target.value)
                      }
                      placeholder="例: gas-hojin-hearing, gas-hojin-objection"
                    />
                  </div>
                </section>

                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">本文</h3>
                  <textarea
                    value={selectedNodeDraft.lines}
                    onChange={(event) =>
                      updateNodeDraft(selectedNodeDraft.key, "lines", event.target.value)
                    }
                    className="min-h-56 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    spellCheck={false}
                  />
                </section>

                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">意図・NG・コツ</h3>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">意図</label>
                    <Input
                      value={selectedNodeDraft.intent}
                      onChange={(event) =>
                        updateNodeDraft(selectedNodeDraft.key, "intent", event.target.value)
                      }
                      placeholder="このノードで達成したいこと"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">NG例（1行1項目）</label>
                    <textarea
                      value={selectedNodeDraft.ngExamples}
                      onChange={(event) =>
                        updateNodeDraft(selectedNodeDraft.key, "ngExamples", event.target.value)
                      }
                      className="min-h-20 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">コツ（1行1項目）</label>
                    <textarea
                      value={selectedNodeDraft.tips}
                      onChange={(event) =>
                        updateNodeDraft(selectedNodeDraft.key, "tips", event.target.value)
                      }
                      className="min-h-20 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                  </div>
                </section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">編集対象のノードを左から選択してください。</p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
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
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setSelectedPanel((prev) => (prev === "talk" ? "node" : "talk"))}
              >
                {selectedPanel === "talk" ? "ノード編集へ" : "トーク情報へ"}
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
    </div>
  );
}
