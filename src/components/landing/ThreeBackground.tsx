
import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random';
import * as THREE from 'three';

// Interactive particle system
function ParticleField({ count = 2000, mousePos, color = "#8B5CF6" }: {
  count?: number;
  mousePos: React.RefObject<{x: number, y: number}>;
  color?: string;
}) {
  const points = useRef<THREE.Points>(null);
  
  // Create particles with explicit Float32Array typing
  const sphere = useRef<Float32Array>(random.inSphere(new Float32Array(count * 3), { radius: 1.5 }) as Float32Array);
  
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
      positions={sphere.current}
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
      {/* Purple Light Beam */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[20vw] h-[70vh] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/60 via-purple-500/20 to-transparent animate-pulse-beam rounded-full blur-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-400/50 via-violet-500/30 to-transparent animate-glow-beam rounded-full blur-xl"></div>
      </div>
      
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
