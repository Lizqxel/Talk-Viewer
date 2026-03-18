import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { talkRepository } from "@/lib/repository";

export default async function TalksPage() {
  const [categories, talks] = await Promise.all([
    talkRepository.getTalkCategories(),
    talkRepository.getTalkList(),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">トーク一覧</h1>
        <p className="text-sm text-muted-foreground">カテゴリ別に整理されたトークテンプレートを確認できます。</p>
      </section>

      <section className="rounded-xl border bg-card p-4 md:p-5">
        <div className="relative max-w-lg">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="検索UI（次フェーズで機能実装）"
            aria-label="トーク検索UI"
            className="h-10 bg-muted/40 pl-9"
          />
        </div>
      </section>

      <section className="space-y-4">
        {categories.map((category) => {
          const categoryTalks = talks.filter((talk) => talk.categoryId === category.id);

          return (
            <div key={category.id} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryTalks.map((talk) => (
                  <Card key={talk.id} className="border-border/80 transition-colors hover:border-primary/40">
                    <CardHeader>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Badge variant="outline">{talk.difficulty}</Badge>
                        <span className="text-xs text-muted-foreground">更新: {talk.updatedAt}</span>
                      </div>
                      <CardTitle className="text-base leading-snug">{talk.title}</CardTitle>
                      <CardDescription>{talk.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {talk.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Link
                        href={`/talks/${talk.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        詳細を見る
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
