import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  FolderTree,
  Megaphone,
  PanelTop,
  Sparkles,
} from "lucide-react";

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

export default async function HomePage() {
  const [
    announcements,
    highlights,
    quickLinks,
    recentUpdates,
    categories,
    featuredItems,
    talks,
    productLabels,
    sceneLabels,
  ] = await Promise.all([
    talkRepository.getAnnouncements(),
    talkRepository.getDailyHighlights(),
    talkRepository.getQuickLinks(),
    talkRepository.getRecentUpdates(),
    talkRepository.getTalkCategories(),
    talkRepository.getFeaturedItems(),
    talkRepository.getTalkList(),
    talkRepository.getProductLabels(),
    talkRepository.getSceneLabels(),
  ]);

  const importantNotice = announcements.find((notice) => notice.level === "important") ?? announcements[0];

  const featuredTalkCards = featuredItems
    .sort((a, b) => a.rank - b.rank)
    .map((item) => {
      const talk = talks.find((talkItem) => talkItem.id === item.talkId);
      return talk ? { ...item, talk } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-6">
      {importantNotice ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <AlertTriangle className="size-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">周知事項バナー</p>
                <p className="text-sm font-semibold text-foreground md:text-base">{importantNotice.title}</p>
                <p className="text-sm text-muted-foreground">{importantNotice.body}</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit">
              {importantNotice.publishedAt}
            </Badge>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-card p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="gap-1.5">
              <PanelTop className="size-3.5" aria-hidden="true" />
              Daily Team Portal
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">テレアポ・トークポータル</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              “マニュアル”ではなく、毎日使う社内ホームとして設計した運用ポータルです。
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
        <SectionHeading title="本日の重要情報" description="日次で必ず確認する運用・KPI情報" />
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((highlight) => (
            <Card key={highlight.id} className="border-border/80">
              <CardHeader>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <Badge variant={highlight.priority === "high" ? "default" : "secondary"}>
                    {highlight.priority === "high" ? "HIGH" : "MEDIUM"}
                  </Badge>
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="text-[15px] leading-snug">{highlight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{highlight.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" aria-hidden="true" />
              よく使うトーク
            </CardTitle>
            <CardDescription>現場で使用頻度が高い導線</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {featuredTalkCards.map((item) => (
              <Link
                key={item.id}
                href={`/talks/${item.talk.id}`}
                className="group flex items-start justify-between rounded-lg border bg-background px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.talk.title}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{productLabels[item.talk.product]}</Badge>
                    <Badge variant="outline">{sceneLabels[item.talk.scene]}</Badge>
                  </div>
                </div>
                <ArrowRight
                  className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4 text-primary" aria-hidden="true" />
              最近更新されたトーク
            </CardTitle>
            <CardDescription>変更点を把握して会話品質を統一</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUpdates.map((update) => (
              <div key={update.id} className="rounded-lg border bg-background p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{update.title}</p>
                  <Badge variant={update.type === "talk" ? "default" : "outline"}>
                    {update.type.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{update.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">{update.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="size-4 text-primary" aria-hidden="true" />
              カテゴリへ移動
            </CardTitle>
            <CardDescription>商材・シーンごとに必要なトークへ移動</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/talks?category=${category.id}`}
                className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="text-sm font-semibold text-foreground">{category.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{category.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>ショートカット</CardTitle>
            <CardDescription>よく使う導線を固定表示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="group flex items-start justify-between rounded-lg border bg-background px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="周知一覧" description="運用ルールやお知らせを横断で確認" />
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
    </div>
  );
}
