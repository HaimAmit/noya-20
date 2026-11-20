(() => {
  const $ = s => document.querySelector(s);
  const form = $('#gate'), input = $('#pw'), msg = $('#gate-msg'), btn = $('#gate-btn');
  const KEY = 'noya20-pass';

  const normalize = raw => {
    let s = raw.trim().toLowerCase().replace(/[\s"'״׳.!?,🐶🐾]/g, '').replace(/ו+$/, 'ו');
    if (['מילו', 'מיילו', 'מיילוש', 'milo', 'mylo', 'mailo'].includes(s)) s = 'מיילו';
    return s;
  };

  let vaultP;
  const getVault = () => vaultP ||= fetch('vault.bin').then(r => r.arrayBuffer()).then(b => new Uint8Array(b)).catch(e => { vaultP = null; throw e; });
  getVault().catch(() => {});

  async function unlock(pass) {
    const buf = await getVault();
    const salt = buf.slice(0, 16), iv = buf.slice(16, 28), data = buf.slice(28);
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    const payload = JSON.parse(new TextDecoder().decode(plain));
    const PHOTOS = {};
    for (const [name, b64] of Object.entries(payload.photos)) {
      const bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      PHOTOS[name] = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    }
    return { ...payload.content, PHOTOS };
  }

  async function tryOpen(pass, silent) {
    btn.disabled = true;
    if (!silent) msg.textContent = 'בודקים כרטיס... 🔍';
    try {
      const data = await unlock(pass);
      localStorage.setItem(KEY, pass);
      form.hidden = true;
      msg.textContent = '';
      window.startApp(data);
      $('#jump').hidden = false;
      return true;
    } catch {
      if (!silent) {
        msg.textContent = 'לא נכון 🙃 רמז: יש לו 4 רגליים והוא הודף טילים';
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      }
      return false;
    } finally { btn.disabled = false; }
  }

  form.addEventListener('submit', e => { e.preventDefault(); tryOpen(normalize(input.value)); });
  const saved = localStorage.getItem(KEY);
  if (saved) tryOpen(saved, true);
})();
