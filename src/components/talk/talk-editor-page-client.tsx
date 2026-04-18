"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, FilePenLine, Loader2, MessageCircleReply, MessageSquarePlus, Plus, Save, ShieldAlert, Trash2, TriangleAlert } from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSectionDefsFromTalk, deriveTalkSections } from "@/lib/talk-sections";
import { deleteTalkByApi, publishScriptActivityHighlightByApi, updateTalkByApi } from "@/lib/talk-portal-api";
import { type NodeKind, type Talk, type TalkBranchGuide, type TalkNode, type TalkOutReply, type TalkSectionDef } from "@/types/talk";

interface TalkEditorPageClientProps {
  talkId: string;
}

type BranchGuideDraft = {
  id: string;
  afterLine: number;
  trigger: string;
  action: string;
};

type OutReplyDraft = TalkOutReply & {
  id: string;
};

function cloneTalk(talk: Talk): Talk {
  return JSON.parse(JSON.stringify(talk)) as Talk;
}

function clampAfterLine(value: number, maxLine: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(0, Math.trunc(value)), maxLine);
}

function getScriptLines(node: TalkNode) {
  return node.readAloudScript && node.readAloudScript.length > 0 ? node.readAloudScript : node.lines;
}

function parseArrowText(text: string): { trigger: string; action: string } | null {
  const arrow = text.includes("→") ? "→" : text.includes("->") ? "->" : null;
  if (!arrow) {
    return null;
  }

  const [triggerRaw, actionRaw] = text.split(arrow, 2);
  const trigger = String(triggerRaw ?? "").trim();
  const action = String(actionRaw ?? "").trim();

  if (!trigger || !action) {
    return null;
  }

  return { trigger, action };
}

function extractBranchGuides(node: TalkNode): BranchGuideDraft[] {
  if ((node.branchGuides?.length ?? 0) > 0) {
    return node.branchGuides!.map((guide, index) => ({
      id: `${node.id}-guide-${index}`,
      afterLine: guide.afterLine,
      trigger: guide.trigger,
      action: guide.action,
    }));
  }

  return (node.inlineNotes ?? [])
    .map((note, index) => {
      if (note.tone !== "branch") {
        return null;
      }

      const parsed = parseArrowText(note.text);
      if (!parsed) {
        return null;
      }

      return {
        id: `${node.id}-${index}`,
        afterLine: note.afterLine,
        trigger: parsed.trigger,
        action: parsed.action,
      };
    })
    .filter((guide): guide is BranchGuideDraft => Boolean(guide));
}

function normalizeNodeScriptLines(node: TalkNode, nextLines: string[]): TalkNode {
  const maxAfterLine = nextLines.length;

  return {
    ...node,
    lines: [...nextLines],
    readAloudScript: [...nextLines],
    inlineNotes: (node.inlineNotes ?? []).map((note) => ({
      ...note,
      afterLine: clampAfterLine(note.afterLine, maxAfterLine),
    })),
    pointBlocks: (node.pointBlocks ?? []).map((point) => ({
      ...point,
      afterLine: clampAfterLine(point.afterLine, maxAfterLine),
    })),
    branchGuides: (node.branchGuides ?? []).map((guide) => ({
      ...guide,
      afterLine: clampAfterLine(guide.afterLine, maxAfterLine),
    })),
  };
}

function getAfterLineOptions(lines: string[]) {
  const options = [{ value: 0, label: "本文の前" }];

  for (let i = 0; i < lines.length; i += 1) {
    const preview = String(lines[i] ?? "").slice(0, 18);
    options.push({
      value: i + 1,
      label: `${i + 1}行目の後${preview ? `: ${preview}` : ""}`,
    });
  }

  return options;
}

function updateNodeById(talk: Talk, nodeId: string, updater: (node: TalkNode) => TalkNode): Talk {
  return {
    ...talk,
    nodes: talk.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
  };
}

