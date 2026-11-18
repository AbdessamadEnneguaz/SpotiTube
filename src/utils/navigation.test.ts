import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_ROUTE,
  pushRoute,
  popRoute,
  canGoBackFromRoute,
  RouteEntry
} from './navigation';

test('pushRoute appends current route and avoids duplicate top entries', () => {
  const start = { history: [] as RouteEntry[], current: INITIAL_ROUTE };
  const s1 = pushRoute(start.history, start.current, { view: 'countries', playlistId: null });
  assert.equal(s1.current.view, 'countries');
  assert.equal(s1.history.length, 1);
  assert.equal(s1.history[0].view, 'home');

  // Navigating to same route is a no-op
  const s1Dup = pushRoute(s1.history, s1.current, { view: 'countries', playlistId: null });
  assert.equal(s1Dup.history.length, 1);

  const s2 = pushRoute(s1.history, s1.current, { view: 'search', playlistId: null });
  assert.equal(s2.current.view, 'search');
  assert.equal(s2.history.length, 2);
});

test('popRoute steps back through history and returns to home cleanly', () => {
  const s1 = pushRoute([], INITIAL_ROUTE, { view: 'mixes', playlistId: null });
  const s2 = pushRoute(s1.history, s1.current, { view: 'playlist', playlistId: 'playlist_africa_pulse' });
  assert.equal(canGoBackFromRoute(s2.history, s2.current), true);

  const back1 = popRoute(s2.history, s2.current);
  assert.equal(back1.current.view, 'mixes');
  assert.equal(back1.current.playlistId, null);
  assert.equal(back1.history.length, 1);

  const back2 = popRoute(back1.history, back1.current);
  assert.equal(back2.current.view, 'home');
  assert.equal(back2.history.length, 0);
  assert.equal(canGoBackFromRoute(back2.history, back2.current), false);
});

test('popRoute resets non-home root route with empty history back to home', () => {
  const res = popRoute([], { view: 'charts', playlistId: null });
  assert.equal(res.current.view, 'home');
  assert.equal(canGoBackFromRoute(res.history, res.current), false);
});
