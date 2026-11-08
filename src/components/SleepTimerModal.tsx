import React from 'react';
import { X, Moon, Check, Clock } from 'lucide-react';

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
    { label: 'End of track', minutes: -1 }, // -1 sentinel for end of track
    { label: 'Turn off timer', minutes: null }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#1e1e1e] border border-neutral-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          aria-label="Close Sleep Timer"
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Sleep Timer</h2>
            <p className="text-[11px] text-neutral-400">Stop audio when you fall asleep</p>
          </div>
        </div>

        <div className="space-y-1">
          {options.map((opt) => {
            const isSelected = activeTimerMinutes === opt.minutes;
            return (
              <button
                key={opt.label}
                onClick={() => {
                  onSetTimer(opt.minutes);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#1db954] text-black font-bold'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-black" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
