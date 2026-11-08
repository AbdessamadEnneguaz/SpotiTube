import { test } from 'node:test';
import assert from 'node:assert';
import {
  addSearchTerm,
  removeSearchTerm,
  clearSearchTerms
} from './recentSearches.ts';

test('addSearchTerm prepends new query and trims whitespace', () => {
  const initial = ['toto', 'senhaji'];
  const updated = addSearchTerm(initial, '  7elmetado2  ');
  assert.deepStrictEqual(updated, ['7elmetado2', 'toto', 'senhaji']);
});

test('addSearchTerm ignores empty or whitespace-only queries', () => {
  const initial = ['toto'];
  assert.deepStrictEqual(addSearchTerm(initial, ''), ['toto']);
  assert.deepStrictEqual(addSearchTerm(initial, '    '), ['toto']);
});

test('addSearchTerm deduplicates case-insensitively and moves query to top', () => {
  const initial = ['7elmetado2', 'Said Senhaji', 'Cheb Khaled'];
  const updated = addSearchTerm(initial, 'said senhaji');
  assert.deepStrictEqual(updated, ['said senhaji', '7elmetado2', 'Cheb Khaled']);
});

test('addSearchTerm limits array length to maxItems', () => {
  const initial = ['1', '2', '3', '4', '5'];
  const updated = addSearchTerm(initial, 'new', 3);
  assert.deepStrictEqual(updated, ['new', '1', '2']);
  assert.strictEqual(updated.length, 3);
});

test('removeSearchTerm removes matching query case-insensitively', () => {
  const initial = ['7elmetado2', 'Said Senhaji', 'Cheb Khaled'];
  const updated = removeSearchTerm(initial, 'said senhaji');
  assert.deepStrictEqual(updated, ['7elmetado2', 'Cheb Khaled']);
});

test('removeSearchTerm leaves list unchanged if query is not present', () => {
  const initial = ['7elmetado2', 'Cheb Khaled'];
  const updated = removeSearchTerm(initial, 'NonExistent');
  assert.deepStrictEqual(updated, ['7elmetado2', 'Cheb Khaled']);
});

test('clearSearchTerms returns an empty array', () => {
  assert.deepStrictEqual(clearSearchTerms(), []);
});
