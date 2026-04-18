"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SectionPointAccordionProps {
  mindset: string;
  skill: string;
  value: string;
}

export function SectionPointAccordion({ mindset, skill, value }: SectionPointAccordionProps) {
  const hasMindset = mindset.trim().length > 0;
  const hasSkill = skill.trim().length > 0;

  return (
    <div className="mt-3 rounded-lg border border-amber-200/70 bg-amber-50/65 px-3 py-2.5">
      <Accordion type="single" collapsible>
        <AccordionItem value={value} className="border-none">
          <AccordionTrigger className="py-1.5 text-sm font-semibold text-zinc-800 hover:no-underline">
            ポイントを見る
          </AccordionTrigger>
          <AccordionContent className="pb-1">
            <div className="space-y-2.5 rounded-md border border-amber-200/75 bg-background/65 p-2.5 text-xs leading-6 text-zinc-700 md:text-sm">
              {hasMindset ? (
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-amber-800 uppercase md:text-xs">意識していること</p>
                  <p className="mt-0.5 [text-wrap:pretty]">{mindset}</p>
                </div>
              ) : null}
              {hasSkill ? (
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-amber-800 uppercase md:text-xs">成績アップのコツ</p>
                  <p className="mt-0.5 [text-wrap:pretty]">{skill}</p>
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}