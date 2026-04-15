"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, FilePenLine, Loader2, Save, ShieldAlert, TriangleAlert } from "lucide-react";

import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTalkByApi } from "@/lib/talk-portal-api";
import { type Talk } from "@/types/talk";

interface TalkEditorPageClientProps {
  talkId: string;
}

function parseTalkJson(raw: string, expectedTalkId: string): Talk {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSON形式が不正です");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("トークデータはオブジェクト形式で入力してください");
  }

  const talk = parsed as Talk;

  if (talk.id !== expectedTalkId) {
    throw new Error(`talk.id は ${expectedTalkId} のままにしてください`);
  }

  if (!Array.isArray(talk.nodes) || !Array.isArray(talk.rootNodeIds) || !Array.isArray(talk.tags)) {
    throw new Error("nodes / rootNodeIds / tags は配列である必要があります");
  }

  return talk;
}

export function TalkEditorPageClient({ talkId }: TalkEditorPageClientProps) {
  const { data, error, isLoading, reload } = useTalkBootstrapContext();

  const [jsonText, setJsonText] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const talk = useMemo(() => data?.talks.find((item) => item.id === talkId) ?? null, [data, talkId]);

  useEffect(() => {
    if (!talk || isDirty) {
      return;
    }

    setJsonText(JSON.stringify(talk, null, 2));
  }, [talk, isDirty]);

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
            <Link href={`/talks/${talkId}`}>詳細ページへ戻る</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!talk) {
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
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const parsedTalk = parseTalkJson(jsonText, talkId);
      const result = await updateTalkByApi(parsedTalk);
      setSaveMessage(
        result.revision
          ? `保存しました（revision: ${result.revision}, transport: ${result.transport}）`
          : `保存しました（transport: ${result.transport}）`,
      );
      setIsDirty(false);
      await reload();
    } catch (caught) {
      setSaveError(String(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href={`/talks/${talkId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          詳細ページへ戻る
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              <FilePenLine className="size-6 text-primary" aria-hidden="true" />
              トーク編集
            </h1>
            <p className="text-sm text-muted-foreground">{talk.title}</p>
          </div>
          <Badge variant="secondary">編集者: {data.user.email ?? "unknown"}</Badge>
        </div>
      </div>

      <Card className="border-border/80 bg-card">
        <CardHeader>
          <CardTitle className="text-base">トークJSON編集</CardTitle>
          <CardDescription>talk.id は変更せずに編集し、保存すると Apps Script doPost で反映されます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={jsonText}
            onChange={(event) => {
              setJsonText(event.target.value);
              setIsDirty(true);
            }}
            className="min-h-[520px] w-full rounded-lg border border-border/80 bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            spellCheck={false}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving || !isDirty}>
              {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              保存
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                setJsonText(JSON.stringify(talk, null, 2));
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
  );
}
