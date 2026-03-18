"use client";

import { useState } from "react";
import { ChevronDown, CornerDownRight, GitBranch, MessageCircleReply } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type TalkNode } from "@/types/talk";

interface TalkScriptFlowProps {
  nodes: TalkNode[];
  rootNodeIds: string[];
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
};

const hikariScriptSectionDefs = [
  {
    id: "opening",
    title: "オープニング",
    nodeIds: ["hikari-open"],
  },
  {
    id: "requirement",
    title: "要件説明",
    nodeIds: ["hikari-purpose"],
  },
  {
    id: "hearing",
    title: "現状確認(ヒアリング)",
    nodeIds: ["hikari-age-check", "hikari-confirm-1"],
  },
  {
    id: "benefit",
    title: "ベネフィット提示",
    nodeIds: ["hikari-benefit"],
  },
  {
    id: "appointment-qualification",
    title: "アポ診断",
    nodeIds: ["hikari-price-closing", "hikari-family-consent"],
  },
  {
    id: "closing",
    title: "クロージング(アポ獲得次)",
    nodeIds: ["hikari-next-steps", "hikari-contact", "hikari-double-check"],
  },
] as const;

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

export function TalkScriptFlow({ nodes, rootNodeIds }: TalkScriptFlowProps) {
  const rootNodeId = rootNodeIds[0];

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const sections: ScriptSection[] = hikariScriptSectionDefs
    .map((sectionDef) => {
      const sectionNodes = sectionDef.nodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is TalkNode => Boolean(node));

      return {
        id: sectionDef.id,
        title: sectionDef.title,
        lines: sectionNodes.flatMap((node) => node.lines),
        outReplies: sectionNodes.flatMap((node) => outReplyByNodeId[node.id] ?? []),
      };
    })
    .filter((section) => section.lines.length > 0);

  const [openSectionId, setOpenSectionId] = useState<string | null>(sections[0]?.id ?? null);

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
        <p className="text-sm text-muted-foreground">左側は台本を通しで読める表示です。アウト返しは右側の補助パネルで必要な時だけ開いて確認してください。</p>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <Card className="border-zinc-900/15 bg-card shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-xl text-zinc-900">台本全文</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pt-5">
            {sections.map((section, index) => (
              <motion.section
                key={section.id}
                className="pb-8 last:pb-0"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.42 }}
                onViewportEnter={() => setOpenSectionId(section.id)}
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
                  {section.lines.map((line, lineIndex) => (
                    <p key={`${section.id}-${lineIndex}`} className="text-[1.02rem] leading-8 text-foreground [text-wrap:pretty] md:text-[1.08rem]">
                      {renderLineWithCommaBreak(line, `${section.id}-${lineIndex}`)}
                    </p>
                  ))}
                </motion.div>
                {index < sections.length - 1 ? <Separator className="mt-6" /> : null}
              </motion.section>
            ))}
          </CardContent>
        </Card>

        <div className="xl:sticky xl:top-20">
          <OutReplyPanel sections={sections} openSectionId={openSectionId} onOpenSectionChange={setOpenSectionId} />
        </div>
      </div>
    </div>
  );
}

function OutReplyPanel({
  sections,
  openSectionId,
  onOpenSectionChange,
}: {
  sections: ScriptSection[];
  openSectionId: string | null;
  onOpenSectionChange: (sectionId: string | null) => void;
}) {

  return (
    <Card className="overflow-hidden border-zinc-900/15 bg-card shadow-sm">
      <div className="h-1.5 w-full bg-primary" aria-hidden="true" />
      <CardHeader className="border-b bg-muted/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-900">
          <GitBranch className="size-4 text-primary" aria-hidden="true" />
          アウト返し
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {sections.map((section) => {
          const isOpen = openSectionId === section.id;

          return (
            <motion.div
              key={section.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rounded-lg border border-zinc-900/10 bg-background"
            >
              <button
                type="button"
                onClick={() => onOpenSectionChange(openSectionId === section.id ? null : section.id)}
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
              onClick={() => setOpenIndex((current) => (current === index ? null : index))}
              className="w-full rounded-md border border-zinc-900/10 bg-muted/20 px-3 py-2 text-left transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">OUT</p>
              <p className="text-sm leading-relaxed text-foreground [text-wrap:pretty]">{renderLineWithCommaBreak(entry.out, `out-${index}`)}</p>
            </button>

            <AnimatePresence initial={false}>
              {openIndex === index ? (
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
