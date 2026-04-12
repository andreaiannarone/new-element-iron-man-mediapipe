import * as THREE from 'three';

// --- SHADERS FOR WIREFRAME (Existing) ---
const vertexShader = `
  attribute vec3 center;
  varying vec3 vCenter;
    
  void main() {
    vCenter = center;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
  }
`;

const fragmentShader = `
  varying vec3 vCenter;

  void main() {
    if (vCenter.x > 0.02 && vCenter.y > 0.02 && vCenter.z > 0.02) {
      discard;
    } else {
      if (vCenter.x < 0.02 && (vCenter.y < 0.25 || vCenter.z < 0.25)) {
        discard;
      }
      if (vCenter.y < 0.02 && (vCenter.x < 0.25 || vCenter.z < 0.25)) {
        discard;
      }
      if (vCenter.z < 0.02 && (vCenter.y < 0.25 || vCenter.x < 0.25)) {
        discard;
      }
    }
    gl_FragColor = vec4(0.77, 0.90 ,1.0 , 0.2);
  }
`;

// --- SHADERS FOR PARTICLES (New: Replaces Image Texture) ---
const particleVertexShader = `
  uniform float size;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    // Size attenuation based on depth
    gl_PointSize = size * ( 400.0 / -mvPosition.z );
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  uniform vec3 color;
  void main() {
    // Circular particle shape calculation
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) discard;
    
    // Soft glow gradient
    float alpha = 1.0 - (dist * 2.0);
    alpha = pow(alpha, 1.5); // Tune glow curve

    gl_FragColor = vec4( color, alpha );
  }
`;

// --- GEOMETRY HELPER ---
function addCenterAttribute(geometry: THREE.BufferGeometry) {
  const vectors = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1)
  ];

  const position = geometry.attributes.position;
  const centers = new Float32Array(position.count * 3);

  for (let i = 0, l = position.count; i < l; i++) {
    vectors[i % 3].toArray(centers, i * 3);
  }

  geometry.setAttribute("center", new THREE.BufferAttribute(centers, 3));
}

export function createTechSphere(): THREE.Group {
  const group = new THREE.Group();

  const geometry = new THREE.IcosahedronGeometry(10, 6); // High detail geometry
  addCenterAttribute(geometry);

  // Replaced createAlphaMapTexture/createWhiteTexture with ShaderMaterial
  
  // Particle Material (Procedural Shader)
  const atomMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x0567ba) },
      size: { value: 1.2 } 
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // Wireframe Material (Original Shader)
  const bondMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const spherePoints = new THREE.Points(geometry, atomMaterial);
  const sphereLines = new THREE.Mesh(geometry, bondMaterial);

  group.add(spherePoints);
  group.add(sphereLines);

  return group;
}