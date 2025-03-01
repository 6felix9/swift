"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export const AuroraBackground = ({
  children,
  className,
  containerClassName,
  isDarkMode = true,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  isDarkMode?: boolean;
}) => {
  const backgroundColors = isDarkMode 
    ? ["#002B49", "#001F35", "#FFB800"] // CelcomDigi colors
    : ["#FFB800", "#002B49", "#001F35"];

  const mousePosition = useRef({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const updateMousePosition = (e: MouseEvent) => {
      const rect = backgroundRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      mousePosition.current = { x, y };
      
      if (backgroundRef.current) {
        const gradientSize = isDarkMode ? "100%" : "50%";
        backgroundRef.current.style.setProperty("--x", `${x * 100}%`);
        backgroundRef.current.style.setProperty("--y", `${y * 100}%`);
        backgroundRef.current.style.setProperty("--gradient-size", gradientSize);
      }
    };

    window.addEventListener("mousemove", updateMousePosition);
    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
  }, [isMounted, isDarkMode]);

  if (!isMounted) return null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full rounded-lg",
        containerClassName
      )}
    >
      <div
        ref={backgroundRef}
        className={cn(
          "absolute inset-0 transition-opacity group-hover:opacity-100",
          "bg-[radial-gradient(circle_at_var(--x)_var(--y),var(--gradient-color-1)_0%,var(--gradient-color-2)_45%,var(--gradient-color-3)_100%)]",
          className
        )}
        style={{
          "--gradient-color-1": backgroundColors[0],
          "--gradient-color-2": backgroundColors[1],
          "--gradient-color-3": backgroundColors[2],
          "--x": "50%",
          "--y": "50%",
          "--gradient-size": isDarkMode ? "100%" : "50%",
        } as React.CSSProperties}
      />
      <div className="relative">{children}</div>
    </div>
  );
};
