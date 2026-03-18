"use client";

import { motion, type MotionProps } from "framer-motion";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

const defaultReveal: MotionProps = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.4, ease: "easeOut" },
};

interface RevealProps {
  className?: string;
  delay?: number;
  children: ReactNode;
}

export function Reveal({ className, delay = 0, children }: RevealProps) {
  return (
    <motion.div
      className={className}
      {...defaultReveal}
      transition={{
        ...(defaultReveal.transition ?? {}),
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerGridProps {
  className?: string;
  children: ReactNode;
}

export function StaggerGrid({ className, children }: StaggerGridProps) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.05,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  className?: string;
  children: ReactNode;
}

export function StaggerItem({ className, children }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
      }}
    >
      {children}
    </motion.div>
  );
}
