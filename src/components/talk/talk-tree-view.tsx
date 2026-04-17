"use client";

import { useMemo, useState } from "react";
import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Lightbulb,
  MessageCircleWarning,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type TalkNode } from "@/types/talk";

interface TalkTreeViewProps {
  nodes: TalkNode[];
  rootNodeIds: string[];
}

const kindLabel: Record<TalkNode["kind"], string> = {
  opening: "第一声",
  hearing: "ヒアリング",
  proposal: "提案",
  objection: "切り返し",
  closing: "クロージング",
  note: "補足",
};

type InlineNoteTone = "branch" | "operator" | "condition" | "warning";

function inlineToneClass(tone?: InlineNoteTone) {
  if (tone === "branch") {
    return "rounded-md border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm leading-7 text-primary";
  }

  if (tone === "warning") {
    return "rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm leading-7 font-semibold text-amber-800";
  }

  if (tone === "operator") {
    return "rounded-md border border-zinc-900/10 bg-muted/25 px-3 py-2.5 text-sm leading-7 text-muted-foreground";
  }

  return "rounded-md border border-cyan-300/50 bg-cyan-50/70 px-3 py-2.5 text-sm leading-7 text-cyan-900";
}

function tryParseArrowNote(text: string): { trigger: string; action: string } | null {
  const arrow = text.includes("→") ? "→" : text.includes("->") ? "->" : null;
  if (!arrow) {
    return null;
  }

  const [triggerRaw, actionRaw] = text.split(arrow, 2);
  const trigger = (triggerRaw ?? "").trim();
  const action = (actionRaw ?? "").trim();

  if (!trigger || !action) {
    return null;
  }

  return { trigger, action };
}

function getBranchGuidesForLine(node: TalkNode, lineNumber: number) {
  const structuredGuides = (node.branchGuides ?? [])
    .filter((guide) => guide.afterLine === lineNumber)
    .map((guide) => ({
      trigger: guide.trigger,
      action: guide.action,
    }));

  if (structuredGuides.length > 0) {
    return structuredGuides;
  }

  return (node.inlineNotes ?? [])
    .filter((note) => note.afterLine === lineNumber && note.tone === "branch")
    .map((note) => tryParseArrowNote(note.text))
    .filter((note): note is { trigger: string; action: string } => Boolean(note));
}

