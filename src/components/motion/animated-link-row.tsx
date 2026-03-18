"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AnimatedLinkRowProps {
  href: string;
  title: string;
  description: string;
  meta?: ReactNode;
  className?: string;
}

export function AnimatedLinkRow({ href, title, description, meta, className }: AnimatedLinkRowProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("group relative overflow-hidden rounded-lg border bg-background", className)}
    >
      <span className="absolute inset-y-0 left-0 w-1 -translate-x-full bg-primary/80 transition-transform duration-300 group-hover:translate-x-0" />
      <Link
        href={href}
        className="flex items-start justify-between gap-3 px-3 py-2.5 transition-colors duration-200 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {meta ? <div className="mt-2">{meta}</div> : null}
        </div>
        <motion.span
          initial={{ x: 0 }}
          whileHover={{ x: 3 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mt-1"
        >
          <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </motion.span>
      </Link>
    </motion.div>
  );
}
