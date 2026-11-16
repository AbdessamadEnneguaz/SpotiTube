import React, { useState } from 'react';
import { X, Sliders, Sparkles, Volume2, Check, Radio } from 'lucide-react';
import { EqualizerSettings } from '../types/music';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EqualizerSettings;
  onUpdateSettings: (settings: EqualizerSettings) => void;
  audioQuality: 'normal' | 'high' | 'very_high_320k';
  onChangeAudioQuality: (q: 'normal' | 'high' | 'very_high_320k') => void;
  crossfade: number;
  onChangeCrossfade: (sec: number) => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  audioQuality,
  onChangeAudioQuality,
  crossfade,
  onChangeCrossfade
}) => {
  if (!isOpen) return null;

  const presets: { id: EqualizerSettings['preset']; name: string; values: [number, number, number, number, number] }[] = [
    { id: 'flat', name: 'Flat', values: [0, 0, 0, 0, 0] },
    { id: 'bass_boost', name: 'Bass Boost (Chaabi/Trap)', values: [7, 5, 1, 0, -1] },
    { id: 'acoustic', name: 'Acoustic / Live', values: [3, 2, 0, 3, 4] },
    { id: 'hip_hop', name: 'Hip-Hop & Drill', values: [6, 4, -1, 2, 3] },
    { id: 'vocal', name: 'Vocal / Rai Legends', values: [-2, 0, 4, 3, 1] },
    { id: 'electronic', name: 'Electronic Dance', values: [5, 3, 0, 2, 4] }
  ];

  const handlePresetSelect = (presetId: EqualizerSettings['preset']) => {
    const p = presets.find(x => x.id === presetId);
    if (p) {
      onUpdateSettings({
        preset: presetId,
        bass: p.values[0],
        midLow: p.values[1],
        mid: p.values[2],
        midHigh: p.values[3],
        treble: p.values[4]
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#181818] border border-neutral-700 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          aria-label="Close Equalizer"
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-10 h-10 rounded-full bg-[#1db954]/20 text-[#1db954] flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold">Audio Equalizer & Sound Quality</h2>
              <span className="text-[10px] bg-gradient-to-r from-amber-400 to-[#1db954] text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Premium
              </span>
            </div>
            <p className="text-xs text-neutral-400">Custom master output sound tuning & streaming bitrates</p>
          </div>
        </div>

        {/* Streaming Quality Selector (Premium Unlocked) */}
        <div className="bg-[#121212] p-3.5 sm:p-4 rounded-xl border border-neutral-800 mb-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Streaming Audio Quality
            </span>
            <span className="text-[11px] font-mono text-[#1db954] font-semibold">
              Lifetime Free Unlocked
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'normal', label: 'Normal (96k)' },
              { id: 'high', label: 'High (160k)' },
              { id: 'very_high_320k', label: 'Very High (320k)' }
            ].map(q => (
              <button
                key={q.id}
                onClick={() => onChangeAudioQuality(q.id as any)}
                className={`py-2 px-2 rounded-lg text-[11px] sm:text-xs font-semibold text-center border transition-all cursor-pointer ${
                  audioQuality === q.id
                    ? 'bg-[#1db954] text-black border-[#1db954] font-bold shadow-md'
                    : 'bg-neutral-800/60 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equalizer Presets Chips */}
        <div className="mb-5 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 block">
            Sound Presets
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  settings.preset === p.id
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 5-Band Slider Controls */}
        <div className="bg-[#121212] p-3.5 sm:p-4 rounded-xl border border-neutral-800 mb-5">
          <div className="grid grid-cols-5 gap-2 sm:gap-3 text-center">
            {[
              { label: '60 Hz', key: 'bass' as const, val: settings.bass },
              { label: '250 Hz', key: 'midLow' as const, val: settings.midLow },
              { label: '1 kHz', key: 'mid' as const, val: settings.mid },
              { label: '4 kHz', key: 'midHigh' as const, val: settings.midHigh },
              { label: '16 kHz', key: 'treble' as const, val: settings.treble }
            ].map(band => (
              <div key={band.key} className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-neutral-400 font-mono">
                  {band.val > 0 ? `+${band.val}` : band.val}dB
                </span>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={1}
                  value={band.val}
                  onChange={e => {
                    onUpdateSettings({
                      ...settings,
                      preset: 'flat',
                      [band.key]: parseInt(e.target.value, 10)
                    });
                  }}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  aria-label={`${band.label} equalizer band`}
                  className="h-24 sm:h-28 accent-[#1db954] cursor-pointer"
                />
                <span className="text-[10px] sm:text-[11px] font-bold text-neutral-300">{band.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Crossfade duration slider */}
        <div className="bg-[#121212] p-3.5 rounded-xl border border-neutral-800 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-white">Crossfade Songs</div>
            <div className="text-[11px] text-neutral-400">Seamless transition between tracks</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#1db954] w-6 text-right">{crossfade}s</span>
            <input
              type="range"
              min={0}
              max={12}
              value={crossfade}
              onChange={e => onChangeCrossfade(parseInt(e.target.value, 10))}
              className="w-28 accent-[#1db954] cursor-pointer"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs"
          >
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
};
