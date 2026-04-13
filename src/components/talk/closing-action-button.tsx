"use client";

import { Button } from "@/components/ui/button";
import { incrementClosingCount } from "@/lib/closing-metrics";

interface ClosingActionButtonProps {
  className?: string;
}

export function ClosingActionButton({ className }: ClosingActionButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      className={className}
      onClick={() => {
        incrementClosingCount();
      }}
    >
      クロージングした
    </Button>
  );
}