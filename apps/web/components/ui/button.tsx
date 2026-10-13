import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // "In offset": viền mực + bóng cứng lệch xuống, nhấn xuống thì bóng co lại như ấn con dấu
  primary:
    "border-[1.5px] border-hard bg-jade text-on-jade shadow-[3px_3px_0_0_var(--hard)] " +
    "hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--hard)] " +
    "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  secondary:
    "border-[1.5px] border-ink/80 bg-paper-raised text-ink " +
    "hover:bg-paper-sunk active:bg-paper-sunk",
  ghost: "text-ink hover:bg-ink/8",
  danger:
    "border-[1.5px] border-hard bg-coral text-white shadow-[3px_3px_0_0_var(--hard)] " +
    "hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--hard)] " +
    "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm sm:px-4",
  md: "h-11 px-6 text-[0.95rem]",
  lg: "h-14 px-8 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props} />
  );
}
