"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/", label: "ホーム", match: (pathname: string) => pathname === "/" },
  { href: "/talks", label: "トーク一覧", match: (pathname: string) => pathname.startsWith("/talks") },
];

export function AppHeader() {
  const pathname = usePathname();

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
        <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
          <span className="rounded-md border bg-muted px-2 py-1">更新: 3件</span>
          <span className="rounded-md border bg-muted px-2 py-1">周知: 3件</span>
        </div>
      </div>

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
