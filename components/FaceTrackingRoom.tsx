import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createTechSphere } from './TechSphere';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    FaceMesh: any;
    Hands: any;
    Camera: any;
  }
}

interface HandZoomSensitivity {
  openGestureRatio: number;
  closedGestureRatio: number;
  maxTipDepthDelta: number;
  scaleSmoothing: number;
  spreadSmoothing: number;
  gestureDeadZoneRatio: number;
  maxScaleStep: number;
}

interface HandTrackingQuality {
  modelComplexity: 0 | 1;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  inputWidth: number;
  inputHeight: number;
  landmarkSmoothing: number;
}

const DEFAULT_HAND_SCALE = 1.0;
const OPEN_HAND_SCALE = 2.8;
const CLOSED_HAND_SCALE = 0.8;
const WRIST_INDEX = 0;
const THUMB_TIP_INDEX = 4;
const INDEX_TIP_INDEX = 8;
const INDEX_BASE_INDEX = 5;
const MIDDLE_BASE_INDEX = 9;
const PINKY_BASE_INDEX = 17;
const MAX_INVALID_HAND_FRAMES = 5;
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17], [5, 9], [9, 13], [13, 17],
] as const;
const HAND_TRACKING_QUALITY: HandTrackingQuality = {
  modelComplexity: 1,
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.6,
  inputWidth: 960,
  inputHeight: 720,
  landmarkSmoothing: 0.58,
};
const HAND_ZOOM_SENSITIVITY: HandZoomSensitivity = {
  // Lower values make maximum zoom easier to reach.
  openGestureRatio: 1.55,
  // Lower values require thumb and index to get closer before minimum zoom is reached.
  closedGestureRatio: 0.03,
  // Decrease to reject more cases where one fingertip is much closer to the camera.
  maxTipDepthDelta: 0.14,
  // Lower values make scale transitions smoother but less reactive.
  scaleSmoothing: 0.24,
  // Lower values filter more noise but respond more slowly.
  spreadSmoothing: 0.4,
  // Increase to ignore more tiny thumb/index jitter around the current pose.
  gestureDeadZoneRatio: 0.035,
  // Lower values make zoom more precise by capping how much scale can change per hand frame.
  maxScaleStep: 0.06,
};

const getLandmarkDistance = (first: any, second: any) => {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  const deltaZ = (first.z ?? 0) - (second.z ?? 0);

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
};

const getPlanarLandmarkDistance = (first: any, second: any) => {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
};

const getThumbIndexSpreadRatio = (hand: any[]) => {
  const wrist = hand[WRIST_INDEX];
  const thumbTip = hand[THUMB_TIP_INDEX];
  const indexTip = hand[INDEX_TIP_INDEX];
  const indexBase = hand[INDEX_BASE_INDEX];
  const middleBase = hand[MIDDLE_BASE_INDEX];
  const pinkyBase = hand[PINKY_BASE_INDEX];

  if (!wrist || !thumbTip || !indexTip || !indexBase || !middleBase || !pinkyBase) {
    return null;
  }

  const tipDepthDelta = Math.abs((thumbTip.z ?? 0) - (indexTip.z ?? 0));

  // Ignore the gesture if one fingertip moves much closer to the camera than the other.
  if (tipDepthDelta > HAND_ZOOM_SENSITIVITY.maxTipDepthDelta) {
    return null;
  }

  const thumbIndexDistance = getPlanarLandmarkDistance(thumbTip, indexTip);
  const palmWidth = getPlanarLandmarkDistance(indexBase, pinkyBase);
  const palmHeight = getPlanarLandmarkDistance(wrist, middleBase);
  const handReferenceSize = (palmWidth + palmHeight) * 0.5;

  if (handReferenceSize < 0.01) {
    return null;
  }

  return thumbIndexDistance / handReferenceSize;
};

const applyDeadZone = (currentValue: number, nextValue: number, deadZone: number) => {
  const delta = nextValue - currentValue;

  if (Math.abs(delta) <= deadZone) {
    return currentValue;
  }

  return currentValue + Math.sign(delta) * (Math.abs(delta) - deadZone);
};

