import { useRef, useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ChartData } from '../../services/dataAnalystAgent';

interface ChartPanelProps {
  data: ChartData;
  position?: [number, number, number];
}

export function ChartPanel({ data, position = [400, 30, 120] }: ChartPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Removed floating animation for better performance

  // Calculate chart dimensions and points
  const { points, maxCount, chartWidth, chartHeight } = useMemo(() => {
    const maxCount = Math.max(...data.counts);
    const chartWidth = 70;
    const chartHeight = 40;
    
    const points: [number, number][] = data.years.map((year, index) => {
      const x = data.years.length > 1 
        ? (index / (data.years.length - 1)) * chartWidth - chartWidth / 2
        : 0; // Center single point
      const y = (data.counts[index] / maxCount) * chartHeight - chartHeight / 2;
      return [x, y];
    });

    return { points, maxCount, chartWidth, chartHeight };
  }, [data]);

  // Create line geometry - optimized with fewer segments
  const lineGeometry = useMemo(() => {
    // If there's only one point, return null (no curve needed)
    if (points.length < 2) return null;
    
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y]) => new THREE.Vector3(x, y, 0.1))
    );
    return new THREE.TubeGeometry(curve, 20, 0.3, 6, false);
  }, [points]);

  // Create fill area geometry - optimized
  const fillGeometry = useMemo(() => {
    // If there's only one point, return null (no fill needed)
    if (points.length < 2) return null;
    
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], -chartHeight / 2);
    points.forEach(([x, y]) => shape.lineTo(x, y));
    shape.lineTo(points[points.length - 1][0], -chartHeight / 2);
    shape.lineTo(points[0][0], -chartHeight / 2);
    
    return new THREE.ShapeGeometry(shape);
  }, [points, chartHeight]);
  
  // Memoize grid lines to prevent recreation
  const gridLines = useMemo(() => {
    return [0, 1, 2, 3, 4].map((i) => {
      const y = (i / 4) * chartHeight - chartHeight / 2;
      const count = Math.round((i / 4) * maxCount);
      return { y, count, i };
    });
  }, [chartHeight, maxCount]);

  return (
    <group ref={groupRef} position={position} rotation={[0, -Math.PI / 2, 0]}>
      {/* White background panel */}
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[chartWidth + 20, chartHeight + 25]} />
        <meshStandardMaterial 
          color="#FFFFFF"
          transparent
          opacity={0.98}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Shadow/depth effect */}
      <mesh position={[0.5, -0.5, -0.6]}>
        <planeGeometry args={[chartWidth + 20, chartHeight + 25]} />
        <meshStandardMaterial 
          color="#000000"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border */}
      <lineSegments position={[0, 0, -0.4]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(chartWidth + 20, chartHeight + 25)]} />
        <lineBasicMaterial color="#002868" linewidth={3} />
      </lineSegments>

      {/* Title */}
      <Text
        position={[0, (chartHeight + 25) / 2 - 4, 0]}
        fontSize={3}
        color="#002868"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`Team USA ${data.sport}`}
      </Text>

      <Text
        position={[0, (chartHeight + 25) / 2 - 7.5, 0]}
        fontSize={2.2}
        color="#475569"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`${data.category === 'paralympians' ? 'Paralympic' : 'Olympic'} Representation Over Time`}
      </Text>

      {/* Grid lines */}
      {gridLines.map(({ y, count, i }) => (
        <group key={`grid-${i}`}>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  -chartWidth / 2, y, 0,
                  chartWidth / 2, y, 0
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#CBD5E1" opacity={0.5} transparent />
          </line>
          {/* Y-axis value labels */}
          <Text
            position={[-chartWidth / 2 - 3, y, 0]}
            fontSize={1.5}
            color="#64748B"
            anchorX="right"
            anchorY="middle"
          >
            {count}
          </Text>
        </group>
      ))}

      {/* Fill area under curve */}
      {fillGeometry && (
        <mesh geometry={fillGeometry}>
          <meshBasicMaterial color="#BF0A30" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Line chart */}
      {lineGeometry && (
        <mesh geometry={lineGeometry}>
          <meshStandardMaterial color="#BF0A30" emissive="#BF0A30" emissiveIntensity={0.3} />
        </mesh>
      )}

      {/* Data points - optimized with lower poly count */}
      {points.map(([x, y], index) => (
        <group key={index} position={[x, y, 0.2]}>
          <mesh>
            <sphereGeometry args={[0.8, 8, 8]} />
            <meshStandardMaterial 
              color="#BF0A30" 
              emissive="#BF0A30"
              emissiveIntensity={0.5}
            />
          </mesh>
          {/* Value label on data point */}
          <Text
            position={[0, 2, 0]}
            fontSize={1.2}
            color="#002868"
            anchorX="center"
            anchorY="bottom"
            fontWeight="bold"
          >
            {data.counts[index]}
          </Text>
        </group>
      ))}

      {/* Y-axis label */}
      <Text
        position={[-chartWidth / 2 - 8, 0, 0]}
        fontSize={2}
        color="#002868"
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, Math.PI / 2]}
        fontWeight="bold"
      >
        Number of Athletes
      </Text>

      {/* X-axis label */}
      <Text
        position={[0, -chartHeight / 2 - 6, 0]}
        fontSize={2}
        color="#002868"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        Year
      </Text>

      {/* Year labels */}
      {data.years.map((year, index) => {
        const x = (index / (data.years.length - 1)) * chartWidth - chartWidth / 2;
        return (
          <Text
            key={year}
            position={[x, -chartHeight / 2 - 3, 0]}
            fontSize={1.5}
            color="#475569"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {year}
          </Text>
        );
      })}
    </group>
  );
}
