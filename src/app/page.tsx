import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  FolderTree,
  Megaphone,
  Orbit,
} from "lucide-react";

import { AnimatedLinkRow } from "@/components/motion/animated-link-row";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/motion/motion-primitives";
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
    <div className="space-y-8">
      {importantNotice ? (
        <Reveal>
          <section className="brand-card border-primary/40 bg-primary/10 p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-foreground">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wide text-foreground uppercase">Priority Notice</p>
                  <p className="text-sm font-semibold text-foreground md:text-base">{importantNotice.title}</p>
                  <p className="text-sm text-muted-foreground">{importantNotice.body}</p>
                </div>
              </div>
              <Badge variant="outline" className="w-fit border-foreground/20 bg-background/60">
                {importantNotice.publishedAt}
              </Badge>
            </div>
          </section>
        </Reveal>
      ) : null}

      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border geo-hero-surface p-6 md:p-10">
          <div className="absolute inset-0 geo-grid-overlay opacity-45" aria-hidden="true" />
          <div className="brand-diagonal-band absolute top-0 right-0 h-18 w-56 opacity-95 md:h-24 md:w-80" aria-hidden="true" />
          <div className="absolute right-4 bottom-4 hidden rotate-12 border border-foreground/10 bg-background/70 px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block" aria-hidden="true">
            Internal Knowledge Portal
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div className="space-y-4">
              <Badge variant="outline" className="border-foreground/20 bg-background/70">
                BB CONNECTION TALK PORTAL
              </Badge>
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-tight">
                成果を個人技から
                <span className="mx-2 inline-flex items-center bg-primary px-2 py-0.5 text-primary-foreground">再現性</span>
                へ。
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                社内向けトーク資産を、毎日見るホームとして最適化。枝分かれトークと更新情報を同一画面で管理します。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
                  <Link href="/talks">トークを確認する</Link>
                </Button>
                <Button asChild variant="outline" className="border-foreground/20">
                  <Link href="/talks?category=hikari-objection">切り返しカテゴリへ</Link>
                </Button>
              </div>
            </div>

            <div className="brand-card border-foreground/15 bg-background/70 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Orbit className="size-4 text-primary" aria-hidden="true" />
                本日の重要情報
              </div>
              <div className="space-y-2">
                {highlights.slice(0, 3).map((highlight) => (
                  <div key={highlight.id} className="rounded-md border border-border/70 bg-background/70 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{highlight.title}</p>
                      <Badge variant={highlight.priority === "high" ? "default" : "secondary"}>
                        {highlight.priority === "high" ? "HIGH" : "MED"}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{highlight.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <section>
        <SectionHeading title="よく使うトーク" description="日々の架電で迷わないための主要導線" />
        <StaggerGrid className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <StaggerItem>
            <Card className="brand-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="size-4 text-primary" aria-hidden="true" />
                  重点トーク
                </CardTitle>
                <CardDescription>使用頻度・成果影響の高い順</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {featuredTalkCards.map((item) => (
                  <AnimatedLinkRow
                    key={item.id}
                    href={`/talks/${item.talk.id}`}
                    title={item.talk.title}
                    description={item.reason}
                    meta={
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{productLabels[item.talk.product]}</Badge>
                        <Badge variant="outline">{sceneLabels[item.talk.scene]}</Badge>
                      </div>
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="brand-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="size-4 text-primary" aria-hidden="true" />
                  最近更新されたトーク
                </CardTitle>
                <CardDescription>更新点を短時間で把握</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentUpdates.map((update) => (
                  <div key={update.id} className="brand-card border-border/70 bg-background px-3 py-3">
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
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section>
        <SectionHeading title="カテゴリへ移動" description="商材・シーン別に必要トークへ最短アクセス" />
        <StaggerGrid className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <StaggerItem>
            <Card className="brand-card border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="size-4 text-primary" aria-hidden="true" />
                  カテゴリナビゲーション
                </CardTitle>
                <CardDescription>用途ごとに入口を整理</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <AnimatedLinkRow
                    key={category.id}
                    href={`/talks?category=${category.id}`}
                    title={category.name}
                    description={category.description}
                  />
                ))}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="brand-card border-border/80">
              <CardHeader>
                <CardTitle>ショートカット</CardTitle>
                <CardDescription>日次で利用する導線</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickLinks.map((link) => (
                  <AnimatedLinkRow
                    key={link.id}
                    href={link.href}
                    title={link.label}
                    description={link.description}
                  />
                ))}
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section>
        <SectionHeading title="周知一覧" description="運用ルールやお知らせを横断で確認" />
        <StaggerGrid className="grid gap-4 md:grid-cols-3">
          {announcements.map((notice) => (
            <StaggerItem key={notice.id}>
              <Card className="brand-card border-border/80">
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
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>
    </div>
  );
}
