(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  const $ = s => document.querySelector(s);
  const form = $('#gate'), input = $('#pw'), msg = $('#gate-msg'), btn = $('#gate-btn');
  const KEY = 'noya20-pass';

  const normalize = raw => {
    let s = raw.trim().toLowerCase().replace(/[\s"'״׳.!?,🐶🐾]/g, '').replace(/ו+$/, 'ו');
    if (['מילו', 'מיילו', 'מיילוש', 'milo', 'mylo', 'mailo'].includes(s)) s = 'מיילו';
    return s;
  };

  const checkP = fetch('check.bin').then(r => r.arrayBuffer()).then(b => new Uint8Array(b));

  let progress = 0, onProgress = () => {};
  const vaultP = (async () => {
    const r = await fetch('vault.bin');
    const total = +r.headers.get('content-length') || 0;
    if (!r.body || !total) return new Uint8Array(await r.arrayBuffer());
    const reader = r.body.getReader(), out = new Uint8Array(total);
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out.set(value, got); got += value.length;
      progress = got / total; onProgress();
    }
    return got === total ? out : out.slice(0, got);
  })();
  vaultP.catch(() => {});

  async function deriveKey(pass, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  const dec = (key, buf) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));

  let busy = false;
  async function tryOpen(pass, silent) {
    if (busy) return;
    busy = true; btn.disabled = true;
    try {
      const check = await checkP;
      let key;
      try {
        key = await deriveKey(pass, check.slice(0, 16));
        await dec(key, check.slice(16));
      } catch {
        if (!silent) {
          msg.textContent = 'לא נכון 🙃 רמז: יש לו 4 רגליים והוא הודף טילים';
          form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        }
        return;
      }
      localStorage.setItem(KEY, pass);
      input.blur();
      const show = () => { msg.textContent = `נכון! 🎉 מתדלקים את המטוס... ${Math.round(progress * 100)}%`; };
      onProgress = show; show();
      const plain = new Uint8Array(await dec(key, await vaultP));
      const len = new DataView(plain.buffer).getUint32(0);
      const { content, index } = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + len)));
      const PHOTOS = {};
      for (const [name, [off, size]] of Object.entries(index)) {
        PHOTOS[name] = URL.createObjectURL(new Blob([plain.subarray(4 + len + off, 4 + len + off + size)], { type: 'image/jpeg' }));
      }
      form.hidden = true;
      msg.textContent = '';
      window.startApp({ ...content, PHOTOS });
      $('#jump').hidden = false;
      scrollTo(0, 0);
    } catch {
      msg.textContent = 'משהו השתבש בטעינה 😕 נסי לרענן את הדף';
    } finally {
      busy = false; btn.disabled = false; onProgress = () => {};
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); tryOpen(normalize(input.value)); });
  const saved = localStorage.getItem(KEY);
  if (saved) tryOpen(saved, true);
})();
