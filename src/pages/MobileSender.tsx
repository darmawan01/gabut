import { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer from 'peerjs';

export default function MobileSender() {
  const [searchParams] = useSearchParams();
  const targetPeerId = searchParams.get('id');
  const [status, setStatus] = useState<string>('Init...');
  const [logs, setLogs] = useState<string[]>([]);
  const [peerId, setPeerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);

  const addLog = (msg: string) => {
     setLogs(prev => [...prev.slice(-9), msg]); // Keep last 10 logs
     console.log(msg);
  };

  // 1. Init Camera & Peer
  useEffect(() => {
    async function init() {
       addLog("Starting Init...");
       
       // A. Camera
       try {
          addLog("Req Camera (640x480)...");
          const stream = await navigator.mediaDevices.getUserMedia({
             video: { 
                 facingMode: 'user', 
                 width: 640, 
                 height: 480 
             },
             audio: false
          });
          
          addLog("Cam Acquired: " + stream.id);
          streamRef.current = stream;
          
          if (videoRef.current) {
             videoRef.current.srcObject = stream;
             // Force play immediately
             videoRef.current.play().then(() => {
                addLog("Video Playing");
             }).catch(e => {
                addLog("Play Err: " + (e as Error).message);
             });
          }
       } catch (e: unknown) {
          addLog("Cam FAIL: " + (e as Error).message);
          setStatus("CAM ERROR");
       }

       // B. PeerJS
       addLog("Init PeerJS...");
       const peer = new Peer({
          config: {
             iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
             ]
          }
       });
       peerRef.current = peer;
       
       peer.on('open', id => {
          setPeerId(id);
          addLog("Peer Ready: " + id);
          setStatus("READY");
       });

       peer.on('error', err => {
           addLog("Peer Err: " + err.type);
           setStatus("NET ERROR");
       });
       
       peer.on('disconnected', () => {
           addLog("Peer Disconnected");
           setStatus("OFFLINE");
       });
    }
    init();
  }, []);

  // 2. TRANSMIT
  const goLive = () => {
     if(!targetPeerId || !peerRef.current || !streamRef.current) return;
     
     const stream = streamRef.current;
     if(!stream.active) {
         addLog("Stream Inactive!");
         return;
     }

     addLog("Calling " + targetPeerId + "...");
     setStatus("CONNECTING...");
     
     const call = peerRef.current.call(targetPeerId, stream);
     
     call.on('close', () => {
         addLog("Call Closed");
         setIsConnected(false);
         setStatus("READY");
     });
     
     call.on('error', (e) => addLog("Call Err: " + e.type));

     // Assume success for UI feedback
     setTimeout(() => {
         setIsConnected(true);
         setStatus("LIVE");
         addLog("Signal Live");
     }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden flex flex-col">
       
       {/* 1. VIDEO AREA (Upper Half) */}
       <div className="relative flex-1 bg-zinc-900 border-b border-white/20">
          <video 
             ref={videoRef}
             className="w-full h-full object-cover"
             muted playsInline autoPlay 
          />
          <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs font-mono">
             {status}
          </div>
       </div>

       {/* 2. CONTROLS & LOGS (Lower Half) */}
       <div className="h-1/2 bg-zinc-900 p-4 flex flex-col gap-4">
          
          <button 
             onClick={goLive}
             disabled={!peerId || isConnected}
             className={`w-full py-6 rounded-xl font-bold text-xl shadow-lg transition-all ${
                isConnected 
                   ? 'bg-green-600' 
                   : !peerId ? 'bg-zinc-700 text-zinc-500' : 'bg-blue-600 active:scale-95'
             }`}
          >
             {isConnected ? "TRANSMITTING..." : !peerId ? "WAITING FOR NET..." : "START STREAM"}
          </button>

          {/* Persistent Debug Log */}
          <div className="flex-1 bg-black font-mono text-[10px] text-green-400 p-2 rounded overflow-y-auto border border-white/10">
             {logs.map((L, i) => (
                <div key={i} className="border-b border-white/5 py-1">
                   <span className="opacity-50 mr-2">[{i}]</span>{L}
                </div>
             ))}
          </div>
          
          <div className="text-[10px] text-zinc-500 text-center">
             PeerID: {peerId || '...'} | Target: {targetPeerId?.slice(0,6)}
          </div>
       </div>

    </div>
  );
}
