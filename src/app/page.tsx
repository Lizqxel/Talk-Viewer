import {
  BellRing,
  Megaphone,
} from "lucide-react";
import Link from "next/link";

import { BrandHero } from "@/components/home/brand-hero";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/motion/motion-primitives";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { talkRepository } from "@/lib/repository";

export default async function HomePage() {
  const [
    featuredItems,
    talks,
    productLabels,
    sceneLabels,
  ] = await Promise.all([
    talkRepository.getFeaturedItems(),
    talkRepository.getTalkList(),
    talkRepository.getProductLabels(),
    talkRepository.getSceneLabels(),
  ]);

  const featuredTalkCards = featuredItems
    .sort((a, b) => a.rank - b.rank)
    .map((item) => {
      const talk = talks.find((talkItem) => talkItem.id === item.talkId);
      return talk ? { ...item, talk } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-8">
      <BrandHero />

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
              <CardContent className="flex-1">
                <div className="rounded-lg border border-zinc-900/12 bg-muted/20 px-3 py-3">
                  <p className="text-sm text-muted-foreground">ここにはRecent Updatesが入ります</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section>
        <SectionHeading title="周知一覧" description="運用ルールやお知らせを横断で確認" />
        <StaggerGrid className="grid gap-4 md:grid-cols-3">
          <StaggerItem className="h-full md:col-span-3">
            <Card className="flex h-full flex-col overflow-hidden border-zinc-900/15 bg-card shadow-sm">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground">ここには周知一覧が入ります</p>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerGrid>
      </section>
    </div>
  );
}
