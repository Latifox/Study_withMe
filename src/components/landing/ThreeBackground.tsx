
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
  const [hovered, setHovered] = useState(false);
  
  // Gentle floating animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
      meshRef.current.rotation.y += 0.001;
      
      // Pulse effect when hovered
      if (hovered) {
        meshRef.current.scale.x = 1 + Math.sin(state.clock.getElapsedTime() * 5) * 0.05;
        meshRef.current.scale.y = 1 + Math.sin(state.clock.getElapsedTime() * 5) * 0.05;
        meshRef.current.scale.z = 1 + Math.sin(state.clock.getElapsedTime() * 5) * 0.05;
      }
    }
  });
  
  return (
    <group position={new Vector3(...position)} scale={scale} rotation={new Euler(...rotation)}>
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <icosahedronGeometry args={[0.5, 2]} />
        <meshStandardMaterial 
          color={hovered ? "#a855f7" : "#8B5CF6"} 
          emissive={hovered ? "#7c3aed" : "#4C1D95"}
          emissiveIntensity={hovered ? 0.4 : 0.2}
          roughness={0.3}
          metalness={0.8}
          wireframe={hovered}
        />
      </mesh>
      
      {/* Add educational elements around the brain */}
      <group rotation={[0, state => state.clock.getElapsedTime() * 0.2, 0]}>
        {/* Books and educational symbols orbiting the brain */}
        <mesh position={[0.8, 0, 0]} scale={0.1}>
          <boxGeometry args={[2, 0.3, 1.5]} />
          <meshStandardMaterial color="#4ade80" />
        </mesh>
        
        <mesh position={[-0.7, 0.3, 0]} scale={0.08} rotation={[0, Math.PI / 4, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
        
        <mesh position={[0, 0.7, 0.7]} scale={0.12}>
          <torusGeometry args={[0.5, 0.2, 16, 32]} />
          <meshStandardMaterial color="#f472b6" emissive="#db2777" emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  );
}

// Educational floating text elements
function EducationalTerms({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const terms = [
    { text: "AI", position: [0.8, 0.5, 0], color: "#f472b6", scale: 0.15 },
    { text: "Learning", position: [-0.8, 0.2, 0.3], color: "#4ade80", scale: 0.12 },
    { text: "Knowledge", position: [0.5, -0.5, -0.3], color: "#60a5fa", scale: 0.13 },
    { text: "Education", position: [-0.6, -0.3, 0.1], color: "#fbbf24", scale: 0.11 }
  ];
  
  return (
    <group position={new Vector3(...position)}>
      {terms.map((term, index) => (
        <EducationalTerm 
          key={index}
          text={term.text}
          position={term.position}
          color={term.color}
          scale={term.scale}
          speed={0.5 + index * 0.1}
        />
      ))}
    </group>
  );
}

function EducationalTerm({ text, position, color, scale, speed }: {
  text: string;
  position: [number, number, number];
  color: string;
  scale: number;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Float up and down
      meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * speed) * 0.1;
      // Gentle rotation
      meshRef.current.rotation.y += 0.005;
      
      if (hovered) {
        meshRef.current.scale.setScalar(scale * 1.2);
      } else {
        meshRef.current.scale.setScalar(scale);
      }
    }
  });
  
  return (
    <mesh 
      ref={meshRef} 
      position={new Vector3(...position)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={hovered ? 0.5 : 0.2}
        transparent={true}
        opacity={0.7}
      />
    </mesh>
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
        
        // Create a ripple effect from mouse position
        const positions = points.current.geometry.attributes.position.array as Float32Array;
        const time = state.clock.getElapsedTime();
        
        for (let i = 0; i < positions.length; i += 3) {
          const distance = Math.sqrt(
            Math.pow(positions[i] - x, 2) + 
            Math.pow(positions[i + 1] - y, 2)
          );
          
          if (distance < 0.3) {
            positions[i + 2] += Math.sin(time * 5) * 0.01;
          }
        }
        points.current.geometry.attributes.position.needsUpdate = true;
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
  const { camera } = useThree();
  
  useFrame((state) => {
    // Gentle camera movement
    camera.position.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.2;
    camera.position.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1;
    camera.lookAt(0, 0, 0);
  });
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.2} color="#4ade80" />
      
      <ParticleField mousePos={mousePos} />
      <BrainModel position={[0, 0, -0.5]} scale={0.4} rotation={[0, Math.PI, 0]} />
      <EducationalTerms position={[0, 0, 0]} />
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 3}
        rotateSpeed={0.3}
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
