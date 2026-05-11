import { useRef, useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { MedalDistributionData } from '../../services/dataAnalystAgent';

interface PieChartPanelProps {
  data: MedalDistributionData;
  position?: [number, number, number];
}

export function PieChartPanel({ data, position = [400, 30, 240] }: PieChartPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const panelWidth = 70;
  const panelHeight = 40;
  
  // Medal colors
  const medalColors: Record<string, string> = {
    'Gold': '#FFD700',      // Gold
    'Silver': '#C0C0C0',   // Silver
    'Bronze': '#CD7F32'     // Bronze
  };

  // Calculate pie slices
  const pieSlices = useMemo(() => {
    const radius = 12;
    const centerX = 0;
    const centerY = 0;
    let startAngle = -Math.PI / 2; // Start at top

    return data.medals.map((medal) => {
      const angle = (medal.percentage / 100) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const midAngle = startAngle + angle / 2;
      
      // Label position (outside the pie)
      const labelRadius = radius + 7;
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;
      
      const slice = {
        type: medal.type,
        count: medal.count,
        percentage: medal.percentage,
        startAngle,
        endAngle,
        midAngle,
        labelX,
        labelY,
        color: medalColors[medal.type] || '#95A5A6'
      };
      
      startAngle = endAngle;
      return slice;
    });
  }, [data.medals]);

  return (
    <group ref={groupRef} position={position} rotation={[0, -Math.PI / 2, 0]}>
      {/* White background panel */}
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[panelWidth + 20, panelHeight + 25]} />
        <meshStandardMaterial 
          color="#FFFFFF"
          transparent
          opacity={0.98}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Shadow/depth effect */}
      <mesh position={[0.5, -0.5, -0.6]}>
        <planeGeometry args={[panelWidth + 20, panelHeight + 25]} />
        <meshStandardMaterial 
          color="#000000"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border */}
      <lineSegments position={[0, 0, -0.4]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(panelWidth + 20, panelHeight + 25)]} />
        <lineBasicMaterial color="#002868" linewidth={3} />
      </lineSegments>

      {/* Title */}
      <Text
        position={[0, (panelHeight + 25) / 2 - 4, 0]}
        fontSize={3}
        color="#002868"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`Overall Medal Composition: ${data.sport}`}
      </Text>

      <Text
        position={[0, (panelHeight + 25) / 2 - 7.5, 0]}
        fontSize={2.2}
        color="#475569"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`${data.category === 'paralympians' ? 'Paralympic' : 'Olympic'} Medal Distribution`}
      </Text>

      {/* Pie slices */}
      {pieSlices.map((slice, index) => {
        const radius = 12;
        const centerX = 0;
        const centerY = 0;
        
        // Create pie slice shape with proper geometry
        const shape = new THREE.Shape();
        shape.moveTo(centerX, centerY);
        
        // Create arc with enough segments for smooth curve
        const segments = 32;
        const angleStep = (slice.endAngle - slice.startAngle) / segments;
        for (let i = 0; i <= segments; i++) {
          const angle = slice.startAngle + angleStep * i;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          shape.lineTo(x, y);
        }
        shape.lineTo(centerX, centerY);
        
        const geometry = new THREE.ShapeGeometry(shape);
        
        return (
          <group key={index}>
            {/* Pie slice */}
            <mesh geometry={geometry} position={[0, 0, 0.1]}>
              <meshStandardMaterial 
                color={slice.color} 
                emissive={slice.color}
                emissiveIntensity={0.2}
              />
            </mesh>
            
            {/* Medal type label */}
            <Text
              position={[slice.labelX, slice.labelY, 0.2]}
              fontSize={1.5}
              color="#002868"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {slice.type}
            </Text>
            
            {/* Percentage label */}
            <Text
              position={[slice.labelX, slice.labelY - 2, 0.2]}
              fontSize={1.2}
              color="#475569"
              anchorX="center"
              anchorY="middle"
            >
              {`${slice.percentage.toFixed(1)}%`}
            </Text>
          </group>
        );
      })}

      {/* Total medals count */}
      <Text
        position={[0, -panelHeight / 2 - 5, 0]}
        fontSize={1.5}
        color="#002868"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`Total Medals: ${data.totalMedals}`}
      </Text>
    </group>
  );
}