function normalizeTalkForSave(talk: Talk): Talk {
  return {
    ...talk,
    nodes: talk.nodes.map((node) => {
      const normalizedNode = normalizeNodeScriptLines(node, getScriptLines(node));
      const inlineNotesWithoutBranch = (normalizedNode.inlineNotes ?? []).filter((note) => note.tone !== "branch");

      return {
        ...normalizedNode,
        inlineNotes: inlineNotesWithoutBranch.length > 0 ? inlineNotesWithoutBranch : undefined,
      };
    }),
  };
}

function hasIncompleteBranchGuide(talk: Talk) {
  return talk.nodes.some((node) =>
    (node.branchGuides ?? []).some((guide) => !guide.trigger.trim() || !guide.action.trim()),
  );
}

function hasIncompleteOutReply(talk: Talk) {
  return talk.nodes.some((node) =>
    (node.outReplies ?? []).some((entry) => !entry.out.trim() || !entry.reply.trim()),
  );
}

function arrayMove<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [target] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, target);
  return next;
}

function renderSectionId(sectionId: string) {
  return sectionId.replace(/-/g, " ");
}

function sanitizeIdPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createUniqueSectionId(talk: Talk) {
  const existingIds = new Set((talk.sectionDefs ?? []).map((section) => section.id));
  let seq = (talk.sectionDefs?.length ?? 0) + 1;

  while (existingIds.has(`section-${seq}`)) {
    seq += 1;
  }

  return `section-${seq}`;
}

function createUniqueNodeId(talk: Talk, sectionId: string) {
  const existingIds = new Set(talk.nodes.map((node) => node.id));
  const base = sanitizeIdPart(`${talk.id}-${sectionId}`) || "node";
  let seq = 1;
  let candidate = `${base}-${seq}`;

  while (existingIds.has(candidate)) {
    seq += 1;
    candidate = `${base}-${seq}`;
  }

  return candidate;
}

function normalizeSectionDefs(sectionDefs: TalkSectionDef[], nodes: TalkNode[]) {
  const validNodeIds = new Set(nodes.map((node) => node.id));
  const usedNodeIds = new Set<string>();

  const normalized = sectionDefs.map((section) => {
    const nextNodeIds = section.nodeIds.filter((nodeId) => {
      if (!validNodeIds.has(nodeId) || usedNodeIds.has(nodeId)) {
        return false;
      }

      usedNodeIds.add(nodeId);
      return true;
    });

    return {
      ...section,
      nodeIds: nextNodeIds,
    };
  });

  const orphanNodeIds = nodes.map((node) => node.id).filter((nodeId) => !usedNodeIds.has(nodeId));
  if (orphanNodeIds.length > 0) {
    if (normalized[0]) {
      normalized[0] = {
        ...normalized[0],
        nodeIds: [...normalized[0].nodeIds, ...orphanNodeIds],
      };
    } else {
      normalized.push({
        id: "section-1",
        title: "セクション 1",
        nodeIds: orphanNodeIds,
      });
    }
  }

  return normalized;
}

function ensureSectionDefs(talk: Talk) {
  if ((talk.sectionDefs?.length ?? 0) > 0) {
    return talk.sectionDefs!;
  }

  return createSectionDefsFromTalk(talk);
}

function inferNodeKind(sectionId: string): NodeKind {
  const normalized = sectionId.toLowerCase();

  if (normalized.includes("opening")) return "opening";
  if (normalized.includes("hearing") || normalized.includes("requirement") || normalized.includes("age-check")) return "hearing";
  if (normalized.includes("proposal") || normalized.includes("benefit")) return "proposal";
  if (normalized.includes("objection")) return "objection";
  if (normalized.includes("closing")) return "closing";

  return "note";
}

