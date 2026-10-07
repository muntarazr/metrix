import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Bespoke icon for Manual creation ("يدوي").
 * Represents precision craftsmanship, architectural drafting, and deliberate human authorship.
 */
export function ManualCreateIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {/* Precision Drafting Pen Nib Body */}
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

/**
 * Bespoke icon for AI creation ("ذكاء اصطناعي").
 * Features a radiant parabolic intelligence star, luminous core nucleus,
 * satellite starburst, and quantum spark.
 */
export function AICreateIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {/* Primary Radiant Intelligence Star */}
      <path
        d="M10 2.5C10 7.2 6.8 10.5 2.5 10.5C6.8 10.5 10 13.8 10 18.5C10 13.8 13.2 10.5 17.5 10.5C13.2 10.5 10 7.2 10 2.5Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      {/* Luminous Core Nucleus */}
      <circle cx="10" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      {/* Satellite Starburst (Blooming AI Spark) */}
      <path
        d="M18.5 2C18.5 3.8 17.2 5 15.5 5C17.2 5 18.5 6.2 18.5 8C18.5 6.2 19.8 5 21.5 5C19.8 5 18.5 3.8 18.5 2Z"
        fill="currentColor"
        fillOpacity="0.35"
        strokeWidth={1.5}
      />
      {/* Tertiary Quantum Spark */}
      <circle cx="4.5" cy="4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
