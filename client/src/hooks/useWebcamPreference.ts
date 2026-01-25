import { useCallback, useState } from 'react';

const STORAGE_KEY = 'van-beaches:webcam-hidden';

export function useWebcamPreference(): {
  isHidden: boolean;
  hide: () => void;
  show: () => void;
  toggle: () => void;
} {
  const [isHidden, setIsHidden] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const hide = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable
    }
    setIsHidden(true);
  }, []);

  const show = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch {
      // localStorage unavailable
    }
    setIsHidden(false);
  }, []);

  const toggle = useCallback(() => {
    if (isHidden) {
      show();
    } else {
      hide();
    }
  }, [isHidden, hide, show]);

  return { isHidden, hide, show, toggle };
}
