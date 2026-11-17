import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNotificationPermissionState,
  shouldTriggerBackgroundNotification,
  shouldAutoPromptPermissionsOnEntry
} from './backgroundPermission.ts';

test('getNotificationPermissionState safely returns unsupported outside browser window', () => {
  assert.equal(getNotificationPermissionState(), 'unsupported');
});

test('shouldAutoPromptPermissionsOnEntry prompts once on first entry when permission is not granted', () => {
  assert.equal(
    shouldAutoPromptPermissionsOnEntry({
      alreadyPrompted: false,
      notificationPermission: 'default'
    }),
    true
  );
  assert.equal(
    shouldAutoPromptPermissionsOnEntry({
      alreadyPrompted: true,
      notificationPermission: 'default'
    }),
    false
  );
  assert.equal(
    shouldAutoPromptPermissionsOnEntry({
      alreadyPrompted: false,
      notificationPermission: 'granted'
    }),
    false
  );
});

test('shouldTriggerBackgroundNotification fires only when playing, hidden, and permission granted', () => {
  assert.equal(
    shouldTriggerBackgroundNotification({
      isPlaying: true,
      isDocumentHidden: true,
      permission: 'granted'
    }),
    true
  );
  assert.equal(
    shouldTriggerBackgroundNotification({
      isPlaying: true,
      isDocumentHidden: false,
      permission: 'granted'
    }),
    false
  );
  assert.equal(
    shouldTriggerBackgroundNotification({
      isPlaying: true,
      isDocumentHidden: true,
      permission: 'default'
    }),
    false
  );
  assert.equal(
    shouldTriggerBackgroundNotification({
      isPlaying: false,
      isDocumentHidden: true,
      permission: 'granted'
    }),
    false
  );
});
