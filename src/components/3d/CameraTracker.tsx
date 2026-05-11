import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

interface CameraTrackerProps {
  enabled: boolean;
  statePositions: { name: string; pos: [number, number, number] }[];
  onNearState: (state: string | null) => void;
}

export function CameraTracker({ enabled, statePositions, onNearState }: CameraTrackerProps) {
  const { camera } = useThree();
  const lastLoggedState = useRef<string | null>(null);

  useFrame(() => {
    if (!enabled) return;

    const cameraPos = camera.position;
    let nearestState: string | null = null;
    
    // Use same logic as Falcon - check distance to state positions
    if (statePositions.length > 0) {
      for (const s of statePositions) {
        const dx = cameraPos.x - s.pos[0];
        const dy = cameraPos.y - s.pos[1];
        const dz = cameraPos.z - s.pos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Use threshold of 30 (same as Falcon)
        if (dist < 30) {
          nearestState = s.name;
          break;
        }
      }
    }
    
    // Debug logging when state changes
    if (nearestState !== lastLoggedState.current) {
      if (nearestState) {
        console.log(`🎯 Near state: ${nearestState} at camera position (${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)}, ${cameraPos.z.toFixed(1)})`);
      } else {
        console.log(`📍 No state nearby`);
      }
      lastLoggedState.current = nearestState;
    }
    
    onNearState(nearestState);
  });

  return null;
}
