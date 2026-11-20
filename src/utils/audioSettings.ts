import {
  AudioSettings,
  CrossfadeSeconds,
  EqualizerPreset,
  EqualizerSettings,
} from '../types/music';
import { safeParseJson } from './security';

export const AUDIO_SETTINGS_STORAGE_KEY = 'kiddwave_audio_settings_v1';

export type EqBandKey =
  | 'band60Hz'
  | 'band230Hz'
  | 'band910Hz'
  | 'band3600Hz'
  | 'band14000Hz';

export interface EqBandDefinition {
  key: EqBandKey;
  frequency: number;
  label: string;
  filterType: BiquadFilterType;
  q: number;
}

export const EQ_BANDS: EqBandDefinition[] = [
  { key: 'band60Hz', frequency: 60, label: '60Hz', filterType: 'lowshelf', q: 0.7 },
  { key: 'band230Hz', frequency: 230, label: '230Hz', filterType: 'peaking', q: 1.0 },
  { key: 'band910Hz', frequency: 910, label: '910Hz', filterType: 'peaking', q: 1.0 },
  { key: 'band3600Hz', frequency: 3600, label: '3.6kHz', filterType: 'peaking', q: 1.0 },
  { key: 'band14000Hz', frequency: 14000, label: '14kHz', filterType: 'highshelf', q: 0.7 },
];

export interface EqPresetDefinition {
  id: EqualizerPreset;
  label: string;
  gains: Record<EqBandKey, number>;
}

export const EQ_PRESETS: Record<EqualizerPreset, EqPresetDefinition> = {
  flat: {
    id: 'flat',
    label: 'Flat',
    gains: { band60Hz: 0, band230Hz: 0, band910Hz: 0, band3600Hz: 0, band14000Hz: 0 },
  },
  bass_boost: {
    id: 'bass_boost',
    label: 'Bass Boost',
    gains: { band60Hz: 7.5, band230Hz: 4.5, band910Hz: 0, band3600Hz: 1, band14000Hz: 1.5 },
  },
  pop: {
    id: 'pop',
    label: 'Pop',
    gains: { band60Hz: 2, band230Hz: 1, band910Hz: 2.5, band3600Hz: 4, band14000Hz: 3 },
  },
  rock: {
    id: 'rock',
    label: 'Rock',
    gains: { band60Hz: 4.5, band230Hz: 2, band910Hz: -1, band3600Hz: 3.5, band14000Hz: 4.5 },
  },
  vocal: {
    id: 'vocal',
    label: 'Vocal',
    gains: { band60Hz: -3, band230Hz: -1, band910Hz: 4, band3600Hz: 5, band14000Hz: 2 },
  },
  electronic: {
    id: 'electronic',
    label: 'Electronic',
    gains: { band60Hz: 6, band230Hz: 2.5, band910Hz: -1.5, band3600Hz: 3.5, band14000Hz: 5.5 },
  },
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  normalizationEnabled: true,
  crossfadeSeconds: 0,
  equalizer: {
    preset: 'flat',
    ...EQ_PRESETS.flat.gains,
  },
};

export function clampEqDb(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(12, Math.max(-12, value)) * 10) / 10;
}

export function normalizeCrossfadeSeconds(value: unknown): CrossfadeSeconds {
  if (value === 2 || value === 4) return value;
  return 0;
}

export function applyEqPreset(
  current: EqualizerSettings,
  preset: EqualizerPreset
): EqualizerSettings {
  const def = EQ_PRESETS[preset] || EQ_PRESETS.flat;
  return {
    ...current,
    preset: def.id,
    band60Hz: def.gains.band60Hz,
    band230Hz: def.gains.band230Hz,
    band910Hz: def.gains.band910Hz,
    band3600Hz: def.gains.band3600Hz,
    band14000Hz: def.gains.band14000Hz,
  };
}

export function updateEqBand(
  current: EqualizerSettings,
  band: EqBandKey,
  dbValue: number
): EqualizerSettings {
  const next: EqualizerSettings = {
    ...current,
    [band]: clampEqDb(dbValue),
  };

  const matchingPreset = (Object.keys(EQ_PRESETS) as EqualizerPreset[]).find((presetId) => {
    const g = EQ_PRESETS[presetId].gains;
    return (
      Math.abs(next.band60Hz - g.band60Hz) < 0.05 &&
      Math.abs(next.band230Hz - g.band230Hz) < 0.05 &&
      Math.abs(next.band910Hz - g.band910Hz) < 0.05 &&
      Math.abs(next.band3600Hz - g.band3600Hz) < 0.05 &&
      Math.abs(next.band14000Hz - g.band14000Hz) < 0.05
    );
  });

  if (matchingPreset) {
    next.preset = matchingPreset;
  }
  return next;
}

export function sanitizeAudioSettings(raw: unknown): AudioSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_AUDIO_SETTINGS,
      equalizer: { ...DEFAULT_AUDIO_SETTINGS.equalizer },
    };
  }
  const obj = raw as Partial<AudioSettings>;
  const eqRaw = (obj.equalizer || {}) as Partial<EqualizerSettings>;
  const presetCandidate = eqRaw.preset;
  const preset: EqualizerPreset =
    presetCandidate && presetCandidate in EQ_PRESETS ? presetCandidate : 'flat';

  return {
    normalizationEnabled:
      typeof obj.normalizationEnabled === 'boolean'
        ? obj.normalizationEnabled
        : DEFAULT_AUDIO_SETTINGS.normalizationEnabled,
    crossfadeSeconds: normalizeCrossfadeSeconds(obj.crossfadeSeconds),
    equalizer: {
      preset,
      band60Hz: clampEqDb(Number(eqRaw.band60Hz ?? EQ_PRESETS[preset].gains.band60Hz)),
      band230Hz: clampEqDb(Number(eqRaw.band230Hz ?? EQ_PRESETS[preset].gains.band230Hz)),
      band910Hz: clampEqDb(Number(eqRaw.band910Hz ?? EQ_PRESETS[preset].gains.band910Hz)),
      band3600Hz: clampEqDb(Number(eqRaw.band3600Hz ?? EQ_PRESETS[preset].gains.band3600Hz)),
      band14000Hz: clampEqDb(Number(eqRaw.band14000Hz ?? EQ_PRESETS[preset].gains.band14000Hz)),
    },
  };
}

export function loadAudioSettings(): AudioSettings {
  try {
    if (typeof localStorage === 'undefined') return sanitizeAudioSettings(null);
    const raw = localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) return sanitizeAudioSettings(null);
    const parsed = safeParseJson<unknown>(raw, null);
    return sanitizeAudioSettings(parsed);
  } catch {
    return sanitizeAudioSettings(null);
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify(sanitizeAudioSettings(settings))
    );
  } catch {
    // Ignore storage quota errors cleanly
  }
}