function BranchGuideInline({
  entries,
  openIndex,
  onToggle,
}: {
  entries: { trigger: string; action: string }[];
  openIndex: number | null;
  onToggle: (index: number) => void;
}) {
  const openEntry = typeof openIndex === "number" ? entries[openIndex] : null;

  return (
    <div className={inlineToneClass("branch")}>
      <p className="mb-1 text-[11px] font-semibold tracking-wide uppercase">会話ガイド</p>

      <div className="space-y-2">
        <div className="rounded border border-primary/30 bg-background/70 px-2.5 py-1.5">
          <p className="text-[11px] font-semibold text-primary/80">① 相手の反応</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {entries.map((entry, index) => {
              const isOpen = openIndex === index;

              return (
                <button
                  key={`${entry.trigger}-${index}`}
                  type="button"
                  onClick={() => onToggle(index)}
                  aria-expanded={isOpen}
                  className={`rounded border px-2 py-1 text-sm leading-6 transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    isOpen
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-primary/30 bg-background/70 text-foreground hover:bg-primary/8"
                  }`}
                >
                  {entry.trigger}
                </button>
              );
            })}
          </div>
        </div>

        {openEntry ? (
          <div className="rounded border border-primary/30 bg-background/70 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold text-primary/80">② 返しトーク</p>
            <p className="text-sm leading-6 text-foreground">{openEntry.action}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderInlineNote(text: string, tone?: InlineNoteTone) {
  if (tone === "condition" && text.includes("→")) {
    const [trigger, action] = text.split("→", 2);

    return (
      <div className={inlineToneClass(tone)}>
        <p className="mb-1 text-[11px] font-semibold tracking-wide uppercase">案内メモ</p>
        <div className="space-y-2">
          <div className="rounded border border-cyan-300/50 bg-background/70 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold text-cyan-800/80">この場合</p>
            <p className="text-sm leading-6 text-foreground">{trigger.trim()}</p>
          </div>
          <div className="rounded border border-cyan-300/50 bg-background/70 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold text-cyan-800/80">伝える内容</p>
            <p className="text-sm leading-6 text-foreground">{action.trim()}</p>
          </div>
        </div>
      </div>
    );
  }

  if (tone === "warning") {
    return (
      <div className={inlineToneClass(tone)}>
        <p className="text-[11px] font-semibold tracking-wide uppercase">注意</p>
        <p>{text}</p>
      </div>
    );
  }

  if (tone === "operator") {
    return (
      <div className={inlineToneClass(tone)}>
        <p className="text-[11px] font-semibold tracking-wide uppercase">補足</p>
        <p>{text}</p>
      </div>
    );
  }

  return <p className={inlineToneClass(tone)}>{text}</p>;
}

function renderLineWithCommaBreak(text: string, keyPrefix: string) {
  const parts = text.split("、");
  const lines: string[] = [];
  let currentLine = "";

  parts.forEach((part, index) => {
    currentLine += part;

    const hasComma = index < parts.length - 1;
    if (!hasComma) {
      return;
    }

    currentLine += "、";

    if ([...currentLine].length >= 8) {
      lines.push(currentLine);
      currentLine = "";
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.map((line, index) => (
    <span key={`${keyPrefix}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export function TalkTreeView({ nodes, rootNodeIds }: TalkTreeViewProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>(rootNodeIds);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(rootNodeIds[0] ?? null);

  const toggleNode = (nodeId: string) => {
    setExpandedNodeIds((current) =>
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId],
    );
  };

  const expandAll = () => setExpandedNodeIds(nodes.map((node) => node.id));
  const collapseAll = () => setExpandedNodeIds(rootNodeIds);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3">
        <p className="text-sm text-muted-foreground">分岐を辿りながら、各ノードの意図・NG・コツを確認できます。</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={expandAll}>
            すべて展開
          </Button>
          <Button size="sm" variant="outline" onClick={collapseAll}>
            ルートのみ表示
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rootNodeIds.map((nodeId) => {
          const node = nodeMap.get(nodeId);
          if (!node) {
            return null;
          }

          return (
            <TreeNodeCard
              key={node.id}
              node={node}
              nodeMap={nodeMap}
              expandedNodeIds={expandedNodeIds}
              onToggle={toggleNode}
              onSelect={setActiveNodeId}
              activeNodeId={activeNodeId}
              depth={0}
            />
          );
        })}
      </div>
    </div>
  );
}

function TreeNodeCard({
  node,
  nodeMap,
  expandedNodeIds,
  onToggle,
  onSelect,
  activeNodeId,
  depth,
}: {
  node: TalkNode;
  nodeMap: Map<string, TalkNode>;
  expandedNodeIds: string[];
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  activeNodeId: string | null;
  depth: number;
}) {
  const scriptLines = node.readAloudScript ?? node.lines;
  const lineAnchoredNotes = node.inlineNotes ?? [];
  const notesForLine = (lineNumber: number) => lineAnchoredNotes.filter((note) => note.afterLine === lineNumber);

  const [openBranchIndexByLine, setOpenBranchIndexByLine] = useState<Record<number, number | null>>({});

  const childNodes = node.nextNodeIds
    .map((nodeId) => nodeMap.get(nodeId))
    .filter((child): child is TalkNode => Boolean(child));

  const isExpanded = expandedNodeIds.includes(node.id);
  const isActive = activeNodeId === node.id;

  const renderNotes = (lineNumber: number) => {
    const notes = notesForLine(lineNumber);
    const branchArrowNotes = getBranchGuidesForLine(node, lineNumber);
    const hasStructuredBranchGuides = (node.branchGuides?.length ?? 0) > 0;
    const remainingNotes = notes.filter((note) => {
      if (note.tone !== "branch") {
        return true;
      }

      if (hasStructuredBranchGuides) {
        return false;
      }

      return !Boolean(tryParseArrowNote(note.text));
    });
    const openIndex = openBranchIndexByLine[lineNumber] ?? null;

    return (
      <>
        {branchArrowNotes.length > 0 ? (
          <BranchGuideInline
            entries={branchArrowNotes}
            openIndex={typeof openIndex === "number" ? openIndex : null}
            onToggle={(index) =>
              setOpenBranchIndexByLine((current) => ({
                ...current,
                [lineNumber]: current[lineNumber] === index ? null : index,
              }))
            }
          />
        ) : null}

        {remainingNotes.map((note, noteIndex) => (
          <div key={`${node.id}-inline-${lineNumber}-${noteIndex}`}>{renderInlineNote(note.text, note.tone as InlineNoteTone | undefined)}</div>
        ))}
      </>
    );
  };

  const handleCopy = async () => {
    const copyText = [
      `タイトル: ${node.title}`,
      "セリフ:",
      ...scriptLines,
      `意図: ${node.intent}`,
      `NG例: ${node.ngExamples.join(" / ")}`,
      `コツ: ${node.tips.join(" / ")}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      // no-op
    }
  };

  return (
    <div className="space-y-3">
      <motion.div layout>
      <Card className={`brand-card ${isActive ? "border-primary/60 bg-primary/5" : "border-border/80"}`}>
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onSelect(node.id);
                onToggle(node.id);
              }}
              className="group flex items-start gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{kindLabel[node.kind]}</Badge>
                  {node.reactionLabel ? <Badge variant="outline">{node.reactionLabel}</Badge> : null}
                </div>
                <h3 className="text-sm font-semibold text-foreground md:text-base">{node.title}</h3>
              </div>
            </button>

            <Button type="button" size="sm" variant={isActive ? "default" : "outline"} onClick={handleCopy}>
              <Copy className="size-4" aria-hidden="true" />
              コピー
            </Button>
          </div>

          <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-4 overflow-hidden"
            >
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">セリフ</p>
                <div className="space-y-2">
                  {renderNotes(0)}
                  {scriptLines.map((line, lineIndex) => {
                    const lineNumber = lineIndex + 1;

                    return (
                      <div key={`${node.id}-${lineIndex}`} className="space-y-1.5">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                          {renderLineWithCommaBreak(line, `${node.id}-${lineIndex}`)}
                        </p>
                        {renderNotes(lineNumber)}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <InfoPanel
                  icon={<Target className="size-4 text-primary" aria-hidden="true" />}
                  title="意図"
                  content={[node.intent]}
                />
                <InfoPanel
                  icon={<MessageCircleWarning className="size-4 text-primary" aria-hidden="true" />}
                  title="NG例"
                  content={node.ngExamples}
                />
                <InfoPanel
                  icon={<Lightbulb className="size-4 text-primary" aria-hidden="true" />}
                  title="コツ"
                  content={node.tips}
                />
              </div>

              {childNodes.length > 0 ? (
                <div className="space-y-1 rounded-lg border bg-background p-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">次の分岐</p>
                  <div className="flex flex-wrap gap-1.5">
                    {childNodes.map((child) => (
                      <Badge key={child.id} variant={activeNodeId === child.id ? "default" : "outline"}>
                        {child.reactionLabel ?? child.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </motion.div>
          ) : null}
          </AnimatePresence>
        </CardContent>
      </Card>
      </motion.div>

      {isExpanded && childNodes.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flow-connector space-y-3 border-l border-dashed pl-4"
          style={{ marginLeft: `${Math.max(depth, 0) * 8}px` }}
        >
          {childNodes.map((child) => (
            <TreeNodeCard
              key={child.id}
              node={child}
              nodeMap={nodeMap}
              expandedNodeIds={expandedNodeIds}
              onToggle={onToggle}
              onSelect={onSelect}
              activeNodeId={activeNodeId}
              depth={depth + 1}
            />
          ))}
        </motion.div>
      ) : null}
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  content,
}: {
  icon: ReactNode;
  title: string;
  content: string[];
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5">
        {content.map((item) => (
          <li key={item} className="text-xs leading-relaxed text-muted-foreground md:text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
