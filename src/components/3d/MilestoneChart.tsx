import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Float, Html } from '@react-three/drei';
import { Trophy, Medal, Award } from 'lucide-react';

interface MilestoneChartProps {
  milestones: string[];
  position: [number, number, number];
  paused?: boolean;
}

export function MilestoneChart({ milestones, position, paused = false }: MilestoneChartProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && !paused) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group position={position} ref={groupRef}>
      <Float speed={paused ? 0 : 2} rotationIntensity={paused ? 0 : 0.5} floatIntensity={paused ? 0 : 1}>
        {/* Main Panel */}
        <mesh position={[0, 15, 0]}>
          <boxGeometry args={[35, 25, 1]} />
          <meshStandardMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.9} 
            metalness={0.1} 
            roughness={0.1} 
          />
        </mesh>

        {/* Header Bar */}
        <mesh position={[0, 27, 0.6]}>
          <boxGeometry args={[35, 3, 0.5]} />
          <meshStandardMaterial color="#002868" metalness={0.8} roughness={0.2} />
        </mesh>

        <Text
          position={[0, 27, 1]}
          fontSize={1.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          COLLECTIVE MILESTONES
        </Text>

        {/* Milestone Bars/Data Visualization */}
        {milestones.map((milestone, idx) => {
          const yPos = 20 - (idx * 6);
          const iconColor = idx === 0 ? "#FFB81C" : idx === 1 ? "#BF0A30" : "#002868";
          
          return (
            <group key={idx} position={[0, yPos, 1]}>
              {/* Background Bar */}
              <mesh position={[0, 0, -0.1]}>
                <planeGeometry args={[30, 4.5]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
              
              {/* Data Icon via HTML for precision */}
              <Html position={[-13, 0, 0]} transform occlude>
                <div className="flex items-center justify-center p-1 rounded bg-white shadow-sm border border-slate-100">
                  {idx === 0 ? <Trophy size={16} color={iconColor} /> : 
                   idx === 1 ? <Medal size={16} color={iconColor} /> : 
                   <Award size={16} color={iconColor} />}
                </div>
              </Html>

              <Text
                position={[2, 0, 0]}
                fontSize={1}
                color="#334155"
                anchorX="center"
                anchorY="middle"
                maxWidth={24}
                textAlign="center"
              >
                {milestone}
              </Text>
            </group>
          );
        })}
      </Float>
    </group>
  );
}
