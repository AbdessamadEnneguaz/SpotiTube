import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildChunkByteRange,
  computeOfflineStorageSummary,
  formatStorageBytes,
  parseContentRangeTotal,
} from './offlineDb';

test('parseContentRangeTotal extracts total byte size from HTTP 206 Content-Range headers', () => {
  assert.equal(parseContentRangeTotal('bytes 0-524287/3840120'), 3840120);
  assert.equal(parseContentRangeTotal('bytes 524288-1048575/*'), null);
  assert.equal(parseContentRangeTotal(undefined), null);
});

test('buildChunkByteRange generates aligned 512KB byte ranges', () => {
  assert.equal(buildChunkByteRange(0), 'bytes=0-524287');
  assert.equal(buildChunkByteRange(524288), 'bytes=524288-1048575');
});

test('computeOfflineStorageSummary and formatStorageBytes summarize disk footprint cleanly', () => {
  const summary = computeOfflineStorageSummary([
    { sizeBytes: 3_145_728, coverSizeBytes: 51_200 },
    { sizeBytes: 4_194_304, coverSizeBytes: 48_800 },
  ]);
  assert.equal(summary.trackCount, 2);
  assert.equal(summary.totalBytes, 7_440_032);
  assert.equal(formatStorageBytes(summary.totalBytes), '7.1 MB');
  assert.equal(formatStorageBytes(0), '0 MB');
});
