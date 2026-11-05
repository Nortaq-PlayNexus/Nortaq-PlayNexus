import React, { useEffect, useRef } from 'react';

interface PhosphorTrailProps {
  color?: string;
  length?: number;
  size?: number;
  opacity?: number;
}

interface Point {
  x: number;
  y: number;
}

const PhosphorTrail: React.FC<PhosphorTrailProps> = ({
  color = '#2ff3e0',
  length = 12,
  size = 3,
  opacity = 0.6,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const trailRef = useRef<Point[]>([]);
  const enabledRef = useRef<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse || reduced) {
      enabledRef.current = false;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMove = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      trailRef.current.push({ x: e.clientX, y: e.clientY });
      if (trailRef.current.length > length) {
        trailRef.current.splice(0, trailRef.current.length - length);
      }
    };
    window.addEventListener('mousemove', handleMove);

    const draw = () => {
      if (!enabledRef.current) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const trail = trailRef.current;
      const n = trail.length;
      for (let i = 0; i < n; i++) {
        const p = trail[i];
        const t = n === 1 ? 1 : i / (n - 1);
        const r = size * (0.4 + 0.6 * t);
        const a = opacity * (0.2 + 0.8 * t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = a;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      enabledRef.current = false;
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [color, length, size, opacity]);

  // If disabled, render nothing.
  // We determine at mount; but to avoid rendering canvas when disabled, check media queries synchronously.
  const coarse = typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false;
  const reduced = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  if (coarse || reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
};

export default PhosphorTrail;
