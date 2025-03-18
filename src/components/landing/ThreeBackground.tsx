
import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random';
import * as THREE from 'three';
import { Vector3, Euler } from 'three';

// Brain model that represents AI/Education
function BrainModel({ position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] }: { 
  position?: [number, number, number]; 
  scale?: number; 
  rotation?: [number, number, number]; 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
      meshRef.current.rotation.y += 0.001;
    }
  });
  
  return (
    <group position={new Vector3(...position)} scale={scale} rotation={new Euler(...rotation)}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshStandardMaterial 
          color="#8B5CF6" 
          emissive="#4C1D95"
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

// Simplified 3D Text
function SimpleText({ position = [0, 0, 0], color = "#ffffff" }: {
  position: [number, number, number];
  color?: string;
}) {
  const textRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (textRef.current) {
      textRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
      textRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
    }
  });
  
  return (
    <group ref={textRef} position={new Vector3(...position)}>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// Interactive particle system
function ParticleField({ count = 2000, mousePos, color = "#8B5CF6" }: {
  count?: number;
  mousePos: React.RefObject<{x: number, y: number}>;
  color?: string;
}) {
  const points = useRef<THREE.Points>(null);
  
  // Create particles
  const [sphere] = useState(() => {
    const arr = random.inSphere(new Float32Array(count * 3), { radius: 1.5 });
    return arr as Float32Array;
  });
  
  useFrame((state) => {
    if (points.current) {
      points.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.2;
      points.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.2;
      
      // Interact with mouse position if available
      if (mousePos.current) {
        const { x, y } = mousePos.current;
        points.current.rotation.x += (y * 0.01 - points.current.rotation.x) * 0.1;
        points.current.rotation.y += (x * 0.01 - points.current.rotation.y) * 0.1;
      }
    }
  });
  
  return (
    <Points
      ref={points}
      positions={sphere}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color={color}
        size={0.005}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// Main scene setup
function Scene({ mousePos }: { mousePos: React.RefObject<{x: number, y: number}> }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <ParticleField mousePos={mousePos} />
      <BrainModel position={[0, 0, -1]} scale={0.4} rotation={[0, Math.PI, 0]} />
      <SimpleText position={[0, 0.5, 0]} color="#ffffff" />
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        enableRotate={false} 
      />
    </>
  );
}

export default function ThreeBackground() {
  const mousePos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1
      };
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas 
        camera={{ position: [0, 0, 2], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 0);
        }}
      >
        <Scene mousePos={mousePos} />
      </Canvas>
    </div>
  );
}
