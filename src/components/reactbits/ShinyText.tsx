"use client";

import React from "react";

interface ShinyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  variant?: "primary" | "foreground";
}

/**
 * ShinyText from React Bits.
 * Subtle, luxury light-sweep shimmer across text.
 */
export function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = "",
  variant = "primary",
  ...props
}: ShinyTextProps) {
  const gradient =
    variant === "primary"
      ? "linear-gradient(120deg, color-mix(in oklch, var(--primary) 70%, transparent) 0%, var(--primary) 35%, #ffffff 50%, var(--primary) 65%, color-mix(in oklch, var(--primary) 70%, transparent) 100%)"
      : "linear-gradient(120deg, var(--muted-foreground) 0%, var(--foreground) 35%, #ffffff 50%, var(--foreground) 65%, var(--muted-foreground) 100%)";

  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${
        disabled ? "" : "animate-shine"
      } ${className}`}
      style={{
        backgroundImage: gradient,
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        animationDuration: `${speed}s`,
      }}
      {...props}
    >
      {text}
    </span>
  );
}

export default ShinyText;
