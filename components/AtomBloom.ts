import * as THREE from 'three';

export function createAtomBloom(): THREE.Group {
  const group = new THREE.Group();

  // Nucleus (Icosahedron)
  const nucleusGeom = new THREE.IcosahedronGeometry(2, 1);
  const nucleusMat = new THREE.MeshBasicMaterial({ 
    color: 0x58a6ff, 
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });
  const nucleus = new THREE.Mesh(nucleusGeom, nucleusMat);
  group.add(nucleus);

  // Inner Core Glow
  const coreGeom = new THREE.SphereGeometry(1, 16, 16);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const core = new THREE.Mesh(coreGeom, coreMat);
  group.add(core);

  // Electron Rings
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ringGeom = new THREE.TorusGeometry(4 + i * 1.5, 0.05, 8, 50);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x58a6ff });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    
    // Random rotation for each ring to form an atom shape
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    
    group.add(ring);
  }

  // Floating Particles
  const particleCount = 20;
  const particleGeom = new THREE.SphereGeometry(0.15, 8, 8);
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xaaddff });
  
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(particleGeom, particleMat);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 5 + Math.random() * 3;
    
    particle.position.x = radius * Math.sin(phi) * Math.cos(theta);
    particle.position.y = radius * Math.sin(phi) * Math.sin(theta);
    particle.position.z = radius * Math.cos(phi);
    
    group.add(particle);
  }

  return group;
}