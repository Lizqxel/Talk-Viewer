"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, House, KeyRound, Layers3 } from "lucide-react";

import { ClosingActionButton } from "@/components/talk/closing-action-button";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { cn } from "@/lib/utils";

const ClosingManagerSidebarSummary = dynamic(
  () =>
    import("@/components/talk/closing-manager-sidebar-summary").then(
      (module) => module.ClosingManagerSidebarSummary,
    ),
  { ssr: false },
);

const baseNavigationItems = [
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

const adminNavigationItem = {
  href: "/admin/script-permissions",
  label: "権限管理",
  icon: KeyRound,
  match: (pathname: string) => pathname.startsWith("/admin/script-permissions"),
};

export function AppSidebar() {
  const pathname = usePathname();
  const { data } = useTalkBootstrapContext();
  const isTalkDetailPage = pathname.startsWith("/talks/");
  const navigationItems = data?.user?.isAdmin
    ? [...baseNavigationItems, adminNavigationItem]
    : baseNavigationItems;

  return (
    <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:border-r md:bg-card">
      <div className="border-b px-5 py-4">
        <Link href="/" className="group flex items-center gap-3 focus-visible:outline-none">
          <div className="flex size-10 items-center justify-center rounded-full border border-zinc-900/12 bg-zinc-50 transition-colors group-hover:bg-zinc-100">
            <Image src="/bbc-mark.svg" alt="Broad Band Connection" width={24} height={24} className="size-6" priority />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Broad Band</p>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Connection</p>
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
        {isTalkDetailPage ? (
          <>
            <ClosingManagerSidebarSummary />
            <ClosingActionButton className="mb-3 h-12 w-full text-sm font-semibold" />
          </>
        ) : null}

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