function createNodeDraft(talk: Talk, sectionId: string): TalkNode {
  return {
    id: createUniqueNodeId(talk, sectionId),
    title: "新規ノード",
    kind: inferNodeKind(sectionId),
    lines: [""],
    readAloudScript: [""],
    intent: "",
    ngExamples: [],
    tips: [],
    nextNodeIds: [],
  };
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

export function TalkEditorPageClient({ talkId }: TalkEditorPageClientProps) {
  const router = useRouter();
  const { data, error, isLoading, reload } = useTalkBootstrapContext();

  const [draftTalk, setDraftTalk] = useState<Talk | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const talk = useMemo(() => data?.talks.find((item) => item.id === talkId) ?? null, [data, talkId]);

  useEffect(() => {
    if (!talk || isDirty) {
      return;
    }

    const cloned = cloneTalk(talk);
    if ((cloned.sectionDefs?.length ?? 0) === 0) {
      cloned.sectionDefs = createSectionDefsFromTalk(cloned);
    }

    setDraftTalk(cloned);
  }, [talk, isDirty]);

  const sections = useMemo(() => {
    if (!draftTalk) {
      return [];
    }
    return deriveTalkSections(draftTalk, { includeEmptySections: true });
  }, [draftTalk]);

  useEffect(() => {
    if (sections.length === 0) {
      return;
    }

    const currentSection = sections.find((section) => section.id === selectedSectionId);
    if (!currentSection) {
      const firstSection = sections[0];
      setSelectedSectionId(firstSection.id);
      setSelectedNodeId(firstSection.nodes[0]?.id ?? "");
      return;
    }

    const nodeExists = currentSection.nodes.some((node) => node.id === selectedNodeId);
    if (!nodeExists) {
      setSelectedNodeId(currentSection.nodes[0]?.id ?? "");
    }
  }, [sections, selectedSectionId, selectedNodeId]);

  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null;
  const selectedNode = selectedSection?.nodes.find((node) => node.id === selectedNodeId) ?? selectedSection?.nodes[0] ?? null;
  const selectedScriptLines = selectedNode ? getScriptLines(selectedNode) : [];
  const afterLineOptions = getAfterLineOptions(selectedScriptLines);

  const setDirtyState = () => {
    setIsDirty(true);
    setSaveMessage(null);
    setSaveError(null);
  };

  const mutateTalk = (updater: (prev: Talk) => Talk) => {
    setDraftTalk((prev) => {
      if (!prev) {
        return prev;
      }
      return updater(prev);
    });
    setDirtyState();
  };

  const mutateNode = (nodeId: string, updater: (node: TalkNode) => TalkNode) => {
    mutateTalk((prevTalk) => updateNodeById(prevTalk, nodeId, updater));
  };

  const updateGuides = (node: TalkNode, updater: (guides: BranchGuideDraft[]) => BranchGuideDraft[]) => {
    const currentGuides = extractBranchGuides(node);
    const nextGuides = updater(currentGuides);
    const maxAfterLine = getScriptLines(node).length;
    const normalizedGuides: TalkBranchGuide[] = nextGuides.map((guide) => ({
      afterLine: clampAfterLine(guide.afterLine, maxAfterLine),
      trigger: guide.trigger,
      action: guide.action,
    }));

    mutateNode(node.id, (currentNode) => ({
      ...currentNode,
      branchGuides: normalizedGuides,
    }));
  };

  const handleAddSection = () => {
    let nextSectionId = "";

    mutateTalk((prevTalk) => {
      const sectionDefs = ensureSectionDefs(prevTalk);
      nextSectionId = createUniqueSectionId({ ...prevTalk, sectionDefs });

      return {
        ...prevTalk,
        sectionDefs: [
          ...sectionDefs,
          {
            id: nextSectionId,
            title: "新規セクション",
            nodeIds: [],
          },
        ],
      };
    });

    if (nextSectionId) {
      setSelectedSectionId(nextSectionId);
      setSelectedNodeId("");
    }
  };

  const handleMoveSection = (fromIndex: number, toIndex: number) => {
    mutateTalk((prevTalk) => {
      const sectionDefs = ensureSectionDefs(prevTalk);
      return {
        ...prevTalk,
        sectionDefs: arrayMove(sectionDefs, fromIndex, toIndex),
      };
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    const targetSection = sections.find((section) => section.id === sectionId);
    if (!targetSection) {
      return;
    }

    const firstConfirm = window.confirm(`「${targetSection.title}」を削除しますか？`);
    if (!firstConfirm) {
      return;
    }

    const nodeCount = targetSection.nodes.length;
    const secondConfirm = window.confirm(
      `配下ノード ${nodeCount} 件も一括削除されます。\n本当に削除してよいですか？`,
    );
    if (!secondConfirm) {
      return;
    }

    mutateTalk((prevTalk) => {
      const sectionDefs = ensureSectionDefs(prevTalk);
      const removedNodeIds = new Set((sectionDefs.find((section) => section.id === sectionId)?.nodeIds ?? []));

      const nextNodes = prevTalk.nodes
        .filter((node) => !removedNodeIds.has(node.id))
        .map((node) => ({
          ...node,
          nextNodeIds: node.nextNodeIds.filter((nextId) => !removedNodeIds.has(nextId)),
        }));

      const nextSectionDefs = normalizeSectionDefs(
        sectionDefs
          .filter((section) => section.id !== sectionId)
          .map((section) => ({
            ...section,
            nodeIds: section.nodeIds.filter((nodeId) => !removedNodeIds.has(nodeId)),
          })),
        nextNodes,
      );

      const validNodeIds = new Set(nextNodes.map((node) => node.id));
      const nextRootNodeIds = prevTalk.rootNodeIds.filter((nodeId) => validNodeIds.has(nodeId));

      return {
        ...prevTalk,
        nodes: nextNodes,
        rootNodeIds:
          nextRootNodeIds.length > 0
            ? nextRootNodeIds
            : nextNodes[0]
              ? [nextNodes[0].id]
              : [],
        sectionDefs: nextSectionDefs,
      };
    });
  };

  const handleAddNodeToSection = (sectionId: string) => {
    let nextNodeId = "";

    mutateTalk((prevTalk) => {
      const sectionDefs = ensureSectionDefs(prevTalk);
      const sectionIndex = sectionDefs.findIndex((section) => section.id === sectionId);
      if (sectionIndex < 0) {
        return prevTalk;
      }

      const nextNode = createNodeDraft({ ...prevTalk, sectionDefs }, sectionId);
      nextNodeId = nextNode.id;

      const nextSectionDefs = sectionDefs.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              nodeIds: [...section.nodeIds, nextNode.id],
            }
          : section,
      );

      return {
        ...prevTalk,
        nodes: [...prevTalk.nodes, nextNode],
        rootNodeIds: prevTalk.rootNodeIds.length > 0 ? prevTalk.rootNodeIds : [nextNode.id],
        sectionDefs: nextSectionDefs,
      };
    });

    if (nextNodeId) {
      setSelectedSectionId(sectionId);
      setSelectedNodeId(nextNodeId);
    }
  };

  const handleMoveNodeInSection = (sectionId: string, fromIndex: number, toIndex: number) => {
    mutateTalk((prevTalk) => {
      const sectionDefs = ensureSectionDefs(prevTalk);

      return {
        ...prevTalk,
        sectionDefs: sectionDefs.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                nodeIds: arrayMove(section.nodeIds, fromIndex, toIndex),
              }
            : section,
        ),
      };
    });
  };

  const handleDeleteNodeInSection = (nodeId: string) => {
    const node = draftTalk?.nodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }

    const confirmed = window.confirm(`ノード「${node.title}」を削除しますか？`);
    if (!confirmed) {
      return;
    }

    mutateTalk((prevTalk) => {
      const sectionDefs = ensureSectionDefs(prevTalk);
      const nextNodes = prevTalk.nodes
        .filter((item) => item.id !== nodeId)
        .map((item) => ({
          ...item,
          nextNodeIds: item.nextNodeIds.filter((nextId) => nextId !== nodeId),
        }));

      const nextSectionDefs = normalizeSectionDefs(
        sectionDefs.map((section) => ({
          ...section,
          nodeIds: section.nodeIds.filter((id) => id !== nodeId),
        })),
        nextNodes,
      );

      const validNodeIds = new Set(nextNodes.map((item) => item.id));
      const nextRootNodeIds = prevTalk.rootNodeIds.filter((id) => validNodeIds.has(id));

      return {
        ...prevTalk,
        nodes: nextNodes,
        rootNodeIds:
          nextRootNodeIds.length > 0
            ? nextRootNodeIds
            : nextNodes[0]
              ? [nextNodes[0].id]
              : [],
        sectionDefs: nextSectionDefs,
      };
    });
  };

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  if (!data.user?.canEdit) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
            編集権限がありません
          </CardTitle>
          <CardDescription>Editorsシートに自分のメールを登録し、can_edit と is_active を TRUE に設定してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/talks">トーク一覧へ戻る</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!talk || !draftTalk) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">対象トークが見つかりません</CardTitle>
          <CardDescription>talkId が存在しないか、参照データが未投入です。初期投入はターミナルから npm run migrate:talks を実行してください。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
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

    if (hasIncompleteBranchGuide(draftTalk)) {
      setSaveError("会話ガイドに未入力があります");
      return;
    }

    if (hasIncompleteOutReply(draftTalk)) {
      setSaveError("アウト返しに未入力があります");
      return;
    }

    setIsSaving(true);

    try {
      const normalized = normalizeTalkForSave(draftTalk);
      const result = await updateTalkByApi(normalized);
      let notificationError: string | null = null;

      try {
        await publishScriptActivityHighlightByApi({
          action: "edited",
          talkId: normalized.id,
          talkTitle: normalized.title,
          actorEmail: formatUserLabel(data.user?.name, data.user?.email),
        });
      } catch (caught) {
        notificationError = toErrorMessage(caught);
      }

      const saveBaseMessage = result.revision
        ? `保存しました（revision: ${result.revision}, transport: ${result.transport}）`
        : `保存しました（transport: ${result.transport}）`;

      setSaveMessage(
        notificationError
          ? `${saveBaseMessage}（通知の反映に失敗しました）`
          : `${saveBaseMessage}（ホームの重要情報に通知しました）`,
      );

      if (notificationError) {
        setSaveError(`保存は完了しましたが、通知の反映に失敗しました: ${notificationError}`);
      }

      setDraftTalk(normalized);
      setIsDirty(false);
      await reload();
    } catch (caught) {
      setSaveError(toErrorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    const confirmed = window.confirm(`「${talk.title}」を削除しますか？\nこの操作は元に戻せません。`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      await deleteTalkByApi(talk.id);
      await reload();
      router.replace("/talks");
    } catch (caught) {
      setSaveError(toErrorMessage(caught));
    } finally {
      setIsDeleting(false);
    }
  };

  const currentGuides = selectedNode ? extractBranchGuides(selectedNode) : [];
  const currentOutReplies: OutReplyDraft[] = (selectedNode?.outReplies ?? []).map((entry, index) => ({
    id: `${selectedNode?.id ?? "node"}-out-reply-${index}`,
    out: entry.out,
    reply: entry.reply,
  }));
  const currentPointBlocks = selectedNode?.pointBlocks ?? [];

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
              <FilePenLine className="size-6 text-primary" aria-hidden="true" />
              トーク編集
            </h1>
            <p className="text-sm text-muted-foreground">{draftTalk.title}</p>
          </div>
          <Badge variant="secondary">編集者: {formatUserLabel(data.user?.name, data.user?.email)}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">セクション</CardTitle>
                <CardDescription>セクション内の + からノードを追加します。</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSection}>
                <Plus className="size-4" aria-hidden="true" />
                セクション追加
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.map((section, sectionIndex) => {
              const isSelected = selectedSection?.id === section.id;

              return (
                <div key={section.id} className={`rounded-lg border p-3 ${isSelected ? "border-primary/50 bg-primary/5" : "border-border/70"}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{renderSectionId(section.id)}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={sectionIndex === 0}
                          onClick={() => handleMoveSection(sectionIndex, sectionIndex - 1)}
                        >
                          上へ
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={sectionIndex === sections.length - 1}
                          onClick={() => handleMoveSection(sectionIndex, sectionIndex + 1)}
                        >
                          下へ
                        </Button>
                        <Button type="button" variant="outline" size="xs" onClick={() => handleDeleteSection(section.id)}>
                          削除
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={section.title}
                      onChange={(event) => {
                        const nextTitle = event.target.value;
                        mutateTalk((prevTalk) => {
                          const sectionDefs = ensureSectionDefs(prevTalk);
                          return {
                            ...prevTalk,
                            sectionDefs: sectionDefs.map((item) =>
                              item.id === section.id
                                ? {
                                    ...item,
                                    title: nextTitle,
                                  }
                                : item,
                            ),
                          };
                        });
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddNodeToSection(section.id)}>
                      <Plus className="size-4" aria-hidden="true" />
                      このセクションにノード追加
                    </Button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {section.nodes.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border/70 px-2.5 py-2 text-xs text-muted-foreground">
                        ノードはまだありません
                      </p>
                    ) : null}

                    {section.nodes.map((node, nodeIndex) => {
                      const isNodeSelected = selectedNode?.id === node.id;

                      return (
                        <div key={node.id} className="rounded-md border border-border/60 bg-background p-1.5">
                          <button
                            type="button"
                            className={`w-full rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${
                              isNodeSelected
                                ? "border-primary/60 bg-primary/10 text-foreground"
                                : "border-border/70 bg-background hover:bg-muted/50"
                            }`}
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              setSelectedNodeId(node.id);
                            }}
                          >
                            <p className="font-medium leading-5">{node.title}</p>
                          </button>
                          <div className="mt-1 flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={nodeIndex === 0}
                              onClick={() => handleMoveNodeInSection(section.id, nodeIndex, nodeIndex - 1)}
                            >
                              上へ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={nodeIndex === section.nodes.length - 1}
                              onClick={() => handleMoveNodeInSection(section.id, nodeIndex, nodeIndex + 1)}
                            >
                              下へ
                            </Button>
                            <Button type="button" variant="outline" size="xs" onClick={() => handleDeleteNodeInSection(node.id)}>
                              削除
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{selectedNode ? selectedNode.title : "ノード未選択"}</CardTitle>
                <CardDescription>本文の行間に会話ガイドとポイントを挿入できます。</CardDescription>
              </div>
              {selectedNode ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      mutateNode(selectedNode.id, (node) => ({
                        ...node,
                        outReplies: [
                          ...(node.outReplies ?? []),
                          {
                            out: "",
                            reply: "",
                          },
                        ],
                      }));
                    }}
                  >
                    <MessageCircleReply className="size-4" aria-hidden="true" />
                    アウト返し追加
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const defaultAfterLine = selectedScriptLines.length;
                      updateGuides(selectedNode, (guides) => [
                        ...guides,
                        {
                          id: `${selectedNode.id}-guide-${Date.now()}`,
                          afterLine: defaultAfterLine,
                          trigger: "",
                          action: "",
                        },
                      ]);
                    }}
                  >
                    <MessageSquarePlus className="size-4" aria-hidden="true" />
                    会話ガイド追加
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const defaultAfterLine = selectedScriptLines.length;
                      mutateNode(selectedNode.id, (node) => ({
                        ...node,
                        pointBlocks: [
                          ...(node.pointBlocks ?? []),
                          {
                            afterLine: defaultAfterLine,
                            mindset: "",
                            skill: "",
                          },
                        ],
                      }));
                    }}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    ポイント追加
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {!selectedNode ? (
              <p className="text-sm text-muted-foreground">編集対象のノードを左の一覧から選択してください。</p>
            ) : (
              <>
                <section className="space-y-2 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">ノードタイトル</h3>
                  <Input
                    value={selectedNode.title}
                    onChange={(event) => {
                      const nextTitle = event.target.value;
                      mutateNode(selectedNode.id, (node) => ({
                        ...node,
                        title: nextTitle,
                      }));
                    }}
                    placeholder="ノードタイトル"
                  />
                </section>

                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">本文</h3>
                  <textarea
                    value={selectedScriptLines.join("\n")}
                    onChange={(event) => {
                      const nextLines = event.target.value.split(/\r?\n/);
                      mutateNode(selectedNode.id, (node) => normalizeNodeScriptLines(node, nextLines));
                    }}
                    className="min-h-64 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    spellCheck={false}
                  />
                </section>

                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">会話ガイド（分岐）</h3>
                  {currentGuides.length === 0 ? (
                    <p className="text-sm text-muted-foreground">会話ガイドはまだありません。ノード右上の会話ガイド追加で作成できます。</p>
                  ) : (
                    <div className="space-y-2">
                      {currentGuides.map((guide, guideIndex) => (
                        <div key={guide.id} className="space-y-2 rounded-md border border-border/60 p-2.5">
                          <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]">
                            <select
                              value={String(guide.afterLine)}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                updateGuides(selectedNode, (guides) =>
                                  guides.map((item, index) =>
                                    index === guideIndex
                                      ? {
                                          ...item,
                                          afterLine: clampAfterLine(value, selectedScriptLines.length),
                                        }
                                      : item,
                                  ),
                                );
                              }}
                              className="h-9 rounded-md border border-border/70 bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              {afterLineOptions.map((option) => (
                                <option key={`guide-${option.value}`} value={String(option.value)}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <Input
                              value={guide.trigger}
                              placeholder="相手の反応ラベル"
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                updateGuides(selectedNode, (guides) =>
                                  guides.map((item, index) =>
                                    index === guideIndex
                                      ? {
                                          ...item,
                                          trigger: nextValue,
                                        }
                                      : item,
                                  ),
                                );
                              }}
                            />
                          </div>
                          <textarea
                            value={guide.action}
                            placeholder="返しトーク"
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              updateGuides(selectedNode, (guides) =>
                                guides.map((item, index) =>
                                  index === guideIndex
                                    ? {
                                        ...item,
                                        action: nextValue,
                                      }
                                    : item,
                                ),
                              );
                            }}
                            className="min-h-20 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={guideIndex === 0}
                              onClick={() => {
                                updateGuides(selectedNode, (guides) => arrayMove(guides, guideIndex, guideIndex - 1));
                              }}
                            >
                              上へ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={guideIndex === currentGuides.length - 1}
                              onClick={() => {
                                updateGuides(selectedNode, (guides) => arrayMove(guides, guideIndex, guideIndex + 1));
                              }}
                            >
                              下へ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                updateGuides(selectedNode, (guides) => guides.filter((_, index) => index !== guideIndex));
                              }}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">アウト返し</h3>
                  {currentOutReplies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">アウト返しはまだありません。ノード右上のアウト返し追加で作成できます。</p>
                  ) : (
                    <div className="space-y-2">
                      {currentOutReplies.map((entry, outReplyIndex) => (
                        <div key={entry.id} className="space-y-2 rounded-md border border-border/60 p-2.5">
                          <Input
                            value={entry.out}
                            placeholder="OUT（お客様の反応）"
                            onChange={(event) => {
                              const nextOut = event.target.value;
                              mutateNode(selectedNode.id, (node) => ({
                                ...node,
                                outReplies: (node.outReplies ?? []).map((item, index) =>
                                  index === outReplyIndex
                                    ? {
                                        ...item,
                                        out: nextOut,
                                      }
                                    : item,
                                ),
                              }));
                            }}
                          />

                          <textarea
                            value={entry.reply}
                            placeholder="アウト返し"
                            onChange={(event) => {
                              const nextReply = event.target.value;
                              mutateNode(selectedNode.id, (node) => ({
                                ...node,
                                outReplies: (node.outReplies ?? []).map((item, index) =>
                                  index === outReplyIndex
                                    ? {
                                        ...item,
                                        reply: nextReply,
                                      }
                                    : item,
                                ),
                              }));
                            }}
                            className="min-h-20 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={outReplyIndex === 0}
                              onClick={() => {
                                mutateNode(selectedNode.id, (node) => ({
                                  ...node,
                                  outReplies: arrayMove(node.outReplies ?? [], outReplyIndex, outReplyIndex - 1),
                                }));
                              }}
                            >
                              上へ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={outReplyIndex === currentOutReplies.length - 1}
                              onClick={() => {
                                mutateNode(selectedNode.id, (node) => ({
                                  ...node,
                                  outReplies: arrayMove(node.outReplies ?? [], outReplyIndex, outReplyIndex + 1),
                                }));
                              }}
                            >
                              下へ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                mutateNode(selectedNode.id, (node) => ({
                                  ...node,
                                  outReplies: (node.outReplies ?? []).filter((_, index) => index !== outReplyIndex),
                                }));
                              }}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3 rounded-lg border border-border/70 p-3">
                  <h3 className="text-sm font-semibold">ポイント（行間挿入）</h3>
                  {currentPointBlocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">行間ポイントはまだありません。ノード右上のポイント追加で作成できます。</p>
                  ) : (
                    <div className="space-y-2">
                      {currentPointBlocks.map((pointBlock, pointIndex) => (
                        <div key={`${selectedNode.id}-point-${pointIndex}`} className="space-y-2 rounded-md border border-border/60 p-2.5">
                          <select
                            value={String(pointBlock.afterLine)}
                            onChange={(event) => {
                              const nextAfterLine = Number(event.target.value);
                              mutateNode(selectedNode.id, (node) => ({
                                ...node,
                                pointBlocks: (node.pointBlocks ?? []).map((item, index) =>
                                  index === pointIndex
                                    ? {
                                        ...item,
                                        afterLine: clampAfterLine(nextAfterLine, selectedScriptLines.length),
                                      }
                                    : item,
                                ),
                              }));
                            }}
                            className="h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            {afterLineOptions.map((option) => (
                              <option key={`point-${option.value}`} value={String(option.value)}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <textarea
                            value={pointBlock.mindset}
                            placeholder="意識していること"
                            onChange={(event) => {
                              const nextMindset = event.target.value;
                              mutateNode(selectedNode.id, (node) => ({
                                ...node,
                                pointBlocks: (node.pointBlocks ?? []).map((item, index) =>
                                  index === pointIndex
                                    ? {
                                        ...item,
                                        mindset: nextMindset,
                                      }
                                    : item,
                                ),
                              }));
                            }}
                            className="min-h-20 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />

                          <textarea
                            value={pointBlock.skill}
                            placeholder="成績アップのコツ"
                            onChange={(event) => {
                              const nextSkill = event.target.value;
                              mutateNode(selectedNode.id, (node) => ({
                                ...node,
                                pointBlocks: (node.pointBlocks ?? []).map((item, index) =>
                                  index === pointIndex
                                    ? {
                                        ...item,
                                        skill: nextSkill,
                                      }
                                    : item,
                                ),
                              }));
                            }}
                            className="min-h-20 w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={pointIndex === 0}
                              onClick={() => {
                                mutateNode(selectedNode.id, (node) => ({
                                  ...node,
                                  pointBlocks: arrayMove(node.pointBlocks ?? [], pointIndex, pointIndex - 1),
                                }));
                              }}
                            >
                              上へ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={pointIndex === currentPointBlocks.length - 1}
                              onClick={() => {
                                mutateNode(selectedNode.id, (node) => ({
                                  ...node,
                                  pointBlocks: arrayMove(node.pointBlocks ?? [], pointIndex, pointIndex + 1),
                                }));
                              }}
                            >
                              下へ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                mutateNode(selectedNode.id, (node) => ({
                                  ...node,
                                  pointBlocks: (node.pointBlocks ?? []).filter((_, index) => index !== pointIndex),
                                }));
                              }}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button type="button" onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
                {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                保存
              </Button>
              <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting || isSaving}>
                {isDeleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                削除
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving || isDeleting}
                onClick={() => {
                  setDraftTalk(cloneTalk(talk));
                  setIsDirty(false);
                  setSaveError(null);
                  setSaveMessage(null);
                }}
              >
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
