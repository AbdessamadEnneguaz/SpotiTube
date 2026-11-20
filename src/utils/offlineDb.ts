import { OfflineTrackMetadata, Track } from '../types/music';
import { resolveClientMirrorAudio } from './clientAudioResolver';
import { buildSignedAudioUrl, createSignedHeaders } from './requestSignature';

export const OFFLINE_DB_NAME = 'kiddwave_offline_db';
export const OFFLINE_DB_VERSION = 1;
export const OFFLINE_STORE_NAME = 'tracks';
export const DOWNLOAD_CHUNK_BYTES = 524_288; // Matches backend 512KB /api/audio chunk limit
export const MAX_OFFLINE_CHUNKS = 80; // Caps single track download at ~40MB

export interface OfflineTrackRecord extends OfflineTrackMetadata {
  audioBlob: Blob;
  coverBlob: Blob | null;
}

export interface OfflineStorageStats {
  trackCount: number;
  totalBytes: number;
  quotaBytes: number | null;
  usageBytes: number | null;
}

/**
 * Pure helper: parses total byte count from an HTTP Content-Range header,
 * e.g. "bytes 0-524287/3456789" -> 3456789. Returns null for unknown ("/*").
 */
export function parseContentRangeTotal(contentRange: string | null | undefined): number | null {
  if (!contentRange || typeof contentRange !== 'string') return null;
  const match = /bytes\s+\d+-\d+\/(\d+)/i.exec(contentRange.trim());
  if (!match) return null;
  const total = Number(match[1]);
  return Number.isFinite(total) && total > 0 ? total : null;
}

export function buildChunkByteRange(start: number, chunkBytes = DOWNLOAD_CHUNK_BYTES): string {
  const safeStart = Math.max(0, Math.floor(start));
  const safeEnd = safeStart + Math.max(1024, chunkBytes) - 1;
  return `bytes=${safeStart}-${safeEnd}`;
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function computeOfflineStorageSummary(records: Pick<OfflineTrackMetadata, 'sizeBytes' | 'coverSizeBytes'>[]): {
  trackCount: number;
  totalBytes: number;
} {
  let totalBytes = 0;
  for (const r of records) {
    totalBytes += Math.max(0, Number(r.sizeBytes) || 0) + Math.max(0, Number(r.coverSizeBytes) || 0);
  }
  return {
    trackCount: records.length,
    totalBytes,
  };
}

function openOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'youtubeId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open offline DB'));
  });
}

async function fetchBackendCompleteAudioBlob(
  youtubeId: string,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const sigHeaders = await createSignedHeaders('/api/audio', youtubeId);
    const probeRes = await fetch(`/api/audio?v=${encodeURIComponent(youtubeId)}&probe=1`, {
      headers: sigHeaders,
      signal: AbortSignal.timeout(4000),
    });
    if (!probeRes.ok) return null;
    const probeJson = (await probeRes.json()) as { available?: boolean; mimeType?: string | null };
    if (!probeJson?.available) return null;

    const mimeType = probeJson.mimeType || 'audio/mp4';
    const chunks: Blob[] = [];
    let offset = 0;
    let totalBytes: number | null = null;

    for (let iter = 0; iter < MAX_OFFLINE_CHUNKS; iter += 1) {
      // Freshly sign every chunk so long downloads never fail the ±120s window
      const signedUrl = await buildSignedAudioUrl(youtubeId);
      const res = await fetch(signedUrl, {
        headers: {
          Range: buildChunkByteRange(offset, DOWNLOAD_CHUNK_BYTES),
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok && res.status !== 206) {
        if (chunks.length === 0) return null;
        break;
      }

      const contentRange = res.headers.get('content-range');
      const parsedTotal = parseContentRangeTotal(contentRange);
      if (parsedTotal !== null) {
        totalBytes = parsedTotal;
      }

      const chunkBlob = await res.blob();
      if (!chunkBlob || chunkBlob.size === 0) break;

      chunks.push(chunkBlob);
      offset += chunkBlob.size;

      if (totalBytes && totalBytes > 0) {
        onProgress?.(Math.min(95, Math.round((offset / totalBytes) * 95)));
        if (offset >= totalBytes) break;
      } else {
        onProgress?.(Math.min(85, 15 + iter * 10));
        if (res.status === 200 || chunkBlob.size < DOWNLOAD_CHUNK_BYTES) {
          break;
        }
      }
    }

    if (chunks.length === 0) return null;
    const completeBlob = new Blob(chunks, { type: mimeType });
    if (completeBlob.size < 1024) return null;
    return { blob: completeBlob, mimeType };
  } catch {
    return null;
  }
}

async function fetchMirrorCompleteAudioBlob(
  youtubeId: string,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const mirror = await resolveClientMirrorAudio(youtubeId);
    if (!mirror?.url) return null;

    onProgress?.(20);
    const res = await fetch(mirror.url, {
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size < 1024) return null;
    onProgress?.(90);
    return {
      blob,
      mimeType: blob.type || mirror.mimeType || 'audio/mp4',
    };
  } catch {
    return null;
  }
}

async function fetchCoverBlobSafe(track: Track): Promise<Blob | null> {
  const candidates = [
    track.thumbnail,
    `https://i.ytimg.com/vi/${track.youtubeId}/mqdefault.jpg`,
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const b = await res.blob();
        if (b && b.size > 0) return b;
      }
    } catch {
      // Ignore CORS-blocked cover fetches cleanly
    }
  }
  return null;
}

