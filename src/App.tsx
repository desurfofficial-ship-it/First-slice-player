/**
 * First Slice NYC — 3D Three.js Web Game
 * Main React Application Wrapper with Ergonomic Collapsible Control Dock,
 * Camera Presets, Starter Wardrobe Switcher, and 60 FPS Diagnostics.
 */

import { useEffect, useState, useRef } from 'react';
import { Game } from './game/Game';
import { STARTERS, starterById } from './core/starters';
import { loadSave } from './core/Save';
import { WardrobeModal } from './ui/WardrobeModal';
import {
  Camera,
  Compass,
  Zap,
  Eye,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  User,
  Sliders,
  RotateCcw,
  Shirt,
  Sparkles,
  Lock,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCamPreset, setActiveCamPreset] = useState<'cozy' | 'street' | 'vista' | 'topdown'>('cozy');
  const [currentStarter, setCurrentStarter] = useState(() => loadSave().starter || 'classic');
  const [isLocked, setIsLocked] = useState(() => Boolean(loadSave().starter));
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [fps, setFps] = useState(60);
  const [soundOn, setSoundOn] = useState(true);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const container = document.getElementById('app');
    if (!container) return;

    // Prevent duplicate canvases
    container.innerHTML = '';
    let gameInstance: Game | null = null;

    try {
      gameInstance = new Game(container);
      gameRef.current = gameInstance;
      (window as any).__game = gameInstance;
    } catch (err) {
      console.error('Error booting First Slice NYC:', err);
    }

    // Auto-open 3D Wardrobe when starter card is requested on arrival
    const starterCardEl = document.getElementById('starter-card');
    let observer: MutationObserver | null = null;
    if (starterCardEl) {
      observer = new MutationObserver(() => {
        if (!starterCardEl.hidden) {
          starterCardEl.hidden = true; // Replace flat text card with 3D studio
          setWardrobeOpen(true);
        }
      });
      observer.observe(starterCardEl, { attributes: true, attributeFilter: ['hidden'] });
    }

    // Keyboard shortcuts: H to toggle HUD, C to center camera, O to open Wardrobe
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyH') {
        setCollapsed((prev) => !prev);
      } else if (e.code === 'KeyC') {
        gameRef.current?.resetCamera();
      } else if (e.code === 'KeyO') {
        setWardrobeOpen((prev) => !prev);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsSprinting(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsSprinting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // FPS meter calculation
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsAnimId = 0;

    const measureFps = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      fpsAnimId = requestAnimationFrame(measureFps);
    };
    fpsAnimId = requestAnimationFrame(measureFps);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(fpsAnimId);
    };
  }, []);

  const handleSelectCamPreset = (preset: 'cozy' | 'street' | 'vista' | 'topdown') => {
    setActiveCamPreset(preset);
    gameRef.current?.setCameraPreset(preset);
  };

  const handleSelectStarter = (id: string) => {
    if (isLocked) {
      console.warn('Character is locked for this playthrough.');
      return;
    }
    setCurrentStarter(id);
    setIsLocked(true);
    gameRef.current?.setStarter(id, true);
  };

  const handleStartNewGame = (starterId?: string) => {
    gameRef.current?.startNewGame(starterId);
  };

  const handleResetCam = () => {
    gameRef.current?.resetCamera();
  };

  const handleToggleSound = () => {
    const nextSound = !soundOn;
    setSoundOn(nextSound);
    const audioBtn = document.getElementById('btn-audio');
    if (audioBtn) audioBtn.click();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-end select-none font-sans">
      {/* Unified Bottom Ergonomic Control Dock (Three.js Skill Section 5) */}
      <div className="pointer-events-auto mx-auto mb-3 flex flex-col items-center max-w-[96vw] w-full sm:w-auto">
        {/* Collapse / Expand Toggle Tab */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="mb-1 flex items-center gap-1.5 rounded-t-lg bg-[#1A1420]/90 px-3 py-1 text-xs font-semibold text-white/80 hover:text-white border-t border-x border-white/15 shadow-md transition-all cursor-pointer"
          aria-label={collapsed ? 'Show Game Controls' : 'Hide Game Controls'}
        >
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          <span>{collapsed ? 'Controls & Camera (H)' : 'Hide Dock (H)'}</span>
        </button>

        {/* The Glassmorphic Dock Container */}
        {!collapsed && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 rounded-2xl bg-[#1A1420]/92 px-4 py-2.5 sm:px-5 sm:py-3 border border-white/15 text-white shadow-2xl backdrop-blur-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Movement Controls Helper */}
            <div className="flex items-center gap-2 pr-3 sm:border-r sm:border-white/15">
              <div className="flex flex-col text-[11px]">
                <div className="flex items-center gap-1 font-semibold text-white/90">
                  <span className="rounded bg-white/15 px-1 py-0.5 text-[10px] font-mono">WASD</span>
                  <span>Walk</span>
                  <span className="text-white/40">/</span>
                  <span className={`rounded px-1 py-0.5 text-[10px] font-mono ${isSprinting ? 'bg-amber-500 text-black font-bold' : 'bg-white/15'}`}>
                    Shift
                  </span>
                  <span className={isSprinting ? 'text-amber-300 font-bold' : 'text-white/80'}>Sprint</span>
                </div>
                <div className="text-[10px] text-white/50 flex items-center gap-1 mt-0.5">
                  <span className="rounded bg-white/10 px-1 text-[9px] font-mono">Space</span>
                  <span>Interact</span>
                  <span className="text-white/30">•</span>
                  <span className={`font-semibold ${isSprinting ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isSprinting ? '6.4 m/s' : '4.2 m/s'}
                  </span>
                </div>
              </div>
            </div>

            {/* Intuitive Camera Controls Hint & Orbit Indicator */}
            <div className="flex items-center gap-2 pr-3 sm:border-r sm:border-white/15">
              <Compass size={15} className="text-amber-400 shrink-0" />
              <div className="flex flex-col text-[11px]">
                <span className="font-semibold text-white/90">Mouse Drag to Orbit</span>
                <span className="text-[10px] text-white/50">Scroll to Zoom • Q/E turn</span>
              </div>
              <button
                type="button"
                onClick={handleResetCam}
                title="Center Camera behind Character (C)"
                className="ml-1 rounded-lg bg-white/10 p-1.5 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Center Camera behind Player"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Camera View Presets */}
            <div className="flex items-center gap-1">
              <Camera size={13} className="text-white/50 mr-1 hidden sm:inline" />
              {(['cozy', 'street', 'vista', 'topdown'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectCamPreset(preset)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    activeCamPreset === preset
                      ? 'bg-amber-400 text-black font-bold shadow-sm'
                      : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                  aria-pressed={activeCamPreset === preset}
                >
                  {preset === 'cozy' && 'Cozy 3/4'}
                  {preset === 'street' && 'Street'}
                  {preset === 'vista' && 'Vista'}
                  {preset === 'topdown' && 'Top'}
                </button>
              ))}
            </div>

            {/* Character & Wardrobe Section */}
            <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-white/15">
              {isLocked ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWardrobeOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-400/15 border border-amber-400/35 px-2.5 py-1 text-xs hover:bg-amber-400/25 transition-all cursor-pointer shadow-sm"
                    title="View Character in 3D Wardrobe (O)"
                  >
                    <div
                      className="h-3.5 w-3.5 rounded-full border border-white/50 shadow-sm shrink-0"
                      style={{ backgroundColor: '#' + starterById(currentStarter).look.jacket.toString(16).padStart(6, '0') }}
                    />
                    <span className="font-bold text-white text-xs">{starterById(currentStarter).name}</span>
                    <span className="flex items-center gap-0.5 rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                      <Lock size={9} />
                      <span>Locked</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewGameModal(true)}
                    className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
                    title="Start a new game to choose another character"
                  >
                    <RotateCcw size={11} />
                    <span className="hidden sm:inline">New Game</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setWardrobeOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400/20 to-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400/30 hover:text-white transition-all cursor-pointer shadow-sm"
                  title="Open 3D Character Wardrobe Studio (O)"
                  aria-label="Open 3D Character Wardrobe"
                >
                  <Shirt size={14} className="text-amber-400" />
                  <span className="hidden sm:inline">Choose Character</span>
                  <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-mono text-amber-300">O</span>
                </button>
              )}
            </div>

            {/* Sound Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSound}
              className="rounded-lg bg-white/10 p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors cursor-pointer ml-1"
              title={soundOn ? 'Sound is on (Click to mute)' : 'Sound is muted (Click to unmute)'}
              aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* New Game Confirmation Modal Dialog */}
      {showNewGameModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#1c1622] border border-amber-500/30 p-5 text-white shadow-2xl">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-white">Start a New Game?</h3>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Starting a new game will reset all story progression and block milestones back to Day 1 so you can choose a different character.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowNewGameModal(false)}
                className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStartNewGame()}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black shadow-md hover:bg-amber-300 transition-all cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset & Start New Game</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Character Wardrobe Studio Modal */}
      <WardrobeModal
        isOpen={wardrobeOpen}
        onClose={() => setWardrobeOpen(false)}
        currentStarterId={currentStarter}
        isLocked={isLocked}
        onSelectStarter={handleSelectStarter}
        onStartNewGame={handleStartNewGame}
      />
    </div>
  );
}
