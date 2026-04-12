import React, { useEffect, useRef } from 'react';
import { SphereConfig } from '../types';

interface ParticleSphereProps {
  config: SphereConfig;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  theta: number;
  phi: number;
  index: number;
  neighbors: number[]; // Indices of spatially nearest neighbors
}

// Helper to interpolate colors
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

const ParticleSphere: React.FC<ParticleSphereProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const pointsRef = useRef<Point3D[]>([]);

  // Initialize points on a sphere using Fibonacci lattice (Golden Section)
  // and pre-calculate neighbors for the wireframe mesh.
  useEffect(() => {
    const points: Point3D[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const goldenAngle = (2 * Math.PI) * (1 - 1 / goldenRatio);

    // Temporary array to hold 3D unit coordinates for neighbor calculation
    const tempCoords: {x: number, y: number, z: number}[] = [];

    for (let i = 0; i < config.particleCount; i++) {
      const y = 1 - (i / (config.particleCount - 1)) * 2; 
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      const phi = Math.acos(y);

      // Pre-calc unit position for neighbor search
      const ux = Math.sin(phi) * Math.cos(theta);
      const uy = Math.sin(phi) * Math.sin(theta);
      const uz = Math.cos(phi);
      
      tempCoords.push({ x: ux, y: uy, z: uz });

      points.push({
        x: 0, 
        y: 0,
        z: 0,
        theta,
        phi,
        index: i,
        neighbors: []
      });
    }

    // Find nearest neighbors for each point (O(N^2) but only runs on config change)
    // We look for the closest k neighbors to create a mesh
    const K_NEIGHBORS = 6; 
    
    for (let i = 0; i < config.particleCount; i++) {
      const p1 = tempCoords[i];
      const distances: {idx: number, dist: number}[] = [];

      for (let j = 0; j < config.particleCount; j++) {
        if (i === j) continue;
        const p2 = tempCoords[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        // Squared distance is enough for sorting
        distances.push({ idx: j, dist: dx*dx + dy*dy + dz*dz });
      }

      // Sort by distance and take top K
      distances.sort((a, b) => a.dist - b.dist);
      points[i].neighbors = distances.slice(0, K_NEIGHBORS).map(d => d.idx);
    }

    pointsRef.current = points;
  }, [config.particleCount]); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const baseRgb = hexToRgb(config.colorBase);
    const glowRgb = hexToRgb(config.colorGlow);

    let rotationX = 0;
    let rotationY = 0;

    const render = () => {
      const parent = canvas.parentElement;
      if (parent) {
        if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        }
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      rotationX += config.rotationSpeedX;
      rotationY += config.rotationSpeedY;

      const cosRX = Math.cos(rotationX);
      const sinRX = Math.sin(rotationX);
      const cosRY = Math.cos(rotationY);
      const sinRY = Math.sin(rotationY);

      // 1. Calculate Positions
      // We keep indices consistent with pointsRef.current for neighbor lookups
      const projectedPoints = pointsRef.current.map(point => {
        const r = config.radius;
        let x = r * Math.sin(point.phi) * Math.cos(point.theta);
        let y = r * Math.sin(point.phi) * Math.sin(point.theta);
        let z = r * Math.cos(point.phi);

        // Rotation
        let x2 = x * cosRY - z * sinRY;
        let z2 = z * cosRY + x * sinRY;
        let y2 = y;

        let y3 = y2 * cosRX - z2 * sinRX;
        let z3 = z2 * cosRX + y2 * sinRX;
        let x3 = x2;

        // Perspective
        const scale = config.perspective / (config.perspective + z3);
        const x2d = x3 * scale + centerX;
        const y2d = y3 * scale + centerY;

        return { x: x2d, y: y2d, z: z3, scale, index: point.index, neighbors: point.neighbors };
      });

      // 2. Draw Connections
      // Draw lines BEFORE particles so they appear behind
      if (config.connectionDistance > 0) {
        ctx.lineWidth = 0.5;
        
        projectedPoints.forEach((p1, i) => {
          // Optimization: fade out lines that are far back to reduce visual clutter
          if (p1.z < -config.radius * 0.5) return; 

          p1.neighbors.forEach(neighborIdx => {
             // Only draw connection if neighbor index is greater to avoid double drawing lines
             if (neighborIdx <= i) return;

             const p2 = projectedPoints[neighborIdx];
             
             // Check 2D distance for the "stretchy" effect
             const dx = p1.x - p2.x;
             const dy = p1.y - p2.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             
             // Dynamic connection distance based on scale (perspective)
             const maxDist = config.connectionDistance * Math.max(p1.scale, p2.scale);

             if (dist < maxDist) {
               const alpha = (1 - dist / maxDist) * 0.8; // Max opacity 0.8
               
               // Use glow color for lines
               ctx.strokeStyle = `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${alpha})`;
               ctx.beginPath();
               ctx.moveTo(p1.x, p1.y);
               ctx.lineTo(p2.x, p2.y);
               ctx.stroke();
             }
          });
        });
      }

      // 3. Draw Particles
      // Sort for Painter's Algorithm (Draw back to front)
      // We create a shallow copy for sorting so we don't mess up indices for next frame if we used direct ref
      // (Though map returned new array so it's fine)
      const sortedPoints = [...projectedPoints].sort((a, b) => b.z - a.z);

      sortedPoints.forEach(p => {
        const size = Math.max(0.1, config.particleSize * p.scale);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        
        const ratio = p.index / config.particleCount;
        const r = Math.round(baseRgb.r + ratio * (glowRgb.r - baseRgb.r));
        const g = Math.round(baseRgb.g + ratio * (glowRgb.g - baseRgb.g));
        const b = Math.round(baseRgb.b + ratio * (glowRgb.b - baseRgb.b));

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();

        if (p.scale > 0.8) {
             ctx.shadowBlur = 10 * p.scale;
             ctx.shadowColor = config.colorGlow;
             ctx.fill();
             ctx.shadowBlur = 0; 
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
    />
  );
};

export default ParticleSphere;