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
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-[#BA9870]/40 bg-[#DFC5A4] px-3.5 py-2 text-xs font-medium text-[#2A1F14] shadow-md md:bottom-5 dark:border-[#6E553D] dark:bg-[#3B2E21] dark:text-[#F5E9DA]"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline mode — saved locally on this device</span>
    </div>
  );
};
