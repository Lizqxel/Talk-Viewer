"use client";

import { useEffect, useState } from "react";
import { ChevronDown, CornerDownRight, GitBranch, MessageCircleReply } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { SectionPointAccordion } from "@/components/talk/section-point-accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_OUT_REPLIES_BY_NODE_ID } from "@/lib/default-out-replies";
import { HIKARI_SCRIPT_SECTION_DEFS } from "@/lib/talk-sections";
import { type TalkNode, type TalkOutReply, type TalkSectionDef } from "@/types/talk";

interface TalkScriptFlowProps {
  nodes: TalkNode[];
  rootNodeIds: string[];
  sectionDefs?: TalkSectionDef[];
  sectionTitleOverrides?: Record<string, string>;
}

type ScriptSection = {
  id: string;
  title: string;
  lines: string[];
  outReplies: TalkOutReply[];
  nodes?: TalkNode[];
};

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
      children: guide.children,
    }));

  if (structuredGuides.length > 0) {
    return structuredGuides;
  }

  return (node.inlineNotes ?? [])
    .filter((note) => note.afterLine === lineNumber && note.tone === "branch")
    .map((note) => tryParseArrowNote(note.text))
    .filter((note): note is { trigger: string; action: string } => Boolean(note))
    .map((note) => ({
      ...note,
      children: undefined,
    }));
}

export function TalkScriptFlow({ nodes, rootNodeIds, sectionDefs, sectionTitleOverrides }: TalkScriptFlowProps) {
  const rootNodeId = rootNodeIds[0];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const effectiveSectionDefs = sectionDefs && sectionDefs.length > 0
    ? sectionDefs
    : HIKARI_SCRIPT_SECTION_DEFS.map((section) => ({
        id: section.id,
        title: sectionTitleOverrides?.[section.id] || section.title,
        nodeIds: [...section.nodeIds],
      }));

  const sections: ScriptSection[] = effectiveSectionDefs
    .map((sectionDef) => {
      const sectionNodes = sectionDef.nodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is TalkNode => Boolean(node));

      return {
        id: sectionDef.id,
        title: sectionDef.title,
        lines: sectionNodes.flatMap((node) => node.readAloudScript ?? node.lines),
        outReplies: sectionNodes.flatMap((node) =>
          node.outReplies ?? (DEFAULT_OUT_REPLIES_BY_NODE_ID[node.id] ?? []),
        ),
        nodes: sectionNodes,
      };
    })
    .filter((section) => (section.nodes?.length ?? 0) > 0);

  const displaySections: ScriptSection[] =
    sections.length > 0
      ? sections
      : nodes.map((node) => ({
          id: node.id,
          title: node.title,
          lines: node.readAloudScript ?? node.lines,
          outReplies: node.outReplies ?? (DEFAULT_OUT_REPLIES_BY_NODE_ID[node.id] ?? []),
          nodes: [node],
        }));

  const [manualOpenSectionIds, setManualOpenSectionIds] = useState<string[]>([]);
  const [autoOpenSectionId, setAutoOpenSectionId] = useState<string | null>(displaySections[0]?.id ?? null);

  if (!rootNodeId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative overflow-hidden rounded-xl border border-zinc-900/12 bg-card p-3"
      >
        <div className="absolute top-0 right-0 h-10 w-28 bg-primary/25 [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)]" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">スクロール中は該当セクションのアウト返しを一時表示し、手動で開いたセクションだけ開いた状態を保持します。</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-start md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-zinc-900/15 bg-card shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-xl text-zinc-900">台本全文</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pt-5">
            {displaySections.map((section, index) => (
              <motion.section
                key={section.id}
                className="pb-8 last:pb-0"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.42 }}
                onViewportEnter={() => setAutoOpenSectionId(section.id)}
                onViewportLeave={() =>
                  setAutoOpenSectionId((current) => (current === section.id ? null : current))
                }
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.03 }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-zinc-100">{index + 1}</span>
                  <h3 className="text-lg font-semibold tracking-tight text-zinc-900 md:text-xl">{section.title}</h3>
                </div>
                <motion.div
                  whileHover={{ y: -1.5 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative space-y-3 overflow-hidden rounded-lg border border-zinc-900/10 bg-background p-4 md:p-5"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary/80" aria-hidden="true" />
                  {section.nodes?.map((node) => <RenderNodeScript key={node.id} node={node} />)}
                </motion.div>
                {index < displaySections.length - 1 ? <Separator className="mt-6" /> : null}
              </motion.section>
            ))}
          </CardContent>
        </Card>

        <div className="sm:sticky sm:top-20">
          <OutReplyPanel
            sections={displaySections}
            manualOpenSectionIds={manualOpenSectionIds}
            autoOpenSectionId={autoOpenSectionId}
            onOpenSectionToggle={(sectionId) =>
              setManualOpenSectionIds((current) =>
                current.includes(sectionId)
                  ? current.filter((id) => id !== sectionId)
                  : [...current, sectionId],
              )
            }
          />
        </div>
      </div>
    </div>
  );
}

