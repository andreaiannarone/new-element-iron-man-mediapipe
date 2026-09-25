import React, { useEffect, useState } from 'react';
import { Info, Volume2, VolumeX } from 'lucide-react';
import FaceTrackingRoom from './components/FaceTrackingRoom';
import AboutDialog from './components/AboutDialog';
import EntryScreen, { type StartMode } from './components/EntryScreen';
import { sound } from './components/sound';

const App: React.FC = () => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pointerFallback, setPointerFallback] = useState(false);
  // null until the visitor chooses on the entry screen.
  const [startMode, setStartMode] = useState<StartMode | null>(null);
  const started = startMode !== null;
  // True from the click on the entry screen: drives the power-up transition.
  const [entering, setEntering] = useState(false);
  const [muted, setMuted] = useState(sound.isMuted);
  useEffect(() => sound.subscribe(setMuted), []);

  return (
    <main className="relative w-screen h-screen h-dvh min-h-screen min-h-dvh overflow-hidden bg-black selection:bg-blue-500/30">

      {/* Accessible page heading: the experience itself renders to a canvas, so
          the document keeps a real h1 for screen readers and crawlers. */}
      <h1 className="nx-sr">
        New Element - Iron Man: real-time face and hand tracking in the browser.
        Move your head to explore a 3D sci-fi room and pinch your thumb and index finger to zoom the particle sphere.
      </h1>

      {/* Main 3D Environment */}
      <div className="absolute inset-0 z-0">
        <FaceTrackingRoom onPointerFallbackChange={setPointerFallback} startMode={startMode} entering={entering} />
      </div>

      {/* Overlay UI - Styled to match Top Right Icons */}
      <div className={`absolute top-6 left-4 z-10 pointer-events-none sm:left-6 transition-opacity duration-700 motion-reduce:transition-none ${started ? 'opacity-100' : 'opacity-0'}`}>
        <div data-hud="brand" className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg w-fit">
          <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider font-mono">
            NEW ELEMENT<span className="hidden sm:inline"> - IRON MAN</span>
          </span>
        </div>
      </div>

      {/* Bottom Left: Instruction Badge.
          Sits above the webcam window (z-40) so the info button stays clickable
          where the two overlap on narrow screens. */}
      <div className={`absolute bottom-6 left-4 right-4 z-50 pointer-events-none transition-opacity duration-700 delay-200 motion-reduce:transition-none sm:left-6 sm:right-auto ${started ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex w-full items-center gap-2 sm:w-fit">

          {/* Info button: its own pill, matching the badge's glass treatment. */}
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            aria-haspopup="dialog"
            aria-label="About this project"
            title="About this project"
            className="pointer-events-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg text-zinc-300 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Info className="h-3.5 w-3.5" />
          </button>

          {/* Sound toggle, same pill as the info button */}
          <button
            type="button"
            onClick={() => {
              sound.setMuted(!muted);
              if (muted) sound.blip('click');
            }}
            aria-pressed={!muted}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            title={muted ? 'Turn sound on' : 'Turn sound off'}
            className="pointer-events-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg text-zinc-300 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          <div className="flex w-full min-w-0 items-center justify-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg sm:w-fit">
            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse shrink-0" />
            <p className="text-center text-[10px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
              {pointerFallback
              ? 'MOVE OR DRAG TO LOOK AROUND & SCROLL OR PINCH TO ZOOM'
              : 'MOVE HEAD FOR BACKGROUND & PINCH IN WEBCAM TO ZOOM'}
            </p>
          </div>

        </div>
      </div>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {!started ? <EntryScreen onIgnite={() => setEntering(true)} onStart={setStartMode} /> : null}

    </main>
  );
};

export default App;
