/**
 * Procedural sound design for the experience, built on the Web Audio API.
 *
 * Nothing is downloaded: every sound is synthesised. The context can only
 * start inside a user gesture, so `start()` is called from the entry screen
 * buttons; until then every other call is a silent no-op.
 *
 *   energy   tone that follows the sphere's scale while it is being pinched
 *   ignite   the entry power-up: soft rise, then a low impact on IGNITE_IMPACT_S
 *   blip     short UI / tracking cues
 */

/** Seconds from `ignite()` to the impact; the visual burst uses the same. */
export const IGNITE_IMPACT_S = 0.8;

const MUTE_KEY = 'ne-muted';
/** Overall volume: kept low, the sound should sit behind the visuals. */
const MASTER_LEVEL = 0.55;

type Blip = 'click' | 'found' | 'online';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private energyGain: GainNode | null = null;
  private energyOsc: OscillatorNode[] = [];
  private energyFilter: BiquadFilterNode | null = null;
  private muted = readMuted();
  private listeners = new Set<(muted: boolean) => void>();

  get isMuted() {
    return this.muted;
  }

  /** Must run inside a user gesture (click / tap). Safe to call twice. */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    this.ctx = ctx;

    // master -> gentle compressor -> speakers, so stacked sounds never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_LEVEL;
    this.master.connect(comp);

    this.buildEnergy();

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* storage unavailable: the choice lasts for this visit only */
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.08);
    }
    this.listeners.forEach((fn) => fn(muted));
  }

  subscribe(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Entry power-up: rising charge, impact at IGNITE_IMPACT_S, shimmer tail. */
  ignite() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + 0.02;
    const hit = t0 + IGNITE_IMPACT_S;

    // Charge: soft sine rising under a lowpass
    const rise = ctx.createOscillator();
    rise.type = 'sine';
    rise.frequency.setValueAtTime(90, t0);
    rise.frequency.exponentialRampToValueAtTime(330, hit);
    const riseGain = envelope(ctx, t0, [[0, 0], [IGNITE_IMPACT_S * 0.85, 0.07], [IGNITE_IMPACT_S + 0.08, 0]]);
    rise.connect(riseGain).connect(this.master);
    rise.start(t0);
    rise.stop(hit + 0.1);

    // Impact: warm low thump
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, hit);
    sub.frequency.exponentialRampToValueAtTime(45, hit + 0.5);
    const subGain = envelope(ctx, hit, [[0, 0], [0.02, 0.3], [0.9, 0]]);
    sub.connect(subGain).connect(this.master);
    sub.start(hit);
    sub.stop(hit + 1);

    // Tail: quiet chord that fades out
    [440, 660].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = envelope(ctx, hit, [[0, 0], [0.06, 0.018 / (i + 1)], [1.6, 0]]);
      o.connect(g).connect(this.master!);
      o.start(hit);
      o.stop(hit + 1.7);
    });
  }

  /**
   * Follows the sphere while it is being shaped.
   * @param scale    current sphere scale (about 0.5 - 2)
   * @param activity how fast it is changing, 0 when still
   */
  setEnergy(scale: number, activity: number) {
    const ctx = this.ctx;
    if (!ctx || !this.energyGain || !this.energyFilter) return;
    const now = ctx.currentTime;
    // Dead zone: the scale keeps easing by tiny amounts at rest.
    const a = activity < 0.05 ? 0 : Math.min(1, activity);
    const base = 70 + scale * 60;
    this.energyOsc[0].frequency.setTargetAtTime(base, now, 0.08);
    this.energyOsc[1].frequency.setTargetAtTime(base * 1.5, now, 0.08);
    this.energyFilter.frequency.setTargetAtTime(250 + a * 700, now, 0.08);
    this.energyGain.gain.setTargetAtTime(a * 0.035, now, a > 0 ? 0.08 : 0.4);
  }

  blip(kind: Blip) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const notes: Record<Blip, number[]> = {
      click: [740],
      found: [523, 659],
      online: [440, 554, 659],
    };
    const step = kind === 'online' ? 0.09 : 0.07;
    const level = kind === 'click' ? 0.02 : 0.025;
    notes[kind].forEach((f, i) => {
      const t = ctx.currentTime + 0.01 + i * step;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = envelope(ctx, t, [[0, 0], [0.02, level], [kind === 'online' && i === 2 ? 0.5 : 0.22, 0]]);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.7);
    });
  }

  // --- internals -----------------------------------------------------------

  private buildEnergy() {
    const ctx = this.ctx!;
    this.energyGain = ctx.createGain();
    this.energyGain.gain.value = 0;
    this.energyGain.connect(this.master!);
    this.energyFilter = ctx.createBiquadFilter();
    this.energyFilter.type = 'lowpass';
    this.energyFilter.frequency.value = 300;
    this.energyFilter.Q.value = 4;
    this.energyFilter.connect(this.energyGain);
    this.energyOsc = (['triangle', 'sine'] as OscillatorType[]).map((type, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = i === 0 ? 130 : 195;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0.25;
      o.connect(g).connect(this.energyFilter!);
      o.start();
      return o;
    });
  }
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** A gain node following [secondsFromStart, level] points, linearly. */
function envelope(ctx: AudioContext, start: number, points: Array<[number, number]>) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(points[0][1], start + points[0][0]);
  for (const [t, v] of points.slice(1)) g.gain.linearRampToValueAtTime(v, start + t);
  return g;
}

export const sound = new SoundEngine();
