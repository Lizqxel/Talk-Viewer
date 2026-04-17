"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useClosingDashboardContext } from "@/components/shared/closing-dashboard-provider";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";

interface ClosingActionButtonProps {
  className?: string;
}

export function ClosingActionButton({ className }: ClosingActionButtonProps) {
  const { recordClosing, isRecording } = useClosingDashboardContext();
  const { data } = useTalkBootstrapContext();
  const canEdit = Boolean(data?.user?.canEdit);

  return (
    <Button
      type="button"
      size="lg"
      className={className}
      disabled={isRecording || !canEdit}
      onClick={() => {
        void recordClosing().catch(() => {
          // Provider側でエラー表示済み。
        });
      }}
    >
      {isRecording ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      クロージングした
    </Button>
  );
}