import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_NOTE_ID,
  formatCompactPath,
  normalizeDomain,
  normalizePageUrl,
  parseTabContext,
} from '../extension/shared/url-utils.js';

test('normalizeDomain strips www and lowercases', () => {
  assert.equal(normalizeDomain('WWW.GitHub.COM'), 'github.com');
  assert.equal(normalizeDomain('docs.github.com'), 'docs.github.com');
  assert.equal(normalizeDomain(''), '');
});

test('normalizePageUrl removes tracking params and hashes while keeping meaningful query params', () => {
  const input = 'https://www.youtube.com/watch?v=abc123&utm_source=twitter&fbclid=xyz#t=10';
  assert.equal(normalizePageUrl(input), 'https://youtube.com/watch?v=abc123');
});

test('normalizePageUrl removes trailing slash on non-root paths', () => {
  assert.equal(
    normalizePageUrl('https://developer.chrome.com/docs/extensions/'),
    'https://developer.chrome.com/docs/extensions',
  );
  assert.equal(normalizePageUrl('https://example.com/'), 'https://example.com/');
});

test('parseTabContext rejects internal chrome:// pages gracefully', () => {
  const ctx = parseTabContext('chrome://extensions/', 'Extensions');
  assert.equal(ctx.isWebPage, false);
  assert.equal(ctx.pageId, '');
  assert.equal(ctx.domainId, '');
  assert.equal(ctx.globalId, GLOBAL_NOTE_ID);
});

test('parseTabContext builds consistent page and domain IDs for web pages', () => {
  const ctx = parseTabContext('https://www.npmjs.com/package/vite?utm_medium=email', 'vite - npm');
  assert.equal(ctx.isWebPage, true);
  assert.equal(ctx.domain, 'npmjs.com');
  assert.equal(ctx.pageId, 'page:https://npmjs.com/package/vite');
  assert.equal(ctx.domainId, 'domain:npmjs.com');
  assert.equal(ctx.title, 'vite - npm');
});

test('formatCompactPath extracts path and query', () => {
  assert.equal(formatCompactPath('https://example.com/'), '/');
  assert.equal(formatCompactPath('https://example.com/docs?q=test'), '/docs?q=test');
});
