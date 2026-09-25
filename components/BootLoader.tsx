import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sound } from './sound';

/**
 * HUD-style boot readout shown while the tracking engines load.
 *
 * It reads the same status strings the init sequence already emits and maps
 * them onto a fixed list of steps, so progress follows the real sequence.
 * Within a step the percentage creeps towards the step's ceiling, so a slow
 * download never looks frozen, but it never passes into the next step on its
 * own. The scene keeps rendering underneath: the pill never blocks input.
 */
const STEPS: Array<{ match: string; label: string; to: number }> = [
  { match: 'Loading Face Tracking', label: 'Face engine', to: 15 },
  { match: 'Initializing Face', label: 'Face model', to: 30 },
  { match: 'Loading Hand Tracking', label: 'Hand engine', to: 45 },
  { match: 'Initializing Hand', label: 'Hand model', to: 60 },
  { match: 'Starting Camera', label: 'Camera link', to: 75 },
  // The camera is running but the models download on the first frame: this
  // is usually the longest wait, so it is shown rather than hidden behind 100%.
  { match: 'Active', label: 'Calibrating', to: 97 },
];

/** How long the "Online" state stays on screen before the pill fades. */
const HOLD_MS = 900;
const FADE_MS = 600;
/** Time constant of the creep inside a step. */
const CREEP_MS = 2500;

/** Horizontal gap kept between the loader and the badges either side. */
const GAP = 8;
/** Below this slot width the step label is dropped. */
const COMPACT_BELOW = 190;
/** Below this the dot goes too, leaving just the percentage. */
const MINIMAL_BELOW = 80;

type Slot = { left: number; width: number; top: number; height: number };

/**
 * The loader sits on the top bar, in the space between the brand badge
 * (top left) and the live-tracking badge (top right). Both badges change
 * width with the viewport and their text, so the slot is measured.
 */
const measureSlot = (): Slot | null => {
  const brand = document.querySelector('[data-hud="brand"]');
  const live = document.querySelector('[data-hud="live"]');
  if (!brand || !live) return null;
  const b = brand.getBoundingClientRect();
  const l = live.getBoundingClientRect();
  return {
    left: b.right + GAP,
    width: Math.max(0, l.left - GAP - (b.right + GAP)),
    top: b.top,
    height: b.height,
  };
};

type Phase = 'loading' | 'online' | 'leaving' | 'gone';

interface BootLoaderProps {
  visible: boolean;
  status: string;
}

const BootLoader: React.FC<BootLoaderProps> = ({ visible, status }) => {
  const isError = /error/i.test(status);

  // loading -> online (brief confirmation) -> leaving (fade) -> gone
  const [phase, setPhase] = useState<Phase>(visible ? 'loading' : 'gone');
  useEffect(() => {
    if (visible) {
      setPhase('loading');
      return;
    }
    setPhase((p) => (p === 'gone' ? p : 'online'));
    const toLeaving = window.setTimeout(() => setPhase((p) => (p === 'gone' ? p : 'leaving')), HOLD_MS);
    const toGone = window.setTimeout(() => setPhase('gone'), HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(toLeaving);
      window.clearTimeout(toGone);
    };
  }, [visible]);

  useEffect(() => {
    if (phase === 'online' && !isError) sound.blip('online');
  }, [phase, isError]);

  const found = STEPS.findIndex((s) => status.startsWith(s.match));
  const step = Math.max(found, 0);
  const finished = phase === 'online' || phase === 'leaving';

  // Smoothed percentage: eases towards the current step's ceiling.
  const [percent, setPercent] = useState(0);
  const stepStartRef = useRef({ step, at: performance.now() });
  if (stepStartRef.current.step !== step) stepStartRef.current = { step, at: performance.now() };
  useEffect(() => {
    if (phase === 'gone') return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      // Time-based easing, so a slow frame rate does not slow the count.
      const k = 1 - Math.exp(-(now - last) / 180);
      last = now;
      const from = step === 0 ? 0 : STEPS[step - 1].to;
      const to = STEPS[step].to;
      const t = now - stepStartRef.current.at;
      const target = finished ? 100 : from + (to - from) * (1 - Math.exp(-t / CREEP_MS));
      setPercent((p) => {
        const next = p + (target - p) * k;
        return Math.max(p, target - next < 0.5 ? target : next);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, finished, phase]);

  const [slot, setSlot] = useState<Slot | null>(null);
  const mounted = phase !== 'gone';
  useLayoutEffect(() => {
    if (!mounted) return;
    const update = () => setSlot(measureSlot());
    update();
    const observer = new ResizeObserver(update);
    document.querySelectorAll('[data-hud]').forEach((el) => observer.observe(el));
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [mounted]);

  if (!mounted) return null;

  const label = isError ? 'Offline' : finished ? 'Online' : STEPS[step].label;
  const shown = finished ? 100 : Math.min(100, Math.round(percent));
  const pulsing = !finished && !isError;

  const compact = slot !== null && slot.width < COMPACT_BELOW;
  const minimal = slot !== null && slot.width < MINIMAL_BELOW;
  // Until the badges are measured, fall back to the top centre.
  const position: React.CSSProperties = slot
    ? { left: slot.left, width: slot.width, top: slot.top, height: slot.height }
    : { left: 0, right: 0, top: 24 };

  // Glass pill sized like the badges it sits between, so the top bar reads
  // as one row.
  return (
    <div
      role="status"
      aria-live="polite"
      style={position}
      className={`pointer-events-none fixed z-[9999] flex items-center justify-center transition-opacity duration-[600ms] ease-out motion-reduce:transition-none ${
        phase === 'leaving' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className={`ne-boot-in relative flex max-w-full min-w-0 items-center gap-2 rounded-full border bg-black/40 px-3 py-1.5 shadow-lg backdrop-blur-md transition-colors duration-500 ${
          isError ? 'border-amber-400/40' : finished ? 'border-blue-500/40 bg-blue-500/20' : 'border-white/10'
        }`}
      >
        {/* Status dot, same size as the other badges' dots, with a radar
            ping while loading */}
        <span className={`relative flex h-2 w-2 shrink-0 ${minimal ? 'hidden' : ''}`} aria-hidden="true">
          {pulsing ? <span className="ne-ping absolute inset-0 rounded-full bg-blue-400" /> : null}
          <span
            className={`relative h-2 w-2 rounded-full ${
              isError ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
            }`}
          />
        </span>

        {/* Fixed width, so the pill does not jitter while the count runs */}
        <span
          className={`shrink-0 font-mono text-[11px] font-bold tracking-wider tabular-nums ${
            isError ? 'text-amber-400' : 'text-blue-400'
          } ${compact ? '' : 'w-8'}`}
        >
          {isError ? 'OFF' : `${shown}%`}
        </span>

        <span
          key={label}
          className={`ne-boot-label truncate font-mono text-[11px] font-bold tracking-wider uppercase ${
            finished ? 'text-blue-100' : 'text-white/90'
          } ${compact ? 'sr-only' : ''}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

export default BootLoader;
