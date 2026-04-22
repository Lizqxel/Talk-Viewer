"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ClosingDashboardProvider } from "@/components/shared/closing-dashboard-provider";
import { PasswordAccessGate } from "@/components/shared/password-access-gate";
import { TalkBootstrapProvider } from "@/components/shared/talk-bootstrap-provider";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);
  const isTalkDetailLayout =
    pathSegments[0] === "talks" &&
    pathSegments.length >= 2 &&
    pathSegments[1] !== "migrate";

  return (
    <TalkBootstrapProvider>
      <ClosingDashboardProvider>
        <PasswordAccessGate />
        <div className="relative min-h-screen bg-background">
          <div className="pointer-events-none fixed inset-0 z-0 bbc-global-canvas" aria-hidden="true" />
          <div className="pointer-events-none fixed inset-0 z-0 bbc-lowpoly-overlay" aria-hidden="true" />
          <div className="pointer-events-none fixed -top-24 left-[18%] z-0 hidden h-[88vh] w-[360px] opacity-45 xl:block bbc-ribbon-left" aria-hidden="true" />
          <div className="pointer-events-none fixed right-[-120px] top-[10vh] z-0 hidden h-[56vh] w-[500px] opacity-55 xl:block bbc-ribbon-right" aria-hidden="true" />
          <div className="relative z-10 flex min-h-screen">
            <AppSidebar />
            <div
              className={cn(
                "flex min-h-screen w-full flex-col",
                isTalkDetailLayout ? "md:pl-16 xl:pl-64" : "md:pl-64",
              )}
            >
              <AppHeader />
              <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto w-full max-w-7xl">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </ClosingDashboardProvider>
    </TalkBootstrapProvider>
  );
}