const drawHandTrackingOverlay = (
  overlay: HTMLCanvasElement | null,
  video: HTMLVideoElement | null,
  handLandmarks: any[] | undefined
) => {
  if (!overlay) {
    return;
  }

  const context = overlay.getContext('2d');

  if (!context) {
    return;
  }

  const width = video?.videoWidth || 640;
  const height = video?.videoHeight || 480;

  if (overlay.width !== width || overlay.height !== height) {
    overlay.width = width;
    overlay.height = height;
  }

  context.clearRect(0, 0, width, height);

  if (!handLandmarks?.length) {
    return;
  }

  context.lineCap = 'round';
  context.lineJoin = 'round';

  handLandmarks.forEach((hand) => {
    HAND_CONNECTIONS.forEach(([startIndex, endIndex]) => {
      const start = hand[startIndex];
      const end = hand[endIndex];

      if (!start || !end) {
        return;
      }

      context.beginPath();
      context.moveTo(start.x * width, start.y * height);
      context.lineTo(end.x * width, end.y * height);
      context.strokeStyle = 'rgba(96, 165, 250, 0.75)';
      context.lineWidth = 3;
      context.stroke();
    });

    hand.forEach((landmark: any, index: number) => {
      const isGestureTip = index === THUMB_TIP_INDEX || index === INDEX_TIP_INDEX;
      const radius = isGestureTip ? 7 : 4.5;

      context.beginPath();
      context.arc(landmark.x * width, landmark.y * height, radius, 0, Math.PI * 2);
      context.fillStyle = isGestureTip ? 'rgba(255, 255, 255, 0.95)' : 'rgba(59, 130, 246, 0.92)';
      context.fill();

      context.beginPath();
      context.arc(landmark.x * width, landmark.y * height, radius + 2, 0, Math.PI * 2);
      context.strokeStyle = isGestureTip ? 'rgba(56, 189, 248, 0.95)' : 'rgba(14, 165, 233, 0.5)';
      context.lineWidth = 2;
      context.stroke();
    });

    const thumbTip = hand[THUMB_TIP_INDEX];
    const indexTip = hand[INDEX_TIP_INDEX];

    if (thumbTip && indexTip) {
      context.beginPath();
      context.moveTo(thumbTip.x * width, thumbTip.y * height);
      context.lineTo(indexTip.x * width, indexTip.y * height);
      context.strokeStyle = 'rgba(250, 204, 21, 0.9)';
      context.lineWidth = 2.5;
      context.setLineDash([8, 6]);
      context.stroke();
      context.setLineDash([]);
    }
  });
};

const smoothHandLandmarks = (previousHand: any[] | null, nextHand: any[]) => {
  if (!previousHand) {
    return nextHand.map((landmark) => ({ ...landmark }));
  }

  return nextHand.map((landmark, index) => {
    const previousLandmark = previousHand[index];

    if (!previousLandmark) {
      return { ...landmark };
    }

    const previousZ = previousLandmark.z ?? landmark.z ?? 0;
    const currentZ = landmark.z ?? previousZ;

    return {
      ...landmark,
      x: previousLandmark.x + (landmark.x - previousLandmark.x) * HAND_TRACKING_QUALITY.landmarkSmoothing,
      y: previousLandmark.y + (landmark.y - previousLandmark.y) * HAND_TRACKING_QUALITY.landmarkSmoothing,
      z: previousZ + (currentZ - previousZ) * HAND_TRACKING_QUALITY.landmarkSmoothing,
    };
  });
};

