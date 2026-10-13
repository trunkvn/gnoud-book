import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "jade" | "marigold" | "coral" | "neutral";

const tones: Record<Tone, string> = {
  jade: "bg-jade-tint text-jade-strong border-jade/40",
  marigold: "bg-marigold-soft text-ink border-marigold/70",
  coral: "bg-coral-tint text-coral border-coral/40",
  neutral: "bg-paper-sunk text-ink-soft border-line",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
