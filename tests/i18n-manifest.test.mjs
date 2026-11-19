import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TRANSLATIONS, t } from '../extension/shared/i18n.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXT_DIR = path.join(ROOT, 'extension');

test('manifest.json is valid MV3 and references existing files & icons', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.side_panel?.default_path);
  assert.ok(fs.existsSync(path.join(EXT_DIR, manifest.side_panel.default_path)));
  assert.ok(fs.existsSync(path.join(EXT_DIR, manifest.background.service_worker)));

  for (const iconPath of Object.values(manifest.icons)) {
    assert.ok(fs.existsSync(path.join(EXT_DIR, iconPath)), `Missing icon: ${iconPath}`);
  }
});

test('all _locales message files contain matching keys and valid Chrome Web Store description length', () => {
  const locales = ['en', 'pt_BR', 'pt'];
  const keySets = {};

  for (const locale of locales) {
    const file = path.join(EXT_DIR, '_locales', locale, 'messages.json');
    assert.ok(fs.existsSync(file), `Missing locale file: ${locale}`);
    const messages = JSON.parse(fs.readFileSync(file, 'utf8'));
    keySets[locale] = Object.keys(messages).sort();

    assert.ok(
      messages.extDescription.message.length <= 132,
      `${locale} extDescription exceeds 132 chars (${messages.extDescription.message.length})`,
    );
  }

  assert.deepEqual(keySets.pt_BR, keySets.en);
  assert.deepEqual(keySets.pt, keySets.en);
});

test('UI TRANSLATIONS dictionary has matching keys in English and Portuguese', () => {
  const enKeys = Object.keys(TRANSLATIONS.en).sort();
  const ptKeys = Object.keys(TRANSLATIONS.pt).sort();
  assert.deepEqual(ptKeys, enKeys);
  assert.equal(t('pt', 'tabAll', { count: 5 }), 'Todas (5)');
  assert.equal(t('en', 'tabAll', { count: 5 }), 'All Notes (5)');

  const html = fs.readFileSync(path.join(EXT_DIR, 'sidepanel', 'sidepanel.html'), 'utf8');
  const matches = [...html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)];
  for (const [, key] of matches) {
    assert.ok(key in TRANSLATIONS.en, `Missing i18n key referenced in HTML: ${key}`);
  }
});
