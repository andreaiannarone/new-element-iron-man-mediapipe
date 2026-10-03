/**
 * Render quality setting, chosen from the settings menu next to the info button.
 *
 * Quality drives the renderer's pixel ratio, which also sets the resolution of
 * the bloom pass, so it is the single biggest lever on GPU cost:
 *
 *   low      0.75x  for older laptops and phones that struggle to hold the frame rate
 *   medium   1x     one pixel per CSS pixel
 *   high     native device pixel ratio, capped at 2 (the original look)
 *   auto     starts at high and steps down while the frame rate stays low
 */

export type QualityLevel = 'auto' | 'low' | 'medium' | 'high';

export const QUALITY_LEVELS: { level: QualityLevel; label: string }[] = [
  { level: 'auto', label: 'Auto' },
  { level: 'low', label: 'Low' },
  { level: 'medium', label: 'Medium' },
  { level: 'high', label: 'High' },
];

const QUALITY_KEY = 'ne-quality';

export function qualityPixelRatio(level: QualityLevel) {
  if (level === 'low') return 0.75;
  if (level === 'medium') return 1;
  // high, and the starting point of auto
  return Math.min(window.devicePixelRatio, 2);
}

class QualityStore {
  private level = readLevel();
  private listeners = new Set<(level: QualityLevel) => void>();

  get current() {
    return this.level;
  }

  set(level: QualityLevel) {
    if (level === this.level) return;
    this.level = level;
    try {
      localStorage.setItem(QUALITY_KEY, level);
    } catch {
      /* storage unavailable: the choice lasts for this visit only */
    }
    this.listeners.forEach((fn) => fn(level));
  }

  subscribe(fn: (level: QualityLevel) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

function readLevel(): QualityLevel {
  try {
    const stored = localStorage.getItem(QUALITY_KEY);
    if (stored === 'auto' || stored === 'low' || stored === 'medium' || stored === 'high') return stored;
  } catch {
    /* fall through to the default */
  }
  return 'auto';
}

export const quality = new QualityStore();
