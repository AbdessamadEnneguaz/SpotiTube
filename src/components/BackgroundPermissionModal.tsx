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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={handleDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bg-perm-title"
        className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl bg-[#110E0F] border border-white/14 p-5 sm:p-6 shadow-2xl text-[#F4F1F1] relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close permissions prompt"
          className="absolute top-4 right-4 text-[#A39E9F] hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-[#FF443A]">
          <Radio className="w-4 h-4" />
          <span className="text-xs font-semibold">Kiddwave Permissions</span>
        </div>

        <div>
          <h3 id="bg-perm-title" className="font-display text-lg font-bold text-white">
            Allow Permissions for Background &amp; Offline Play
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-[#D0CBCC] leading-relaxed">
            Allow permissions so audio keeps running when switching apps and cached tracks remain available offline.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between rounded-xl bg-[#070607]/85 border border-white/[0.08] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#FF443A] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Media Notifications</div>
                <div className="text-[11px] text-[#A39E9F]">Lock-screen controls &amp; playback alerts</div>
              </div>
            </div>
            <span
              className={`text-xs font-semibold shrink-0 ${
                notifStatus === 'granted'
                  ? 'text-[#FF443A]'
                  : notifStatus === 'denied'
                    ? 'text-rose-400'
                    : 'text-[#D0CBCC]'
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

          <div className="flex items-center justify-between rounded-xl bg-[#070607]/85 border border-white/[0.08] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-[#FF443A] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Background Audio Focus</div>
                <div className="text-[11px] text-[#A39E9F]">Maintains continuous audio session</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#FF443A] shrink-0">
              {audioUnlocked ? 'Unlocked' : 'Ready'}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#070607]/85 border border-white/[0.08] px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-[#FF443A] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white">Persistent Offline Cache</div>
                <div className="text-[11px] text-[#A39E9F]">Protects cached tracks offline</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#FF443A] shrink-0">
              {persistentStorage ? 'Allowed' : 'Ready'}
            </span>
          </div>
        </div>

        {notifStatus === 'denied' && (
          <div className="flex items-start gap-2 rounded-xl bg-[#EF2323]/10 border border-[#EF2323]/30 p-3 text-xs text-[#F4F1F1]">
            <AlertCircle className="w-4 h-4 text-[#FF443A] shrink-0 mt-0.5" />
            <span>
              Browser notifications are blocked. Open Site Settings and set Notifications to <strong>Allow</strong>.
            </span>
          </div>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-xs sm:text-sm font-semibold text-[#F4F1F1] transition-colors cursor-pointer"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleEnableAllPermissions}
            disabled={isRequesting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#EF2323] hover:bg-[#FF3830] py-2.5 px-4 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60 shadow-[0_6px_18px_rgba(239,35,35,0.35)]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isRequesting ? 'Allowing...' : 'Allow All Permissions'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
