import React, { useEffect, useRef, useState } from 'react';
import { Check, Settings } from 'lucide-react';
import { QUALITY_LEVELS, quality, type QualityLevel } from './quality';
import { sound } from './sound';

/**
 * Settings button for the bottom HUD. Opens a small menu above it where the
 * visitor picks the render quality; Escape or a click outside closes it.
 */
const SettingsMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<QualityLevel>(quality.current);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => quality.subscribe(setLevel), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (next: QualityLevel) => {
    quality.set(next);
    sound.blip('click');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="pointer-events-auto relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="settings-menu"
        aria-label="Settings"
        title="Settings"
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
          open ? 'bg-white/15 text-white' : 'text-zinc-300'
        }`}
      >
        <Settings className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} />
      </button>

      {open ? (
        <div
          id="settings-menu"
          role="menu"
          aria-label="Render quality"
          className="absolute bottom-full left-0 mb-2 w-40 rounded-xl border border-white/10 bg-black/70 p-1 shadow-2xl backdrop-blur-xl"
        >
          <p className="px-2.5 pt-1.5 pb-1 font-mono text-[9px] font-bold tracking-[0.18em] text-zinc-400 uppercase">
            Quality
          </p>
          {QUALITY_LEVELS.map((option) => {
            const active = option.level === level;
            return (
              <button
                key={option.level}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(option.level)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 ${
                  active ? 'bg-white/15 text-white' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {option.label}
                {active ? <Check className="h-3 w-3 text-blue-400" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default SettingsMenu;
