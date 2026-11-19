import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareSemver,
  detectAndroidApkEnv,
  isNewerApkVersion,
  parseApkVersionManifest,
  parseSemver,
  shouldShowApkUpdateBanner
} from './apkUpdate';

test('parseSemver and compareSemver accurately order semantic versions', () => {
  assert.deepEqual(parseSemver('1.2.1'), [1, 2, 1]);
  assert.deepEqual(parseSemver('v2.0.3-beta'), [2, 0, 3]);
  assert.equal(parseSemver('invalid'), null);

  assert.equal(compareSemver('1.2.1', '1.0.0'), 1);
  assert.equal(compareSemver('2.0.0', '1.9.9'), 1);
  assert.equal(compareSemver('1.2.1', '1.2.1'), 0);
  assert.equal(compareSemver('1.1.0', '1.2.0'), -1);

  assert.equal(isNewerApkVersion('1.0.0', '1.2.1'), true);
  assert.equal(isNewerApkVersion('1.2.1', '1.2.1'), false);
  assert.equal(isNewerApkVersion('1.3.0', '1.2.1'), false);
});

test('detectAndroidApkEnv detects wrapper via KiddwaveAndroid bridge, legacy bridge, or User-Agent', () => {
  assert.deepEqual(
    detectAndroidApkEnv({ userAgent: 'Mozilla/5.0 Chrome/126.0 Mobile' }),
    { isAndroidWrapper: false, installedVersion: null }
  );

  assert.deepEqual(
    detectAndroidApkEnv({
      userAgent: 'Mozilla/5.0 Chrome/126.0 KiddwaveAndroid/1.2.1'
    }),
    { isAndroidWrapper: true, installedVersion: '1.2.1' }
  );

  assert.deepEqual(
    detectAndroidApkEnv({
      kiddwaveBridge: { getAppVersion: () => '1.1.0' }
    }),
    { isAndroidWrapper: true, installedVersion: '1.1.0' }
  );

  assert.deepEqual(
    detectAndroidApkEnv({
      legacyBridge: {}
    }),
    { isAndroidWrapper: true, installedVersion: '1.0.0' }
  );
});

test('parseApkVersionManifest validates version format and safe APK URL', () => {
  const valid = parseApkVersionManifest({
    latestApkVersion: '1.3.0',
    apkDownloadUrl: '/Kiddwave.apk',
    releaseNotes: 'Performance improvements and native wrapper updates.'
  });
  assert.deepEqual(valid, {
    latestApkVersion: '1.3.0',
    apkDownloadUrl: '/Kiddwave.apk',
    releaseNotes: 'Performance improvements and native wrapper updates.'
  });

  assert.equal(
    parseApkVersionManifest({
      latestApkVersion: '1.3.0',
      apkDownloadUrl: 'javascript:alert(1)'
    }),
    null
  );
  assert.equal(
    parseApkVersionManifest({
      latestApkVersion: 'not-a-version',
      apkDownloadUrl: '/Kiddwave.apk'
    }),
    null
  );
});

test('shouldShowApkUpdateBanner triggers only inside Android APK when newer and not dismissed', () => {
  const manifest = {
    latestApkVersion: '1.3.0',
    apkDownloadUrl: '/Kiddwave.apk',
    releaseNotes: 'Faster background audio.'
  };

  assert.equal(
    shouldShowApkUpdateBanner({
      isAndroidWrapper: true,
      installedVersion: '1.2.1',
      manifest,
      dismissedVersion: null
    }),
    true
  );

  assert.equal(
    shouldShowApkUpdateBanner({
      isAndroidWrapper: false,
      installedVersion: null,
      manifest,
      dismissedVersion: null
    }),
    false
  );

  assert.equal(
    shouldShowApkUpdateBanner({
      isAndroidWrapper: true,
      installedVersion: '1.3.0',
      manifest,
      dismissedVersion: null
    }),
    false
  );

  assert.equal(
    shouldShowApkUpdateBanner({
      isAndroidWrapper: true,
      installedVersion: '1.2.1',
      manifest,
      dismissedVersion: '1.3.0'
    }),
    false
  );
});
