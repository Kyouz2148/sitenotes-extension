import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXT_DIR = path.join(ROOT, 'extension');
const DIST_DIR = path.join(ROOT, 'dist');

const manifest = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'manifest.json'), 'utf8'));
const version = manifest.version;
const zipName = `sitenotes-v${version}.zip`;
const zipPath = path.join(DIST_DIR, zipName);

fs.mkdirSync(DIST_DIR, { recursive: true });
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: EXT_DIR });

const stats = fs.statSync(zipPath);
console.log(`Packaged ${zipPath} (${(stats.size / 1024).toFixed(1)} KB)`);