export async function saveTrackOffline(
  track: Track,
  onProgress?: (percent: number) => void
): Promise<OfflineTrackMetadata> {
  if (!track || !track.youtubeId) {
    throw new Error('Track has no valid media ID.');
  }

  // Return existing record immediately if already saved
  const existing = await getOfflineTrackRecord(track.youtubeId);
  if (existing && existing.audioBlob && existing.audioBlob.size > 1024) {
    onProgress?.(100);
    return {
      youtubeId: existing.youtubeId,
      track: existing.track,
      mimeType: existing.mimeType,
      sizeBytes: existing.sizeBytes,
      coverSizeBytes: existing.coverSizeBytes,
      savedAt: existing.savedAt,
    };
  }

  onProgress?.(5);
  const downloaded =
    (await fetchBackendCompleteAudioBlob(track.youtubeId, onProgress)) ||
    (await fetchMirrorCompleteAudioBlob(track.youtubeId, onProgress));

  if (!downloaded) {
    throw new Error('Offline audio download unavailable for this stream.');
  }

  const coverBlob = await fetchCoverBlobSafe(track);
  onProgress?.(98);

  const record: OfflineTrackRecord = {
    youtubeId: track.youtubeId,
    track,
    audioBlob: downloaded.blob,
    mimeType: downloaded.mimeType,
    coverBlob,
    sizeBytes: downloaded.blob.size,
    coverSizeBytes: coverBlob ? coverBlob.size : 0,
    savedAt: Date.now(),
  };

  const db = await openOfflineDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    tx.objectStore(OFFLINE_STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to write offline track'));
  });
  db.close();

  onProgress?.(100);
  return {
    youtubeId: record.youtubeId,
    track: record.track,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    coverSizeBytes: record.coverSizeBytes,
    savedAt: record.savedAt,
  };
}

export async function getOfflineTrackRecord(
  youtubeId: string
): Promise<OfflineTrackRecord | null> {
  if (!youtubeId || typeof indexedDB === 'undefined') return null;
  try {
    const db = await openOfflineDatabase();
    const record = await new Promise<OfflineTrackRecord | null>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
      const req = tx.objectStore(OFFLINE_STORE_NAME).get(youtubeId);
      req.onsuccess = () => resolve((req.result as OfflineTrackRecord | undefined) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record || !record.track || typeof record.track !== 'object') {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

export async function listOfflineTracks(): Promise<OfflineTrackMetadata[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await openOfflineDatabase();
    const records = await new Promise<OfflineTrackRecord[]>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
      const req = tx.objectStore(OFFLINE_STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as OfflineTrackRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    return records
      .filter((r) => Boolean(r && r.youtubeId && r.track && typeof r.track === 'object' && r.track.id))
      .map((r) => ({
        youtubeId: r.youtubeId,
        track: r.track,
        mimeType: r.mimeType || 'audio/mp4',
        sizeBytes: Number(r.sizeBytes) || 0,
        coverSizeBytes: Number(r.coverSizeBytes) || 0,
        savedAt: Number(r.savedAt) || 0,
      }))
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function deleteOfflineTrack(youtubeId: string): Promise<void> {
  if (!youtubeId || typeof indexedDB === 'undefined') return;
  try {
    const db = await openOfflineDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
      tx.objectStore(OFFLINE_STORE_NAME).delete(youtubeId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore DB errors
  }
}

export async function clearAllOfflineTracks(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openOfflineDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
      tx.objectStore(OFFLINE_STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore DB errors
  }
}

export async function getOfflineStorageStats(
  knownMetadata?: OfflineTrackMetadata[]
): Promise<OfflineStorageStats> {
  const list = knownMetadata || (await listOfflineTracks());
  const summary = computeOfflineStorageSummary(list);

  let quotaBytes: number | null = null;
  let usageBytes: number | null = null;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      if (typeof estimate.quota === 'number') quotaBytes = estimate.quota;
      if (typeof estimate.usage === 'number') usageBytes = estimate.usage;
    }
  } catch {
    // ignore unsupported estimate()
  }

  return {
    trackCount: summary.trackCount,
    totalBytes: summary.totalBytes,
    quotaBytes,
    usageBytes,
  };
}
