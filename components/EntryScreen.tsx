import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Hand, MousePointer2, ScanFace, ShieldCheck } from 'lucide-react';
import { sound } from './sound';
import { entrySphereSlot } from './entryLayout';

export type StartMode = 'camera' | 'pointer';

interface EntryScreenProps {
  /** Fired on the click itself, so the scene's power-up starts in sync. */
  onIgnite?: () => void;
  /** Fired once the overlay has faded. */
  onStart: (mode: StartMode) => void;
}

/**
 * Entry sequence.
 *
 * The webcam is never requested on load: the visitor is told what it is for
 * and asks for it themselves, or enters with mouse and touch instead. The
 * scene is already rendering behind this screen, so choosing reveals it
 * instantly rather than starting a new wait.
 */
const EntryScreen: React.FC<EntryScreenProps> = ({ onIgnite, onStart }) => {
  const [leaving, setLeaving] = useState(false);

  // Share the space between the top labels and the copy with the scene,
  // which fits the sphere into it on portrait screens.
  const labelsRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const labels = labelsRef.current;
      const intro = introRef.current;
      if (!labels || !intro) return;
      const labelRow = labels.firstElementChild as HTMLElement | null;
      entrySphereSlot.top = labels.getBoundingClientRect().top + (labelRow?.offsetHeight ?? 0);
      entrySphereSlot.bottom = intro.getBoundingClientRect().top;
      entrySphereSlot.valid = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (introRef.current) observer.observe(introRef.current);
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      entrySphereSlot.valid = false;
    };
  }, []);

  const choose = (mode: StartMode) => {
    if (leaving) return;
    setLeaving(true);
    // Audio can only start inside the click.
    sound.start();
    sound.ignite();
    onIgnite?.();
    // Matches the overlay fade so the scene is revealed, not cut to.
    window.setTimeout(() => onStart(mode), 720);
  };

  return (
    <div
      className={`ne-entry absolute inset-0 z-[100] transition-opacity duration-[700ms] motion-reduce:transition-none ${
        leaving ? 'is-leaving pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Vignette: keeps the sphere visible in the middle, darkens the edges
          and the bottom so the copy stays legible over the scene. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 42%, transparent 0%, rgba(9,9,11,0.45) 70%, rgba(9,9,11,0.85) 100%), linear-gradient(to top, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0.5) 38%, transparent 65%)',
        }}
        aria-hidden="true"
      />

      {/* HUD labels in the corners of the viewport; the bottom pair is
          desktop only, where the copy does not reach the bottom edge. */}
      <div ref={labelsRef} className="absolute inset-x-4 top-5 bottom-5 sm:inset-8" aria-hidden="true">
        <span className="ne-rise absolute top-0 left-0 font-mono text-[9px] tracking-[0.3em] text-white/45 uppercase">
          New Element
        </span>
        <div className="ne-rise absolute top-0 right-0 flex items-center gap-2">
          <span className="ne-blink h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]" />
          <span className="font-mono text-[9px] tracking-[0.3em] text-white/45 uppercase">Standby</span>
        </div>
        <span className="ne-rise absolute bottom-0 left-0 hidden font-mono sm:block text-[9px] tracking-[0.3em] text-white/45 uppercase">
          Face · Hands
        </span>
        <span className="ne-rise absolute right-0 bottom-0 hidden font-mono sm:block text-[9px] tracking-[0.3em] text-white/45 uppercase">
          Local only
        </span>
      </div>

      {/* Content. On wide screens it splits into two columns either side of
          the sphere (see .ne-layout in index.css) so nothing covers it; on
          narrower screens it stacks at the bottom. */}
      <div className="ne-layout">
        <div ref={introRef} className="ne-content ne-intro">
          <p className="ne-rise ne-eyebrow flex items-center font-mono text-[10px] font-bold tracking-[0.4em] text-blue-300 uppercase" style={{ animationDelay: '0.1s' }}>
            Iron Man · Element synthesis
          </p>

          <h2 className="ne-rise ne-title mt-4 leading-[1.05] font-bold tracking-[0.02em] text-white uppercase" style={{ animationDelay: '0.2s' }}>
            Your webcam <span className="ne-title-break" />becomes
            <br />
            <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              the controller
            </span>
          </h2>

          {/* How it works, as two gestures */}
          <div className="ne-rise ne-chips mt-6 flex flex-wrap items-center gap-2" style={{ animationDelay: '0.32s' }}>
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/80 backdrop-blur-sm">
              <ScanFace className="h-3.5 w-3.5 text-blue-300" />
              Head to explore
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/80 backdrop-blur-sm">
              <Hand className="h-3.5 w-3.5 text-blue-300" />
              Pinch to shape
            </span>
          </div>
        </div>

        <div className="ne-content ne-actions">
          <div className="ne-rise ne-buttons grid gap-3" style={{ animationDelay: '0.44s' }}>
            <button
              type="button"
              onClick={() => choose('camera')}
              className="ne-cta group relative flex items-center justify-center gap-3 overflow-hidden rounded-full bg-blue-500 px-7 py-3.5 text-white transition-[background-color,box-shadow] hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
            >
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase">Enter with camera</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </button>

            <button
              type="button"
              onClick={() => choose('pointer')}
              className="flex items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3.5 text-white/70 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
            >
              <MousePointer2 className="h-4 w-4" />
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase">Use mouse instead</span>
            </button>
          </div>

          <p className="ne-rise ne-note mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-white/55" style={{ animationDelay: '0.56s' }}>
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-blue-300/80" />
            <span className="sm:hidden">Nothing is recorded, frames stay in your browser.</span>
            <span className="hidden sm:inline">Nothing is recorded: every frame stays in your browser. Permission is asked only after you choose.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EntryScreen;
