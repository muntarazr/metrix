"use client";

import React, { useState, useEffect, useRef } from "react";

interface MagnetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: number;
  disabled?: boolean;
  magnetStrength?: number;
  activeTransition?: string;
  inactiveTransition?: string;
}

/**
 * Magnet from React Bits.
 * Gives interactive elements a physical magnetic attraction toward the cursor.
 */
export function Magnet({
  children,
  padding = 35,
  disabled = false,
  magnetStrength = 3.5,
  activeTransition = "transform 0.18s cubic-bezier(0.25, 1, 0.5, 1)",
  inactiveTransition = "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
  className = "",
  ...props
}: MagnetProps) {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const magnetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!magnetRef.current) return;

      const { left, top, width, height } =
        magnetRef.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      if (dist < Math.max(width, height) / 2 + padding) {
        setIsActive(true);
        const offsetX = (e.clientX - centerX) / magnetStrength;
        const offsetY = (e.clientY - centerY) / magnetStrength;
        setPosition({ x: offsetX, y: offsetY });
      } else {
        setIsActive(false);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [padding, disabled, magnetStrength]);

  const currentPos = disabled ? { x: 0, y: 0 } : position;
  const transition = isActive && !disabled ? activeTransition : inactiveTransition;

  return (
    <div
      ref={magnetRef}
      className={`inline-block ${className}`}
      style={{
        transform: `translate3d(${currentPos.x}px, ${currentPos.y}px, 0)`,
        transition,
        willChange: "transform",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export default Magnet;
