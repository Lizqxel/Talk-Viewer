"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, FilePenLine, FolderTree, Loader2, Trash2, TriangleAlert, UserRound } from "lucide-react";

import { ApiFallbackNotice } from "@/components/shared/api-fallback-notice";
import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { TalkScriptFlow } from "@/components/talk/talk-script-flow";
import { TalkTreeView } from "@/components/talk/talk-tree-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteTalkByApi } from "@/lib/talk-portal-api";

const ClosingManagerPanel = dynamic(
  () => import("@/components/talk/closing-manager-panel").then((module) => module.ClosingManagerPanel),
  { ssr: false },
);

interface TalkDetailPageClientProps {
  talkId: string;
}

export function TalkDetailPageClient({ talkId }: TalkDetailPageClientProps) {
  const router = useRouter();
  const { data, error, isLoading, isFallback, reload } = useTalkBootstrapContext();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!data.user?.canEdit || isDeleting) {
      return;
    }

    const confirmed = window.confirm(`「${talk.title}」を削除しますか？\nこの操作は元に戻せません。`);
    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteTalkByApi(talk.id);
      await reload();
      router.replace("/talks");
    } catch (caught) {
      setDeleteError(String(caught));
    } finally {
      setIsDeleting(false);
    }
  };

  const isScriptFlowTalk =
    talk.detailLayout === "script-flow" ||
    talk.id === "hikari-kojin-standard" ||
    talk.id === "hikari-hojin-standard" ||
    talk.id === "docomo-hikari-apo-basic-2";
  const productLabel = data.productLabels[talk.product] ?? talk.product;
  const sceneLabel = data.sceneLabels[talk.scene] ?? talk.scene;

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
              <Badge variant="secondary">{productLabel}</Badge>
              <Badge variant="outline">{sceneLabel}</Badge>
              <Badge variant="outline">{talk.difficulty}</Badge>
              <span className="text-xs text-muted-foreground">最終更新: {talk.updatedAt}</span>
            </div>
            {data.user?.canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/talks/editor?talkId=${encodeURIComponent(talk.id)}`}>
                    <FilePenLine className="size-4" aria-hidden="true" />
                    編集
                  </Link>
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => void handleDelete()} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                  削除
                </Button>
              </div>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{talk.title}</h1>
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground md:text-base">{talk.summary}</p>
          {deleteError ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {deleteError}
            </p>
          ) : null}
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
          <TalkScriptFlow
            nodes={talk.nodes}
            rootNodeIds={talk.rootNodeIds}
            sectionTitleOverrides={talk.sectionTitleOverrides}
          />
        ) : (
          <TalkTreeView nodes={talk.nodes} rootNodeIds={talk.rootNodeIds} />
        )}
      </section>
    </div>
  );
}