import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../../hooks/useKeyboard';
import { PerspectiveCamera, Text } from '@react-three/drei';

const MIN_ALTITUDE = 15;
const START_POSITION = new THREE.Vector3(0, 50, -350);
const START_ROTATION = new THREE.Euler(0, 0, 0);

export function Glider({ 
  statePositions = [], 
  onPitStop, 
  isSimulationPaused = false 
}: { 
  statePositions?: { name: string, pos: [number, number, number] }[], 
  onPitStop?: (name: string) => void,
  isSimulationPaused?: boolean
}) {
  const meshRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { forward, backward, left, right, arrowUp, arrowDown } = useKeyboard();
  const [localPaused, setLocalPaused] = useState(false);
  const paused = localPaused || isSimulationPaused;
  const pausedRef = useRef(paused);
  const lastTriggeredState = useRef<string | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Auto-resume if simulation is unpaused
  useEffect(() => {
    if (!isSimulationPaused) {
      setLocalPaused(false);
    }
  }, [isSimulationPaused]);
  
  // Mouse look state
  const mouseRef = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ yaw: 0, pitch: 0 });
  const targetRotation = useRef({ yaw: 0, pitch: 0 });
  const yaw = useRef(0);
  const pitch = useRef(0);

  // Toggle pause with P key, Reset with R key, and track mouse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'p') setLocalPaused((prev) => !prev);
      if (key === 'r') {
        if (meshRef.current) {
          meshRef.current.position.copy(START_POSITION);
          yaw.current = 0;
          pitch.current = 0;
          cameraRotation.current.yaw = 0;
          cameraRotation.current.pitch = 0;
          meshRef.current.rotation.set(0, 0, 0);
          setLocalPaused(false);
          lastTriggeredState.current = null;
          if (onPitStop) onPitStop(""); 
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Always update cursor position in background
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 + 1;
      
      mouseRef.current.x = mx;
      mouseRef.current.y = my;

      if (!pausedRef.current) {
        targetRotation.current.yaw = -mx * (Math.PI * 0.5);
        targetRotation.current.pitch = my * (Math.PI * 0.25);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onPitStop]);

  useFrame((state, delta) => {
    if (!meshRef.current || !visualRef.current) return;

    if (paused) {
      // 0. Hovering animation even when paused/in pit stop
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y += Math.sin(time * 2) * 0.005;
      visualRef.current.rotation.z = THREE.MathUtils.lerp(visualRef.current.rotation.z, Math.sin(time) * 0.1, 0.05);
      visualRef.current.rotation.x = THREE.MathUtils.lerp(visualRef.current.rotation.x, Math.cos(time * 0.5) * 0.05, 0.05);
    } else {
      // Movement constants
      let moveSpeed = 0.12; 
      const turnSpeed = 0.01; 
      const pitchSpeed = 0.008; 
      const MAX_PITCH = Math.PI / 3.5; // ~50 degrees max pitch up/down

      // Adjust speed with arrows
      if (arrowUp) moveSpeed *= 3;
      if (arrowDown) moveSpeed *= -1.5;

      // 1. Update Angles
      if (forward) pitch.current = Math.min(pitch.current + pitchSpeed, MAX_PITCH);
      if (backward) pitch.current = Math.max(pitch.current - pitchSpeed, -MAX_PITCH);
      
      if (left) {
        yaw.current += turnSpeed;
        visualRef.current.rotation.z = THREE.MathUtils.lerp(visualRef.current.rotation.z, 0.4, 0.1);
      } else if (right) {
        yaw.current -= turnSpeed;
        visualRef.current.rotation.z = THREE.MathUtils.lerp(visualRef.current.rotation.z, -0.4, 0.1);
      } else {
        visualRef.current.rotation.z = THREE.MathUtils.lerp(visualRef.current.rotation.z, 0, 0.1);
      }

      // 2. Apply Rotation explicitly to prevent flipping (YXZ order)
      meshRef.current.rotation.set(-pitch.current, yaw.current, 0, 'YXZ');

      // 3. Constant forward momentum
      meshRef.current.translateZ(moveSpeed);

      // 4. Altitude Clamp & Auto-Leveling
      if (meshRef.current.position.y <= MIN_ALTITUDE) {
        meshRef.current.position.y = MIN_ALTITUDE;
        // Force level out if trying to dive into the ground
        if (pitch.current > 0) {
          pitch.current = THREE.MathUtils.lerp(pitch.current, 0, 0.1);
        }
      }

      // 5. Pit Stop Proximity Check
      if (statePositions.length > 0 && onPitStop) {
        const gliderPos = meshRef.current.position;
        let foundNearby = false;

        for (const s of statePositions) {
          const dx = gliderPos.x - s.pos[0];
          const dz = gliderPos.z - s.pos[2];
          const distSq = dx * dx + dz * dz;
          
          // Trigger if horizontal distance < 20 units (distSq < 400) AND altitude is low enough over label (~25)
          if (distSq < 400 && gliderPos.y < 25) {
            foundNearby = true;
            if (lastTriggeredState.current !== s.name) {
              lastTriggeredState.current = s.name;
              onPitStop(s.name);
            }
            break;
          }
        }

        if (!foundNearby) {
          lastTriggeredState.current = null;
        }
      }
    }

    // Smooth camera follow with 360 Mouse Look
    if (cameraRef.current) {
        // Smoothly lerp towards target rotation
        cameraRotation.current.yaw = THREE.MathUtils.lerp(cameraRotation.current.yaw, targetRotation.current.yaw, 0.08);
        cameraRotation.current.pitch = THREE.MathUtils.lerp(cameraRotation.current.pitch, targetRotation.current.pitch, 0.08);

        // Base follow offset (relative to glider)
        const baseOffset = new THREE.Vector3(0, 4, -12);
        
        // Create an orbit rotation based on mouse movement
        const orbitRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(cameraRotation.current.pitch, cameraRotation.current.yaw, 0, 'YXZ')
        );
        
        // Combine glider rotation with camera orbit rotation
        const finalRotation = meshRef.current.quaternion.clone().multiply(orbitRotation);
        
        // Apply rotation to offset
        const rotatedOffset = baseOffset.clone().applyQuaternion(finalRotation);
        const cameraPosition = meshRef.current.position.clone().add(rotatedOffset);
        
        // Smooth positioning
        cameraRef.current.position.lerp(cameraPosition, 0.1);
        
        // Look at point ahead based on the same combined rotation
        const lookAtTarget = new THREE.Vector3(0, 0, 10)
          .applyQuaternion(finalRotation)
          .add(meshRef.current.position);
          
        cameraRef.current.lookAt(lookAtTarget);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={60} far={5000} />
      <group ref={meshRef} position={START_POSITION.toArray() as [number, number, number]}>
        {/* Visual Group with Banking */}
        <group ref={visualRef}>
          <group>
            {/* Central Professional Core */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.3, 0.2, 1.4, 16]} />
              <meshStandardMaterial color="#BF0A30" metalness={0.5} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
              <sphereGeometry args={[0.38, 16, 16]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.1} metalness={0.6} />
            </mesh>

            {/* Glowing Structural Spines - Team USA Red */}
            <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 2.0, 8]} />
              <meshStandardMaterial color="#BF0A30" emissive="#BF0A30" emissiveIntensity={0.5} />
            </mesh>

            {/* Scalloped Wings - Updated to Reds */}
            <group position={[0, 0, 0]}>
              {/* Left Wing */}
              <group position={[-0.4, 0, 0]}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <mesh 
                    key={`l-wing-${i}`} 
                    position={[-1.2 - (i * 0.4), 0, -0.2 + (i * 0.1)]} 
                    rotation={[0.2, -0.2 + (i * 0.1), -0.1]}
                    scale={[1.6, 0.1, 1.3 - (i * 0.1)]}
                  >
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshStandardMaterial 
                      color={i % 2 === 0 ? "#BF0A30" : "#FFFFFF"} 
                      metalness={0.3}
                      roughness={0.4}
                    />
                  </mesh>
                ))}
              </group>

              {/* Right Wing */}
              <group position={[0.4, 0, 0]}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <mesh 
                    key={`r-wing-${i}`} 
                    position={[1.2 + (i * 0.4), 0, -0.2 + (i * 0.1)]} 
                    rotation={[0.2, 0.2 - (i * 0.1), 0.1]}
                    scale={[1.6, 0.1, 1.3 - (i * 0.1)]}
                  >
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshStandardMaterial 
                      color={i % 2 === 0 ? "#BF0A30" : "#FFFFFF"} 
                      metalness={0.3}
                      roughness={0.4}
                    />
                  </mesh>
                ))}
              </group>
            </group>

            {/* Rear Stabilizers - Patriotic Reds */}
            <group position={[0, 0, -0.8]}>
              <mesh position={[0.25, 0.2, 0]} rotation={[0, 0, 0.5]} scale={[0.3, 0.05, 1.0]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial color="#BF0A30" />
              </mesh>
              <mesh position={[-0.25, 0.2, 0]} rotation={[0, 0, -0.5]} scale={[0.3, 0.05, 1.0]}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial color="#BF0A30" />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
