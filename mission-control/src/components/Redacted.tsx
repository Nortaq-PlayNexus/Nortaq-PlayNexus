import React, { useEffect, useRef, useState, useCallback } from 'react';

type RevealOn = 'hover' | 'focus' | 'always';

interface RedactedProps {
  text: string;
  revealOn?: RevealOn;
  speed?: number;
  className?: string;
}

const STYLE_ID = 'redacted-component-styles';

const CSS = `
.redacted-wrap {
  position: relative;
  display: inline;
  outline: none;
}
.redacted-char {
  color: transparent;
  background-color: #000;
  border-radius: 2px;
  padding: 0 1px;
  transition: color 0.08s ease, background-color 0.08s ease;
  white-space: pre;
}
.redacted-char.revealed {
  color: inherit;
  background-color: transparent;
}
.redacted-wrap.revealing .scanline {
  opacity: 1;
  animation: redacted-scan 0.6s linear;
}
.scanline {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: rgba(0, 255, 120, 0.9);
  box-shadow: 0 0 6px rgba(0, 255, 120, 0.9);
  opacity: 0;
  pointer-events: none;
}
@keyframes redacted-scan {
  0% { left: 0%; opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .redacted-char { transition: none; }
  .scanline { display: none; }
}
`;

function injectStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function Redacted({ text, revealOn = 'hover', speed = 25, className }: RedactedProps) {
  const [revealedCount, setRevealedCount] = useState<number>(
    revealOn === 'always' ? text.length : 0
  );
  const [active, setActive] = useState<boolean>(revealOn === 'always');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (revealOn === 'always') {
      setRevealedCount(text.length);
      setActive(true);
    } else {
      setRevealedCount(0);
      setActive(false);
    }
  }, [text, revealOn]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startReveal = useCallback(() => {
    if (revealOn === 'always') return;
    setActive(true);
    if (reducedMotion) {
      setRevealedCount(text.length);
      return;
    }
    clearTimer();
    setRevealedCount(0);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i += 1;
      setRevealedCount(i);
      if (i >= text.length) clearTimer();
    }, speed);
  }, [revealOn, reducedMotion, text.length, speed, clearTimer]);

  const stopReveal = useCallback(() => {
    if (revealOn === 'always') return;
    clearTimer();
    setActive(false);
    setRevealedCount(0);
  }, [revealOn, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleMouseEnter = revealOn === 'hover' ? startReveal : undefined;
  const handleMouseLeave = revealOn === 'hover' ? stopReveal : undefined;
  const handleFocus = revealOn === 'focus' ? startReveal : undefined;
  const handleBlur = revealOn === 'focus' ? stopReveal : undefined;

  const tabIndex = revealOn === 'focus' ? 0 : undefined;

  return (
    <span
      className={`redacted-wrap${active ? ' revealing' : ''}${
        className ? ' ' + className : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={tabIndex}
    >
      {text.split('').map((ch, idx) => (
        <span
          key={idx}
          className={`redacted-char${idx < revealedCount ? ' revealed' : ''}`}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
      <span className="scanline" aria-hidden="true" />
    </span>
  );
}

export default Redacted;