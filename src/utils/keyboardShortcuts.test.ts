import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampSeekTime,
  isEditableElement,
  resolveGlobalMediaShortcut
} from './keyboardShortcuts';

test('isEditableElement detects input, textarea, select, and contentEditable elements', () => {
  assert.equal(isEditableElement({ tagName: 'INPUT' }), true);
  assert.equal(isEditableElement({ tagName: 'textarea' }), true);
  assert.equal(isEditableElement({ tagName: 'SELECT' }), true);
  assert.equal(isEditableElement({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditableElement({ tagName: 'DIV', getAttribute: () => 'searchbox' }), true);
  assert.equal(isEditableElement({ tagName: 'BODY' }), false);
  assert.equal(isEditableElement({ tagName: 'BUTTON' }), false);
});

test('resolveGlobalMediaShortcut maps Space, ArrowRight (+5s), and ArrowLeft (-5s) outside inputs', () => {
  assert.deepEqual(
    resolveGlobalMediaShortcut({ key: ' ', code: 'Space' }, { tagName: 'BODY' }),
    { type: 'toggle-play' }
  );
  assert.deepEqual(
    resolveGlobalMediaShortcut({ key: 'ArrowRight' }, { tagName: 'MAIN' }),
    { type: 'seek-delta', deltaSeconds: 5 }
  );
  assert.deepEqual(
    resolveGlobalMediaShortcut({ key: 'ArrowLeft' }, { tagName: 'DIV' }),
    { type: 'seek-delta', deltaSeconds: -5 }
  );
});

test('resolveGlobalMediaShortcut ignores inputs, modifiers, and repeated Space presses', () => {
  assert.equal(resolveGlobalMediaShortcut({ key: ' ', code: 'Space' }, { tagName: 'INPUT' }), null);
  assert.equal(resolveGlobalMediaShortcut({ key: 'ArrowRight' }, { tagName: 'INPUT' }), null);
  assert.equal(resolveGlobalMediaShortcut({ key: 'ArrowLeft' }, { tagName: 'TEXTAREA' }), null);
  assert.equal(
    resolveGlobalMediaShortcut({ key: ' ', code: 'Space', repeat: true }, { tagName: 'BODY' }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: ' ', code: 'Space', ctrlKey: true }, { tagName: 'BODY' }),
    null
  );
  assert.equal(
    resolveGlobalMediaShortcut({ key: 'ArrowRight', metaKey: true }, { tagName: 'BODY' }),
    null
  );
});

test('clampSeekTime clamps cleanly between 0 and track duration', () => {
  assert.equal(clampSeekTime(12, 5, 200), 17);
  assert.equal(clampSeekTime(197, 5, 200), 200);
  assert.equal(clampSeekTime(3, -5, 200), 0);
  assert.equal(clampSeekTime(10, -5, 0), 5);
});
