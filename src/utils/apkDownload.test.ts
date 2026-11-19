import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDirectApkHref,
  isApkHeadResponseValid,
  isSafeApkDownloadUrl,
  resolveApkDownloadConfig
} from './apkDownload';

test('isSafeApkDownloadUrl accepts valid https or local .apk paths and rejects unsafe URLs', () => {
  assert.equal(isSafeApkDownloadUrl('https://github.com/user/kiddwave/releases/download/v1/Kiddwave.apk'), true);
  assert.equal(isSafeApkDownloadUrl('/Kiddwave.apk'), true);
  assert.equal(isSafeApkDownloadUrl('/SpotiTube.apk'), true);
  assert.equal(isSafeApkDownloadUrl('/downloads/Kiddwave-release.apk'), true);
  assert.equal(isSafeApkDownloadUrl('/../secret/Kiddwave.apk'), false);
  assert.equal(isSafeApkDownloadUrl('http://insecure.example.com/app.apk'), false);
  assert.equal(isSafeApkDownloadUrl('javascript:alert(1)'), false);
  assert.equal(isSafeApkDownloadUrl('//evil.com/Kiddwave.apk'), false);
});

test('resolveApkDownloadConfig prioritizes valid configuredUrl, then localApkExists, else unavailable', () => {
  const withEnv = resolveApkDownloadConfig({
    configuredUrl: 'https://cdn.example.com/Kiddwave.apk',
    localApkExists: true
  });
  assert.equal(withEnv.available, true);
  assert.equal(withEnv.downloadUrl, 'https://cdn.example.com/Kiddwave.apk');

  const withLocal = resolveApkDownloadConfig({
    configuredUrl: '',
    localApkExists: true,
    sha256: 'abc123'
  });
  assert.equal(withLocal.available, true);
  assert.equal(withLocal.downloadUrl, '/Kiddwave.apk');
  assert.equal(withLocal.filename, 'Kiddwave.apk');
  assert.equal(withLocal.sha256, 'abc123');

  const unavailable = resolveApkDownloadConfig({
    configuredUrl: 'javascript:alert(1)',
    localApkExists: false
  });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.downloadUrl, null);
});

test('getDirectApkHref enforces safe fallback to /Kiddwave.apk', () => {
  assert.equal(getDirectApkHref({ downloadUrl: '/Kiddwave.apk' }), '/Kiddwave.apk');
  assert.equal(getDirectApkHref({ downloadUrl: 'https://kiddwave.netlify.app/Kiddwave.apk' }), 'https://kiddwave.netlify.app/Kiddwave.apk');
  assert.equal(getDirectApkHref({ downloadUrl: 'javascript:alert(1)' }), '/Kiddwave.apk');
  assert.equal(getDirectApkHref(null), '/Kiddwave.apk');
});

test('isApkHeadResponseValid distinguishes real APK binaries from HTML fallbacks', () => {
  assert.equal(
    isApkHeadResponseValid({
      ok: true,
      contentType: 'application/vnd.android.package-archive',
      contentLength: '3314475'
    }),
    true
  );
  assert.equal(
    isApkHeadResponseValid({
      ok: true,
      contentType: 'text/html; charset=utf-8',
      contentLength: '4500'
    }),
    false
  );
  assert.equal(
    isApkHeadResponseValid({
      ok: false,
      contentType: 'application/vnd.android.package-archive',
      contentLength: '3314475'
    }),
    false
  );
});
