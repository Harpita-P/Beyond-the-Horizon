import { useEffect, useState } from 'react';

export function useKeyboard() {
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    arrowUp: false,
    arrowDown: false,
    arrowLeft: false,
    arrowRight: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': setKeys((k) => ({ ...k, forward: true })); break;
        case 's': setKeys((k) => ({ ...k, backward: true })); break;
        case 'a': setKeys((k) => ({ ...k, left: true })); break;
        case 'd': setKeys((k) => ({ ...k, right: true })); break;
        case ' ': setKeys((k) => ({ ...k, up: true })); break;
        case 'shift': setKeys((k) => ({ ...k, down: true })); break;
        case 'arrowup': setKeys((k) => ({ ...k, arrowUp: true })); break;
        case 'arrowdown': setKeys((k) => ({ ...k, arrowDown: true })); break;
        case 'arrowleft': setKeys((k) => ({ ...k, arrowLeft: true })); break;
        case 'arrowright': setKeys((k) => ({ ...k, arrowRight: true })); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': setKeys((k) => ({ ...k, forward: false })); break;
        case 's': setKeys((k) => ({ ...k, backward: false })); break;
        case 'a': setKeys((k) => ({ ...k, left: false })); break;
        case 'd': setKeys((k) => ({ ...k, right: false })); break;
        case ' ': setKeys((k) => ({ ...k, up: false })); break;
        case 'shift': setKeys((k) => ({ ...k, down: false })); break;
        case 'arrowup': setKeys((k) => ({ ...k, arrowUp: false })); break;
        case 'arrowdown': setKeys((k) => ({ ...k, arrowDown: false })); break;
        case 'arrowleft': setKeys((k) => ({ ...k, arrowLeft: false })); break;
        case 'arrowright': setKeys((k) => ({ ...k, arrowRight: false })); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return keys;
}
