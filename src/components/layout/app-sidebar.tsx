"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { BookOpenText, House, KeyRound, Layers3, NotebookPen } from "lucide-react";

import { AcquiredPointButton } from "@/components/talk/acquired-point-button";
import { ClosingActionButton } from "@/components/talk/closing-action-button";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import {
  compareScriptActivityHighlightIdDesc,
  isScriptActivityHighlightId,
} from "@/lib/script-activity-highlight";
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

const highlightsNavigationItem = {
  href: "/admin/highlights",
  label: "重要情報管理",
  icon: NotebookPen,
  match: (pathname: string) => pathname.startsWith("/admin/highlights"),
};

const publicBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const bbcMarkSrc = `${publicBasePath}/bbc-mark.svg`;
const HOME_NOTIFICATION_SEEN_STORAGE_KEY = "talk-viewer:home-notification-seen";

function readSeenHomeNotificationSignature() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(HOME_NOTIFICATION_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeenHomeNotificationSignature(signature: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(HOME_NOTIFICATION_SEEN_STORAGE_KEY, signature);
  } catch {
    // Ignore storage failures to keep navigation functional.
  }
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data } = useTalkBootstrapContext();
  const pathSegments = pathname.split("/").filter(Boolean);
  const isTalkDetailPage =
    pathSegments[0] === "talks" &&
    pathSegments.length >= 2 &&
    pathSegments[1] !== "migrate";
  const isCompactTalkSidebar = isTalkDetailPage;
  const canEditPortal = Boolean(data?.user?.canEdit || data?.user?.isAdmin);
  const navigationItems = [
    ...baseNavigationItems,
    ...(canEditPortal ? [highlightsNavigationItem] : []),
    ...(data?.user?.isAdmin ? [adminNavigationItem] : []),
  ];

  const latestScriptActivityHighlight = useMemo(() => {
    const candidates =
      data?.dailyHighlights
        .map((item) => {
          return {
            id: item.id,
            title: item.title.trim(),
            detail: item.detail.trim(),
          };
        })
        .filter(
          (item) =>
            isScriptActivityHighlightId(item.id) &&
            item.title.length > 0 &&
            item.detail.length > 0,
        ) ?? [];

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => compareScriptActivityHighlightIdDesc(a.id, b.id));
    return candidates[0];
  }, [data]);

  const latestHomeNotificationSignature = useMemo(() => {
    if (!latestScriptActivityHighlight) {
      return null;
    }

    return `${latestScriptActivityHighlight.id}:${latestScriptActivityHighlight.title}:${latestScriptActivityHighlight.detail}`;
  }, [latestScriptActivityHighlight]);

  const hasUnreadHomeNotification = useMemo(() => {
    if (!latestHomeNotificationSignature) {
      return false;
    }

    if (pathname === "/") {
      return false;
    }

    const seenSignature = readSeenHomeNotificationSignature();
    return seenSignature !== latestHomeNotificationSignature;
  }, [pathname, latestHomeNotificationSignature]);

  useEffect(() => {
    if (pathname === "/" && latestHomeNotificationSignature) {
      writeSeenHomeNotificationSignature(latestHomeNotificationSignature);
    }
  }, [pathname, latestHomeNotificationSignature]);

  return (
    <aside
      className={cn(
        "hidden md:fixed md:inset-y-0 md:flex md:flex-col md:border-r md:bg-card",
        isCompactTalkSidebar ? "md:w-16 xl:w-64" : "md:w-64",
      )}
    >
      <div className={cn("border-b py-4", isCompactTalkSidebar ? "px-2 xl:px-5" : "px-5")}>
        <Link href="/" className="group flex items-center gap-3 focus-visible:outline-none">
          <div className="flex size-10 items-center justify-center rounded-full border border-zinc-900/12 bg-zinc-50 transition-colors group-hover:bg-zinc-100">
            <Image src={bbcMarkSrc} alt="Broad Band Connection" width={24} height={24} className="size-6" priority />
          </div>
          <div className={cn("min-w-0", isCompactTalkSidebar ? "hidden xl:block" : null)}>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Broad Band</p>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">Connection</p>
          </div>
        </Link>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1 py-4",
          isCompactTalkSidebar ? "px-2 xl:px-3" : "px-3",
        )}
        aria-label="メインナビゲーション"
      >
        {navigationItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          const showHomeNotificationDot =
            item.href === "/" &&
            pathname !== "/" &&
            hasUnreadHomeNotification;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isCompactTalkSidebar ? "justify-center xl:justify-start" : null,
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative inline-flex">
                <Icon className="size-4" aria-hidden="true" />
                {showHomeNotificationDot ? (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-card" aria-hidden="true" />
                ) : null}
              </span>
              <span className={cn(isCompactTalkSidebar ? "hidden xl:inline" : null)}>{item.label}</span>
              {showHomeNotificationDot ? <span className="sr-only">ホームに新着通知があります</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t py-4", isCompactTalkSidebar ? "px-2 xl:px-4" : "px-4")}>
        {isTalkDetailPage ? (
          <>
            <div className={cn(isCompactTalkSidebar ? "hidden xl:block" : null)}>
              <ClosingManagerSidebarSummary />
              <ClosingActionButton className="mb-2 h-12 w-full text-sm font-semibold" />
              <AcquiredPointButton className="mb-3 h-12 w-full text-sm font-semibold" />
            </div>
          </>
        ) : null}

        <div className={cn(isCompactTalkSidebar ? "hidden xl:block" : null)}>
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Layers3 className="size-4 text-primary" aria-hidden="true" />
              今日の運用メモ
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">更新はホームの「最近の更新」から確認できます。</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
