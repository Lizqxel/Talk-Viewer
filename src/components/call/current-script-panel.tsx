import { CircleAlert, Lightbulb, MessageSquareText, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CurrentScriptPanelProps {
  nodeType: string;
  title: string;
  lines: string[];
  intent: string;
  ngExamples: string[];
  tips: string[];
}

export function CurrentScriptPanel({
  nodeType,
  title,
  lines,
  intent,
  ngExamples,
  tips,
}: CurrentScriptPanelProps) {
  return (
    <Card className="brand-card border-border/80 bg-card shadow-sm">
      <CardHeader className="space-y-2 border-b bg-muted/20">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-foreground text-background">
            {nodeType}
          </Badge>
          <Badge variant="outline" className="border-primary/30 bg-primary/10">
            読み上げ中ノード
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight md:text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText className="size-4 text-primary" aria-hidden="true" />
            読み上げ本文
          </div>
          <div className="space-y-3 text-base leading-relaxed text-foreground md:text-lg">
            {lines.map((line, index) => (
              <p key={`${line}-${index}`} className="rounded-md bg-background/75 px-3 py-2">
                <span className="mr-2 text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb className="size-4 text-primary" aria-hidden="true" />
              意図
            </p>
            <p className="text-sm text-muted-foreground">{intent}</p>
          </div>

          <Separator />

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldAlert className="size-4 text-destructive" aria-hidden="true" />
              NG例
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {ngExamples.map((item, index) => (
                <li key={`${item}-${index}`}>- {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CircleAlert className="size-4 text-primary" aria-hidden="true" />
              コツ
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {tips.map((item, index) => (
                <li key={`${item}-${index}`}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