function RenderNodeScript({ node }: { node: TalkNode }) {
  const scriptLines = node.readAloudScript ?? node.lines;
  const lineAnchoredNotes = node.inlineNotes ?? [];
  const lineAnchoredPoints = node.pointBlocks ?? [];

  const [openBranchIndexByLine, setOpenBranchIndexByLine] = useState<Record<number, number | null>>({});

  const notesForLine = (lineNumber: number) => lineAnchoredNotes.filter((note) => note.afterLine === lineNumber);
  const pointsForLine = (lineNumber: number) => lineAnchoredPoints.filter((point) => point.afterLine === lineNumber);

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
          <div key={`${node.id}-inline-${lineNumber}-${noteIndex}`}>{renderInlineNote(note.text, note.tone)}</div>
        ))}

        {pointsForLine(lineNumber).map((point, pointIndex) => (
          <SectionPointAccordion
            key={`${node.id}-point-${lineNumber}-${pointIndex}`}
            value={`${node.id}-point-${lineNumber}-${pointIndex}`}
            mindset={point.mindset}
            skill={point.skill}
          />
        ))}
      </>
    );
  };

  return (
    <>
      {renderNotes(0)}

      {scriptLines.map((line, lineIndex) => {
        const lineNumber = lineIndex + 1;

        return (
          <div key={`${node.id}-${lineIndex}`} className="space-y-1.5">
            <p className="text-[1.02rem] leading-8 text-foreground md:text-[1.08rem]">
              {renderLineWithCommaBreak(line, `${node.id}-line-${lineIndex}`)}
            </p>

            {renderNotes(lineNumber)}
          </div>
        );
      })}
    </>
  );
}

function BranchGuideInline({
  entries,
  openIndex,
  onToggle,
}: {
  entries: { trigger: string; action: string; children?: { trigger: string; action: string }[] }[];
  openIndex: number | null;
  onToggle: (index: number) => void;
}) {
  const openEntry = typeof openIndex === "number" ? entries[openIndex] : null;
  const [openChildIndex, setOpenChildIndex] = useState<number | null>(null);

  useEffect(() => {
    setOpenChildIndex(null);
  }, [openIndex]);

  const childEntries = openEntry?.children ?? [];
  const openChildEntry = typeof openChildIndex === "number" ? childEntries[openChildIndex] : null;

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
          <>
            <div className="rounded border border-primary/30 bg-background/70 px-2.5 py-1.5">
              <p className="text-[11px] font-semibold text-primary/80">② 返しトーク</p>
              <p className="text-sm leading-6 text-foreground">{openEntry.action}</p>
            </div>

            {childEntries.length > 0 ? (
              <div className="rounded border border-primary/30 bg-background/70 px-2.5 py-1.5">
                <p className="text-[11px] font-semibold text-primary/80">③ 追加の反応</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {childEntries.map((entry, index) => {
                    const isOpen = openChildIndex === index;

                    return (
                      <button
                        key={`${entry.trigger}-child-${index}`}
                        type="button"
                        onClick={() => setOpenChildIndex((current) => (current === index ? null : index))}
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
            ) : null}

            {openChildEntry ? (
              <div className="rounded border border-primary/30 bg-background/70 px-2.5 py-1.5">
                <p className="text-[11px] font-semibold text-primary/80">④ 返しトーク</p>
                <p className="text-sm leading-6 text-foreground">{openChildEntry.action}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function inlineToneClass(tone?: "branch" | "operator" | "condition" | "warning") {
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

function renderInlineNote(text: string, tone?: "branch" | "operator" | "condition" | "warning") {
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

function OutReplyPanel({
  sections,
  manualOpenSectionIds,
  autoOpenSectionId,
  onOpenSectionToggle,
}: {
  sections: ScriptSection[];
  manualOpenSectionIds: string[];
  autoOpenSectionId: string | null;
  onOpenSectionToggle: (sectionId: string) => void;
}) {

  return (
    <Card className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden border-zinc-900/15 bg-card shadow-sm">
      <div className="h-1.5 w-full bg-primary" aria-hidden="true" />
      <CardHeader className="border-b bg-muted/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-900">
          <GitBranch className="size-4 text-primary" aria-hidden="true" />
          アウト返し
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 overflow-y-auto pt-4 pr-2">
        {sections.map((section) => {
          const isOpen =
            manualOpenSectionIds.includes(section.id) ||
            autoOpenSectionId === section.id;

          return (
            <motion.div
              key={section.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-lg border border-zinc-900/10 bg-background"
            >
              <button
                type="button"
                onClick={() => onOpenSectionToggle(section.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30"
              >
                <span className="text-sm font-medium text-zinc-900">{section.title}</span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`} />
              </button>
              <AnimatePresence initial={false}>{isOpen ? <OutReplyTree entries={section.outReplies} /> : null}</AnimatePresence>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function OutReplyTree({ entries }: { entries: TalkOutReply[] }) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden rounded-lg border border-zinc-900/10 bg-muted/20 p-3 text-sm text-muted-foreground"
      >
        このセクションのアウト返しは準備中です。
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="space-y-3 overflow-hidden border-t border-zinc-900/10 p-3.5"
    >
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={`${entry.out}-${index}`} className="space-y-2">
            <button
              type="button"
              onClick={() =>
                setOpenIndexes((current) =>
                  current.includes(index)
                    ? current.filter((item) => item !== index)
                    : [...current, index],
                )
              }
              className="w-full rounded-md border border-zinc-900/10 bg-muted/20 px-3 py-2 text-left transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">OUT</p>
              <p className="text-sm leading-relaxed text-foreground [text-wrap:pretty]">{renderLineWithCommaBreak(entry.out, `out-${index}`)}</p>
            </button>

            <AnimatePresence initial={false}>
              {openIndexes.includes(index) ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="pl-3">
                    <CornerDownRight className="size-4 text-primary" aria-hidden="true" />
                  </div>

                  <div className="rounded-md border border-primary/30 bg-primary/8 px-3 py-2">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      <MessageCircleReply className="size-3.5 text-primary" aria-hidden="true" />
                      アウト返し
                    </p>
                    <p className="text-sm leading-relaxed text-foreground [text-wrap:pretty]">{renderLineWithCommaBreak(entry.reply, `reply-${index}`)}</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
