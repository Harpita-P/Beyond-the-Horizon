import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export function FloatingSportName({ sportName }: { sportName: string }) {
  const textRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((state, delta) => {
    if (!textRef.current) return;
    
    time.current += delta;
    
    // Floating animation - gentle up and down
    textRef.current.position.y = 80 + Math.sin(time.current * 0.8) * 5;
    
    // Gentle rotation
    textRef.current.rotation.y = Math.sin(time.current * 0.3) * 0.2;
    
    // Gentle scale pulsing
    const scale = 1 + Math.sin(time.current * 1.2) * 0.05;
    textRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group position={[0, 0, 0]}>
      <Text
        ref={textRef}
        position={[0, 80, 0]}
        fontSize={12}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.5}
        outlineColor="#002868"
        font="/fonts/Inter-Bold.woff"
      >
        {sportName}
      </Text>
      
      {/* Glow effect */}
      <pointLight position={[0, 80, 0]} intensity={0.5} distance={50} color="#60A5FA" />
    </group>
  );
}
