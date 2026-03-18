"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, House, Layers3, PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/",
    label: "ホーム",
    icon: House,
    match: (pathname: string) => pathname === "/",
  },
  {
    href: "/talks",
    label: "トーク一覧",
    icon: BookOpenText,
    match: (pathname: string) => pathname.startsWith("/talks"),
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:bg-card">
      <div className="border-b px-5 py-5">
        <Link href="/" className="group flex items-center gap-3 focus-visible:outline-none">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <PanelLeft className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tele-apo Portal</p>
            <p className="text-sm font-semibold text-foreground">トークポータル</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="メインナビゲーション">
        {navigationItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-4 py-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Layers3 className="size-4 text-primary" aria-hidden="true" />
            今日の運用メモ
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">更新はホームの「最近の更新」から確認できます。</p>
        </div>
      </div>
    </aside>
  );
}
