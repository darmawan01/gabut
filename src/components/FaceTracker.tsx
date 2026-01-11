import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceLandmarks {
  faceLandmarks: Landmark[][];
}

interface FaceTrackerProps {
  onLandmarks: (result: FaceLandmarks) => void;
  videoSource?: MediaStream | null; // For remote stream
  isActive: boolean;
  onError?: (error: Error) => void;
}

export default function FaceTracker({ onLandmarks, videoSource, isActive }: FaceTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);

  // 1. Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setLandmarker(faceLandmarker);
        console.log("FaceLandmarker loaded");
      } catch (error) {
        console.error("Error loading FaceLandmarker:", error);
      }
    };
    initLandmarker();
  }, []);

  // 2. Setup Camera or Video Source
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const setupCamera = async () => {
      if (videoSource) {
         // REMOTE SOURCE
         console.log("Setting remote video...");
         video.srcObject = videoSource;
         video.muted = true;
         video.autoplay = true;
         video.playsInline = true;
         
         try {
             await video.play();
             console.log("Remote video play success");
         } catch(e) { console.error("Play fail:", e); }
      } else if (isActive) {
         // LOCAL SOURCE
         try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' }
            });
            video.srcObject = stream;
            video.onloadedmetadata = () => video.play();
         } catch(e) { console.warn("Local Cam Fail", e); }
      }
    };

    setupCamera();
  }, [isActive, videoSource]);

  useEffect(() => {
    function predictWebcam(time: number) {
      if (videoRef.current && landmarker) {
        const video = videoRef.current;
        if (!video.paused && !video.ended && video.readyState >= 2) {
          const results = landmarker.detectForVideo(video, time);
          if (results.faceLandmarks) {
             onLandmarks(results);
          }
        }
      }
      requestRef.current = requestAnimationFrame(predictWebcam);
    }

    if(landmarker && videoRef.current) {
         requestRef.current = requestAnimationFrame(predictWebcam);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [landmarker, onLandmarks]);

  const [vStats, setVStats] = useState<string>('WAITING');

  useEffect(() => {
    if (videoRef.current && videoSource) {
      const v = videoRef.current;
      v.srcObject = videoSource;
      v.onloadedmetadata = () => {
         setVStats(`${v.videoWidth}x${v.videoHeight}`);
         v.play().catch(() => setVStats("PLAY_ERR"));
      };
      
      // Periodic Check
      const timer = setInterval(() => {
         if (v.readyState >= 2) {
            setVStats(`${v.videoWidth}x${v.videoHeight} [OK]`);
         } else {
            setVStats(`STALLED (${v.readyState})`);
         }
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [videoSource]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black border-4 border-blue-900/20">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ transform: 'scaleX(-1)' }} 
      />
      
      {/* 4. VISIBILITY DIAGNOSTICS */}
      <div className="absolute bottom-6 left-6 flex items-center gap-3 z-50 pointer-events-none bg-black/40 backdrop-blur-sm p-2 rounded border border-white/10">
         <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse" />
         <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-white/80 uppercase">Stream Payload</span>
            <span className="text-[12px] font-mono text-green-400">{vStats}</span>
         </div>
      </div>

      {/* Subtle Frame */}
      <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none" />
    </div>
  );
}
