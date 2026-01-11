import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceLandmarks {
  faceLandmarks: Landmark[][];
}

interface SceneProps {
  landmarks: FaceLandmarks | null;
  module: 'mesh' | 'core' | 'pulse';
}

function FacePoints({ landmarks }: { landmarks: FaceLandmarks | null }) {
  const meshRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(478 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(() => {
    if (landmarks?.faceLandmarks?.[0] && meshRef.current) {
      const face = landmarks.faceLandmarks[0];
      const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < face.length; i++) {
        positions[i * 3] = (face[i].x - 0.5) * -10;
        positions[i * 3 + 1] = -(face[i].y - 0.5) * 10;
        positions[i * 3 + 2] = -face[i].z * 10;
      }
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial 
        size={0.06} 
        color="#22d3ee" 
        transparent 
        opacity={0.6} 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function NeuralCore({ landmarks }: { landmarks: FaceLandmarks | null }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (landmarks?.faceLandmarks?.[0] && groupRef.current) {
      const face = landmarks.faceLandmarks[0];
      // Use nose tip (landmark 1) or forehead
      const x = (face[1].x - 0.5) * -10;
      const y = -(face[1].y - 0.5) * 10;
      const z = -face[1].z * 10 + 0.5; // Offset slightly forward
      
      groupRef.current.position.lerp(new THREE.Vector3(x, y, z), 0.1);
      groupRef.current.rotation.y += 0.01;
      groupRef.current.rotation.z += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <Icosahedron args={[0.4, 1]}>
          <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.4} />
        </Icosahedron>
        <Icosahedron args={[0.2, 0]}>
          <meshBasicMaterial color="#ffffff" wireframe />
        </Icosahedron>
      </Float>
      <pointLight color="#a855f7" intensity={2} distance={3} />
    </group>
  );
}

function AuraPulse({ landmarks }: { landmarks: FaceLandmarks | null }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (landmarks?.faceLandmarks?.[0] && meshRef.current) {
      const face = landmarks.faceLandmarks[0];
      const x = (face[1].x - 0.5) * -10;
      const y = -(face[1].y - 0.5) * 10;
      const z = -face[1].z * 10;
      meshRef.current.position.set(x, y, z);
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]}>
      <MeshDistortMaterial
        color="#ec4899"
        speed={3}
        distort={0.4}
        radius={1}
        transparent
        opacity={0.2}
      />
    </Sphere>
  );
}

export default function Scene({ landmarks, module }: SceneProps) {
  return (
    <div className="w-full h-full absolute top-0 left-0 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 50 }} 
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {module === 'mesh' && <FacePoints landmarks={landmarks} />}
        {module === 'core' && <NeuralCore landmarks={landmarks} />}
        {module === 'pulse' && <AuraPulse landmarks={landmarks} />}
      </Canvas>
    </div>
  );
}
