import React, { useState } from 'react';
import { SphereConfig } from '../types';
import { Sliders, Sparkles, Wand2, Loader2, Minimize2, Box, Circle } from 'lucide-react';

interface ControlsProps {
  config: SphereConfig;
  onConfigChange: (newConfig: SphereConfig) => void;
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  mode: 'sphere' | 'room';
  onToggleMode: () => void;
}

const Controls: React.FC<ControlsProps> = ({ config, onConfigChange, onGenerate, isGenerating, mode, onToggleMode }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState("");

  const handleChange = (key: keyof SphereConfig, value: number | string) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg border border-zinc-700 transition-all z-50"
      >
        <Sliders className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-96 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-2xl p-6 text-zinc-100 z-50 flex flex-col gap-4 max-h-[80vh] overflow-y-auto transition-all duration-300">
      
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          Settings
        </h2>
        <div className="flex items-center gap-2">
            <button 
                onClick={onToggleMode}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md text-xs font-medium border border-zinc-700 transition-colors"
                title="Toggle Mode"
            >
                {mode === 'sphere' ? (
                    <><Box className="w-3.5 h-3.5" /> 3D Room</>
                ) : (
                    <><Circle className="w-3.5 h-3.5" /> Sphere</>
                )}
            </button>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
            <Minimize2 className="w-5 h-5" />
            </button>
        </div>
      </div>

      {mode === 'sphere' ? (
      <>
        {/* AI Generator Section */}
        <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
            <label className="text-xs font-medium text-zinc-400 mb-2 block uppercase tracking-wider">
            AI Theme Generator
            </label>
            <form onSubmit={handleGenerateSubmit} className="flex gap-2">
            <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. 'Red Mars', 'Matrix Rain'..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-zinc-600"
            />
            <button 
                type="submit" 
                disabled={isGenerating || !prompt}
                className="bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all"
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            </button>
            </form>
        </div>

        {/* Manual Controls */}
        <div className="space-y-4">
            
            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs text-zinc-500 mb-1 block">Base Color</label>
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1 pr-3 border border-zinc-700">
                    <input 
                    type="color" 
                    value={config.colorBase}
                    onChange={(e) => handleChange('colorBase', e.target.value)}
                    className="w-8 h-8 rounded bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-zinc-300">{config.colorBase}</span>
                </div>
            </div>
            <div>
                <label className="text-xs text-zinc-500 mb-1 block">Glow Color</label>
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1 pr-3 border border-zinc-700">
                    <input 
                    type="color" 
                    value={config.colorGlow}
                    onChange={(e) => handleChange('colorGlow', e.target.value)}
                    className="w-8 h-8 rounded bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-zinc-300">{config.colorGlow}</span>
                </div>
            </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
            <ControlSlider 
                label="Particles" 
                value={config.particleCount} 
                min={100} max={2000} step={50}
                onChange={(v) => handleChange('particleCount', v)}
            />
            <ControlSlider 
                label="Radius" 
                value={config.radius} 
                min={50} max={400} step={10}
                onChange={(v) => handleChange('radius', v)}
            />
            <ControlSlider 
                label="Particle Size" 
                value={config.particleSize} 
                min={0.5} max={5} step={0.1}
                onChange={(v) => handleChange('particleSize', v)}
            />
            <ControlSlider 
                label="Rotation Speed X" 
                value={config.rotationSpeedX * 1000} 
                min={-10} max={10} step={0.1}
                onChange={(v) => handleChange('rotationSpeedX', v / 1000)}
            />
            <ControlSlider 
                label="Rotation Speed Y" 
                value={config.rotationSpeedY * 1000} 
                min={-10} max={10} step={0.1}
                onChange={(v) => handleChange('rotationSpeedY', v / 1000)}
            />
            <ControlSlider 
                label="Connection Dist." 
                value={config.connectionDistance} 
                min={0} max={100} step={1}
                onChange={(v) => handleChange('connectionDistance', v)}
            />
            </div>

        </div>
      </>
      ) : (
          <div className="text-sm text-zinc-400 text-center py-4">
              Face Tracking Mode Active.<br/>
              Move your head to control the room perspective.
              <div className="mt-4 text-xs text-zinc-500">
                  Settings available via on-screen panel (top right).
              </div>
          </div>
      )}
    </div>
  );
};

// Helper Subcomponent
const ControlSlider = ({ label, value, min, max, step, onChange }: { 
  label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void 
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-xs">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono text-zinc-300">{value.toFixed(1)}</span>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
    />
  </div>
);

export default Controls;