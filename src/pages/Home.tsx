import { useState, useEffect, useRef, useCallback } from 'react';
import FaceTracker from '../components/FaceTracker';
import HandTracker from '../components/HandTracker';
import Scene from '../components/Scene';
import RemoteBridge from '../components/RemoteBridge';
import SpatialAudio from '../components/SpatialAudio';

type FilterType = 'standard' | 'neural' | 'combat' | 'ghost';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceLandmarks {
  faceLandmarks: Landmark[][];
  faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
}

interface Hand {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  handedness: { categoryName: string; score: number }[];
}

interface HandLandmarks {
  hands: Hand[];
}

export default function Home() {
  const [mode, setMode] = useState<'local' | 'remote'>('local');
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);
  const [handLandmarks, setHandLandmarks] = useState<HandLandmarks | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [filter, setFilter] = useState<FilterType>('standard');
  const [module, setModule] = useState<'mesh' | 'core' | 'pulse' | 'glitch'>('mesh');
  const [fps, setFps] = useState(0);
  const [showSwipeHighlight, setShowSwipeHighlight] = useState(false);
  
  const frameCount = useRef(0);
  const lastTime = useRef<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string[]>(["SYSTEM_READY", "IDLE_MODE_ACTIVE"]);

  // Ghosting State
  const [ghostLandmarks, setGhostLandmarks] = useState<FaceLandmarks | null>(null);
  const recordedGhostBuffer = useRef<FaceLandmarks[]>([]);
  const ghostPlaybackIndex = useRef(0);

  // Initialize lastTime in a way that avoids impure rendering error
  useEffect(() => {
    if (lastTime.current === null) {
      lastTime.current = performance.now();
    }
  }, []);

  // FPS Counter
  useEffect(() => {
    let animationFrameId: number;
    const updateFps = () => {
      frameCount.current++;
      const now = performance.now();
      if (lastTime.current !== null && now >= lastTime.current + 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = now;
      }
      animationFrameId = requestAnimationFrame(updateFps);
    };
    animationFrameId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Ghost Buffer logic
  useEffect(() => {
    if (landmarks) {
        recordedGhostBuffer.current.push(landmarks);
        if (recordedGhostBuffer.current.length > 60) {
            recordedGhostBuffer.current.shift();
        }
    }
  }, [landmarks]);

  // Ghost Playback loop
  useEffect(() => {
    const playbackTimer = setInterval(() => {
        if (recordedGhostBuffer.current.length > 10) {
            const index = ghostPlaybackIndex.current % recordedGhostBuffer.current.length;
            setGhostLandmarks(recordedGhostBuffer.current[index]);
            ghostPlaybackIndex.current++;
        }
    }, 50);
    return () => clearInterval(playbackTimer);
  }, []);


  const handleLandmarks = useCallback((results: FaceLandmarks) => {
    setLandmarks(results);
  }, []);

  const handleHandLandmarks = useCallback((results: HandLandmarks) => {
    setHandLandmarks(results);
  }, []);

  const handleRemoteStream = useCallback((stream: MediaStream) => {
    setRemoteStream(stream);
    setShowRemoteModal(false);
  }, []);

  const filterConfigs = {
    standard: { color: '#22d3ee', border: 'border-cyan-400', text: 'text-cyan-400', bg: 'from-cyan-950/40', label: 'STANDARD_V4' },
    neural: { color: '#a855f7', border: 'border-purple-400', text: 'text-purple-400', bg: 'from-purple-950/40', label: 'NEURAL_LINK' },
    combat: { color: '#ef4444', border: 'border-red-500', text: 'text-red-500', bg: 'from-red-950/40', label: 'COMBAT_INIT' },
    ghost: { color: '#f59e0b', border: 'border-amber-500', text: 'text-amber-500', bg: 'from-amber-950/40', label: 'GHOST_MODE' }
  };

  const currentFilter = filterConfigs[filter];

  // Gesture Logic: Swipe to change filter
  const lastHandX = useRef<number | null>(null);
  const swipeCooldown = useRef(0);

  useEffect(() => {
    if (swipeCooldown.current > 0) {
      swipeCooldown.current--;
      return;
    }

    if (handLandmarks?.hands?.[0]) {
      const x = handLandmarks.hands[0].landmarks[9].x; // Middle finger MCP
      if (lastHandX.current !== null) {
        const delta = x - lastHandX.current;
        if (Math.abs(delta) > 0.1) {
           const filters: FilterType[] = ['standard', 'neural', 'combat', 'ghost'];
           const currentIndex = filters.indexOf(filter);
           const nextIndex = delta > 0 
              ? (currentIndex + 1) % filters.length 
              : (currentIndex - 1 + filters.length) % filters.length;
           setFilter(filters[nextIndex]);
           setShowSwipeHighlight(true);
           setTimeout(() => setShowSwipeHighlight(false), 500);
           swipeCooldown.current = 30; // ~1 second cooldown at 30fps
        }
      }
      lastHandX.current = x;
    }
  }, [handLandmarks, filter]);

  // Simulated AI Analysis Feed
  useEffect(() => {
    const analysisItems = [
      "SCANNING_ENVIRONMENT...",
      "OBJECT_DETECTED: UNKNOWN",
      "CORE_PHASE_STABLE",
      "NEURAL_LINK_ESTABLISHED",
      "BIOMETRIC_DATA_SYNCED",
      "NODE_STRENGTH: 98%",
      "ENCRYPTION: AES-256",
      "PROTOCOL_V4_ACTIVE"
    ];
    
    const interval = setInterval(() => {
      setAiAnalysis(prev => {
        const next = analysisItems[Math.floor(Math.random() * analysisItems.length)];
        return [...prev.slice(-4), next];
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Emotion Detection Logic
  useEffect(() => {
    if (!landmarks?.faceBlendshapes?.[0]) return;
    
    const categories = landmarks.faceBlendshapes[0].categories;
    const scores: Record<string, number> = {};
    categories.forEach(c => scores[c.categoryName] = c.score);

    // Rule 1: Anger/Brows down -> Combat
    if (scores['browDownLeft'] > 0.5 || scores['browDownRight'] > 0.5) {
      if (filter !== 'combat') setFilter('combat');
    }
    // Rule 2: Smile -> Ghost (Playful)
    else if (scores['mouthSmileLeft'] > 0.5 || scores['mouthSmileRight'] > 0.5) {
      if (filter !== 'ghost') setFilter('ghost');
    }
    // Rule 3: Jaw Open -> Neural + Glitch Module
    else if (scores['jawOpen'] > 0.4) {
      if (filter !== 'neural') setFilter('neural');
      if (module !== 'glitch') setModule('glitch');
    }
  }, [landmarks, filter, module]);

  return (
    <div className={`relative w-screen h-screen text-white bg-black overflow-hidden font-mono select-none transition-colors duration-1000 ${
       filter === 'combat' ? 'bg-red-950/5' : filter === 'neural' ? 'bg-purple-950/5' : ''
    }`}>
      
      <SpatialAudio landmarks={landmarks} handLandmarks={handLandmarks} />

      {/* SWIPE HIGHLIGHT OVERLAY */}
      <div className={`absolute inset-0 z-[100] pointer-events-none border-[10px] ${currentFilter.border} opacity-0 transition-opacity duration-500 ${showSwipeHighlight ? 'opacity-30' : ''}`} />

      {/* 1. BACKGROUND / VIDEO LAYER (Z-0) */}
      <div id="video-layer" className="absolute inset-0 z-0 bg-zinc-950">
         <div className={`absolute inset-0 z-10 pointer-events-none transition-all duration-1000 ${
            filter === 'combat' ? 'sepia-[0.3] hue-rotate-[320deg] contrast-[1.2]' : 
            filter === 'neural' ? 'hue-rotate-[240deg] saturate-[1.5]' :
            filter === 'ghost' ? 'grayscale opacity-70' : ''
         }`} />
         <FaceTracker 
           onLandmarks={handleLandmarks} 
           videoSource={remoteStream}
           isActive={true} 
           onError={() => {}}
         />
         <HandTracker 
           onHandLandmarks={handleHandLandmarks}
           videoSource={remoteStream}
           isActive={true}
         />
      </div>

      {/* 2. 3D SCENE LAYER (Z-10) */}
      <div id="scene-layer" className="absolute inset-0 z-10 pointer-events-none opacity-80">
         <Scene landmarks={landmarks} module={module} ghostLandmarks={filter === 'ghost' ? ghostLandmarks : null} />
      </div>

      {/* 3. HUD LAYER (Z-20) */}
      <div id="hud-layer" className="absolute inset-0 z-20 pointer-events-none p-10">
         
         {/* TOP LEFT: SYSTEM STATUS */}
         <div className={`absolute top-10 left-10 flex flex-col gap-0 border-l-[3px] ${currentFilter.border} pl-4 py-2 bg-gradient-to-r ${currentFilter.bg} to-transparent transition-all duration-500`}>
            <span className={`text-[10px] ${currentFilter.text} tracking-[0.3em] font-bold uppercase opacity-80`}>System Status</span>
            <span className={`text-2xl font-black ${currentFilter.text.replace('-400', '-300').replace('-500', '-300')} tracking-widest text-shadow-glow`}>ONLINE</span>
            <div className="mt-4 flex flex-col gap-1">
               <span className="text-[9px] opacity-60 uppercase tracking-widest text-white/50">Core Metrics</span>
               <div className="flex gap-4">
                  <div className="flex flex-col">
                     <span className="text-xl font-bold text-white leading-none">{fps}</span>
                     <span className="text-[8px] text-white/40 uppercase">Real FPS</span>
                  </div>
                  <div className="flex flex-col border-l border-white/10 pl-4">
                     <span className="text-xl font-bold text-white leading-none">0.4<span className="text-xs ml-0.5">ms</span></span>
                     <span className="text-[8px] text-white/40 uppercase">Latency</span>
                  </div>
               </div>
               <span className={`text-[9px] ${currentFilter.text} opacity-50 mt-2 tracking-widest`}>PROTOCOL: {currentFilter.label}</span>
            </div>
         </div>

         {/* TOP RIGHT: LINK & PROTOCOL */}
         <div className="absolute top-10 right-10 flex flex-col items-end gap-6 pointer-events-auto">
             <button
               onClick={() => {
                  setMode('remote');
                  if (!remoteStream) setShowRemoteModal(true);
               }}
               className={`group relative flex items-center gap-3 px-6 py-2 border transition-all duration-500 rounded-sm ${
                  remoteStream 
                     ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                     : 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
               }`}
             >
                <div className={`w-2 h-2 rounded-full ${remoteStream ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold tracking-[0.4em] uppercase">
                   {remoteStream ? "LINK ACTIVE" : "LINK OFFLINE"}
                </span>
                <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-white/20" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-white/20" />
             </button>

             {/* MODULE SWITCHER */}
             <div className="flex flex-col items-end gap-2">
                <span className="text-[8px] uppercase tracking-[0.5em] text-white/20 mb-1">Active Module</span>
                <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/10">
                   {(['mesh', 'core', 'pulse', 'glitch'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setModule(m)}
                        className={`px-3 py-1 text-[9px] uppercase tracking-tighter transition-all ${
                          module === m ? 'bg-white text-black font-bold' : 'text-white/40 hover:text-white/80'
                        }`}
                      >
                         {m}
                      </button>
                   ))}
                </div>
             </div>



             {/* FILTER SWITCHER */}
             <div className="flex flex-col items-end gap-2">
                <span className="text-[8px] uppercase tracking-[0.5em] text-white/20 mb-1">Visual Protocol</span>
                <div className="flex gap-3">
                   {(Object.keys(filterConfigs) as FilterType[]).map((f) => (
                      <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                           filter === f ? 'scale-125 border-white shadow-[0_0_15px_white]' : 'border-white/10 hover:border-white/30'
                        }`}
                        style={{ backgroundColor: filterConfigs[f].color }}
                      >
                         {filter === f && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </button>
                   ))}
                </div>
             </div>
             
             <button 
                onClick={() => {
                   setMode('local');
                   setRemoteStream(null);
                }}
                className={`text-[9px] uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors ${mode === 'local' ? 'text-cyan-400 font-bold' : ''}`}
             >
                Reset System
             </button>
         </div>

         {/* BOTTOM LEFT: COMMAND INTERFACE */}
         <div className={`absolute bottom-10 left-10 flex flex-col border-l-[3px] ${currentFilter.border} pl-4 py-2 bg-gradient-to-r ${currentFilter.bg} to-transparent transition-all duration-500`}>
            <span className={`text-[10px] ${currentFilter.text} tracking-[0.3em] font-bold uppercase opacity-80`}>Command Interface</span>
            <div className="flex flex-col mt-2">
               <span className="text-xl font-black text-white tracking-widest leading-none underline decoration-2 underline-offset-4">LOGIC: <span className={currentFilter.text}>AETHER_V3</span></span>
               <div className="flex gap-4 mt-3">
                  <div className="px-2 py-0.5 border border-white/10 bg-white/5 text-[8px] text-white/50 tracking-widest uppercase">
                     Face: {landmarks ? "SENSING" : "IDLE"}
                  </div>
                  <div className="px-2 py-0.5 border border-white/10 bg-white/5 text-[8px] text-white/50 tracking-widest uppercase">
                     Hand: {handLandmarks?.hands?.length ? "SENSING" : "IDLE"}
                  </div>
                  <div className="px-2 py-0.5 border border-white/10 bg-white/5 text-[8px] text-white/50 tracking-widest uppercase">
                     Input: WebRTC
                  </div>
               </div>
            </div>
         </div>

         {/* BOTTOM RIGHT: NEURAL ANALYSIS */}
         <div className={`absolute bottom-10 right-10 flex flex-col border-r-[3px] ${currentFilter.border} pr-4 py-2 bg-gradient-to-l ${currentFilter.bg} to-transparent text-right transition-all duration-500`}>
            <span className={`text-[10px] ${currentFilter.text} tracking-[0.3em] font-bold uppercase opacity-80`}>Neural Analysis</span>
            <div className="flex flex-col mt-2">
               <span className="text-xl font-black text-white tracking-widest leading-none">
                  {landmarks ? "TARGET_LOCKED" : "WAITING..."}
               </span>
               <div className="flex flex-col gap-1 mt-3 items-end">
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] text-white/30 uppercase tracking-widest leading-none">Sensor Sync</span>
                     <div className="w-16 h-1 bg-white/10 overflow-hidden relative">
                        <div className={`absolute left-0 top-0 h-full transition-all duration-500 bg-green-500`} style={{ width: landmarks || (handLandmarks?.hands?.length ?? 0) > 0 ? '100%' : '10%' }} />
                     </div>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                     {aiAnalysis.map((item, i) => (
                        <span key={i} className={`text-[8px] ${currentFilter.text} tracking-[0.2em] uppercase opacity-60 leading-tight`}>
                           {item}
                        </span>
                     ))}
                  </div>
               </div>
            </div>
         </div>

         {/* CENTRAL LOGO (Conditional) */}
         {(!landmarks && !remoteStream) && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative group">
                 {/* Layered Glitch Style */}
                 <h1 className="text-8xl font-black tracking-[0.6em] text-white/5 uppercase italic select-none">GEMINI</h1>
                 <h1 className="absolute inset-0 text-8xl font-black tracking-[0.6em] text-cyan-500/10 uppercase italic select-none translate-x-[3px] animate-pulse">GEMINI</h1>
                 <h1 className="absolute inset-0 text-8xl font-black tracking-[0.6em] text-purple-500/10 uppercase italic select-none -translate-x-[3px] animate-pulse delay-75">GEMINI</h1>
                 
                 {/* Main Glowing Text */}
                 <h1 className={`absolute inset-0 text-8xl font-black tracking-[0.6em] ${currentFilter.text} uppercase italic select-none text-shadow-glow opacity-80`}>
                    GEMINI
                 </h1>
                 
                 {/* Decorative Elements */}
                 <div className="absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-[80%] border-l-2 border-t border-b border-white/10" />
                 <div className="absolute -right-4 left-auto top-1/2 -translate-y-1/2 w-12 h-[80%] border-r-2 border-t border-b border-white/10" />
                 
                 <div className="absolute -bottom-8 left-0 right-0 text-center">
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-2" />
                    <span className="text-[9px] tracking-[1.5em] text-white/40 uppercase animate-pulse pl-[1.5em]">System Initializing</span>
                 </div>
              </div>
           </div>
         )}

         {/* SCAN LINES EFFECT */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />
      </div>
      
      {/* 4. MODALS (CENTERED Z-100) */}
      {mode === 'remote' && (
        <RemoteBridge 
          visible={showRemoteModal}
          onStream={handleRemoteStream} 
          onClose={() => {
             setShowRemoteModal(false);
             if (!remoteStream) setMode('local'); 
          }} 
        />
      )}

      {/* STYLE OVERRIDES */}
      <style dangerouslySetInnerHTML={{ __html: `
         .text-shadow-glow { text-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
      `}} />

    </div>
  );
}
