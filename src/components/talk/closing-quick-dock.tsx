"use client";

import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { AcquiredPointButton } from "@/components/talk/acquired-point-button";
import { ClosingActionButton } from "@/components/talk/closing-action-button";

interface ClosingQuickDockProps {
  side?: "left" | "right";
}

export function ClosingQuickDock({ side = "right" }: ClosingQuickDockProps) {
  const { data } = useTalkBootstrapContext();
  const sideClass = side === "left" ? "left-4 right-auto" : "right-4 left-auto";

  if (!data?.user?.canEdit) {
    return null;
  }

  return (
    <div className={`pointer-events-none fixed ${sideClass} bottom-4 z-40 hidden md:block xl:hidden`}>
      <div className="pointer-events-auto rounded-xl border border-border/80 bg-card/95 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <p className="mb-2 px-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          クイック記録
        </p>
        <div className="grid gap-2">
          <ClosingActionButton className="h-10 min-w-[176px] px-3 text-xs font-semibold" />
          <AcquiredPointButton className="h-10 min-w-[176px] px-3 text-xs font-semibold" />
        </div>
      </div>
    </div>
  );
}