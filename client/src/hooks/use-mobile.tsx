import { useState, useEffect } from 'react';

const getIsMobile = () =>
  typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};
