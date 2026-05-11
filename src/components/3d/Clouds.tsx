import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Clouds() {
  const cloudCount = 40;
  
  const clouds = useMemo(() => {
    return Array.from({ length: cloudCount }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 500,
        Math.random() * 50 + 20,
        (Math.random() - 0.5) * 500
      ] as [number, number, number],
      speed: Math.random() * 0.05 + 0.02,
      scale: Math.random() * 5 + 2
    }));
  }, []);

  return (
    <group>
      {clouds.map((cloud, i) => (
        <Cloud key={i} {...cloud} />
      ))}
    </group>
  );
}

function Cloud({ position, speed, scale }: { position: [number, number, number]; speed: number; scale: number }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.position.z += speed;
      if (ref.current.position.z > 250) ref.current.position.z = -250;
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 7, 7]} />
        <meshStandardMaterial color="white" flatShading />
      </mesh>
      <mesh position={[1, 0, 0]} scale={0.8}>
        <sphereGeometry args={[1, 7, 7]} />
        <meshStandardMaterial color="white" flatShading />
      </mesh>
      <mesh position={[-1, 0, 0.2]} scale={0.7}>
        <sphereGeometry args={[1, 7, 7]} />
        <meshStandardMaterial color="white" flatShading />
      </mesh>
    </group>
  );
}
