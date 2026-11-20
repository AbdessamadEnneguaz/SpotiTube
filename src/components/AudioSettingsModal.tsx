import React, { useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Volume2,
  AudioWaveform,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AudioSettings, CrossfadeSeconds, EqualizerPreset } from '../types/music';
import {
  DEFAULT_AUDIO_SETTINGS,
  EQ_BANDS,
  EQ_PRESETS,
  EqBandKey,
  applyEqPreset,
  updateEqBand,
} from '../utils/audioSettings';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onChange: React.Dispatch<React.SetStateAction<AudioSettings>>;
}

const CROSSFADE_OPTIONS: Array<{ value: CrossfadeSeconds; label: string; hint: string }> = [
  { value: 0, label: 'Off (0s)', hint: 'Instant gapless handoff' },
  { value: 2, label: '2s', hint: 'Subtle smooth blend' },
  { value: 4, label: '4s', hint: 'Studio DJ transition' },
];

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const presetKeys = Object.keys(EQ_PRESETS) as EqualizerPreset[];

  const handleSelectPreset = (preset: EqualizerPreset) => {
    onChange((prev) => ({
      ...prev,
      equalizer: applyEqPreset(prev.equalizer, preset),
    }));
  };

  const handleBandChange = (bandKey: EqBandKey, val: number) => {
    onChange((prev) => ({
      ...prev,
      equalizer: updateEqBand(prev.equalizer, bandKey, val),
    }));
  };

  const handleResetAll = () => {
    onChange(() => ({
      normalizationEnabled: DEFAULT_AUDIO_SETTINGS.normalizationEnabled,
      crossfadeSeconds: DEFAULT_AUDIO_SETTINGS.crossfadeSeconds,
      equalizer: { ...DEFAULT_AUDIO_SETTINGS.equalizer },
    }));
  };

  const formatDb = (db: number) => `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audio Engine & 5-Band Equalizer"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="frame-3d w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden bg-[#0D0A0B] border border-white/12 shadow-[0_28px_70px_rgba(0,0,0,0.95)]"
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1.5 rounded-full bg-white/20 mx-auto mt-2.5 shrink-0" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/35 flex items-center justify-center text-[#EF4444] shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-extrabold text-white truncate">
                Audio Engine &amp; Equalizer
              </h2>
              <p className="text-xs text-[#A39E9F] truncate">
                Mastering compressor, crossfade &amp; 5-band EQ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              title="Reset audio settings to defaults"
              aria-label="Reset audio settings"
              className="min-w-[40px] min-h-[40px] px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#D0CBCC] hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close audio settings"
              className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-[#A39E9F] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Loudness Normalization */}
          <section className="rounded-2xl bg-[#141011] border border-white/[0.08] p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#EF4444]/12 border border-[#EF4444]/25 flex items-center justify-center text-[#FF443A] shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">Loudness Normalization</div>
                <p className="text-xs text-[#A39E9F] mt-0.5 leading-relaxed">
                  Real-time dynamics compressor keeps quiet and loud tracks at a consistent volume level.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.normalizationEnabled}
              aria-label="Toggle Loudness Normalization"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  normalizationEnabled: !prev.normalizationEnabled,
                }))
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                settings.normalizationEnabled
                  ? 'bg-[#EF4444] border-[#F87171]/60'
                  : 'bg-[#221D1F] border-white/15'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.normalizationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </section>

          {/* Smooth Crossfade */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AudioWaveform className="w-4 h-4 text-[#EF4444]" />
                <h3 className="font-display text-sm font-bold text-white">
                  Track Crossfade
                </h3>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#FF443A]">
                {settings.crossfadeSeconds === 0 ? 'Gapless Off' : `${settings.crossfadeSeconds}s overlap`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CROSSFADE_OPTIONS.map((opt) => {
                const active = settings.crossfadeSeconds === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() =>
                      onChange((prev) => ({ ...prev, crossfadeSeconds: opt.value }))
                    }
                    className={`min-h-[52px] px-3 py-2 rounded-xl text-left transition-all cursor-pointer border ${
                      active
                        ? 'bg-[#EF4444] text-white border-[#F87171]/60 shadow-[0_6px_16px_rgba(239,68,68,0.32)]'
                        : 'bg-[#141011] text-[#D0CBCC] border-white/[0.08] hover:border-[#EF4444]/40 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold tabular-nums">{opt.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        active ? 'text-white/85' : 'text-[#A39E9F]'
                      }`}
                    >
                      {opt.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 5-Band Equalizer & Presets */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#EF4444]" />
                <h3 className="font-display text-sm font-bold text-white">
                  5-Band Equalizer
                </h3>
              </div>
              <span className="text-xs font-medium text-[#A39E9F]">
                Preset: <strong className="text-white">{EQ_PRESETS[settings.equalizer.preset].label}</strong>
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-2">
              {presetKeys.map((presetId) => {
                const def = EQ_PRESETS[presetId];
                const isActive = settings.equalizer.preset === presetId;
                return (
                  <button
                    type="button"
                    key={presetId}
                    onClick={() => handleSelectPreset(presetId)}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap ${
                      isActive
                        ? 'bg-[#EF4444]/20 text-white border-[#EF4444] shadow-[0_0_14px_rgba(239,68,68,0.2)]'
                        : 'bg-[#141011] text-[#D0CBCC] border-white/[0.08] hover:text-white hover:border-white/20'
                    }`}
                  >
                    {def.label}
                  </button>
                );
              })}
            </div>

            {/* 5 Manual Sliders */}
            <div className="rounded-2xl bg-[#141011] border border-white/[0.08] p-4 space-y-3.5">
              {EQ_BANDS.map((band) => {
                const dbVal = settings.equalizer[band.key];
                const pct = ((dbVal + 12) / 24) * 100;
                return (
                  <div key={band.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-[#F4F1F1] tabular-nums">
                        {band.label}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          dbVal === 0
                            ? 'text-[#A39E9F]'
                            : dbVal > 0
                              ? 'text-[#FF443A]'
                              : 'text-[#D0CBCC]'
                        }`}
                      >
                        {formatDb(dbVal)}
                      </span>
                    </div>

                    <div className="relative h-7 flex items-center">
                      <div className="w-full h-1.5 rounded-full bg-white/12 overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-[#DC2626] to-[#FF443A] rounded-full transition-[width] duration-75"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                        style={{ left: `calc(${pct}% - ${(pct / 100) * 16}px)` }}
                      />
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={dbVal}
                        onChange={(e) =>
                          handleBandChange(band.key, parseFloat(e.target.value))
                        }
                        aria-label={`${band.label} equalizer gain in decibels`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
