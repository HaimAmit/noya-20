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

const used = [...new Set(STOPS.flatMap(s => s.photos || []))];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noya20-'));
const index = {}, blobs = [];
let offset = 0;
for (const name of used) {
  const out = path.join(tmp, name);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '66', '-Z', '1000', path.join('photos', name), '--out', out], { stdio: 'ignore' });
  const b = fs.readFileSync(out);
  index[name] = [offset, b.length];
  offset += b.length;
  blobs.push(b);
}

const json = Buffer.from(JSON.stringify({ content: { STOPS, MILESTONES, LETTER, JUMP_DATE }, index }));
const head = Buffer.alloc(4); head.writeUInt32BE(json.length);
const plain = Buffer.concat([head, json, ...blobs]);

const salt = crypto.getRandomValues(new Uint8Array(16));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const enc = async data => { const iv = crypto.getRandomValues(new Uint8Array(12)); return Buffer.concat([iv, new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data))]); };

fs.writeFileSync('check.bin', Buffer.concat([salt, await enc(new TextEncoder().encode('noya20'))]));
fs.writeFileSync('vault.bin', await enc(plain));
console.log(`vault.bin: ${used.length} photos, ${(fs.statSync('vault.bin').size / 1e6).toFixed(1)} MB`);
