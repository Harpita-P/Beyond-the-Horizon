import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

interface FlightPathsProps {
  statePositions: { name: string; pos: [number, number, number] }[];
  highlightedStates: string[];
}

export function FlightPaths({ statePositions, highlightedStates }: FlightPathsProps) {
  const paths = useMemo(() => {
    if (highlightedStates.length < 2) return [];

    // Get positions of highlighted states
    const highlightedPositions = highlightedStates
      .map(stateName => statePositions.find(s => s.name === stateName))
      .filter(Boolean) as { name: string; pos: [number, number, number] }[];

    if (highlightedPositions.length < 2) return [];

    // Create paths: each state connects to its nearest neighbor
    const allPaths: { points: THREE.Vector3[]; color: string }[] = [];
    const connected = new Set<string>(); // Track which states are already connected

    for (let i = 0; i < highlightedPositions.length; i++) {
      const currentState = highlightedPositions[i];
      const currentPos = new THREE.Vector3(...currentState.pos);
      
      // Find nearest unconnected neighbor
      let nearestDistance = Infinity;
      let nearestIndex = -1;
      
      for (let j = 0; j < highlightedPositions.length; j++) {
        if (i === j) continue;
        
        const otherPos = new THREE.Vector3(...highlightedPositions[j].pos);
        const distance = currentPos.distanceTo(otherPos);
        
        // Check if this would create a new connection
        const pairKey1 = `${currentState.name}-${highlightedPositions[j].name}`;
        const pairKey2 = `${highlightedPositions[j].name}-${currentState.name}`;
        
        if (distance < nearestDistance && !connected.has(pairKey1) && !connected.has(pairKey2)) {
          nearestDistance = distance;
          nearestIndex = j;
        }
      }
      
      // Create path to nearest neighbor if found
      if (nearestIndex !== -1) {
        const start = currentPos;
        const end = new THREE.Vector3(...highlightedPositions[nearestIndex].pos);
        
        // Mark this connection as used
        connected.add(`${currentState.name}-${highlightedPositions[nearestIndex].name}`);
        connected.add(`${highlightedPositions[nearestIndex].name}-${currentState.name}`);

        // Calculate midpoint and add height for arc
        const midpoint = new THREE.Vector3()
          .addVectors(start, end)
          .multiplyScalar(0.5);

        // Calculate distance to determine arc height
        const distance = start.distanceTo(end);
        const arcHeight = Math.min(distance * 0.5, 50); // Cap at 50 units

        // Add height to midpoint for arc effect
        midpoint.y += arcHeight;

        // Create curved path using quadratic bezier
        const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end);
        const points = curve.getPoints(50); // 50 segments for smooth curve

        // Alternate colors for visual variety
        const colors = ['#FFB81C', '#60A5FA', '#34D399', '#F472B6'];
        const color = colors[i % colors.length];

        allPaths.push({ points, color });
      }
    }

    return allPaths;
  }, [statePositions, highlightedStates]);

  if (paths.length === 0) return null;

  return (
    <group>
      {paths.map((path, index) => (
        <Line
          key={index}
          points={path.points}
          color={path.color}
          lineWidth={2}
          opacity={0.6}
          transparent
          dashed={false}
        />
      ))}
    </group>
  );
}
