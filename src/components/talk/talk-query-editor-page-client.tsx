"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FilePenLine, SearchX } from "lucide-react";

import { TalkEditorPageClient } from "@/components/talk/talk-editor-page-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function normalizeSlugValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildTalkEditorHref(talkId: string) {
  return `/talks/editor?talkId=${encodeURIComponent(talkId)}`;
}

export function TalkQueryEditorPageClient() {
  const router = useRouter();
  const [queryTalkId, setQueryTalkId] = useState("");
  const talkId = normalizeSlugValue(queryTalkId);
  const [manualTalkId, setManualTalkId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setQueryTalkId(params.get("talkId") ?? "");
  }, []);

  useEffect(() => {
    setManualTalkId(talkId);
  }, [talkId]);

  if (talkId) {
    return <TalkEditorPageClient talkId={talkId} />;
  }

  const normalizedManualTalkId = normalizeSlugValue(manualTalkId);

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SearchX className="size-4 text-primary" aria-hidden="true" />
            編集対象のトークIDが未指定です
          </CardTitle>
          <CardDescription>
            talkId を入力して固定URLの編集画面を開いてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={manualTalkId}
            onChange={(event) => setManualTalkId(event.target.value)}
            placeholder="例: gas-hojin-standard"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={!normalizedManualTalkId}
              onClick={() => {
                if (!normalizedManualTalkId) {
                  return;
                }

                setQueryTalkId(normalizedManualTalkId);
                router.replace(buildTalkEditorHref(normalizedManualTalkId));
              }}
            >
              <FilePenLine className="size-4" aria-hidden="true" />
              編集画面を開く
            </Button>
            <Button asChild variant="outline">
              <Link href="/talks/new">新スクリプト導入へ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
