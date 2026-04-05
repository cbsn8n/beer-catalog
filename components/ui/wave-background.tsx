"use client";

import * as React from "react";
import { createNoise2D } from "simplex-noise";

interface Point {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number };
}

export function Waves({
  className = "",
  lineColor = "rgba(255,255,255,0.35)",
  backgroundColor = "transparent",
  pointerSize = 0,
}: {
  className?: string;
  lineColor?: string;
  backgroundColor?: string;
  pointerSize?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const pathsRef = React.useRef<SVGPathElement[]>([]);
  const linesRef = React.useRef<Point[][]>([]);
  const rafRef = React.useRef<number | null>(null);
  const noise2D = React.useMemo(() => createNoise2D(), []);

  const mouseRef = React.useRef({
    x: 0,
    y: 0,
    sx: 0,
    sy: 0,
    lx: 0,
    ly: 0,
    v: 0,
    vs: 0,
    a: 0,
  });

  const createLines = React.useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = "";
    pathsRef.current = [];
    linesRef.current = [];

    const lineCount = 7;
    const pointsPerLine = 9;

    for (let l = 0; l < lineCount; l++) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", lineColor);
      path.setAttribute("stroke-width", l === 0 || l === lineCount - 1 ? "1.2" : "1");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("opacity", `${0.25 + l * 0.08}`);
      svg.appendChild(path);
      pathsRef.current.push(path);

      const y = (height / (lineCount + 1)) * (l + 1);
      const points: Point[] = [];
      for (let i = 0; i < pointsPerLine; i++) {
        points.push({
          x: (width / (pointsPerLine - 1)) * i,
          y,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0 },
        });
      }
      linesRef.current.push(points);
    }
  }, [lineColor]);

  const movePoints = React.useCallback((time: number) => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const mouse = mouseRef.current;

    linesRef.current.forEach((line, lIndex) => {
      line.forEach((point, pIndex) => {
        const nX = noise2D(point.x * 0.002 + time * 0.0002 + lIndex, point.y * 0.002);
        const nY = noise2D(point.y * 0.002 + time * 0.00025, point.x * 0.002 + pIndex);
        point.wave.x = nX * 14;
        point.wave.y = nY * 16;

        const dx = mouse.sx - point.x;
        const dy = mouse.sy - point.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = Math.min(width, height) * 0.35;

        if (dist < maxDist && mouse.vs > 0.2) {
          const force = (1 - dist / maxDist) * Math.min(mouse.vs / 35, 1.8);
          point.cursor.x = Math.cos(mouse.a) * force * 18;
          point.cursor.y = Math.sin(mouse.a) * force * 18;
        } else {
          point.cursor.x *= 0.88;
          point.cursor.y *= 0.88;
        }
      });
    });
  }, [noise2D]);

  const moved = React.useCallback((point: Point, withCursorForce = true) => {
    return {
      x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
    };
  }, []);

  const drawLines = React.useCallback(() => {
    const lines = linesRef.current;
    const paths = pathsRef.current;

    lines.forEach((points, lIndex) => {
      if (points.length < 2 || !paths[lIndex]) return;
      const firstPoint = moved(points[0], false);
      let d = `M ${firstPoint.x} ${firstPoint.y}`;
      for (let i = 1; i < points.length; i++) {
        const current = moved(points[i]);
        d += ` L ${current.x} ${current.y}`;
      }
      paths[lIndex].setAttribute("d", d);
    });
  }, [moved]);

  const tick = React.useCallback((time: number) => {
    const mouse = mouseRef.current;
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;

    const dx = mouse.x - mouse.lx;
    const dy = mouse.y - mouse.ly;
    const d = Math.hypot(dx, dy);
    mouse.v = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);

    if (containerRef.current) {
      containerRef.current.style.setProperty("--x", `${mouse.sx}px`);
      containerRef.current.style.setProperty("--y", `${mouse.sy}px`);
    }

    movePoints(time);
    drawLines();
    rafRef.current = requestAnimationFrame(tick);
  }, [drawLines, movePoints]);

  React.useEffect(() => {
    const start = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseRef.current.x = rect.width / 2;
        mouseRef.current.y = rect.height / 2;
        mouseRef.current.sx = rect.width / 2;
        mouseRef.current.sy = rect.height / 2;
      }
      createLines();
      drawLines();
      rafRef.current = requestAnimationFrame(tick);
    };

    const t = window.setTimeout(start, 50);

    const onResize = () => {
      createLines();
      drawLines();
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [createLines, drawLines, tick]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor,
        position: "absolute",
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        // @ts-expect-error css vars
        "--x": "-0.5rem",
        "--y": "50%",
      }}
    >
      <svg ref={svgRef} className="block h-full w-full" xmlns="http://www.w3.org/2000/svg" />
      {pointerSize > 0 && (
        <div
          className="pointer-dot"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${pointerSize}rem`,
            height: `${pointerSize}rem`,
            background: lineColor,
            borderRadius: "50%",
            transform: "translate3d(calc(var(--x) - 50%), calc(var(--y) - 50%), 0)",
            willChange: "transform",
          }}
        />
      )}
    </div>
  );
}
