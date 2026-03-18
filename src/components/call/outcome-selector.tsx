import { ArrowRight, ArrowUpLeft, ChevronsRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OutcomeCandidate = {
  label: string;
  nextNodePreview: string;
};

interface OutcomeSelectorProps {
  outcomes: OutcomeCandidate[];
  fallbackLabel: string;
}

export function OutcomeSelector({ outcomes, fallbackLabel }: OutcomeSelectorProps) {
  return (
    <Card className="brand-card border-border/80 bg-card shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">お客様アウト選択</CardTitle>
          <Badge variant="outline" className="border-primary/30 bg-primary/10">
            最優先操作
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {outcomes.map((outcome) => (
          <Button
            key={outcome.label}
            variant="outline"
            size="lg"
            className="h-auto w-full items-start justify-between gap-3 border-foreground/15 bg-background/85 px-3 py-3 text-left hover:border-primary/45 hover:bg-primary/5"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              <ArrowRight className="size-4 text-primary" aria-hidden="true" />
              {outcome.label}
            </span>
            <span className="text-xs text-muted-foreground">次: {outcome.nextNodePreview}</span>
          </Button>
        ))}

        <Button
          variant="secondary"
          size="lg"
          className="h-auto w-full justify-between bg-foreground text-background hover:bg-foreground/90"
        >
          <span className="flex items-center gap-2">
            <ChevronsRight className="size-4" aria-hidden="true" />
            {fallbackLabel}
          </span>
          <span className="text-xs text-background/80">フォールバック</span>
        </Button>

        <Button variant="ghost" className="w-full justify-start border border-transparent hover:border-foreground/10">
          <ArrowUpLeft className="size-4" aria-hidden="true" />
          1手戻る
        </Button>
      </CardContent>
    </Card>
  );
}
