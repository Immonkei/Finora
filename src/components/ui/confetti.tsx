"use client";

import * as React from "react";

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  angle: number;
  angleSpeed: number;
  color: string;
  alpha: number;
  shape: "rect" | "circle";
}

const COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber / Gold
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#F43F5E", // Rose
];

/**
 * Fires a high-performance, celebratory canvas confetti burst.
 * Zero external dependencies. Self-cleaning after 3.2 seconds.
 */
export function fireConfetti(options?: { particleCount?: number; originY?: number }) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const count = options?.particleCount || 120;
  const originY = options?.originY ?? 0.6; // 60% down screen

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  const startX = width / 2;
  const startY = height * originY;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI / 180) * (Math.random() * 140 - 160); // upward spread (-160° to -20°)
    const speed = Math.random() * 16 + 12;
    particles.push({
      x: startX + (Math.random() - 0.5) * 60,
      y: startY,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: Math.random() * 360,
      angleSpeed: (Math.random() - 0.5) * 12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      shape: Math.random() > 0.3 ? "rect" : "circle",
    });
  }

  let animationFrameId: number;
  const gravity = 0.55;
  const friction = 0.985;
  const startTime = Date.now();
  const duration = 3200; // ms

  function render() {
    if (!ctx) return;
    const elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.vx *= friction;
      p.vy *= friction;
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.angleSpeed;

      if (elapsed > duration * 0.65) {
        p.alpha = Math.max(0, 1 - (elapsed - duration * 0.65) / (duration * 0.35));
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === "rect") {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(animationFrameId);
    canvas.remove();
  };
}

/**
 * Declarative component for triggering confetti when active becomes true.
 */
export function Confetti({ active }: { active: boolean }) {
  React.useEffect(() => {
    if (active) {
      const cleanup = fireConfetti();
      return cleanup;
    }
  }, [active]);

  return null;
}
