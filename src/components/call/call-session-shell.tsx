import type { ReactNode } from "react";
import { Clock3, PhoneCall } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CallSessionShellProps {
  sessionId: string;
  elapsed: string;
  scenarioLabel: string;
  onHangupLabel?: string;
  center: ReactNode;
  right: ReactNode;
  left?: ReactNode;
}

export function CallSessionShell({
  sessionId,
  elapsed,
  scenarioLabel,
  onHangupLabel = "終話へ",
  center,
  right,
  left,
}: CallSessionShellProps) {
  return (
    <div className="call-mode-canvas space-y-4 rounded-2xl border border-border/70 p-3 md:p-4">
      <Card className="call-command-surface overflow-hidden rounded-xl border">
        <div className="call-stripe h-1.5 w-full" aria-hidden="true" />
        <CardContent className="pt-4 md:pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-foreground/15 bg-background/70">
                <PhoneCall className="size-3" aria-hidden="true" />
                Session {sessionId}
              </Badge>
              <Badge variant="secondary" className="bg-foreground/90 text-background">
                {scenarioLabel}
              </Badge>
              <Badge variant="outline" className="border-primary/45 bg-primary/15 text-foreground">
                <Clock3 className="size-3" aria-hidden="true" />
                経過 {elapsed}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-foreground/20 bg-background/80">
                一時停止
              </Button>
              <Button variant="destructive" className="font-semibold">
                {onHangupLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <section className="space-y-4">{left}</section>
        <section className="space-y-4">{center}</section>
        <section className="space-y-4">{right}</section>
      </div>
    </div>
  );
}
