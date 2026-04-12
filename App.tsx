import React from 'react';
import FaceTrackingRoom from './components/FaceTrackingRoom';

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen h-dvh min-h-screen min-h-dvh overflow-hidden bg-black selection:bg-blue-500/30">

      {/* Main 3D Environment */}
      <div className="absolute inset-0 z-0">
        <FaceTrackingRoom />
      </div>

      {/* Overlay UI - Styled to match Top Right Icons */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg w-fit">
          <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider font-mono">
            NEW ELEMENT - IRON MAN
          </span>
        </div>
      </div>

      {/* Bottom Left: Instruction Badge */}
      <div className="absolute bottom-6 left-4 right-4 z-10 pointer-events-none sm:left-6 sm:right-auto">
        <div className="flex w-full items-center justify-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg sm:w-fit">
          <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" />
          <p className="text-center text-[10px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
            MOVE HEAD FOR BACKGROUND & PINCH IN WEBCAM TO ZOOM
          </p>
        </div>
      </div>

    </div>
  );
};

export default App;