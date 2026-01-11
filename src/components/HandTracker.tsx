import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface Hand {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  handedness: { categoryName: string; score: number }[];
}

interface HandLandmarks {
  hands: Hand[];
}

interface HandTrackerProps {
  onHandLandmarks: (result: HandLandmarks) => void;
  videoSource?: MediaStream | null;
  isActive: boolean;
}

export default function HandTracker({ onHandLandmarks, videoSource, isActive }: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);

  // 1. Initialize HandLandmarker
  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.x/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        setLandmarker(handLandmarker);
        console.log("HandLandmarker Initialized");
      } catch (e) {
        console.error("HandLandmarker Init Fail", e);
      }
    };
    initLandmarker();
  }, []);

  // 2. Video Source Management
  useEffect(() => {
    if (!isActive || !videoRef.current) return;
    const video = videoRef.current;

    const setupCamera = async () => {
      if (videoSource) {
        video.srcObject = videoSource;
        video.onloadedmetadata = () => video.play();
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' }
          });
          video.srcObject = stream;
          video.onloadedmetadata = () => video.play();
        } catch (e) {
          console.warn("Local Hand Cam Fail", e);
        }
      }
    };

    setupCamera();
  }, [isActive, videoSource]);

  // 3. Prediction Loop
  useEffect(() => {
    function predictHands(time: number) {
      if (videoRef.current && landmarker) {
        const video = videoRef.current;
        if (!video.paused && !video.ended && video.readyState >= 2) {
          const results = landmarker.detectForVideo(video, time);
          
          if (results.landmarks) {
            const handsData: Hand[] = results.landmarks.map((lm, idx) => ({
              landmarks: lm,
              worldLandmarks: results.worldLandmarks[idx],
              handedness: results.handedness[idx]
            }));
            onHandLandmarks({ hands: handsData });
          }
        }
      }
      requestRef.current = requestAnimationFrame(predictHands);
    }

    if (landmarker && videoRef.current) {
      requestRef.current = requestAnimationFrame(predictHands);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [landmarker, onHandLandmarks]);

  return (
    <video
      ref={videoRef}
      className="hidden"
      playsInline
      muted
      autoPlay
    />
  );
}
