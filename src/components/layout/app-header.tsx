"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";

import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const baseMobileNavItems = [
  { href: "/", label: "ホーム", match: (pathname: string) => pathname === "/" },
  { href: "/talks", label: "トーク一覧", match: (pathname: string) => pathname.startsWith("/talks") },
];

const adminMobileNavItem = {
  href: "/admin/script-permissions",
  label: "権限管理",
  match: (pathname: string) => pathname.startsWith("/admin/script-permissions"),
};

const highlightsMobileNavItem = {
  href: "/admin/highlights",
  label: "重要情報管理",
  match: (pathname: string) => pathname.startsWith("/admin/highlights"),
};

export function AppHeader() {
  const pathname = usePathname();
  const { data, isLoading, error, reload, lastLoadedAt } = useTalkBootstrapContext();
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null);
  const canEditPortal = Boolean(data?.user?.canEdit || data?.user?.isAdmin);
  const mobileNavItems = [
    ...baseMobileNavItems,
    ...(canEditPortal ? [highlightsMobileNavItem] : []),
    ...(data?.user?.isAdmin ? [adminMobileNavItem] : []),
  ];

  const handleRefresh = async () => {
    setRefreshFeedback(null);
    const reloadError = await reload();

    if (reloadError) {
      setRefreshFeedback(reloadError.message);
      return;
    }

    const nowLabel = new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setRefreshFeedback(`最新データを取得しました (${nowLabel})`);
  };

  const lastLoadedLabel = lastLoadedAt
    ? lastLoadedAt.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    : "未取得";
  const errorMessage = refreshFeedback || error?.message || null;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center gap-4 px-4 md:px-8">
        <div className="relative w-full max-w-xl">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="トーク検索"
            placeholder="トーク名・カテゴリ・キーワードで検索（UI準備中）"
            className="h-10 border-border/80 bg-muted/40 pr-3 pl-9 shadow-none"
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => void handleRefresh()} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">更新</span>
        </Button>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
          <span className="rounded-md border bg-muted px-2 py-1">取得: {lastLoadedLabel}</span>
          <span className="rounded-md border bg-muted px-2 py-1">更新: 3件</span>
          <span className="rounded-md border bg-muted px-2 py-1">周知: 3件</span>
        </div>
      </div>

      {errorMessage ? (
        <div className="border-t bg-rose-50/80 px-4 py-2 text-xs text-rose-800 md:px-8">
          <p className="flex items-center gap-1.5">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {errorMessage}
          </p>
        </div>
      ) : null}

      <nav className="border-t px-4 py-2 md:hidden" aria-label="モバイルナビゲーション">
        <ul className="flex gap-2">
          {mobileNavItems.map((item) => {
            const isActive = item.match(pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
