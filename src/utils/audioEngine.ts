import { AudioSettings } from '../types/music';
import { EQ_BANDS } from './audioSettings';

export function canRouteThroughWebAudio(
  srcUrl: string | null | undefined,
  currentOrigin?: string
): boolean {
  if (!srcUrl || typeof srcUrl !== 'string') return false;
  const trimmed = srcUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  if (currentOrigin) {
    try {
      const parsed = new URL(trimmed, currentOrigin);
      return parsed.origin === currentOrigin;
    } catch {
      return false;
    }
  }
  return false;
}

interface AttachedDeck {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

/**
 * Manages the Web Audio API mastering pipeline for Kiddwave:
 * 5-band Equalizer (BiquadFilterNode) -> Loudness Normalization (DynamicsCompressorNode + makeup gain)
 * -> Master GainNode -> AudioContext destination.
 */
export class KiddwaveAudioEngine {
  private ctx: AudioContext | null = null;
  private eqNodes: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode | null = null;
  private makeupGainNode: GainNode | null = null;
  private eqInputNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private decks = new WeakMap<HTMLAudioElement, AttachedDeck>();
  private currentSettings: AudioSettings | null = null;
  private isWebAudioBroken = false;

  private ensureGraph(): boolean {
    if (this.isWebAudioBroken || typeof window === 'undefined') return false;
    if (this.ctx && this.ctx.state !== 'closed') return true;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      this.isWebAudioBroken = true;
      return false;
    }

    try {
      const ctx = new AudioCtx();
      const inputGain = ctx.createGain();
      inputGain.gain.value = 1;

      const bands: BiquadFilterNode[] = EQ_BANDS.map((def) => {
        const filter = ctx.createBiquadFilter();
        filter.type = def.filterType;
        filter.frequency.value = def.frequency;
        filter.Q.value = def.q;
        filter.gain.value = 0;
        return filter;
      });

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.22;

      const makeupGain = ctx.createGain();
      makeupGain.gain.value = 1.28;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;

      // Chain: eqInput -> band0 -> ... -> band4 -> compressor -> makeupGain -> masterGain -> destination
      let prev: AudioNode = inputGain;
      for (const band of bands) {
        prev.connect(band);
        prev = band;
      }
      prev.connect(compressor);
      compressor.connect(makeupGain);
      makeupGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      this.ctx = ctx;
      this.eqInputNode = inputGain;
      this.eqNodes = bands;
      this.compressorNode = compressor;
      this.makeupGainNode = makeupGain;
      this.masterGainNode = masterGain;

      if (this.currentSettings) {
        this.applySettings(this.currentSettings);
      }

      return true;
    } catch {
      this.isWebAudioBroken = true;
      return false;
    }
  }

  public attachDeck(element: HTMLAudioElement | null, initialGain = 1): GainNode | null {
    if (!element) return null;
    const existing = this.decks.get(element);
    if (existing) {
      return existing.gain;
    }
    if (!this.ensureGraph() || !this.ctx || !this.eqInputNode) {
      return null;
    }

    try {
      const source = this.ctx.createMediaElementSource(element);
      const gain = this.ctx.createGain();
      gain.gain.value = initialGain;
      source.connect(gain);
      gain.connect(this.eqInputNode);

      this.decks.set(element, { element, source, gain });
      return gain;
    } catch {
      return null;
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setDeckGain(element: HTMLAudioElement | null, gainValue: number): boolean {
    if (!element) return false;
    const attached = this.decks.get(element);
    if (!attached || !this.ctx) return false;
    const clamped = Math.min(1, Math.max(0, Number.isFinite(gainValue) ? gainValue : 1));
    try {
      attached.gain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
      return true;
    } catch {
      attached.gain.gain.value = clamped;
      return true;
    }
  }

  public applySettings(settings: AudioSettings): void {
    this.currentSettings = settings;
    if (!this.ctx || this.ctx.state === 'closed') return;

    const now = this.ctx.currentTime;

    EQ_BANDS.forEach((def, idx) => {
      const node = this.eqNodes[idx];
      if (!node) return;
      const gainDb = settings.equalizer[def.key] ?? 0;
      try {
        node.gain.setTargetAtTime(gainDb, now, 0.02);
      } catch {
        node.gain.value = gainDb;
      }
    });

    if (this.compressorNode && this.makeupGainNode) {
      if (settings.normalizationEnabled) {
        try {
          this.compressorNode.threshold.setTargetAtTime(-18, now, 0.03);
          this.compressorNode.knee.setTargetAtTime(18, now, 0.03);
          this.compressorNode.ratio.setTargetAtTime(4, now, 0.03);
          this.makeupGainNode.gain.setTargetAtTime(1.28, now, 0.03);
        } catch {
          this.compressorNode.threshold.value = -18;
          this.compressorNode.ratio.value = 4;
          this.makeupGainNode.gain.value = 1.28;
        }
      } else {
        // Transparent bypass: 1:1 ratio and 0 dB threshold leave signal untouched
        try {
          this.compressorNode.threshold.setTargetAtTime(0, now, 0.03);
          this.compressorNode.knee.setTargetAtTime(0, now, 0.03);
          this.compressorNode.ratio.setTargetAtTime(1, now, 0.03);
          this.makeupGainNode.gain.setTargetAtTime(1.0, now, 0.03);
        } catch {
          this.compressorNode.threshold.value = 0;
          this.compressorNode.ratio.value = 1;
          this.makeupGainNode.gain.value = 1.0;
        }
      }
    }
  }

  public getIsWebAudioActive(element: HTMLAudioElement | null): boolean {
    if (!element || this.isWebAudioBroken) return false;
    return this.decks.has(element);
  }

  public dispose(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.eqNodes = [];
    this.compressorNode = null;
    this.makeupGainNode = null;
    this.eqInputNode = null;
    this.masterGainNode = null;
  }
}

export const sharedAudioEngine = new KiddwaveAudioEngine();
