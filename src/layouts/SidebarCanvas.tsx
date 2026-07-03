import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { brandWallpaperKey, brandSolid } from "./WallpaperPicker";

type P = { x: number; y: number; r: number; vx: number; vy: number; a: number };

/**
 * A live, video-like sidebar background: soft glowing orbs (bokeh) drift slowly
 * upward over the solid brand colour, drawn on a canvas. Light orbs on blue/red,
 * dark on yellow. GPU-light (a few dozen particles), pauses when the tab is
 * hidden, and honours reduced-motion (renders one static frame). Decorative.
 */
export function SidebarCanvas({ brand }: { brand: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const key = brandWallpaperKey(brand);
  const onDark = brandSolid(key)?.onDark ?? true;

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const base = onDark ? "255,255,255" : "18,18,18";
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    let w = 0;
    let h = 0;
    let particles: P[] = [];
    let raf = 0;

    const drawP = (p: P) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(${base},${p.a})`);
      g.addColorStop(1, `rgba(${base},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    };

    const frame = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        if (animate) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y + p.r < 0) {
            p.y = h + p.r;
            p.x = rnd(0, w);
          }
          if (p.x < -p.r) p.x = w + p.r;
          else if (p.x > w + p.r) p.x = -p.r;
        }
        drawP(p);
      }
    };

    const resize = () => {
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(12, Math.min(38, Math.round((w * h) / 9000)));
      particles = Array.from({ length: count }, () => ({
        x: rnd(0, w),
        y: rnd(0, h),
        r: rnd(8, 30),
        vx: rnd(-0.12, 0.12),
        vy: rnd(-0.32, -0.06),
        a: rnd(0.05, 0.18),
      }));
      if (reduced || !raf) frame(reduced);
    };

    const tick = () => {
      frame(true);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    if (!reduced) {
      start();
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduced, onDark, key]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0" />;
}
