import test from 'node:test';
import assert from 'node:assert/strict';
import { noteToMarkdown, slugifyFilename } from '../extension/shared/markdown.js';
import { isNoteEmpty, validateAndMergeBackup } from '../extension/shared/storage.js';

test('noteToMarkdown formats metadata, body, and checklist items', () => {
  const md = noteToMarkdown({
    title: 'API Docs',
    scope: 'page',
    url: 'https://example.com/api',
    domain: 'example.com',
    updatedAt: 1700000000000,
    content: 'Check rate limits.',
    checklist: [
      { id: '1', text: 'Read auth section', done: true },
      { id: '2', text: 'Test webhook', done: false },
    ],
  });

  assert.match(md, /^# API Docs/m);
  assert.match(md, /\*\*Source:\*\* https:\/\/example\.com\/api/);
  assert.match(md, /Check rate limits\./);
  assert.match(md, /- \[x\] Read auth section/);
  assert.match(md, /- \[ \] Test webhook/);
});

test('slugifyFilename strips accents and special characters', () => {
  assert.equal(slugifyFilename('Anotações: Página Principal!'), 'anotacoes-pagina-principal');
  assert.equal(slugifyFilename(''), 'sitenotes');
});

test('isNoteEmpty detects empty notes properly', () => {
  assert.equal(isNoteEmpty({ content: '   ', checklist: [] }), true);
  assert.equal(isNoteEmpty({ content: 'Hello', checklist: [] }), false);
  assert.equal(isNoteEmpty({ content: '', checklist: [{ id: '1', text: 'Task', done: false }] }), false);
});

test('validateAndMergeBackup imports newer notes and rejects invalid payloads', () => {
  assert.throws(() => validateAndMergeBackup({ invalid: true }), /Invalid backup/);

  const existing = {
    'domain:example.com': {
      id: 'domain:example.com',
      scope: 'domain',
      domain: 'example.com',
      content: 'Old content',
      checklist: [],
      updatedAt: 1000,
    },
  };

  const backup = {
    notes: {
      'domain:example.com': {
        id: 'domain:example.com',
        scope: 'domain',
        domain: 'example.com',
        content: 'Newer content',
        checklist: [{ id: 'a', text: 'Verify', done: true }],
        updatedAt: 2000,
      },
      'page:https://a.com/': {
        id: 'page:https://a.com/',
        scope: 'page',
        url: 'https://a.com/',
        domain: 'a.com',
        content: 'Note A',
        checklist: [],
        updatedAt: 1500,
      },
    },
  };

  const result = validateAndMergeBackup(backup, existing);
  assert.equal(result.importedCount, 2);
  assert.equal(result.notes['domain:example.com'].content, 'Newer content');
  assert.equal(result.notes['page:https://a.com/'].content, 'Note A');
});
