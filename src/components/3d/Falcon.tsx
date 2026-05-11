import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../../hooks/useKeyboard';
import { PerspectiveCamera, useGLTF, useAnimations } from '@react-three/drei';

const MIN_ALTITUDE = 15;
const START_POSITION = new THREE.Vector3(0, 50, -350);
const START_ROTATION = new THREE.Euler(0, 0, 0);

export function Falcon({ 
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

  const gltf = useGLTF('/bird_flying/scene.gltf');
  const { actions } = useAnimations(gltf.animations, visualRef);

  useEffect(() => {
    console.log('Falcon GLTF loaded:', gltf);
    console.log('Falcon scene:', gltf.scene);
    console.log('Falcon animations:', gltf.animations);
  }, [gltf]);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      console.log('Playing falcon animation');
      const firstAction = Object.values(actions)[0];
      if (firstAction) {
        firstAction.play();
      }
    }
  }, [actions]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!isSimulationPaused) {
      setLocalPaused(false);
    }
  }, [isSimulationPaused]);
  
  const mouseRef = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ yaw: 0, pitch: 0 });
  const targetRotation = useRef({ yaw: 0, pitch: 0 });
  const yaw = useRef(0);
  const pitch = useRef(0);

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
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y += Math.sin(time * 2) * 0.005;
      visualRef.current.rotation.z = THREE.MathUtils.lerp(visualRef.current.rotation.z, Math.sin(time) * 0.1, 0.05);
      visualRef.current.rotation.x = THREE.MathUtils.lerp(visualRef.current.rotation.x, Math.cos(time * 0.5) * 0.05, 0.05);
    } else {
      let moveSpeed = 0.12; 
      const turnSpeed = 0.01; 
      const pitchSpeed = 0.008; 
      const MAX_PITCH = Math.PI / 3.5;

      if (arrowUp) moveSpeed *= 3;
      if (arrowDown) moveSpeed *= -1.5;

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

      meshRef.current.rotation.set(-pitch.current, yaw.current, 0, 'YXZ');
      meshRef.current.translateZ(moveSpeed);

      if (meshRef.current.position.y <= MIN_ALTITUDE) {
        meshRef.current.position.y = MIN_ALTITUDE;
        if (pitch.current > 0) {
          pitch.current = THREE.MathUtils.lerp(pitch.current, 0, 0.1);
        }
      }

      if (statePositions.length > 0 && onPitStop) {
        const gliderPos = meshRef.current.position;
        let foundNearby = false;

        for (const s of statePositions) {
          const dx = gliderPos.x - s.pos[0];
          const dz = gliderPos.z - s.pos[2];
          const distSq = dx * dx + dz * dz;
          
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

    if (cameraRef.current) {
        cameraRotation.current.yaw = THREE.MathUtils.lerp(cameraRotation.current.yaw, targetRotation.current.yaw, 0.08);
        cameraRotation.current.pitch = THREE.MathUtils.lerp(cameraRotation.current.pitch, targetRotation.current.pitch, 0.08);

        const baseOffset = new THREE.Vector3(0, 4, -12);
        
        const orbitRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(cameraRotation.current.pitch, cameraRotation.current.yaw, 0, 'YXZ')
        );
        
        const finalRotation = meshRef.current.quaternion.clone().multiply(orbitRotation);
        
        const rotatedOffset = baseOffset.clone().applyQuaternion(finalRotation);
        const cameraPosition = meshRef.current.position.clone().add(rotatedOffset);
        
        cameraRef.current.position.lerp(cameraPosition, 0.1);
        
        const lookAtTarget = new THREE.Vector3(0, 0, 10)
          .applyQuaternion(finalRotation)
          .add(meshRef.current.position);
          
        cameraRef.current.lookAt(lookAtTarget);
    }
  });

  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color.setHex(0xCC4400); // Vibrant dark red-orange
        }
      });
    }
  }, [gltf.scene]);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={60} far={5000} />
      <group ref={meshRef} position={START_POSITION.toArray() as [number, number, number]}>
        <group ref={visualRef} scale={2.0} rotation={[0, 0, 0]}>
          <primitive object={gltf.scene} />
        </group>
      </group>
    </>
  );
}

useGLTF.preload('/bird_flying/scene.gltf');
