import React, { useEffect, useRef, useState } from 'react';

type Intensity = 'low' | 'med' | 'high';

interface GlitchTextProps {
  text: string;
  intensity?: Intensity;
  continuous?: boolean;
  intervalMs?: number;
}

const STYLE_ID = 'glitch-text-keyframes';

const KEYFRAMES = `
.glitch-text { display: inline-block; position: relative; will-change: transform; }
.glitch-text-active.glitch-low  { animation: glitch-low  0.55s steps(2, end) infinite; }
.glitch-text-active.glitch-med  { animation: glitch-med  0.4s  steps(2, end) infinite; }
.glitch-text-active.glitch-high { animation: glitch-high 0.25s steps(2, end) infinite; }

@keyframes glitch-low {
  0%   { transform: translate(0,0) skew(0deg); text-shadow: none; }
  15%  { transform: translate(-1px, 1px) skew(-1deg); text-shadow: 1px 0 #ff0040, -1px 0 #00ffff; }
  30%  { transform: translate(1px, -1px) skew(1deg); text-shadow: -1px 0 #ff0040, 1px 0 #00ffff; }
  45%  { transform: translate(-2px, 0) skew(-2deg); text-shadow: 2px 0 #ff0040, -2px 0 #00ffff; }
  60%  { transform: translate(2px, 1px) skew(2deg); text-shadow: -2px 0 #ff0040, 2px 0 #00ffff; }
  75%  { transform: translate(-1px, -1px) skew(-1deg); text-shadow: 1px 0 #ff0040, -1px 0 #00ffff; }
  90%  { transform: translate(1px, 1px) skew(1deg); text-shadow: -1px 0 #ff0040, 1px 0 #00ffff; }
  100% { transform: translate(0,0) skew(0deg); text-shadow: none; }
}
@keyframes glitch-med {
  0%   { transform: translate(0,0) skew(0deg); text-shadow: none; }
  12%  { transform: translate(-2px, 2px) skew(-3deg); text-shadow: 3px 0 #ff0040, -3px 0 #00ffff, 0 2px #ff00ff; }
  25%  { transform: translate(3px, -2px) skew(3deg); text-shadow: -3px 0 #ff0040, 3px 0 #00ffff; }
  37%  { transform: translate(-3px, 1px) skew(-2deg); text-shadow: 2px 0 #ff0040, -2px 0 #00ffff; }
  50%  { transform: translate(2px, -3px) skew(2deg); text-shadow: -4px 0 #ff0040, 4px 0 #00ffff; }
  62%  { transform: translate(-4px, 2px) skew(-4deg); text-shadow: 4px 0 #ff0040, -4px 0 #00ffff; }
  75%  { transform: translate(3px, 1px) skew(3deg); text-shadow: -2px 0 #ff0040, 2px 0 #00ffff; }
  87%  { transform: translate(-1px, -2px) skew(-1deg); text-shadow: 1px 0 #ff0040, -1px 0 #00ffff; }
  100% { transform: translate(0,0) skew(0deg); text-shadow: none; }
}
@keyframes glitch-high {
  0%   { transform: translate(0,0) skew(0deg); text-shadow: none; }
  10%  { transform: translate(-4px, 3px) skew(-5deg); text-shadow: 5px 0 #ff0040, -5px 0 #00ffff, 0 3px #ff00ff; }
  20%  { transform: translate(5px, -3px) skew(5deg); text-shadow: -5px 0 #ff0040, 5px 0 #00ffff; }
  30%  { transform: translate(-3px, 4px) skew(-4deg); text-shadow: 4px 0 #ff0040, -4px 0 #00ffff; }
  40%  { transform: translate(4px, -4px) skew(4deg); text-shadow: -6px 0 #ff0040, 6px 0 #00ffff; }
  50%  { transform: translate(-6px, 2px) skew(-6deg); text-shadow: 6px 0 #ff0040, -6px 0 #00ffff, 0 -2px #00ff88; }
  60%  { transform: translate(6px, 3px) skew(6deg); text-shadow: -4px 0 #ff0040, 4px 0 #00ffff; }
  70%  { transform: translate(-2px, -3px) skew(-3deg); text-shadow: 3px 0 #ff0040, -3px 0 #00ffff; }
  80%  { transform: translate(3px, 2px) skew(3deg); text-shadow: -2px 0 #ff0040, 2px 0 #00ffff; }
  90%  { transform: translate(-1px, 1px) skew(-1deg); text-shadow: 1px 0 #ff0040, -1px 0 #00ffff; }
  100% { transform: translate(0,0) skew(0deg); text-shadow: none; }
}
@media (prefers-reduced-motion: reduce) {
  .glitch-text-active { animation: none !important; transform: none !important; text-shadow: none !important; }
}
`;

let injected = false;
function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  injected = true;
}

const INTENSITY_CLASS: Record<Intensity, string> = {
  low: 'glitch-low',
  med: 'glitch-med',
  high: 'glitch-high',
};

const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  intensity = 'low',
  continuous = false,
  intervalMs = 4000,
}) => {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (!continuous) return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const trigger = () => {
      setActive(true);
      window.setTimeout(() => setActive(false), 600);
    };
    trigger();
    timerRef.current = setInterval(trigger, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [continuous, intervalMs]);

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleEnter = () => {
    if (reduceMotion) return;
    setActive(true);
  };
  const handleLeave = () => {
    setActive(false);
  };

  const className = [
    'glitch-text',
    INTENSITY_CLASS[intensity],
    active ? 'glitch-text-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={className}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {text}
    </span>
  );
};

export default GlitchText;