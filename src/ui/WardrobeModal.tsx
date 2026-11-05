/**
 * First Slice NYC — 3D Character Wardrobe & Fitting Room Studio
 * Interactive 3D preview turntable featuring all 6 authentic NYC starters
 * with real-time rotation, accessory inspect, and outfit customizer.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STARTERS, starterById, type Starter } from '../core/starters';
import { buildArticulatedPerson, updatePersonAnim } from '../world/personRig';
import {
  Shirt,
  RotateCcw,
  RotateCw,
  Sparkles,
  X,
  Check,
  Compass,
  Play,
  Pause,
  Layers,
  Lock,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

interface WardrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStarterId: string;
  isLocked: boolean;
  onSelectStarter: (id: string) => void;
  onStartNewGame: (id: string) => void;
}

const STARTER_METADATA: Record<string, { role: string; vibe: string; tag: string }> = {
  classic: {
    role: 'Everyday Courier',
    vibe: 'Gold bomber, cream sneakers, iconic messenger bag.',
    tag: 'Classic NY',
  },
  dee: {
    role: 'Morning Skater',
    vibe: 'Teal windbreaker, backwards cap, deck on her back.',
    tag: 'Streets & Hills',
  },
  marisol: {
    role: 'LaGuardia Painter',
    vibe: 'Oatmeal studio jacket with paint marks, high bun.',
    tag: 'Studio Arts',
  },
  ada: {
    role: 'B-Line Matriarch',
    vibe: 'Warm crimson shawl, wire glasses, wisdom of the city.',
    tag: 'Community',
  },
  booker: {
    role: 'Kestrels Left Fielder',
    vibe: 'Tall athletic silhouette, amber varsity jacket.',
    tag: 'Athletics',
  },
  sixto: {
    role: 'Subway Reader',
    vibe: 'Forest green trench, leather book satchel, quiet charm.',
    tag: 'Library Card',
  },
};

function hexToStr(num: number): string {
  return '#' + num.toString(16).padStart(6, '0').toUpperCase();
}

export function WardrobeModal({
  isOpen,
  onClose,
  currentStarterId,
  isLocked,
  onSelectStarter,
  onStartNewGame,
}: WardrobeModalProps) {
  const [selectedId, setSelectedId] = useState<string>(currentStarterId || 'classic');
  const [autoRotate, setAutoRotate] = useState(true);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const charGroupRef = useRef<THREE.Group | null>(null);
  const rotationAngleRef = useRef(0.35); // initial 3/4 angle
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);

  // Sync state if prop changes
  useEffect(() => {
    if (currentStarterId) setSelectedId(currentStarterId);
    setConfirmNewGame(false);
  }, [currentStarterId, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Build the 3D Turntable Scene
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || 380;
    const height = canvas.clientHeight || 460;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 20);
    camera.position.set(0, 1.05, 3.1);
    camera.lookAt(0, 0.92, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Lighting rig for cozy low-poly diorama
    const hemi = new THREE.HemisphereLight(0xfff5ea, 0x5a5460, 1.2);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffecd0, 1.8);
    keyLight.position.set(2.5, 4.0, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8faec4, 0.8);
    fillLight.position.set(-2.5, 2.5, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf7b32b, 1.1);
    rimLight.position.set(0, 3.0, -3.0);
    scene.add(rimLight);

    // Warm wooden diorama turntable pedestal
    const pedestalGroup = new THREE.Group();
    const pedestalGeo = new THREE.CylinderGeometry(0.72, 0.78, 0.08, 32);
    const pedestalMat = new THREE.MeshLambertMaterial({ color: 0x2a2430 });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.04;
    pedestalGroup.add(pedestal);

    // Brass trim ring on pedestal
    const brassRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.73, 0.73, 0.02, 32),
      new THREE.MeshLambertMaterial({ color: 0xf7b32b }),
    );
    brassRing.position.y = -0.01;
    pedestalGroup.add(brassRing);

    // Soft diorama floor contact shadow
    const shadowDisk = new THREE.Mesh(
      new THREE.RingGeometry(0.01, 0.62, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
    );
    shadowDisk.rotation.x = -Math.PI / 2;
    shadowDisk.position.y = 0.002;
    pedestalGroup.add(shadowDisk);

    scene.add(pedestalGroup);

    // Turntable character holder group
    const charRoot = new THREE.Group();
    scene.add(charRoot);
    charGroupRef.current = charRoot;

    // Render loop
    let animId = 0;
    let lastTime = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (autoRotate && !isDraggingRef.current) {
        rotationAngleRef.current += dt * 0.45;
      }

      if (charRoot) {
        charRoot.rotation.y = rotationAngleRef.current;
        // Living breathing idle
        updatePersonAnim(charRoot, dt);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(render);
    };

    render();

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isOpen]);

  // Update 3D Character Model when selectedId changes
  useEffect(() => {
    if (!isOpen || !charGroupRef.current) return;

    const root = charGroupRef.current;
    // Clear previous model
    while (root.children.length > 0) {
      root.remove(root.children[0]);
    }

    const starter = starterById(selectedId);
    const { group } = buildArticulatedPerson(starter.look);

    // Add skateboard prop if Dee
    if (starter.prop === 'skateboard') {
      const board = new THREE.Group();
      board.name = 'Wardrobe_Board';
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.035, 0.11),
        new THREE.MeshLambertMaterial({ color: 0x2b2730 }),
      );
      const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.012, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x2a9d8f }),
      );
      grip.position.y = 0.02;
      board.add(deck, grip);
      for (const tx of [-0.16, 0.16]) {
        const truck = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.018, 0.12),
          new THREE.MeshLambertMaterial({ color: 0x8a8378 }),
        );
        truck.position.set(tx, -0.02, 0);
        board.add(truck);
      }
      for (const [wx, wz] of [[-0.16, 0.07], [0.16, 0.07], [-0.16, -0.07], [0.16, -0.07]]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.024, 0.024, 0.02, 8),
          new THREE.MeshLambertMaterial({ color: 0xece5d8 }),
        );
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, -0.03, wz);
        board.add(wheel);
      }
      board.position.set(0.03, 1.12, -0.26);
      board.rotation.z = 0.3;
      group.add(board);
    }

    root.add(group);
  }, [selectedId, isOpen]);

  // Pointer drag controls for turntable rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    rotationAngleRef.current += dx * 0.015;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const setAngle = (rad: number) => {
    rotationAngleRef.current = rad;
  };

  const selectedStarter: Starter = starterById(selectedId);
  const meta = STARTER_METADATA[selectedStarter.id] || {
    role: 'Resident',
    vibe: selectedStarter.blurb,
    tag: 'New York',
  };

  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div className="relative flex flex-col lg:flex-row w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-[#18131E] border border-white/15 text-white shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          aria-label="Close Wardrobe"
        >
          <X size={18} />
        </button>

        {/* Left Side: 3D Turntable Preview Stage */}
        <div className="relative flex flex-col items-center justify-between bg-gradient-to-b from-[#221B2B] to-[#14101A] p-4 lg:p-6 lg:w-[48%] border-b lg:border-b-0 lg:border-r border-white/10">
          {/* Top Title Tag */}
          <div className="flex items-center gap-2 self-start mb-1">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/30">
              <Sparkles size={12} />
              <span>3D Fitting Room</span>
            </span>
            <span className="text-xs text-white/50">{meta.tag}</span>
          </div>

          {/* Interactive 3D Canvas */}
          <div
            className="relative w-full aspect-square max-w-[340px] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas ref={canvasRef} className="w-full h-full block" />
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] text-white/50 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <Compass size={11} className="text-amber-400" />
              <span>Drag to rotate 360°</span>
            </div>
          </div>

          {/* Turntable Controls Bar */}
          <div className="flex items-center justify-center gap-2 w-full mt-2">
            <button
              type="button"
              onClick={() => setAngle(0)}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setAngle(Math.PI * 0.25)}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
            >
              3/4 View
            </button>
            <button
              type="button"
              onClick={() => setAngle(Math.PI)}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                rotationAngleRef.current -= 0.5;
              }}
              title="Rotate Left"
              className="rounded-lg bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
              aria-label="Rotate Left"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                rotationAngleRef.current += 0.5;
              }}
              title="Rotate Right"
              className="rounded-lg bg-white/10 p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
              aria-label="Rotate Right"
            >
              <RotateCw size={13} />
            </button>
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? 'Pause Turntable Spin' : 'Start Turntable Spin'}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                autoRotate ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
              aria-label="Toggle Auto-Spin"
            >
              {autoRotate ? <Pause size={13} /> : <Play size={13} />}
            </button>
          </div>
        </div>

        {/* Right Side: Starter Lineup & Outfit Specs */}
        <div className="flex flex-col justify-between p-4 lg:p-7 lg:w-[52%] overflow-y-auto max-h-[85vh]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shirt size={17} className="text-amber-400" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                New York Wardrobe
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-white/60 mb-3">
              Select who got off the bus. Every look carries its own silhouette, backstory, and iconic New York style.
            </p>

            {isLocked && (
              <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 px-3.5 py-2 mb-4 text-xs">
                <Lock size={15} className="text-amber-400 shrink-0" />
                <div className="text-amber-200/90 leading-tight">
                  <span className="font-bold text-white">Character is locked for this playthrough.</span>{' '}
                  You are playing as <span className="font-bold text-amber-300">{starterById(currentStarterId).name}</span>. Start a new game below to switch.
                </div>
              </div>
            )}

            {/* Starters Grid Lineup */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
              {STARTERS.map((s) => {
                const isSelected = selectedId === s.id;
                const isCurrent = currentStarterId === s.id;
                const sm = STARTER_METADATA[s.id];

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(s.id);
                      setConfirmNewGame(false);
                    }}
                    className={`relative flex flex-col items-start p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-1.5 py-0.5 text-emerald-300 text-[9px] font-bold">
                        {isLocked ? <Lock size={9} /> : <Check size={9} />}
                        <span>{isLocked ? 'Active' : 'Current'}</span>
                      </span>
                    )}

                    {/* Jacket Color Indicator Swatch */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-4 w-4 rounded-md shadow-inner border border-white/20"
                        style={{ backgroundColor: hexToStr(s.look.jacket) }}
                      />
                      <span className="font-bold text-sm text-white">{s.name}</span>
                    </div>

                    <span className="text-[11px] text-amber-300/90 font-medium line-clamp-1 mb-1">
                      {sm?.role || 'Resident'}
                    </span>
                    <span className="text-[10px] text-white/50 line-clamp-2">
                      {s.blurb}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Character Deep-Dive Spec Card */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedStarter.name}</h3>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {meta.role}
                  </span>
                </div>
                {selectedStarter.prop && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    + {selectedStarter.prop}
                  </span>
                )}
              </div>

              <blockquote className="text-xs text-white/80 italic mb-3">
                &ldquo;{selectedStarter.blurb}&rdquo;
              </blockquote>

              {/* Color Swatches Breakdown */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3.5 w-3.5 rounded-sm border border-white/30"
                    style={{ backgroundColor: hexToStr(selectedStarter.look.jacket) }}
                  />
                  <span className="text-[11px] text-white/60">Jacket</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3.5 w-3.5 rounded-sm border border-white/30"
                    style={{ backgroundColor: hexToStr(selectedStarter.look.pants) }}
                  />
                  <span className="text-[11px] text-white/60">Pants</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3.5 w-3.5 rounded-sm border border-white/30"
                    style={{ backgroundColor: hexToStr(selectedStarter.look.shoe ?? 0x1a1420) }}
                  />
                  <span className="text-[11px] text-white/60">Sneakers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-3.5 w-3.5 rounded-sm border border-white/30"
                    style={{ backgroundColor: hexToStr(selectedStarter.look.hair) }}
                  />
                  <span className="text-[11px] text-white/60">Hair</span>
                </div>
                {selectedStarter.look.strap && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3.5 w-3.5 rounded-sm border border-white/30"
                      style={{ backgroundColor: hexToStr(selectedStarter.look.strap) }}
                    />
                    <span className="text-[11px] text-white/60">Satchel</span>
                  </div>
                )}
                {selectedStarter.look.shawl && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-3.5 w-3.5 rounded-sm border border-white/30"
                      style={{ backgroundColor: hexToStr(selectedStarter.look.shawl) }}
                    />
                    <span className="text-[11px] text-white/60">Shawl</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {confirmNewGame ? (
              <div className="flex flex-col gap-2.5 w-full bg-[#201828] border border-amber-500/40 rounded-2xl p-3.5 shadow-xl animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-white/90">
                    <span className="font-bold text-amber-300 block text-sm mb-0.5">Start fresh playthrough?</span>
                    This resets story progression and block milestones back to Day 1 so you can begin fresh as <span className="font-bold text-white underline">{selectedStarter.name}</span>.
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onStartNewGame(selectedId);
                      onClose();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 px-3 text-xs font-bold text-black shadow-md hover:bg-amber-300 active:scale-98 transition-all cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Yes, Start Fresh as {selectedStarter.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmNewGame(false)}
                    className="rounded-xl bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                  >
                    Keep Current Game
                  </button>
                </div>
              </div>
            ) : isLocked ? (
              selectedId === currentStarterId ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 px-4 text-sm font-bold text-white shadow-lg hover:from-emerald-400 hover:to-emerald-500 active:scale-98 transition-all cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Resume as {selectedStarter.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmNewGame(true)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 px-4 text-sm font-bold text-black shadow-lg hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all cursor-pointer"
                  >
                    <RotateCcw size={16} />
                    <span>Start New Game as {selectedStarter.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onSelectStarter(selectedId);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 px-4 text-sm font-bold text-black shadow-lg hover:from-amber-300 hover:to-amber-400 active:scale-98 transition-all cursor-pointer"
                >
                  <Check size={16} />
                  <span>Confirm & Step Out as {selectedStarter.name}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
