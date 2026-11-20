import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';

const pass = process.argv[2];
if (!pass) { console.error('usage: node build.mjs <password>'); process.exit(1); }

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('content.js', 'utf8'), ctx);
const { STOPS, MILESTONES, LETTER, JUMP_DATE } = ctx.window;

const used = new Set(STOPS.flatMap(s => s.photos || []));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noya20-'));
const photos = {};
for (const name of used) {
  const out = path.join(tmp, name);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '-Z', '1100', path.join('photos', name), '--out', out], { stdio: 'ignore' });
  photos[name] = fs.readFileSync(out).toString('base64');
}

const plain = new TextEncoder().encode(JSON.stringify({ content: { STOPS, MILESTONES, LETTER, JUMP_DATE }, photos }));
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
fs.writeFileSync('vault.bin', Buffer.concat([salt, iv, enc]));
console.log(`vault.bin: ${used.size} photos, ${(fs.statSync('vault.bin').size / 1e6).toFixed(1)} MB`);