const FaceTrackingRoom: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handOverlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Initializing 3D Environment...");
  const [handDetected, setHandDetected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const loadingOverlay = isLoading ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-blue-500/30 text-blue-400 z-[9999] pointer-events-none">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-center text-xs font-medium tracking-wide uppercase">{status}</span>
    </div>
  ) : null;

  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !containerRef.current) return;
    let isMounted = true;

    // Cleanup refs
    let animationId: number;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let composer: EffectComposer;
    let faceMesh: any;
    let hands: any;
    let cam: any;
    let scene: THREE.Scene;

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    };

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const initScene = async () => {
      if (!canvasRef.current || !videoRef.current || !containerRef.current) return;

      // --- THREE JS SETUP ---
      const canvas = canvasRef.current;
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;

      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
        renderer.setSize(width, height);
        renderer.toneMappingExposure = 1.0;
      } catch (e) {
        setStatus("WebGL Error: Refresh Page");
        return;
      }

      scene = new THREE.Scene();
      scene.background = new THREE.Color('#050505');

      camera = new THREE.PerspectiveCamera(85, width / height, 0.05, 500);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.enableRotate = false;
      controls.autoRotate = false;

      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const dirLight = new THREE.DirectionalLight(0x58a6ff, 1.4);
      dirLight.position.set(2, 3, 2);
      scene.add(dirLight);

      // --- ROOM LOGIC ---
      const roomSize = 90;
      const roomHeight = 30;
      const cellSize = 1.5;
      const roomCenterY = 0;

      const roomGroup = new THREE.Group();
      scene.add(roomGroup);

      const techSphere = createTechSphere();
      techSphere.position.set(0, roomCenterY, 0);
      roomGroup.add(techSphere);

      // --- BLOOM SETUP ---
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      const bloomParams = {
        bloomEnabled: true,
        bloomStrength: 1.0,
        bloomThreshold: 0.0,
        bloomRadius: 0.5,
      };
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        bloomParams.bloomStrength,
        bloomParams.bloomRadius,
        bloomParams.bloomThreshold
      );
      bloomPass.enabled = bloomParams.bloomEnabled;
      composer.addPass(renderPass);
      composer.addPass(bloomPass);

      // --- GRID GENERATOR ---
      const createGridPlane = (w: number, h: number, step: number, color: number) => {
        const verts = [];
        for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) {
          verts.push(x, -h / 2, 0, x, h / 2, 0);
        }
        for (let y = -h / 2; y <= h / 2 + 1e-6; y += step) {
          verts.push(-w / 2, y, 0, w / 2, y, 0);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        return new THREE.LineSegments(
          g,
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4, linewidth: 1 })
        );
      };

      const gridColor = 0x3b82f6;
      const floor = createGridPlane(roomSize, roomSize, cellSize, gridColor);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, roomCenterY - roomHeight / 2, 0);
      roomGroup.add(floor);

      const ceiling = createGridPlane(roomSize, roomSize, cellSize, gridColor);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(0, roomCenterY + roomHeight / 2, 0);
      roomGroup.add(ceiling);

      const backWall = createGridPlane(roomSize, roomHeight, cellSize, gridColor);
      backWall.position.set(0, roomCenterY, -roomSize / 2);
      roomGroup.add(backWall);

      const leftWall = createGridPlane(roomSize, roomHeight, cellSize, gridColor);
      leftWall.rotation.y = Math.PI / 2;
      leftWall.position.set(-roomSize / 2, roomCenterY, 0);
      roomGroup.add(leftWall);

      const rightWall = createGridPlane(roomSize, roomHeight, cellSize, gridColor);
      rightWall.rotation.y = -Math.PI / 2;
      rightWall.position.set(roomSize / 2, roomCenterY, 0);
      roomGroup.add(rightWall);

      // --- ANIMATION VARIABLES ---
      let targetYaw = 0;
      let targetPitch = 0;
      let smoothedYaw = 0;
      let smoothedPitch = 0;

      let targetOffsetX = 0;
      let targetOffsetY = 0;
      let smoothedOffsetX = 0;
      let smoothedOffsetY = 0;
      let targetSlideX = 0;
      let smoothedSlideX = 0;

      // Scaling variables
      let targetScale = DEFAULT_HAND_SCALE;
      let smoothedScale = DEFAULT_HAND_SCALE;
      let smoothedSpreadRatio: number | null = null;
      let smoothedHandLandmarks: any[] | null = null;
      let invalidHandFrames = 0;

      const baseCamRadius = 25;
      const baseCamY = 0;

      camera.position.set(0, baseCamY, baseCamRadius);
      camera.lookAt(0, roomCenterY, 0);

      // --- RENDER LOOP ---
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        controls.update();

        // Face Movement Smoothing
        smoothedYaw += (targetYaw - smoothedYaw) * 0.14;
        smoothedPitch += (targetPitch - smoothedPitch) * 0.14;
        smoothedOffsetX += (targetOffsetX - smoothedOffsetX) * 0.14;
        smoothedOffsetY += (targetOffsetY - smoothedOffsetY) * 0.14;
        smoothedSlideX += (targetSlideX - smoothedSlideX) * 0.12;

        smoothedScale += (targetScale - smoothedScale) * HAND_ZOOM_SENSITIVITY.scaleSmoothing;

        const slideX = smoothedOffsetX * 2.4 + smoothedSlideX;
        const slideY = smoothedOffsetY * 1.8 + smoothedPitch * 1.2;
        roomGroup.position.set(-slideX, -slideY, 0);
        roomGroup.rotation.y = smoothedYaw * 0.85;
        roomGroup.rotation.x = smoothedPitch * 0.6;

        // Apply Scale to Sphere
        techSphere.scale.set(smoothedScale, smoothedScale, smoothedScale);

        // Auto rotate the tech sphere
        techSphere.rotation.y += 0.005;
        techSphere.rotation.x += 0.002;

        composer.render();
      };
      animate();

      // --- SEQUENTIAL LOADING ---
      try {
        // Step 1: Load FaceMesh Script
        setStatus("Loading Face Tracking Engine...");
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.min.js');
        if (!isMounted) return;
        await wait(100);

        // Step 2: Initialize FaceMesh
        setStatus("Initializing Face Model...");
        if (!window.FaceMesh) throw new Error("FaceMesh script failed to load");

        faceMesh = new window.FaceMesh({
          locateFile: (f: string) => {
            // Use standard binary
            if (f === 'face_mesh.wasm') return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.wasm`;
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`;
          },
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false, // Performance increase
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
          setIsLoading(false); // First successful result hides loader
          if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
            setFaceDetected(false);
            return;
          }
          setFaceDetected(true);
          const landmarks = results.multiFaceLandmarks[0];
          const nose = landmarks[6];
          const nx = (nose.x - 0.5) * 2;
          const ny = (nose.y - 0.5) * 2;

          targetYaw = nx * 0.95;
          targetPitch = -ny * 0.75;
          targetOffsetX = nx * 1.2;
          targetOffsetY = -ny * 1.1;
          targetSlideX = nx * 3.0;
        });

        // Step 3: Load Hands Script
        if (!isMounted) return;
        setStatus("Loading Hand Tracking Engine...");
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
        await wait(100);

        // Step 4: Initialize Hands
        setStatus("Initializing Hand Model...");
        if (!window.Hands) throw new Error("Hands script failed to load");

        hands = new window.Hands({
          locateFile: (f: string) => {
            if (f === 'hands.wasm') return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_simd_wasm_bin.wasm`;
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: HAND_TRACKING_QUALITY.modelComplexity,
          minDetectionConfidence: HAND_TRACKING_QUALITY.minDetectionConfidence,
          minTrackingConfidence: HAND_TRACKING_QUALITY.minTrackingConfidence,
        });

        hands.onResults((results: any) => {
          if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            drawHandTrackingOverlay(handOverlayRef.current, videoRef.current, undefined);
            setHandDetected(false);
            smoothedSpreadRatio = null;
            smoothedHandLandmarks = null;
            invalidHandFrames = 0;
            targetScale = DEFAULT_HAND_SCALE;
            return;
          }

          setHandDetected(true);
          const trackedHand = smoothHandLandmarks(
            smoothedHandLandmarks,
            results.multiHandLandmarks[0]
          );
          smoothedHandLandmarks = trackedHand;

          drawHandTrackingOverlay(
            handOverlayRef.current,
            videoRef.current,
            [trackedHand]
          );

          const rawSpreadRatio = getThumbIndexSpreadRatio(trackedHand);

          if (rawSpreadRatio === null) {
            invalidHandFrames += 1;

            if (invalidHandFrames >= MAX_INVALID_HAND_FRAMES) {
              smoothedSpreadRatio = null;
              targetScale = DEFAULT_HAND_SCALE;
            }

            return;
          }

          invalidHandFrames = 0;

          const stabilizedSpreadRatio = smoothedSpreadRatio === null
            ? rawSpreadRatio
            : applyDeadZone(
              smoothedSpreadRatio,
              rawSpreadRatio,
              HAND_ZOOM_SENSITIVITY.gestureDeadZoneRatio
            );

          smoothedSpreadRatio = smoothedSpreadRatio === null
            ? stabilizedSpreadRatio
            : smoothedSpreadRatio + (stabilizedSpreadRatio - smoothedSpreadRatio) * HAND_ZOOM_SENSITIVITY.spreadSmoothing;

          const clampedSpreadRatio = Math.max(
            HAND_ZOOM_SENSITIVITY.closedGestureRatio,
            Math.min(HAND_ZOOM_SENSITIVITY.openGestureRatio, smoothedSpreadRatio)
          );

          const spreadProgress = THREE.MathUtils.smoothstep(
            clampedSpreadRatio,
            HAND_ZOOM_SENSITIVITY.closedGestureRatio,
            HAND_ZOOM_SENSITIVITY.openGestureRatio
          );

          const desiredScale = THREE.MathUtils.lerp(
            CLOSED_HAND_SCALE,
            OPEN_HAND_SCALE,
            spreadProgress
          );

          targetScale += THREE.MathUtils.clamp(
            desiredScale - targetScale,
            -HAND_ZOOM_SENSITIVITY.maxScaleStep,
            HAND_ZOOM_SENSITIVITY.maxScaleStep
          );
        });

        // Step 5: Start Camera
        if (!isMounted) return;
        setStatus("Starting Camera...");
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.min.js');

        if (videoRef.current && window.Camera) {
          cam = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                try {
                  // Alternate processing or just do both? Doing both every frame is heavy.
                  // Let's do both but maybe sequentially in the frame logic if needed.
                  // For now, keep it simple but safeguarded.
                  await faceMesh.send({ image: videoRef.current });
                  await hands.send({ image: videoRef.current });
                } catch (e) {
                  // Ignore dropped frames
                }
              }
            },
            width: HAND_TRACKING_QUALITY.inputWidth,
            height: HAND_TRACKING_QUALITY.inputHeight,
          });

          await cam.start();
          setStatus("Active");
          // Fallback if onResults never fires
          setTimeout(() => setIsLoading(false), 2000);

        } else {
          throw new Error("Camera Utils failed");
        }

      } catch (error) {
        console.error("Initialization sequence failed:", error);
        setStatus("Error: " + (error as any).message);
        // Ensure loader disappears so they can at least see the scene
        setTimeout(() => setIsLoading(false), 2000);
      }
    };

    initScene();

    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      if (renderer) renderer.setSize(width, height);
      if (composer) composer.setSize(width, height);
      if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);

      // Safe cleanup
      if (renderer) {
        renderer.dispose();
        // Traverse scene to dispose geometries/materials
        scene.traverse((object: any) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m: any) => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }

      if (cam) {
        try { cam.stop(); } catch (e) { console.warn("Camera stop error", e); }
      }
      if (faceMesh) {
        try { faceMesh.close(); } catch (e) { console.warn("FaceMesh close error", e); }
      }
      if (hands) {
        try { hands.close(); } catch (e) { console.warn("Hands close error", e); }
      }

      // Stop video stream manually if Camera utils doesn't
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      drawHandTrackingOverlay(handOverlayRef.current, videoRef.current, undefined);
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0 bg-[#0a0f17]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Indicators: Top Right of Main Screen */}
      <div className="absolute top-6 right-6 flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 z-50 pointer-events-none">
        {/* Live Indicator */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg w-fit">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider font-mono">LIVE TRACKING</span>
        </div>

        {/* Face Detection Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg w-fit transition-all duration-300 ${faceDetected ? 'bg-blue-500/20 border-blue-500/40' : 'bg-black/40 border-white/10'}`}>
          <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-zinc-600'}`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${faceDetected ? 'text-blue-100' : 'text-zinc-500'}`}>
            {faceDetected ? 'FACE DETECTED' : 'NO FACE'}
          </span>
        </div>

        {/* Hand Detection Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg w-fit transition-all duration-300 ${handDetected ? 'bg-blue-500/20 border-blue-500/40' : 'bg-black/40 border-white/10'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 475.73 523.45" className={`w-4 h-4 ${handDetected ? 'text-blue-400' : 'text-zinc-500'}`} fill="currentColor">
            <rect x="358.22" y="255.09" width="34.46" height="34.31" rx="4.67" ry="4.67" transform="translate(-24.56 506.91) rotate(-66.34)"/>
            <path d="M475.03,298.75l.7,9.03-15.73,125.3c-.1.82-.47,1.58-1.04,2.18l-57.1,59.63c-.57.6-.94,1.36-1.04,2.18l-2.86,23c-.26,2.1-2.17,3.59-4.27,3.34l-26.18-3.17c-2.11-.26-3.61-2.18-3.35-4.29l4.3-34.47c.1-.82.47-1.59,1.04-2.19l57.01-59.34c.58-.6.94-1.37,1.04-2.19l11.85-96.04c.21-1.69-.72-3.31-2.28-3.99l-18.19-7.92c-1.94-.85-2.83-3.1-1.99-5.05l10.42-24.1c.84-1.95,3.11-2.85,5.06-2l40.45,17.62c1.05.46,1.84,1.36,2.16,2.46h0Z"/>
            <path d="M146.16,294.31c-6.87-10.53-21.03-11.91-30.35-5.75-10.05,6.65-13,19.96-6.23,30.48l89.06,138.29c.73,1.14,1.04,2.49.88,3.83l-3.9,32.11c-.39,3.17-3.27,5.43-6.45,5.04l-22.25-2.74c-3.17-.39-5.42-3.27-5.04-6.44l2.4-19.72c.16-1.34-.15-2.69-.88-3.83l-53.83-83.71c-1.18-1.83-3.29-2.87-5.46-2.62C48.01,385.7-1.21,341.27.02,284.13c3.6-125.79,194.65-116.72,186.79,7.94-.08,1.24.23,2.48.9,3.52l3.89,6.04c2.93,4.55,9.95,2.94,10.6-2.43l14.34-117.05c.24-1.98-.58-3.92-2.12-5.18C136.2,113.26,188.86-9.28,288.97.56c100.93,12.24,125.05,145.67,32.39,189.48-1.8.85-3.07,2.53-3.33,4.51l-3.62,27.55c-.33,2.53,1.03,4.98,3.36,6.03l12.48,5.61c2.89,1.3,4.2,4.69,2.93,7.59l-8.99,20.58c-1.28,2.93-4.69,4.26-7.62,2.99l-35.51-15.51c-2.34-1.02-3.74-3.46-3.43-6l13.39-109.68c1.88-22.81-30.82-26.08-33.77-3.51,0,0-23.2,188.88-23.2,188.88-3.73,31.51-45.33,40.91-62.08,14.82,0,0-25.83-39.59-25.83-39.59ZM325.1,128.94c.04.69.06,1.35.07,2.01.08,5.78,7.59,7.9,10.69,3.02,17.9-28.16,12.61-66.25-14.97-88.6-54.62-43.13-127.03,12.49-107.33,72.46,1.77,5.39,9.37,5.24,11.04-.17,15.35-49.62,95-50.91,100.5,11.29ZM77.87,332.18c-19.32-37.84,9.42-80.46,48.45-81.59,5.31-.15,7.63-6.86,3.52-10.22-68.23-55.67-141.79,65.91-59.27,99.98,5.11,2.11,10.02-3.36,7.3-8.17h0Z"/>
          </svg>
          <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${handDetected ? 'text-blue-100' : 'text-zinc-500'}`}>
            {handDetected ? 'HANDS DETECTED' : 'NO HANDS'}
          </span>
        </div>
      </div>

      {/* Webcam Window */}
      <div className="absolute bottom-6 left-4 right-4 w-auto rounded-3xl overflow-hidden bg-black/40 backdrop-blur-md z-40 group hover:opacity-100 transition-opacity border border-white/10 sm:left-auto sm:right-6 sm:w-72">
        <div className="relative aspect-video bg-black/50">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform scale-x-[-1]"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={handOverlayRef}
            className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md border border-white/10">
            <div className={`w-1.5 h-1.5 rounded-full ${handDetected ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-zinc-600'}`} />
            <span className={`text-[9px] font-bold uppercase tracking-[0.22em] font-mono ${handDetected ? 'text-blue-100' : 'text-zinc-400'}`}>
              HAND OVERLAY
            </span>
          </div>
        </div>
      </div>

      </div>

      {typeof document !== 'undefined' ? createPortal(loadingOverlay, document.body) : null}
    </>
  );
};

export default FaceTrackingRoom;