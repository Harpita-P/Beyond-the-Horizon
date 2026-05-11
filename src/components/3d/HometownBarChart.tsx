import { useRef, useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { HometownDistributionData } from '../../services/dataAnalystAgent';

interface HometownBarChartProps {
  data: HometownDistributionData;
  position?: [number, number, number];
}

export function HometownBarChart({ data, position = [350, 30, 120] }: HometownBarChartProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const panelWidth = 70;
  const panelHeight = 40;
  
  // Generate colors for states
  const stateColors = useMemo(() => {
    const colors = [
      '#BF0A30', '#002868', '#FFD700', '#32CD32', '#FF6347',
      '#4169E1', '#9370DB', '#20B2AA', '#FF69B4', '#00CED1',
      '#DC143C', '#008000', '#FF8C00', '#4B0082', '#FF1493'
    ];
    return data.states.map((_, index) => colors[index % colors.length]);
  }, [data.states]);

  // Calculate pie slices
  const pieSlices = useMemo(() => {
    const radius = 12;
    const centerX = 0;
    const centerY = 0;
    let startAngle = -Math.PI / 2;

    return data.states.map((stateData, index) => {
      const percentage = (stateData.count / data.totalAthletes) * 100;
      const angle = (percentage / 100) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const midAngle = startAngle + angle / 2;
      
      // Label position (outside the pie)
      const labelRadius = radius + 7;
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;
      
      const slice = {
        state: stateData.state,
        count: stateData.count,
        percentage,
        startAngle,
        endAngle,
        midAngle,
        labelX,
        labelY,
        color: stateColors[index]
      };
      
      startAngle = endAngle;
      return slice;
    });
  }, [data.states, data.totalAthletes, stateColors]);

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
        {`Where Team USA ${data.sport}`}
      </Text>

      <Text
        position={[0, (panelHeight + 25) / 2 - 7.5, 0]}
        fontSize={2.2}
        color="#475569"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`${data.category === 'paralympians' ? 'Paralympic' : 'Olympic'} Athletes Come From`}
      </Text>

      {/* Pie slices */}
      {pieSlices.map((slice, index) => {
        const radius = 12;
        const centerX = 0;
        const centerY = 0;
        
        // Create pie slice shape
        const shape = new THREE.Shape();
        shape.moveTo(centerX, centerY);
        
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
            
            {/* State label */}
            <Text
              position={[slice.labelX, slice.labelY, 0.2]}
              fontSize={1.5}
              color="#002868"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {slice.state}
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

      {/* Total athletes count */}
      <Text
        position={[0, -panelHeight / 2 - 5, 0]}
        fontSize={1.5}
        color="#002868"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`Total Athletes: ${data.totalAthletes}`}
      </Text>
    </group>
  );
}
