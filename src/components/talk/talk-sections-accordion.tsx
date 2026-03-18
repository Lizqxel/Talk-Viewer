import { MessageCircleQuestion, ShieldAlert, Sparkles, Target } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { type TalkSection } from "@/types/talk";

interface TalkSectionsAccordionProps {
  sections: TalkSection[];
}

const sectionMeta = {
  firstContact: {
    icon: Sparkles,
    badge: "第一声",
  },
  counter: {
    icon: MessageCircleQuestion,
    badge: "切り返し",
  },
  closing: {
    icon: Target,
    badge: "クロージング",
  },
  ng: {
    icon: ShieldAlert,
    badge: "NG例",
  },
};

export function TalkSectionsAccordion({ sections }: TalkSectionsAccordionProps) {
  return (
    <Accordion type="multiple" className="rounded-xl border bg-card px-4 py-2 md:px-6" defaultValue={[sections[0]?.id]}>
      {sections.map((section) => {
        const meta = sectionMeta[section.kind];
        const Icon = meta.icon;

        return (
          <AccordionItem value={section.id} key={section.id} className="border-border/70">
            <AccordionTrigger className="gap-4 py-4 hover:no-underline">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">{section.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{section.intent}</p>
                </div>
              </div>
              <Badge variant="outline" className="ml-auto hidden md:inline-flex">
                {meta.badge}
              </Badge>
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <ul className="space-y-2.5">
                {section.lines.map((line) => (
                  <li key={line} className="rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed text-foreground">
                    {line}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
