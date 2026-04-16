"use client";

import { useState } from "react";
import { ChevronDown, CornerDownRight, GitBranch, MessageCircleReply } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { SectionPointAccordion } from "@/components/talk/section-point-accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HIKARI_SCRIPT_SECTION_DEFS } from "@/lib/talk-sections";
import { type TalkNode } from "@/types/talk";

interface TalkScriptFlowProps {
  nodes: TalkNode[];
  rootNodeIds: string[];
  sectionTitleOverrides?: Record<string, string>;
}

type OutReply = {
  out: string;
  reply: string;
};

type ScriptSection = {
  id: string;
  title: string;
  lines: string[];
  outReplies: OutReply[];
  nodes?: TalkNode[];
};

const outReplyByNodeId: Record<string, OutReply[]> = {
  "hikari-open": [
    {
      out: "今時間ないので大丈夫です。",
      reply:
        "承知しました。30秒だけ要点をお伝えして、不要ならすぐ終了します。今回は工事費のご負担なしで切替できるご案内だけ先に共有しています。",
    },
    {
      out: "営業ならいらないです。",
      reply:
        "ご不安にさせてしまい失礼しました。営業というより、現在の電話回線の切替可否の事前案内です。ご不要ならこの場で終了できますのでご安心ください。",
    },
  ],
  "hikari-purpose": [
    {
      out: "このままじゃだめなの？変えないとだめなの？",
      reply:
        "もちろん、このままでも大丈夫です。今回、本来だと2万円前後かかる工事費のご負担がないタイミングなので、今のうちに進めたい方が多くご連絡しています。電話機や番号、使い勝手は変わりません。",
    },
    {
      out: "なんで急に連絡きたの？",
      reply:
        "ご案内の対象になっているお客様へ順次ご連絡しており、直近で切替費用のご負担がかからない受付枠があるため、このタイミングでご連絡しています。",
    },
  ],
  "hikari-hojin-purpose": [
    {
      out: "反応が薄い・不安そう",
      reply: "何かご不明な点とか、難しいこととかはございませんか？",
    },
  ],
  "hikari-benefit": [
    {
      out: "電話番号変わるなら困る。",
      reply: "番号は変わりません。今の電話機もそのままお使いいただける前提でご案内しています。",
    },
    {
      out: "工事って家の中まで入るの？",
      reply:
        "一部宅内作業がある場合がありますが、事前連絡のうえで短時間で終わる内容です。内容は当日担当が分かりやすくご説明します。",
    },
  ],
  "hikari-age-check": [
    {
      out: "年齢って関係あるの？",
      reply:
        "はい、電話での受付条件として80歳未満の方に限定されているため、確認だけお願いしています。条件外の場合は書面でのご案内に切り替えます。",
    },
  ],
  "hikari-price-closing": [
    {
      out: "今より高くなるなら嫌です。",
      reply: "その場合は無理に進めません。比較のうえでメリットがなければ現状維持で問題ありません。",
    },
    {
      out: "固定電話あまり使ってないから迷う。",
      reply:
        "使う頻度が少ない方ほど基本料金の差が重要になるため、まずは条件だけ確認して不要なら見送りで大丈夫です。",
    },
  ],
  "hikari-hojin-benefit": [
    {
      out: "はい",
      reply: "あ、そうですよね〜",
    },
    {
      out: "分からない",
      reply: "そうですよね〜。ただあまり使わない方だとこのくらいですので、基本的には変わらないのですが",
    },
  ],
  "hikari-confirm-1": [
    {
      out: "名義人本人じゃないけど進められる？",
      reply:
        "ありがとうございます。続柄とお名前を確認のうえ、必要に応じて確認担当から追加確認を入れた形で進められます。",
    },
    {
      out: "住所とか生年月日を伝えるのが不安。",
      reply:
        "ご不安はもっともです。受付に必要な項目だけを確認し、用途は工事連絡と本人確認に限定されます。不要な項目は伺いません。",
    },
  ],
  "hikari-next-steps": [
    {
      out: "工事の立ち会いが難しいかも。",
      reply:
        "立ち会い時間は事前連絡時に調整可能です。候補日時を複数お出ししますので、合わせやすい枠で調整しましょう。",
    },
  ],
  "hikari-family-consent": [
    {
      out: "家族に確認してからにしたい。",
      reply:
        "承知しました。確認しやすいよう要点を簡単にまとめてお伝えし、確認後に再連絡のタイミングだけ合わせさせてください。",
    },
  ],
  "hikari-contact": [
    {
      out: "番号をもう一度お願いします。",
      reply: "もちろんです。0000-000-000です。念のため復唱いただけますか。",
    },
  ],
  "hikari-double-check": [
    {
      out: "この後電話に出られないかもしれない。",
      reply:
        "ありがとうございます。可能な時間帯を教えていただければ、確認担当へ共有してその時間帯に優先してご連絡します。",
    },
  ],
  "hikari-hojin-double-check": [
    {
      out: "ない",
      reply:
        "ありがとうございます！では一度お電話をお切りになって、次のご連絡をお待ちください。今後ともよろしくお願いいたします。",
    },
  ],
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

export function TalkScriptFlow({ nodes, rootNodeIds, sectionTitleOverrides }: TalkScriptFlowProps) {
  const rootNodeId = rootNodeIds[0];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const sections: ScriptSection[] = HIKARI_SCRIPT_SECTION_DEFS
    .map((sectionDef) => {
      const sectionNodes = sectionDef.nodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is TalkNode => Boolean(node));

      return {
        id: sectionDef.id,
        title: sectionTitleOverrides?.[sectionDef.id] || sectionDef.title,
        lines: sectionNodes.flatMap((node) => node.readAloudScript ?? node.lines),
        outReplies: sectionNodes.flatMap((node) => outReplyByNodeId[node.id] ?? []),
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
          outReplies: outReplyByNodeId[node.id] ?? [],
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
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

        <div className="xl:sticky xl:top-20">
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

    const branchArrowNotes = notes
      .filter((note) => note.tone === "branch")
      .map((note) => {
        const parsed = tryParseArrowNote(note.text);
        if (!parsed) {
          return null;
        }

        return {
          trigger: parsed.trigger,
          action: parsed.action,
        };
      })
      .filter((note): note is { trigger: string; action: string } => Boolean(note));

    const remainingNotes = notes.filter((note) => !(note.tone === "branch" && Boolean(tryParseArrowNote(note.text))));
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

      {node.sectionTips ? (
        <SectionPointAccordion
          value={`${node.id}-section-points`}
          mindset={node.sectionTips.mindset}
          skill={node.sectionTips.skill}
        />
      ) : null}
    </>
  );
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

function OutReplyTree({ entries }: { entries: OutReply[] }) {
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
