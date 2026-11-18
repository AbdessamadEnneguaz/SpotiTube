import React from 'react';
import { X, Moon, Check } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTimerMinutes: number | null;
  onSetTimer: (minutes: number | null) => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  activeTimerMinutes,
  onSetTimer
}) => {
  if (!isOpen) return null;

  const options: { label: string; minutes: number | null }[] = [
    { label: '5 minutes', minutes: 5 },
    { label: '15 minutes', minutes: 15 },
    { label: '30 minutes', minutes: 30 },
    { label: '45 minutes', minutes: 45 },
    { label: '1 hour', minutes: 60 },
    { label: 'End of track', minutes: -1 },
    { label: 'Turn off timer', minutes: null }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#1B1815] border border-[#EAE0D0]/12 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-[#F5F0E8]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Sleep Timer"
          className="absolute top-4 right-4 text-[#9E9384] hover:text-[#F5F0E8] p-1.5 rounded-lg hover:bg-[#EAE0D0]/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#D8C3A5]/15 text-[#DFCCB0] flex items-center justify-center">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-[#F5F0E8]">Sleep Timer</h2>
            <p className="text-xs text-[#9E9384]">Pause playback automatically</p>
          </div>
        </div>

        <div className="space-y-1">
          {options.map((opt) => {
            const isSelected = activeTimerMinutes === opt.minutes;
            return (
              <button
                type="button"
                key={opt.label}
                onClick={() => {
                  onSetTimer(opt.minutes);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#D8C3A5] text-[#12100E] font-bold'
                    : 'text-[#C8BEB0] hover:bg-[#EAE0D0]/[0.06]'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
