import React, { useEffect, useRef } from 'react';

export interface EntropyFieldProps {
  threatIndex?: number;
  seed?: number;
  opacity?: number;
  className?: string;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createNoise2D(random: () => number): (x: number, y: number) => number {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const grad3: Array<[number, number]> = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [1, 0], [-1, 0],
    [0, 1], [0, -1], [0, 1], [0, -1],
  ];
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }

  return function noise2D(xin: number, yin: number): number {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1: number;
    let j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj]];
      const g = grad3[gi0];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }

    let n1 = 0;
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1]];
      const g = grad3[gi1];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }

    let n2 = 0;
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const gi2 = permMod12[ii + 1 + perm[jj + 1]];
      const g = grad3[gi2];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface Particle {
  x: number;
  y: number;
}

export default function EntropyField({
  threatIndex = 0.3,
  seed = 1,
  opacity = 0.08,
  className,
}: EntropyFieldProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const noise2D = createNoise2D(mulberry32(seed));
    const particleRng = mulberry32(seed + 9973);

    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    const initParticles = () => {
      particles.length = 0;
      const count = Math.max(20, Math.min(140, Math.round((width * height) / (dpr * dpr * 9000))));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: particleRng() * width,
          y: particleRng() * height,
        });
      }
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width * dpr));
      height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      initParticles();
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);

    let visible = true;
    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0 });
    intersectionObserver.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) visible = false;
    };
    document.addEventListener('visibilitychange', onVisibility);

    // color based on threat
    const colorFor = (t: number, n: number) => {
      const threat = Math.min(1, Math.max(0, t));
      const r = Math.round(lerp(0, 255, threat) + n * 20);
      const g = Math.round(lerp(190, 160, threat) + n * 10);
      const b = Math.round(lerp(220, 50, threat) - n * 10);
      return `rgb(${r}, ${g}, ${b})`;
    };

    let time = 0;
    let rafId = 0;
    let running = true;

    const render = () => {
      if (!running) return;
      if (!visible || document.hidden) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      const threat = Math.min(1, Math.max(0, threatIndex));

      // subtle noise field as grid of soft dots
      const step = Math.max(18, Math.round(24 * dpr));
      const scale = 0.0025 / dpr;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const n = noise2D(x * scale + time * 0.05, y * scale + time * 0.03);
          const alpha = (n + 1) * 0.5 * 0.35;
          if (alpha < 0.02) continue;
          ctx.fillStyle = colorFor(threat, n);
          ctx.globalAlpha = alpha * (0.4 + threat * 0.3);
          ctx.beginPath();
          ctx.arc(x, y, (1.1 + (n + 1) * 0.6) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // particles
      const speed = 0.3 + threat * 0.9;
      ctx.globalAlpha = 0.5 + threat * 0.2;
      for (const pt of particles) {
        const ang = noise2D(pt.x * 0.004, pt.y * 0.004 + time) * Math.PI * 2.2;
        pt.x += Math.cos(ang) * speed * dpr;
        pt.y += Math.sin(ang) * speed * dpr;
        if (pt.x < 0) pt.x += width;
        if (pt.x > width) pt.x -= width;
        if (pt.y < 0) pt.y += height;
        if (pt.y > height) pt.y -= height;

        ctx.fillStyle = colorFor(threat, 0);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (!reducedMotion) {
        time += 0.008 + threat * 0.012;
        rafId = requestAnimationFrame(render);
      }
    };

    resize();
    render();
    if (!reducedMotion) {
      rafId = requestAnimationFrame(render);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [threatIndex, seed, opacity]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }}
      />
    </div>
  );
}