import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';
import { useLoader } from '@react-three/fiber';
import { Text } from '@react-three/drei';

export const stateAbbreviations: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR'
};

// Topographical Palette - Cohesive blue/purple/pink west, yellow mid, green east
const topoPalette = {
  west: ["#5B7FE8", "#8B7FE8", "#C77FE8"], // Smooth blue to purple to pink blend
  mid: ["#F1C40F", "#F39C12", "#F1C40F"],  // Yellow tones
  east: ["#7CB342", "#9CCC65", "#AED581"], // Green tones
};

interface StateData {
  type: string;
  id: string;
  properties: {
    name: string;
  };
  geometry: any;
}

const MAP_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

export function USMap3D({ 
  onLoaded, 
  onStatesReady,
  onSelectState,
  highlightedStates = [],
  highlightColor = "#FF8C00", // Dark Orange for sports discovery
  viewMode = 'flight',
  stateStats = {},
  maxAthletes = 0,
  sportName = ""
}: { 
  onLoaded?: () => void, 
  onStatesReady?: (states: { name: string, pos: [number, number, number] }[]) => void,
  onSelectState?: (name: string) => void,
  highlightedStates?: string[],
  highlightColor?: string,
  viewMode?: 'flight' | 'map',
  stateStats?: Record<string, { athleteCount: number, gold: number, silver: number, bronze: number, totalMedals: number }>,
  maxAthletes?: number,
  sportName?: string
}) {
  const data = useLoader(THREE.FileLoader, MAP_URL) as string;
  const loadedRef = useRef(false);

  const isDynamicMode = highlightedStates.length > 0;
  const isMapMode = viewMode === 'map';
  const isSportsMode = Object.keys(stateStats).length > 0;

  const labelRotation = [0, 0, 0];

  const { states, counties, countyFeatures, stateMesh } = useMemo(() => {
    try {
      const topoData = JSON.parse(data);
      // @ts-ignore
      const stateGeo = topojson.feature(topoData, topoData.objects.states);
      // @ts-ignore
      const countyMesh = topojson.mesh(topoData, topoData.objects.counties, (a, b) => a !== b);
      // @ts-ignore
      const stateLines = topojson.mesh(topoData, topoData.objects.states, (a, b) => a !== b);
      // @ts-ignore
      const cGeo = topojson.feature(topoData, topoData.objects.counties);
      
      // @ts-ignore
      return { states: stateGeo.features as StateData[], counties: countyMesh, countyFeatures: cGeo.features as any[], stateMesh: stateLines };
    } catch (e) {
      console.error("Failed to parse map data:", e);
      return { states: [], counties: null, countyFeatures: [], stateMesh: null };
    }
  }, [data]);

  const projection = useMemo(() => {
    return d3.geoAlbersUsa()
      .scale(1000)
      .translate([0, 0]);
  }, []);

  useEffect(() => {
    if (data && onLoaded && !loadedRef.current) {
      onLoaded();
      loadedRef.current = true;
    }
  }, [data, onLoaded]);

  useEffect(() => {
    if (states.length > 0 && onStatesReady) {
      const statePositions = states.map(s => {
        const [cx, cy] = d3.geoPath(projection).centroid(s as any) || [0, 0];
        // Convert to world space coordinates and rotate 180 degrees (negate x and z)
        return { name: s.properties.name, pos: [-cx, -2, -cy] as [number, number, number] };
      });
      onStatesReady(statePositions);
    }
  }, [states, onStatesReady, projection]);

  // Vibrant Scale: Warm Yellow -> Green -> Pink -> Purple
  const getPlasmaColor = (count: number, max: number) => {
    if (max === 0) return "#475569";
    const t = count / max;
    const colors = ["#FCD34D", "#34D399", "#F472B6", "#A78BFA"];
    const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 1);
    return colors[idx];
  };

  // Darker versions for state badges
  const getDarkerPlasmaColor = (count: number, max: number) => {
    if (max === 0) return "#475569";
    const t = count / max;
    const colors = ["#F59E0B", "#059669", "#DB2777", "#7C3AED"]; // Darker warm yellow/amber, green, pink, purple
    const idx = Math.min(Math.floor(t * (colors.length - 1)), colors.length - 1);
    return colors[idx];
  };

  return (
    <group rotation={[-Math.PI / 2, 0, isMapMode ? 0 : Math.PI]} position={[0, -2, 0]}>
      {/* Base State Mesh for Interaction/Highlighting logic simplified */}
      {states.map((state, idx) => {
        const isHighlighted = highlightedStates.includes(state.properties.name);
        
        const [cx, cy] = d3.geoPath(projection).centroid(state as any) || [0, 0];
        const abbreviation = stateAbbreviations[state.properties.name] || state.properties.name;
        const stats = stateStats[abbreviation];

        return (
          <group key={state.id}>
            {/* State Badge Circle (Restored) */}
            <mesh position={[cx, -cy, 2.0]}>
              <circleGeometry args={[7, 32]} />
              <meshBasicMaterial 
                color={
                  (isDynamicMode && !isHighlighted) 
                    ? "#C41E3A" 
                    : (isSportsMode ? getDarkerPlasmaColor(stats?.athleteCount || 0, maxAthletes) : "#BF0A30")
                } 
                opacity={1} 
                transparent={true}
              />
            </mesh>

            {/* State Label */}
            <Text
              position={[cx, -cy, 2.5]}
              rotation={labelRotation as [number, number, number]}
              fontSize={4.5}
              color="white"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
              fillOpacity={1}
            >
              {abbreviation}
            </Text>

            {/* Sport Name Label (Above Centroid - Higher and Smaller) */}
            {stats && sportName && (
               <Text
                 position={[cx, -cy + 6.5, 2.5]}
                 rotation={labelRotation as [number, number, number]}
                 fontSize={1.4}
                 color="#002868"
                 fontWeight="black"
                 anchorX="center"
                 anchorY="bottom"
               >
                 {sportName.toUpperCase()}
               </Text>
            )}

            {/* Stats Circular Badges - Moved to the side */}
            {stats && (
              <group position={[cx + 12, -cy, 3.5]}>
                {/* Athlete count circle */}
                <group position={[0, 0, 0]}>
                  <mesh>
                    <circleGeometry args={[3.2, 32]} />
                    <meshBasicMaterial color="#002868" />
                  </mesh>
                  <Text position={[0, 0, 0.1]} fontSize={2.5} color="white" fontWeight="black" anchorX="center" anchorY="middle">
                    {stats.athleteCount}
                  </Text>
                  <Text position={[0, 5.0, 0]} fontSize={1.4} color="#002868" fontWeight="black" anchorX="center">USA</Text>
                  <Text position={[0, 3.8, 0]} fontSize={1.0} color="#002868" fontWeight="bold" anchorX="center">ATHLETES</Text>
                </group>

                {/* Medals cluster - vertical next to athlete count */}
                <group position={[7, 0, 0]}>
                   {/* Gold */}
                   <group position={[0, 3, 0]}>
                      <mesh>
                        <circleGeometry args={[1.5, 24]} />
                        <meshBasicMaterial color="#FFD700" />
                      </mesh>
                      <Text fontSize={1.3} color="black" fontWeight="bold" position={[0, 0, 0.1]}>{stats.gold}</Text>
                      <Text position={[2.5, 0, 0]} fontSize={1.2} color="#002868" fontWeight="bold" anchorX="left">G</Text>
                   </group>
                   {/* Silver */}
                   <group position={[0, 0, 0]}>
                      <mesh>
                        <circleGeometry args={[1.5, 24]} />
                        <meshBasicMaterial color="#C0C0C0" />
                      </mesh>
                      <Text fontSize={1.3} color="black" fontWeight="bold" position={[0, 0, 0.1]}>{stats.silver}</Text>
                      <Text position={[2.5, 0, 0]} fontSize={1.2} color="#002868" fontWeight="bold" anchorX="left">S</Text>
                   </group>
                   {/* Bronze */}
                   <group position={[0, -3, 0]}>
                      <mesh>
                        <circleGeometry args={[1.5, 24]} />
                        <meshBasicMaterial color="#CD7F32" />
                      </mesh>
                      <Text fontSize={1.3} color="white" fontWeight="bold" position={[0, 0, 0.1]}>{stats.bronze}</Text>
                      <Text position={[2.5, 0, 0]} fontSize={1.2} color="#002868" fontWeight="bold" anchorX="left">B</Text>
                   </group>
                </group>
              </group>
            )}

            {/* Hidden interaction plane for state click */}
            <mesh 
              position={[cx, -cy, 0.1]} 
              onClick={(e) => {
                e.stopPropagation();
                onSelectState?.(state.properties.name);
              }}
              onPointerOver={() => (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = 'auto')}
            >
              <circleGeometry args={[25, 8]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </group>
        );
      })}

      {/* Individual Counties with Shade Variations */}
      {countyFeatures.map((county, idx) => {
        // More robust state matching by string ID
        const cId = (county.id || '').toString().padStart(5, '0');
        const stateId = cId.substring(0, 2);
        
        const stateObj = states.find(s => s.id.toString().padStart(2, '0') === stateId);
        const stateName = stateObj ? stateObj.properties.name : "";
        const isHighlighted = stateName ? highlightedStates.includes(stateName) : false;

        // Determine base color based on longitude (East-West Gradient - BLENDED)
        const [cx] = d3.geoPath(projection).centroid(county as any) || [0, 0];
        
        // Normalize cx to a 0-1 range roughly, pushing yellow/green more west
        let t = Math.max(0, Math.min(1, (cx + 120) / 220));
        
        // Specific adjustments for NW states to be yellower/greener
        const yellowStates = ['Washington', 'Montana', 'Idaho', 'Oregon', 'Wyoming', 'North Dakota', 'South Dakota'];
        if (yellowStates.includes(stateName)) {
          t = Math.max(t, 0.4);
        }
        
        const westColor = new THREE.Color(topoPalette.west[idx % topoPalette.west.length]);
        const midColor = new THREE.Color(topoPalette.mid[idx % topoPalette.mid.length]);
        const eastColor = new THREE.Color(topoPalette.east[idx % topoPalette.east.length]);
        
        let blendedColor = new THREE.Color();
        // Shifted thresholds to reduce orange and increase yellow/green coverage
        if (t < 0.15) {
          blendedColor.copy(westColor);
        } else if (t < 0.35) {
          blendedColor.lerpColors(westColor, midColor, (t - 0.15) / 0.2);
        } else if (t < 0.55) {
          blendedColor.lerpColors(midColor, eastColor, (t - 0.35) / 0.2);
        } else {
          blendedColor.copy(eastColor);
        }
        
        const baseColor = blendedColor.getStyle();

        return (
          <CountyShape 
            key={county.id || idx}
            feature={county}
            projection={projection}
            baseColor={baseColor}
            isHighlighted={isHighlighted}
            isDynamicMode={isDynamicMode}
            stateStats={stateStats}
            maxAthletes={maxAthletes}
            getPlasmaColor={getPlasmaColor}
            stateName={stateName}
            seed={idx} // Used for variation
          />
        );
      })}
      
      {/* City/County Outlines */}
      {counties && (
        <CountyOutlines mesh={counties} projection={projection} />
      )}

      {/* Prominent State Borders */}
      {stateMesh && (
        <StateOutlines mesh={stateMesh} projection={projection} />
      )}
    </group>
  );
}

