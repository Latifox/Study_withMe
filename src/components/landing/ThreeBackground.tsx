
import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, OrbitControls, useGLTF, Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { Vector3, Euler } from 'three';

// Brain model that represents AI/Education
function BrainModel({ position = [0, 0, 0], scale = 1, rotation = [0, 0, 0] }: { 
  position?: [number, number, number]; 
  scale?: number; 
  rotation?: [number, number, number]; 
}) {
  const { scene } = useGLTF('/lovable-uploads/cb7788ae-2e82-482c-95a3-c4a34287fa9a.png', true);
  const meshRef = useRef<THREE.Group>(null);
  const fallbackRef = useRef<THREE.Mesh>(null);
  
  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
      meshRef.current.rotation.y += 0.001;
    }
    if (fallbackRef.current) {
      fallbackRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
      fallbackRef.current.rotation.y += 0.001;
    }
  });
  
  // Fallback to a 3D sphere if the model fails to load
  const [modelLoaded, setModelLoaded] = useState(false);
  
  useEffect(() => {
    if (scene) {
      setModelLoaded(true);
    }
  }, [scene]);
  
  return (
    <group position={new Vector3(...position)} scale={scale} rotation={new Euler(...rotation)}>
      {modelLoaded ? (
        <primitive ref={meshRef} object={scene} />
      ) : (
        <mesh ref={fallbackRef}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#8B5CF6" />
        </mesh>
      )}
    </group>
  );
}

// Interactive 3D Text
function AnimatedText({ text, position, size = 0.2, color = "#ffffff" }: {
  text: string;
  position: [number, number, number];
  size?: number;
  color?: string;
}) {
  const textRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { viewport } = useThree();
  
  // Make text responsive
  const scaleFactor = Math.min(1, viewport.width / 10);
  const adjustedSize = size * scaleFactor;
  
  // Animation for hover effect
  const springs = useSpring({
    color: hovered ? "#8B5CF6" : color,
    scale: hovered ? [1.1, 1.1, 1.1] : [1, 1, 1],
    config: { mass: 1, tension: 280, friction: 60 }
  });
  
  useFrame((state) => {
    if (textRef.current) {
      // Subtle wave animation
      const letters = textRef.current.children;
      for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        letter.position.y = Math.sin(state.clock.getElapsedTime() * 2 + i * 0.1) * 0.05;
      }
    }
  });
  
  return (
    <group ref={textRef} position={new Vector3(...position)}>
      {text.split('').map((char, i) => (
        <animated.mesh
          key={i}
          position={[i * adjustedSize * 0.6 - (text.length * adjustedSize * 0.3), 0, 0]}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          // @ts-ignore - this is valid for react-spring/three
          scale={springs.scale}
        >
          <Text3D
            font="/fonts/inter_bold.json"
            size={adjustedSize}
            height={0.05}
          >
            {char}
            <animated.meshStandardMaterial 
              // @ts-ignore - this is valid for react-spring/three
              color={springs.color} 
            />
          </Text3D>
        </animated.mesh>
      ))}
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
  // Explicitly cast to Float32Array
  const [sphere] = useState(() => 
    random.inSphere(new Float32Array(count * 3), { radius: 1.5 }) as Float32Array
  );
  
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
      <AnimatedText 
        text="AI EDUCATION" 
        position={[0, 0.5, 0]} 
        size={0.15} 
      />
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
      >
        <Scene mousePos={mousePos} />
      </Canvas>
    </div>
  );
}
