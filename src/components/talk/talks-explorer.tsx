"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FilePenLine,
  FilePlus2,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatJapaneseDateTime } from "@/lib/date-time";
import { type Talk, type TalkCategory, type TalkDifficulty, type TalkProduct, type TalkScene } from "@/types/talk";

interface TalksExplorerProps {
  initialQuery?: string;
  talks: Talk[];
  categories: TalkCategory[];
  tags: string[];
  productLabels: Record<TalkProduct, string>;
  sceneLabels: Record<TalkScene, string>;
  canCreateTalk: boolean;
  canEdit: boolean;
}

type ViewMode = "card" | "list";

const difficultyOptions: TalkDifficulty[] = ["初級", "中級", "上級"];

function toOptionalLabel(value: string | undefined | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

export function TalksExplorer({
  initialQuery,
  talks,
  categories,
  tags,
  productLabels,
  sceneLabels,
  canCreateTalk,
  canEdit,
}: TalksExplorerProps) {
  const showFilters = false;
  const [query, setQuery] = useState(initialQuery ?? "");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedProducts, setSelectedProducts] = useState<TalkProduct[]>([]);
  const [selectedScenes, setSelectedScenes] = useState<TalkScene[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<TalkDifficulty[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

  const hasFilters =
    selectedProducts.length > 0 ||
    selectedScenes.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedTags.length > 0 ||
    Boolean(selectedCategoryId) ||
    query.trim().length > 0;

  const filteredTalks = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return talks
      .filter((talk) => {
        if (selectedCategoryId && talk.categoryId !== selectedCategoryId) {
          return false;
        }

        if (selectedProducts.length > 0 && !selectedProducts.includes(talk.product)) {
          return false;
        }

        if (selectedScenes.length > 0 && !selectedScenes.includes(talk.scene)) {
          return false;
        }

        if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(talk.difficulty)) {
          return false;
        }

        if (selectedTags.length > 0 && !selectedTags.every((tag) => talk.tags.includes(tag))) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        const searchable = [
          talk.title,
          talk.summary,
          talk.targetPersona,
          talk.categoryName,
          ...talk.tags,
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(keyword);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [
    query,
    selectedCategoryId,
    selectedProducts,
    selectedScenes,
    selectedDifficulties,
    selectedTags,
    talks,
  ]);

  const clearFilters = () => {
    setQuery("");
    setSelectedProducts([]);
    setSelectedScenes([]);
    setSelectedDifficulties([]);
    setSelectedTags([]);
    setSelectedCategoryId(undefined);
  };

  const toggleArrayItem = <T,>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const layoutClassName = showFilters ? "grid gap-4 lg:grid-cols-[280px_1fr]" : "space-y-3";

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">トーク一覧</h1>
          <p className="text-sm text-muted-foreground">用途ごとにトークを一覧で確認できます。</p>
        </div>
        {canCreateTalk ? (
          <Button asChild>
            <Link href="/talks/new">
              <FilePlus2 className="size-4" aria-hidden="true" />
              新スクリプト導入
            </Link>
          </Button>
        ) : null}
      </section>

      <section className="rounded-xl border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="トーク名・タグ・ペルソナで検索"
              aria-label="トーク検索"
              className="h-10 border-border/80 bg-muted/40 pl-9"
            />
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button
              type="button"
              variant={viewMode === "card" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("card")}
              aria-label="カード表示"
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
              カード
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              aria-label="リスト表示"
            >
              <List className="size-4" aria-hidden="true" />
              リスト
            </Button>
          </div>
        </div>
      </section>

      <div className={layoutClassName}>
        {showFilters ? (
          <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
                  フィルター
                </CardTitle>
                <CardDescription>必要なトークだけに絞り込み</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FilterBlock title="カテゴリ">
                  {categories.map((category) => (
                    <FilterChip
                      key={category.id}
                      selected={selectedCategoryId === category.id}
                      onClick={() =>
                        setSelectedCategoryId((current) =>
                          current === category.id ? undefined : category.id,
                        )
                      }
                      label={category.name}
                    />
                  ))}
                </FilterBlock>

                <FilterBlock title="商材">
                  {(Object.keys(productLabels) as TalkProduct[]).map((product) => (
                    <FilterChip
                      key={product}
                      selected={selectedProducts.includes(product)}
                      onClick={() =>
                        toggleArrayItem(selectedProducts, product, setSelectedProducts)
                      }
                      label={productLabels[product] ?? product}
                    />
                  ))}
                </FilterBlock>

                <FilterBlock title="シーン">
                  {(Object.keys(sceneLabels) as TalkScene[]).map((scene) => (
                    <FilterChip
                      key={scene}
                      selected={selectedScenes.includes(scene)}
                      onClick={() => toggleArrayItem(selectedScenes, scene, setSelectedScenes)}
                      label={sceneLabels[scene] ?? scene}
                    />
                  ))}
                </FilterBlock>

                <FilterBlock title="難易度">
                  {difficultyOptions.map((difficulty) => (
                    <FilterChip
                      key={difficulty}
                      selected={selectedDifficulties.includes(difficulty)}
                      onClick={() =>
                        toggleArrayItem(selectedDifficulties, difficulty, setSelectedDifficulties)
                      }
                      label={difficulty}
                    />
                  ))}
                </FilterBlock>

                <FilterBlock title="タグ">
                  {tags.map((tag) => (
                    <FilterChip
                      key={tag}
                      selected={selectedTags.includes(tag)}
                      onClick={() => toggleArrayItem(selectedTags, tag, setSelectedTags)}
                      label={tag}
                    />
                  ))}
                </FilterBlock>

                {hasFilters ? (
                  <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                    条件をクリア
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredTalks.length}</span> 件のトーク
            </p>
            <Badge variant="outline" className="gap-1.5">
              <Sparkles className="size-3.5" aria-hidden="true" />
              用途別で可視化
            </Badge>
          </div>

          {filteredTalks.length === 0 ? (
            <Card className="border-border/80">
              <CardContent className="py-14 text-center text-sm text-muted-foreground">
                条件に一致するトークがありません。フィルター条件を緩めてください。
              </CardContent>
            </Card>
          ) : viewMode === "card" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTalks.map((talk) => (
                <motion.div
                  key={talk.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <TalkCard
                    talk={talk}
                    productLabel={productLabels[talk.product] ?? talk.product}
                    sceneLabel={toOptionalLabel(sceneLabels[talk.scene] ?? talk.scene)}
                    difficultyLabel={toOptionalLabel(talk.difficulty)}
                    canEdit={canEdit}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTalks.map((talk) => (
                <motion.div
                  key={talk.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <TalkListItem
                    talk={talk}
                    productLabel={productLabels[talk.product] ?? talk.product}
                    sceneLabel={toOptionalLabel(sceneLabels[talk.scene] ?? talk.scene)}
                    difficultyLabel={toOptionalLabel(talk.difficulty)}
                    canEdit={canEdit}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function TalkCard({
  talk,
  productLabel,
  sceneLabel,
  difficultyLabel,
  canEdit,
}: {
  talk: Talk;
  productLabel: string;
  sceneLabel: string | null;
  difficultyLabel: string | null;
  canEdit: boolean;
}) {
  return (
    <Card className="brand-card border-border/80">
      <CardHeader>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Badge variant="secondary">{productLabel}</Badge>
          <span className="text-xs text-muted-foreground">更新: {formatJapaneseDateTime(talk.updatedAt)}</span>
        </div>
        <CardTitle className="text-base leading-snug">{talk.title}</CardTitle>
        <CardDescription className="line-clamp-2">{talk.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {sceneLabel ? <Badge variant="outline">{sceneLabel}</Badge> : null}
          {difficultyLabel ? <Badge variant="outline">{difficultyLabel}</Badge> : null}
          {talk.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <motion.span whileHover={{ x: 2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <Link
              href={buildTalkDetailHref(talk.id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              詳細を見る
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </motion.span>
          {canEdit ? (
            <motion.span whileHover={{ x: 2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
              <Link
                href={buildTalkEditorHref(talk.id)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                編集
                <FilePenLine className="size-4" aria-hidden="true" />
              </Link>
            </motion.span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TalkListItem({
  talk,
  productLabel,
  sceneLabel,
  difficultyLabel,
  canEdit,
}: {
  talk: Talk;
  productLabel: string;
  sceneLabel: string | null;
  difficultyLabel: string | null;
  canEdit: boolean;
}) {
  return (
    <Card className="brand-card border-border/80">
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">{talk.title}</p>
            <p className="text-sm text-muted-foreground">{talk.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{productLabel}</Badge>
              {sceneLabel ? <Badge variant="outline">{sceneLabel}</Badge> : null}
              {difficultyLabel ? <Badge variant="outline">{difficultyLabel}</Badge> : null}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="text-xs text-muted-foreground">更新: {formatJapaneseDateTime(talk.updatedAt)}</span>
            <div className="flex flex-wrap items-center gap-3">
              <motion.span whileHover={{ x: 2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                <Link
                  href={buildTalkDetailHref(talk.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  詳細を見る
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </motion.span>
              {canEdit ? (
                <motion.span whileHover={{ x: 2 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                  <Link
                    href={buildTalkEditorHref(talk.id)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    編集
                    <FilePenLine className="size-4" aria-hidden="true" />
                  </Link>
                </motion.span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildTalkEditorHref(talkId: string) {
  return `/talks/editor?talkId=${encodeURIComponent(talkId)}`;
}

function buildTalkDetailHref(talkId: string) {
  return `/talks/detail?talkId=${encodeURIComponent(talkId)}`;
}