function StateOutlines({ mesh, projection }: { mesh: any, projection: any }) {
  const geometry = useMemo(() => {
    const rawPoints: THREE.Vector3[] = [];
    mesh.coordinates.forEach((line: any[]) => {
      for (let i = 0; i < line.length - 1; i++) {
        const [x1, y1] = projection(line[i]) || [0, 0];
        const [x2, y2] = projection(line[i+1]) || [0, 0];
        rawPoints.push(new THREE.Vector3(x1, -y1, 0.6));
        rawPoints.push(new THREE.Vector3(x2, -y2, 0.6));
      }
    });
    return new THREE.BufferGeometry().setFromPoints(rawPoints);
  }, [mesh, projection]);

  return (
    <group>
      {/* Heavy-duty passes for thickness effect */}
      <lineSegments position={[0, 0, 0.2]} geometry={geometry}>
        <lineBasicMaterial attach="material" color="#000000" opacity={1.0} transparent />
      </lineSegments>
      <lineSegments position={[0.2, 0.1, 0.21]} geometry={geometry}>
        <lineBasicMaterial attach="material" color="#000000" opacity={0.6} transparent />
      </lineSegments>
      <lineSegments position={[-0.2, -0.1, 0.21]} geometry={geometry}>
        <lineBasicMaterial attach="material" color="#000000" opacity={0.6} transparent />
      </lineSegments>
      <lineSegments position={[0.1, -0.2, 0.21]} geometry={geometry}>
        <lineBasicMaterial attach="material" color="#000000" opacity={0.6} transparent />
      </lineSegments>
      <lineSegments position={[-0.1, 0.2, 0.21]} geometry={geometry}>
        <lineBasicMaterial attach="material" color="#000000" opacity={0.6} transparent />
      </lineSegments>
    </group>
  );
}

