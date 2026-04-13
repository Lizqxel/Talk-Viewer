"use client";

import Link from "next/link";
import { ChevronLeft, FilePenLine, FolderTree, UserRound } from "lucide-react";

import { ApiFallbackNotice } from "@/components/shared/api-fallback-notice";
import { ApiStatusCard } from "@/components/shared/api-status-card";
import { ClosingManagerPanel } from "@/components/talk/closing-manager-panel";
import { TalkScriptFlow } from "@/components/talk/talk-script-flow";
import { TalkTreeView } from "@/components/talk/talk-tree-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTalkBootstrap } from "@/hooks/use-talk-bootstrap";

interface TalkDetailPageClientProps {
  talkId: string;
}

export function TalkDetailPageClient({ talkId }: TalkDetailPageClientProps) {
  const { data, error, isLoading, isFallback, reload } = useTalkBootstrap();

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  const talk = data.talks.find((item) => item.id === talkId);

  if (!talk) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">指定されたトークが見つかりません</h1>
        <p className="max-w-md text-sm text-muted-foreground">トークIDが未登録か、参照権限のないデータです。</p>
        <Button asChild>
          <Link href="/talks">トーク一覧へ戻る</Link>
        </Button>
      </div>
    );
  }

  const isScriptFlowTalk = talk.id === "hikari-kojin-standard" || talk.id === "hikari-hojin-standard";

  return (
    <div className="space-y-6">
      {isFallback ? <ApiFallbackNotice onRetry={() => void reload()} reason={error?.message} /> : null}
      <div className="space-y-3">
        <Link
          href="/talks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          トーク一覧に戻る
        </Link>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{data.productLabels[talk.product]}</Badge>
              <Badge variant="outline">{data.sceneLabels[talk.scene]}</Badge>
              <Badge variant="outline">{talk.difficulty}</Badge>
              <span className="text-xs text-muted-foreground">最終更新: {talk.updatedAt}</span>
            </div>
            {data.user?.canEdit ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/talks/${talk.id}/edit`}>
                  <FilePenLine className="size-4" aria-hidden="true" />
                  編集
                </Link>
              </Button>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{talk.title}</h1>
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-base">{talk.summary}</p>
        </div>
      </div>

      <Card className="border-border/80 bg-card">
        <CardContent className="space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <UserRound className="size-4" aria-hidden="true" />
            想定ペルソナ: {talk.targetPersona}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {talk.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="md:hidden">
        <ClosingManagerPanel />
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <FolderTree className="size-5 text-primary" aria-hidden="true" />
          {isScriptFlowTalk ? "台本フロー" : "トークツリー"}
        </h2>
        {isScriptFlowTalk ? (
          <TalkScriptFlow nodes={talk.nodes} rootNodeIds={talk.rootNodeIds} />
        ) : (
          <TalkTreeView nodes={talk.nodes} rootNodeIds={talk.rootNodeIds} />
        )}
      </section>
    </div>
  );
}