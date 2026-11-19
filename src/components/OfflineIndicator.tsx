import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  cachedTrackCount?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = React.memo(({
  cachedTrackCount = 0
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-32 md:bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-40 flex items-center gap-2 rounded-xl bg-[#EF2323]/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white shadow-xl border border-white/25 whitespace-nowrap"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        No Internet — Playing cached tracks only ({cachedTrackCount} {cachedTrackCount === 1 ? 'track' : 'tracks'})
      </span>
    </div>
  );
});
