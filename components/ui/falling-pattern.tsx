"use client";

import * as React from "react";

export function FallingPattern({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="falling-pattern-item absolute top-[-10%] block rounded-full bg-white/18"
          style={{
            left: `${(i * 3.7) % 100}%`,
            width: `${10 + (i % 4) * 10}px`,
            height: `${18 + (i % 5) * 18}px`,
            animationDelay: `${(i % 9) * 0.7}s`,
            animationDuration: `${7 + (i % 6)}s`,
            transform: `rotate(${(i % 6) * 12}deg)`,
          }}
        />
      ))}
    </div>
  );
}
