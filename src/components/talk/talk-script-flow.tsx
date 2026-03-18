"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, RotateCcw, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type TalkNode } from "@/types/talk";

interface TalkScriptFlowProps {
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

export function TalkScriptFlow({ nodes, rootNodeIds }: TalkScriptFlowProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const rootNodeId = rootNodeIds[0];

  const [activeNodeId, setActiveNodeId] = useState<string | null>(rootNodeId ?? null);
  const [pathNodeIds, setPathNodeIds] = useState<string[]>(rootNodeId ? [rootNodeId] : []);
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(false);

  if (!rootNodeId) {
    return null;
  }

  const activeNode = activeNodeId ? nodeMap.get(activeNodeId) ?? null : null;
  const rootNode = nodeMap.get(rootNodeId) ?? null;

  if (!activeNode || !rootNode) {
    return null;
  }

  const outcomeNodes = activeNode.nextNodeIds
    .map((nextId) => nodeMap.get(nextId))
    .filter((node): node is TalkNode => Boolean(node));

  const moveToNode = (nextNodeId: string) => {
    setActiveNodeId(nextNodeId);
    setPathNodeIds((current) => [...current, nextNodeId]);
    setIsOutcomeOpen(false);
  };

  const resetFlow = () => {
    setActiveNodeId(rootNodeId);
    setPathNodeIds([rootNodeId]);
    setIsOutcomeOpen(false);
  };

  const activeStep = pathNodeIds.length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-900/12 bg-card p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-zinc-900 text-zinc-100">
            STEP {activeStep}
          </Badge>
          <span className="font-medium text-zinc-900">{activeNode.title}</span>
        </div>
        <Button variant="outline" size="sm" onClick={resetFlow}>
          <RotateCcw className="size-4" aria-hidden="true" />
          最初から
        </Button>
      </div>

      <Card className="border-zinc-900/15 bg-card shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-zinc-900 text-zinc-100">
              {kindLabel[activeNode.kind]}
            </Badge>
            {activeNode.reactionLabel ? (
              <Badge variant="outline" className="border-primary/40 bg-primary/10">
                {activeNode.reactionLabel}
              </Badge>
            ) : null}
          </div>
          <CardTitle className="text-xl text-zinc-900">{activeNode.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          <div className="space-y-3 rounded-lg border border-zinc-900/10 bg-background p-4 md:p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">第一声（固定表示）</p>
            {rootNode.lines.map((line, index) => (
              <p key={`root-${line}-${index}`} className="text-base leading-relaxed text-foreground md:text-[1.05rem]">
                {line}
              </p>
            ))}

            {activeNode.id !== rootNode.id ? (
              <>
                <Separator />
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">現在のアウト返し</p>
                {activeNode.lines.map((line, index) => (
                  <p key={`active-${line}-${index}`} className="text-base leading-relaxed text-foreground md:text-[1.05rem]">
                    {line}
                  </p>
                ))}
              </>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <InfoBox title="意図" body={activeNode.intent} />
            <InfoBox title="NG例" body={activeNode.ngExamples.join(" / ")} />
            <InfoBox title="コツ" body={activeNode.tips.join(" / ")} />
          </div>

          <Separator />

          {outcomeNodes.length > 0 ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between border-zinc-900/15 bg-background"
                onClick={() => setIsOutcomeOpen((current) => !current)}
              >
                アウト返しを{isOutcomeOpen ? "閉じる" : "表示"}
                <ChevronDown
                  className={`size-4 transition-transform ${isOutcomeOpen ? "rotate-180" : "rotate-0"}`}
                  aria-hidden="true"
                />
              </Button>

              {isOutcomeOpen ? (
                <div className="space-y-2">
                  {outcomeNodes.map((nextNode) => (
                    <button
                      key={nextNode.id}
                      type="button"
                      onClick={() => moveToNode(nextNode.id)}
                      className="w-full rounded-lg border border-zinc-900/10 bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{nextNode.reactionLabel ?? nextNode.title}</p>
                        <ArrowRight className="size-4 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-xs text-muted-foreground">例: {nextNode.lines[0]}</p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-primary/35 bg-primary/10 p-3 text-sm text-zinc-700">
              このノードは終端です。終話処理または次の教材へ進んでください。
            </div>
          )}

          <div className="rounded-lg border border-zinc-900/10 bg-muted/20 p-3">
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">分岐ログ</p>
            <p className="text-xs text-muted-foreground">{pathNodeIds.map((nodeId) => nodeMap.get(nodeId)?.title).filter(Boolean).join(" → ")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-900/10 bg-background p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
        <Target className="size-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">{body}</p>
    </div>
  );
}
