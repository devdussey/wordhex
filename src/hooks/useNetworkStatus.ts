import { useState, useEffect } from 'react';

export interface NetworkStatus {
  online: boolean;
  since: number;
  downtime: number;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    since: Date.now(),
    downtime: 0
  });

  useEffect(() => {
    let downtimeStart: number | null = null;

    const handleOnline = () => {
      const now = Date.now();
      const downtime = downtimeStart ? now - downtimeStart : 0;
      downtimeStart = null;

      setStatus({
        online: true,
        since: now,
        downtime
      });
    };

    const handleOffline = () => {
      const now = Date.now();
      downtimeStart = now;

      setStatus(prev => ({
        online: false,
        since: now,
        downtime: prev.downtime
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
