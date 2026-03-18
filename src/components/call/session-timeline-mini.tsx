import { Dot, Route } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TimelineItem = {
  title: string;
  status: "done" | "current";
};

interface SessionTimelineMiniProps {
  items: TimelineItem[];
}

export function SessionTimelineMini({ items }: SessionTimelineMiniProps) {
  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="size-4 text-primary" aria-hidden="true" />
          通話パス
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between gap-2 rounded-md border border-foreground/10 bg-background/80 px-2.5 py-2"
          >
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <Dot className="size-4 text-primary" aria-hidden="true" />
              {item.title}
            </div>
            <Badge variant={item.status === "current" ? "default" : "outline"}>
              {item.status === "current" ? "現在" : "通過"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
