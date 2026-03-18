import Link from "next/link";
import { ArrowRight, BellRing, Megaphone, Sparkles } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { talkRepository } from "@/lib/repository";

const noticeBadgeVariant = {
  info: "secondary",
  warning: "outline",
  important: "default",
} as const;

const updateTypeLabel = {
  talk: "トーク",
  notice: "周知",
  system: "システム",
} as const;

export default async function HomePage() {
  const [announcements, quickLinks, recentUpdates] = await Promise.all([
    talkRepository.getAnnouncements(),
    talkRepository.getQuickLinks(),
    talkRepository.getRecentUpdates(),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Daily Talk Portal
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">テレアポ・トークポータル</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              毎日見る前提で、トーク品質の標準化と改善サイクルを回すための社内ホームです。
            </p>
          </div>
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/talks">
              トーク一覧へ
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section>
        <SectionHeading title="周知事項" description="当日確認しておきたい運用・ルール更新" />
        <div className="grid gap-4 md:grid-cols-3">
          {announcements.map((notice) => (
            <Card key={notice.id} className="border-border/80">
              <CardHeader>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <Badge variant={noticeBadgeVariant[notice.level]}>{notice.level.toUpperCase()}</Badge>
                  <span className="text-xs text-muted-foreground">{notice.publishedAt}</span>
                </div>
                <CardTitle className="text-[15px] leading-snug">{notice.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{notice.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" aria-hidden="true" />
              よく使う導線
            </CardTitle>
            <CardDescription>日次で使うトークへの最短アクセス</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="group flex items-start justify-between rounded-lg border bg-background px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4 text-primary" aria-hidden="true" />
              最近の更新
            </CardTitle>
            <CardDescription>トーク・運用ルール・システム更新</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUpdates.map((update) => (
              <div key={update.id} className="rounded-lg border bg-background p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{update.title}</p>
                  <Badge variant="outline">{updateTypeLabel[update.type]}</Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{update.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">{update.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
