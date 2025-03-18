
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random';
import { Points as ThreePoints } from 'three';

function StarField() {
  const ref = useRef<ThreePoints>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.2;
      ref.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.2;
    }
  });

  // Explicitly create a Float32Array for the sphere positions
  const sphere = random.inSphere(new Float32Array(5000), { radius: 1.5 }) as Float32Array;

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points
        ref={ref}
        positions={sphere}
        stride={3}
        frustumCulled={false}
      >
        <PointMaterial
          transparent
          color="#8B5CF6"
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default function ThreeBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <StarField />
      </Canvas>
    </div>
  );
}

