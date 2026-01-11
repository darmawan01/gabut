import { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend, type ThreeElement } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Icosahedron, shaderMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 1. Define Custom Glitch Shader Material
const GlitchMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color('#22d3ee'),
    opacity: 0.5,
  },
  // Vertex Shader
  `
  varying vec2 vUv;
  uniform float time;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Glitch displacement logic
    float shift = sin(time * 10.0 + pos.y * 2.0) * 0.1;
    if (sin(time * 5.0) > 0.8) {
      pos.x += shift;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 4.0;
  }
  `,
  // Fragment Shader
  `
  varying vec2 vUv;
  uniform vec3 color;
  uniform float opacity;
  uniform float time;
  void main() {
    float scanline = sin(vUv.y * 100.0 + time * 10.0) * 0.1;
    gl_FragColor = vec4(color + scanline, opacity);
  }
  `
);

extend({ GlitchMaterial });

// Type definitions for custom elements
declare module '@react-three/fiber' {
  interface ThreeElements {
    glitchMaterial: ThreeElement<typeof GlitchMaterial>;
  }
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface FaceLandmarks {
  faceLandmarks: Landmark[][];
  faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
}

interface SceneProps {
  landmarks: FaceLandmarks | null;
  module: 'mesh' | 'core' | 'pulse' | 'glitch';
  ghostLandmarks: FaceLandmarks | null;
}

function FacePoints({ landmarks, isGlitch = false }: { landmarks: FaceLandmarks | null; isGlitch?: boolean }) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(478 * 3);
    const uvs = new Float32Array(478 * 2);
    for(let i=0; i<478; i++) {
        uvs[i*2] = i / 478;
        uvs[i*2+1] = Math.sin(i);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geo;
  }, []);

  useFrame((state) => {
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
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      {isGlitch ? (
        <glitchMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      ) : (
        <pointsMaterial 
          size={0.06} 
          color="#22d3ee" 
          transparent 
          opacity={0.6} 
          blending={THREE.AdditiveBlending}
        />
      )}
    </points>
  );
}

function NeuralCore({ landmarks }: { landmarks: FaceLandmarks | null }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (landmarks?.faceLandmarks?.[0] && groupRef.current) {
      const face = landmarks.faceLandmarks[0];
      const x = (face[1].x - 0.5) * -10;
      const y = -(face[1].y - 0.5) * 10;
      const z = -face[1].z * 10 + 0.5;
      
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

function GhostFace({ landmarks }: { landmarks: FaceLandmarks | null }) {
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
        size={0.04} 
        color="#f59e0b" 
        transparent 
        opacity={0.2} 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function Scene({ landmarks, module, ghostLandmarks }: SceneProps) {
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
        {module === 'glitch' && <FacePoints landmarks={landmarks} isGlitch />}
        {module === 'core' && <NeuralCore landmarks={landmarks} />}
        {module === 'pulse' && <AuraPulse landmarks={landmarks} />}

        {ghostLandmarks && <GhostFace landmarks={ghostLandmarks} />}
      </Canvas>
    </div>
  );
}
