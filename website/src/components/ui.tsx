import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "light";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  accent: "bg-accent-500 text-ink-950 shadow-sm hover:bg-accent-400",
  outline: "border border-border-strong bg-surface text-ink-900 hover:bg-ink-50",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-950",
  light: "bg-white text-ink-950 shadow-sm hover:bg-ink-100",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm [&_svg]:size-4",
  md: "h-11 px-5 text-sm [&_svg]:size-4",
  lg: "h-13 px-7 text-base [&_svg]:size-5",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors select-none active:translate-y-px [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

interface CtaProps {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Links into the product app leave this site. */
  external?: boolean;
}

export function Cta({ href, children, variant, size, className, external }: CtaProps) {
  const classes = buttonClass(variant, size, className);
  if (external || href.startsWith("http")) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function Section({
  children,
  className,
  id,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: "default" | "muted" | "dark";
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-20 lg:py-24",
        tone === "muted" && "bg-surface",
        tone === "dark" && "bg-ink-950 text-white",
        className,
      )}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  invert,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  invert?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className={cn("text-xs font-bold tracking-wider uppercase", invert ? "text-brand-300" : "text-brand-700")}>{eyebrow}</p>
      ) : null}
      <h2 className={cn("mt-2 text-3xl font-bold tracking-tight sm:text-4xl", invert ? "text-white" : "text-ink-950")}>{title}</h2>
      {description ? (
        <p className={cn("mt-3 text-lg", invert ? "text-white/70" : "text-ink-600")}>{description}</p>
      ) : null}
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-6 shadow-card", className)}>
      <span className="flex size-11 items-center justify-center rounded-md bg-brand-50 text-brand-700 [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-ink-950">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-bold tracking-tight text-ink-950 tabular sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-ink-500">{label}</p>
    </div>
  );
}
