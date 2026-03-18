import Link from "next/link";
import { ChevronLeft, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { TalkSectionsAccordion } from "@/components/talk/talk-sections-accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { talkRepository } from "@/lib/repository";

interface TalkDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TalkDetailPage({ params }: TalkDetailPageProps) {
  const { id } = await params;
  const talk = await talkRepository.getTalkById(id);

  if (!talk) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/talks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          トーク一覧に戻る
        </Link>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{talk.categoryName}</Badge>
            <Badge variant="secondary">{talk.difficulty}</Badge>
            <span className="text-xs text-muted-foreground">最終更新: {talk.updatedAt}</span>
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">トークセクション</h2>
        <TalkSectionsAccordion sections={talk.sections} />
      </section>
    </div>
  );
}