function CountyShape({ feature, projection, baseColor, isHighlighted, isDynamicMode, stateStats, maxAthletes, getPlasmaColor, stateName, seed }: any) {
  const { geometry } = useMemo(() => {
    const s = new THREE.Shape();
    const coords = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;

    coords.forEach((polygon: any[][]) => {
      polygon.forEach((ring: any[]) => {
        ring.forEach((point: [number, number], i: number) => {
          const [px, py] = projection(point) || [0, 0];
          if (i === 0) s.moveTo(px, -py);
          else s.lineTo(px, -py);
        });
      });
    });

    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false });
    return { geometry: geom };
  }, [feature, projection]);

  const color = useMemo(() => {
    if (isDynamicMode && isHighlighted) {
      // Find stats for this state
      const abbreviation = Object.keys(stateAbbreviations).find(k => k === stateName) 
        ? stateAbbreviations[stateName] 
        : stateName;
      const stats = stateStats[abbreviation];
      if (stats) return getPlasmaColor(stats.athleteCount, maxAthletes);
      return "#FF8C00";
    }

    // Grey/White/Dark Grey gradient for non-highlighted states in dynamic mode
    if (isDynamicMode && !isHighlighted) {
      // Create gradient from light grey to white to dark grey based on seed
      const greyShades = [
        "#F5F5F5", // Very light grey (almost white)
        "#E0E0E0", // Light grey
        "#D3D3D3", // Light grey
        "#C0C0C0", // Silver
        "#A9A9A9", // Dark grey
        "#808080", // Grey
        "#696969", // Dim grey
        "#DCDCDC", // Gainsboro
        "#F0F0F0", // White smoke
        "#BEBEBE", // Medium grey
      ];
      
      const shadeIndex = seed % greyShades.length;
      return greyShades[shadeIndex];
    }

    // Default Terrain Color (keep original colors for normal mode)
    const c = new THREE.Color(baseColor);
    const hsl: any = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    
    // Create a mosaic effect with more significant variant steps
    const lStep = ((seed * 7) % 20) / 100; // 0 to 0.20
    const sStep = ((seed * 13) % 15) / 100; // 0 to 0.15
    
    // Alternate lighter and darker for texture
    if (seed % 2 === 0) {
      hsl.l = Math.max(0.3, hsl.l - lStep);
      hsl.s = Math.min(1.0, hsl.s + sStep);
    } else {
      hsl.l = Math.min(0.9, hsl.l + lStep);
      hsl.s = Math.max(0.0, hsl.s - sStep);
    }
    
    c.setHSL(hsl.h, hsl.s, hsl.l);
    return c;
  }, [baseColor, seed, isHighlighted, isDynamicMode, stateStats, stateName, getPlasmaColor, maxAthletes]);

  const opacity = isDynamicMode && !isHighlighted ? 1.0 : 1.0; 
  const metalness = isDynamicMode && !isHighlighted ? 0.1 : 0.1;
  const roughness = isDynamicMode && !isHighlighted ? 0.8 : 0.8;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial 
        color={color} 
        transparent={false} 
        opacity={opacity} 
        metalness={metalness}
        roughness={roughness}
        flatShading 
      />
    </mesh>
  );
}

function CountyOutlines({ mesh, projection }: { mesh: any, projection: any }) {
  const geometry = useMemo(() => {
    const rawPoints: THREE.Vector3[] = [];
    
    // We iterate through the topojson mesh directly to build state lines
    // This is more efficient for "outlines" than full polygons
    mesh.coordinates.forEach((line: any[]) => {
      for (let i = 0; i < line.length - 1; i++) {
        const p1 = line[i];
        const p2 = line[i+1];
        
        const [x1, y1] = projection(p1) || [0, 0];
        const [x2, y2] = projection(p2) || [0, 0];
        
        rawPoints.push(new THREE.Vector3(x1, -y1, 0.55));
        rawPoints.push(new THREE.Vector3(x2, -y2, 0.55));
      }
    });

    return new THREE.BufferGeometry().setFromPoints(rawPoints);
  }, [mesh, projection]);

  return (
    <lineSegments position={[0, 0, 0.1]} geometry={geometry}>
      <lineBasicMaterial attach="material" color="#000000" opacity={0.15} transparent />
    </lineSegments>
  );
}
