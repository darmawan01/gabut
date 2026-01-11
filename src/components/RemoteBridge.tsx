import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, ShieldCheck, Activity } from 'lucide-react';

interface RemoteBridgeProps {
  onStream: (stream: MediaStream) => void;
  onClose: () => void;
  visible: boolean;
}

export default function RemoteBridge({ onStream, onClose, visible }: RemoteBridgeProps) {
  const [peerId, setPeerId] = useState<string>('');
  const [status, setStatus] = useState<'initializing' | 'waiting' | 'connected' | 'error'>('initializing');
  const [errorMsg, setErrorMsg] = useState('');
  const peerRef = useRef<Peer | null>(null);
  const [manualHost, setManualHost] = useState(window.location.host);

  const onStreamRef = useRef(onStream);
  useEffect(() => {
    onStreamRef.current = onStream;
  }, [onStream]);

  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 7); 
    const peer = new Peer(id, {
        config: {
           iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
           ]
        }
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setStatus('waiting');
    });

    peer.on('call', (call) => {
      console.log("Receiving call...");
      call.answer(new MediaStream()); 
      call.on('stream', (remoteStream) => {
        if (remoteStream.getVideoTracks().length > 0) {
           setStatus('connected');
           onStreamRef.current(remoteStream);
        }
      });
    });

    peer.on('connection', (conn) => {
      conn.on('data', (data: unknown) => {
         const payload = data as { type?: string; image?: string };
         if (payload && payload.type === 'frame' && payload.image) {
            const img = document.getElementById('debug-jpeg-preview') as HTMLImageElement;
            if (img) img.src = payload.image;
         }
      });
    });

    peer.on('error', (err) => {
      setStatus('error');
      setErrorMsg(err.message || 'Connection failed');
    });

    return () => {
      peer.destroy();
    };
  }, []);

  const getMobileUrl = () => {
    const protocol = window.location.protocol;
    const host = manualHost || window.location.host;
    return `${protocol}//${host}/mobile?id=${peerId}`;
  };

  if (!visible) return <div className="hidden" />;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/90 backdrop-blur-xl p-6 font-mono">
       
       <div className="relative w-full max-w-lg bg-zinc-950 border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.1)] rounded-lg p-10 flex flex-col items-center">
          
          {/* Decorative Corner Borders */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400" />

          <button onClick={onClose} className="absolute top-4 right-4 text-cyan-500/50 hover:text-cyan-400 transition-colors pointer-events-auto">
             <X size={24} />
          </button>

          <header className="mb-8 text-center flex flex-col items-center">
             <div className="p-3 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4 animate-pulse">
                <Share2 size={32} className="text-cyan-400" />
             </div>
             <h2 className="text-2xl font-black text-cyan-400 tracking-[0.2em] uppercase">Neural Bridge</h2>
             <p className="text-[10px] text-cyan-500/50 mt-1 tracking-widest uppercase">Encryption: Phase 4 AES-256</p>
          </header>

          {status === 'waiting' && (
             <div className="w-full flex flex-col items-center gap-6">
                <div className="relative p-6 bg-white rounded-lg group">
                   <div className="absolute inset-[-10px] border border-cyan-500/20 rounded-xl" />
                   <QRCodeSVG value={getMobileUrl()} size={220} />
                   {/* Scanning Animation */}
                   <div className="absolute inset-4 top-4 h-0.5 bg-cyan-500 shadow-[0_0_15px_cyan] animate-scan pointer-events-none opacity-50" />
                </div>
                
                <div className="text-center">
                   <p className="text-xs text-cyan-300 tracking-widest uppercase mb-4 animate-pulse">Syncing Connection...</p>
                   <div className="flex flex-col gap-2">
                      <div className="bg-cyan-950/50 border border-cyan-800/50 px-4 py-2 text-[10px] text-cyan-400 break-all">
                         {getMobileUrl()}
                      </div>
                      <input 
                         type="text"
                         value={manualHost}
                         onChange={(e) => setManualHost(e.target.value)}
                         className="bg-transparent border-b border-cyan-800 text-[10px] text-center text-cyan-500 focus:border-cyan-400 outline-none mt-2"
                         placeholder="MANUAL OVERRIDE HOST"
                      />
                   </div>
                </div>
             </div>
          )}

          {status === 'connected' && (
             <div className="flex flex-col items-center gap-4 py-12">
                <ShieldCheck size={64} className="text-cyan-400 animate-bounce" />
                <span className="text-xl font-bold text-cyan-300 tracking-[0.3em] uppercase">Link Secure</span>
                <button onClick={onClose} className="mt-8 px-12 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase text-sm skew-x-[-15deg] transition-all">
                   Enter HUD
                </button>
             </div>
          )}

          {status === 'error' && (
             <div className="text-center py-12">
                <Activity size={64} className="text-red-500 mx-auto mb-4" />
                <p className="text-red-400 font-bold uppercase tracking-widest">{errorMsg}</p>
                <button onClick={() => window.location.reload()} className="mt-6 text-[10px] text-zinc-500 underline uppercase tracking-widest">Retry System Init</button>
             </div>
          )}

          {/* JPEG PREVIEW (Bottom Right Mini) */}
          <div className="absolute bottom-4 right-4 w-24 h-18 border border-white/10 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all pointer-events-auto overflow-hidden">
             <img id="debug-jpeg-preview" className="w-full h-full object-cover" />
          </div>

       </div>
    </div>
  );
}
