export interface SphereConfig {
  particleCount: number;
  radius: number;
  rotationSpeedX: number;
  rotationSpeedY: number;
  colorBase: string; // Hex color
  colorGlow: string; // Hex color
  particleSize: number;
  connectionDistance: number; // Distance to draw lines between particles (0 for none)
  perspective: number;
}

export const DEFAULT_CONFIG: SphereConfig = {
  particleCount: 800,
  radius: 200,
  rotationSpeedX: 0.002,
  rotationSpeedY: 0.004,
  colorBase: '#60a5fa', // Blue-400
  colorGlow: '#3b82f6', // Blue-500
  particleSize: 1.5,
  connectionDistance: 50,
  perspective: 800,
};