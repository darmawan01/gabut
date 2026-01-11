import { useEffect, useRef } from 'react';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceLandmarks {
  faceLandmarks: Landmark[][];
}

interface Hand {
  landmarks: Landmark[];
}

interface HandLandmarks {
  hands: Hand[];
}

interface SpatialAudioProps {
  landmarks: FaceLandmarks | null;
  handLandmarks: HandLandmarks | null;
}

export default function SpatialAudio({ landmarks, handLandmarks }: SpatialAudioProps) {
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);

  useEffect(() => {
    // Initialize Audio Context on first interaction or mount (may need user interaction)
    const initAudio = () => {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        oscillator.current = audioCtx.current.createOscillator();
        gainNode.current = audioCtx.current.createGain();
        
        oscillator.current.type = 'sine';
        oscillator.current.frequency.setValueAtTime(220, audioCtx.current.currentTime);
        gainNode.current.gain.setValueAtTime(0, audioCtx.current.currentTime);
        
        oscillator.current.connect(gainNode.current);
        gainNode.current.connect(audioCtx.current.destination);
        oscillator.current.start();
      }
    };

    const handleInteraction = () => {
        initAudio();
        window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    
    return () => {
        window.removeEventListener('click', handleInteraction);
        oscillator.current?.stop();
        audioCtx.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!audioCtx.current || !oscillator.current || !gainNode.current) return;

    if (landmarks?.faceLandmarks?.[0] || handLandmarks?.hands?.[0]) {
      const targetGain = 0.05;
      gainNode.current.gain.setTargetAtTime(targetGain, audioCtx.current.currentTime, 0.1);
      
      // Map X position to Frequency
      let x = 0.5;
      if (handLandmarks?.hands?.[0]) {
          x = handLandmarks.hands[0].landmarks[9].x;
      } else if (landmarks?.faceLandmarks?.[0]) {
          x = landmarks.faceLandmarks[0][1].x;
      }
      
      const freq = 110 + (1 - x) * 440; // 110Hz to 550Hz
      oscillator.current.frequency.setTargetAtTime(freq, audioCtx.current.currentTime, 0.1);
    } else {
      gainNode.current.gain.setTargetAtTime(0, audioCtx.current.currentTime, 0.1);
    }
  }, [landmarks, handLandmarks]);

  return null;
}
