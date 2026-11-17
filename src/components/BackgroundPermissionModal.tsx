import React, { useState, useEffect } from 'react';
import { X, Radio, Bell, CheckCircle2, Smartphone, AlertCircle, HardDrive } from 'lucide-react';
import {
  getNotificationPermissionState,
  markAppPermissionsPrompted,
  NotificationPermStatus,
  requestBackgroundPlayPermissions
} from '../utils/backgroundPermission';

interface BackgroundPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const BackgroundPermissionModal: React.FC<BackgroundPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted
}) => {
  const [notifStatus, setNotifStatus] = useState<NotificationPermStatus>('default');
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [persistentStorage, setPersistentStorage] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotifStatus(getNotificationPermissionState());
      if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
        navigator.storage.persisted().then(setPersistentStorage).catch(() => {});
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    markAppPermissionsPrompted();
    onClose();
  };

  const handleEnableAllPermissions = async () => {
    setIsRequesting(true);
    try {
      const res = await requestBackgroundPlayPermissions();
      setNotifStatus(res.notification);
      setAudioUnlocked(res.audioUnlocked);
      setPersistentStorage(res.persistentStorage);
      onPermissionGranted?.();
      onClose();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bg-perm-title"
        className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl bg-[#181818] border border-neutral-700 p-5 sm:p-6 shadow-2xl text-white relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close permissions prompt"
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-[#1db954]">
          <Radio className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">App Permissions</span>
        </div>

        <div>
          <h3 id="bg-perm-title" className="text-lg font-bold text-white">
            Allow Permissions for Background &amp; Offline Play
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Allow all app permissions so music continues playing in the background when leaving the app and your cached tracks stay saved offline.
          </p>
        </div>

        {/* All Permissions Overview */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between rounded-xl bg-neutral-900/90 border border-neutral-800 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#1db954] shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Media Notifications</div>
                <div className="text-[11px] text-neutral-400">Keeps background playback active &amp; lock-screen controls</div>
              </div>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                notifStatus === 'granted'
                  ? 'bg-[#1db954]/20 text-[#1db954]'
                  : notifStatus === 'denied'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {notifStatus === 'granted'
                ? 'Allowed'
                : notifStatus === 'denied'
                  ? 'Blocked'
                  : notifStatus === 'unsupported'
                    ? 'N/A'
                    : 'Required'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-neutral-900/90 border border-neutral-800 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-[#1db954] shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Background Audio Focus</div>
                <div className="text-[11px] text-neutral-400">Unlocks audio session &amp; lock-screen skip controls</div>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1db954]/20 text-[#1db954] shrink-0">
              {audioUnlocked ? 'Unlocked' : 'Ready'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-neutral-900/90 border border-neutral-800 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-[#1db954] shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Persistent Offline Cache</div>
                <div className="text-[11px] text-neutral-400">Protects cached tracks for automatic offline mode</div>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1db954]/20 text-[#1db954] shrink-0">
              {persistentStorage ? 'Allowed' : 'Ready'}
            </span>
          </div>
        </div>

        {notifStatus === 'denied' && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Browser notifications are currently blocked. Open Chrome/Safari Site Settings and set Notifications to <strong>Allow</strong>.
            </span>
          </div>
        )}

        <div className="rounded-xl bg-neutral-900/60 border border-neutral-800/80 p-3 text-[11px] text-neutral-300 leading-relaxed">
          <strong className="text-white">Phone Battery Tip:</strong> For uninterrupted background play on Android, set{' '}
          <span className="text-neutral-100">Settings → Apps → SpotiTube / Chrome → Battery</span> to{' '}
          <strong className="text-[#1db954]">Unrestricted</strong>.
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm font-semibold text-neutral-200 transition-colors cursor-pointer"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleEnableAllPermissions}
            disabled={isRequesting}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#1db954] hover:bg-[#1ed760] py-2.5 px-4 text-xs sm:text-sm font-bold text-black transition-all cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isRequesting ? 'Allowing...' : 'Allow All Permissions'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
