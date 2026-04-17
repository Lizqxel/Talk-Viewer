"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, SearchX } from "lucide-react";

import { TalkDetailPageClient } from "@/components/talk/talk-detail-page-client";
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

function buildTalkDetailHref(talkId: string) {
  return `/talks/detail?talkId=${encodeURIComponent(talkId)}`;
}

export function TalkQueryDetailPageClient() {
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
    return <TalkDetailPageClient talkId={talkId} />;
  }

  const normalizedManualTalkId = normalizeSlugValue(manualTalkId);

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SearchX className="size-4 text-primary" aria-hidden="true" />
            表示対象のトークIDが未指定です
          </CardTitle>
          <CardDescription>
            talkId を入力して固定URLの詳細画面を開いてください。
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
                router.replace(buildTalkDetailHref(normalizedManualTalkId));
              }}
            >
              <FileText className="size-4" aria-hidden="true" />
              詳細画面を開く
            </Button>
            <Button asChild variant="outline">
              <Link href="/talks">トーク一覧へ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
