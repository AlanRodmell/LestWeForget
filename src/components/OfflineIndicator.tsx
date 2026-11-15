import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-[#B59267]/50 bg-[#DCC19B] px-3.5 py-2 text-xs font-medium text-[#291E14] shadow-md md:bottom-5 dark:border-[#5D4834] dark:bg-[#382B1E] dark:text-[#F4E8D6]"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline mode — saved locally on this device</span>
    </div>
  );
};
