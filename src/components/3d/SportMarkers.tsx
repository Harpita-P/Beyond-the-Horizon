import { Float } from '@react-three/drei';

interface SportMarkerProps {
  position: [number, number, number];
  type: string;
}

export function SportMarker({ position, type }: SportMarkerProps) {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <group position={[position[0], position[1] + 12, position[2]]}>
        {/* Simple light-emitting gem */}
        <mesh>
          <octahedronGeometry args={[1.5]} />
          <meshStandardMaterial 
            color="#60A5FA" 
            emissive="#3B82F6"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        
        {/* Glowing point light */}
        <pointLight 
          position={[0, 0, 0]} 
          intensity={2} 
          distance={20} 
          color="#60A5FA" 
        />
      </group>
    </Float>
  );
}

interface SportMarkersProps {
  activeSports: string[];
  highlightedStates: string[];
  statePositions: { name: string, pos: [number, number, number] }[];
}

export function SportMarkers({ activeSports, highlightedStates, statePositions }: SportMarkersProps) {
  // Disabled - no floating markers needed
  return null;
}
