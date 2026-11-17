import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeApkDownloadUrl, resolveApkDownloadConfig } from './apkDownload';

test('isSafeApkDownloadUrl accepts valid https or local .apk paths and rejects unsafe URLs', () => {
  assert.equal(isSafeApkDownloadUrl('https://github.com/user/spotitube/releases/download/v1/SpotiTube.apk'), true);
  assert.equal(isSafeApkDownloadUrl('/SpotiTube.apk'), true);
  assert.equal(isSafeApkDownloadUrl('/downloads/SpotiTube-release.apk'), true);
  assert.equal(isSafeApkDownloadUrl('http://insecure.example.com/app.apk'), false);
  assert.equal(isSafeApkDownloadUrl('javascript:alert(1)'), false);
  assert.equal(isSafeApkDownloadUrl('//evil.com/SpotiTube.apk'), false);
});

test('resolveApkDownloadConfig prioritizes valid configuredUrl, then localApkExists, else unavailable', () => {
  const withEnv = resolveApkDownloadConfig({
    configuredUrl: 'https://cdn.example.com/SpotiTube.apk',
    localApkExists: true
  });
  assert.equal(withEnv.available, true);
  assert.equal(withEnv.downloadUrl, 'https://cdn.example.com/SpotiTube.apk');

  const withLocal = resolveApkDownloadConfig({
    configuredUrl: '',
    localApkExists: true
  });
  assert.equal(withLocal.available, true);
  assert.equal(withLocal.downloadUrl, '/SpotiTube.apk');

  const unavailable = resolveApkDownloadConfig({
    configuredUrl: 'javascript:alert(1)',
    localApkExists: false
  });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.downloadUrl, null);
});
