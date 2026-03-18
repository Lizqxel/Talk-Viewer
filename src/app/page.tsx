import {
  BellRing,
  FolderTree,
  Megaphone,
} from "lucide-react";
import NextLink from "next/link";

import { BrandHero } from "@/components/home/brand-hero";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/motion/motion-primitives";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { talkRepository } from "@/lib/repository";

const noticeBadgeVariant = {
  info: "secondary",
  warning: "outline",
  important: "default",
} as const;

const Link = NextLink;

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
      <BrandHero importantNotice={importantNotice ?? null} highlights={highlights} />

      <Reveal>
        <section className="relative -mt-2 overflow-hidden rounded-2xl border border-zinc-900/10 bg-card/75 p-4 backdrop-blur-sm md:p-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
          <p className="pl-2 text-sm text-muted-foreground">
            ここからは日常業務向けのポータル導線です。最短で台本に到達できるよう、利用頻度順で配置しています。
          </p>
        </section>
      </Reveal>

      <section>
        <SectionHeading title="よく使うトーク" description="日々の架電で迷わないための主要導線" />
        <StaggerGrid className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <StaggerItem className="h-full">
            <Card className="flex h-full flex-col overflow-hidden border-zinc-900/15 bg-card shadow-sm">
              <div className="bg-zinc-900 px-4 py-3 text-zinc-100 md:px-5">
                <p className="text-xs font-semibold tracking-[0.16em] text-zinc-300 uppercase">Today&apos;s Main Scripts</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <Megaphone className="size-4 text-primary" aria-hidden="true" />
                  重点トーク
                </p>
              </div>
              <CardHeader className="pb-3">
                <CardDescription>使用頻度・成果影響の高い順に3件を固定表示</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {featuredTalkCards.map((item, index) => {
                  const rank = String(index + 1).padStart(2, "0");
                  return (
                    <Link
                      key={item.id}
                      href={`/talks/${item.talk.id}`}
                      className="group flex min-h-[104px] items-start gap-3 rounded-xl border border-zinc-900/10 bg-background px-3 py-3 transition-colors hover:border-primary/45 hover:bg-primary/5"
                    >
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-zinc-100">
                        {rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{item.talk.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="border-zinc-900/20 bg-muted/30">
                            {productLabels[item.talk.product]}
                          </Badge>
                          <Badge variant="outline" className="border-zinc-900/20 bg-muted/30">
                            {sceneLabels[item.talk.scene]}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem className="h-full">
            <Card className="flex h-full flex-col border-zinc-900/15 bg-card shadow-sm">
              <div className="bg-zinc-900 px-4 py-2.5 text-zinc-100">
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase">Recent Updates</p>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-900">
                  <BellRing className="size-4 text-primary" aria-hidden="true" />
                  最近更新されたトーク
                </CardTitle>
                <CardDescription>更新点を短時間で把握</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-0">
                {recentUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="relative min-h-[106px] border-l border-zinc-900/15 py-3 pl-4 first:pt-0 last:pb-0"
                  >
                    <span
                      className="absolute -left-[5px] top-4 size-2.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{update.title}</p>
                      <Badge
                        variant={update.type === "talk" ? "default" : "outline"}
                        className={
                          update.type === "talk"
                            ? "bg-primary text-zinc-900"
                            : "border-zinc-900/25 bg-zinc-100"
                        }
                      >
                        {update.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{update.detail}</p>
                    <p className="mt-1.5 text-xs font-medium text-zinc-500">{update.date}</p>
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
          <StaggerItem className="h-full">
            <Card className="h-full overflow-hidden border-zinc-900/15 bg-card shadow-sm">
              <div className="bg-zinc-900 px-4 py-2.5 text-zinc-100">
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase">Category Navigator</p>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-zinc-900">
                  <FolderTree className="size-4 text-primary" aria-hidden="true" />
                  カテゴリナビゲーション
                </CardTitle>
                <CardDescription>用途ごとに入口を整理</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {categories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/talks?category=${category.id}`}
                    className="group flex min-h-[86px] flex-col justify-between rounded-xl border border-zinc-900/10 bg-background px-3 py-3 transition-colors hover:border-primary/45 hover:bg-primary/5"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{category.name}</p>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        C{index + 1}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{category.description}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem className="h-full">
            <Card className="flex h-full flex-col border-zinc-900/15 bg-card shadow-sm">
              <div className="bg-zinc-900 px-4 py-2.5 text-zinc-100">
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-300 uppercase">Quick Access</p>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-zinc-900">ショートカット</CardTitle>
                <CardDescription>日次で利用する導線</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {quickLinks.map((link, index) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="group flex min-h-[74px] items-center justify-between gap-3 rounded-lg border border-zinc-900/10 bg-background px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-primary/8"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                    <span className="rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-700">
                      F{index + 1}
                    </span>
                  </Link>
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
            <StaggerItem key={notice.id} className="h-full">
              <Card className="flex h-full flex-col overflow-hidden border-zinc-900/15 bg-card shadow-sm">
                <div className="h-1.5 w-full bg-primary" aria-hidden="true" />
                <CardHeader className="pb-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <Badge
                      variant={noticeBadgeVariant[notice.level]}
                      className={
                        notice.level === "important"
                          ? "bg-primary text-zinc-900"
                          : notice.level === "warning"
                            ? "border-zinc-900/25 bg-zinc-100"
                            : undefined
                      }
                    >
                      {notice.level.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-medium text-zinc-500">{notice.publishedAt}</span>
                  </div>
                  <CardTitle className="text-[15px] leading-snug text-zinc-900">{notice.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
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
