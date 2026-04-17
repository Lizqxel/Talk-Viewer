"use client";

import { Loader2 } from "lucide-react";

import { useClosingDashboardContext } from "@/components/shared/closing-dashboard-provider";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Button } from "@/components/ui/button";

interface AcquiredPointButtonProps {
  className?: string;
  deltaPt?: number;
}

export function AcquiredPointButton({ className, deltaPt = 1 }: AcquiredPointButtonProps) {
  const { recordAcquiredPt, isRecordingPt, isRecording } = useClosingDashboardContext();
  const { data } = useTalkBootstrapContext();
  const canEdit = Boolean(data?.user?.canEdit);
  const isBusy = isRecording || isRecordingPt;

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className={className}
      disabled={isBusy || !canEdit}
      onClick={() => {
        void recordAcquiredPt(deltaPt).catch(() => {
          // Provider側でエラー表示済み。
        });
      }}
    >
      {isRecordingPt ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      獲得した (+{deltaPt}pt)
    </Button>
  );
}
