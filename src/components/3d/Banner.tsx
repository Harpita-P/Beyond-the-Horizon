import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';

interface BannerProps {
  viewMode?: 'flight' | 'map';
  title?: string | null;
}

export function Banner({ viewMode = 'flight', title }: BannerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isMapMode = viewMode === 'map';

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle floating animation
      groupRef.current.position.y = (isMapMode ? 140 : 100) + Math.sin(time * 0.5) * 8;
      
      if (!isMapMode) {
        // Subtle swaying in 3D mode - MUST add Math.PI to face the glider arriving from -Z
        groupRef.current.rotation.y = Math.PI + Math.sin(time * 0.2) * 0.05;
        groupRef.current.rotation.x = 0;
      } else {
        // Tilt up for 2D map bird's eye view
        groupRef.current.rotation.x = -Math.PI / 2.5; 
        groupRef.current.rotation.y = 0;
      }
    }
  });

  const Star = ({ position }: { position: [number, number, number] }) => (
    <Text
      position={position}
      fontSize={8}
      color="white"
      anchorX="center"
      anchorY="middle"
    >
      ★
    </Text>
  );

  return (
    <group ref={groupRef} position={[0, 100, isMapMode ? -340 : 300]}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        {/* Banner Background - Red */}
        <mesh position={[0, 0, -0.5]}>
          <planeGeometry args={[280, 45]} />
          <meshStandardMaterial 
            color="#BF0A30" 
            transparent 
            opacity={0.9} 
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Decorative White Stars on sides */}
        <group position={[-115, 0, 0.1]}>
            <Star position={[0, 12, 0]} />
            <Star position={[0, 0, 0]} />
            <Star position={[0, -12, 0]} />
        </group>
        <group position={[115, 0, 0.1]}>
            <Star position={[0, 12, 0]} />
            <Star position={[0, 0, 0]} />
            <Star position={[0, -12, 0]} />
        </group>

        {/* Text - Main Title */}
        <Text
          fontSize={title ? 12 : 14}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={220}
          textAlign="center"
          position={[0, 5, 0.1]}
        >
          {title ? title.toUpperCase() : "BEYOND THE HORIZON"}
        </Text>

        {/* Text - Subtitle */}
        <Text
          fontSize={6}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={220}
          textAlign="center"
          position={[0, -8, 0.1]}
        >
          TEAM USA x GOOGLE CLOUD HACKATHON
        </Text>

        {/* Decorative Borders - Patriotic Colors */}
        <mesh position={[0, 19, 0]}>
          <boxGeometry args={[258, 1.0, 0.1]} />
          <meshStandardMaterial color="#BF0A30" />
        </mesh>
        <mesh position={[0, -19, 0]}>
          <boxGeometry args={[258, 1.0, 0.1]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </Float>
    </group>
  );
}
