window.startApp = ({ STOPS, MILESTONES, LETTER, JUMP_DATE, PHOTOS }) => {
  const TOP = 2000;
  const $ = (s, el = document) => el.querySelector(s);
  const stopsEl = $('#stops');

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');

  STOPS.forEach((s, i) => {
    const alt = TOP - 50 - i * 100;
    const ms = MILESTONES.find(m => m.before === i);
    if (ms) stopsEl.insertAdjacentHTML('beforeend', milestoneHTML(ms));
    const photos = s.photos || [];
    const cls = ['', 'one', 'two', 'three'][Math.min(photos.length, 3)] || 'two';
    stopsEl.insertAdjacentHTML('beforeend', `
      <section class="stop" data-alt="${alt}">
        <article class="card">
          <div class="badge"><span class="n">${fmt(alt)} מ׳</span> · ${i + 1}/20</div>
          ${photos.length ? `<div class="photos ${cls}">${photos.map(p => `<img src="${PHOTOS[p]}" loading="lazy" alt="">`).join('')}</div>` : ''}
          <h3>${esc(s.title)}</h3>
          ${s.date ? `<div class="date">${esc(s.date)}</div>` : ''}
          <p>${esc(s.text)}</p>
          ${[].concat(s.quote || []).map(q => `<div class="quote">״${esc(q.text)}\u2060״<span class="who">— ${esc(q.who)}</span></div>`).join('')}
          ${s.quotes ? `<div class="bubbles">${s.quotesTitle ? `<div class="bubbles-title">${esc(s.quotesTitle)}</div>` : ''}${s.quotes.map(q => `<span class="bubble">${esc(q)}</span>`).join('')}</div>` : ''}
        </article>
      </section>`);
  });
  const tail = MILESTONES.find(m => m.before === STOPS.length);
  if (tail) stopsEl.insertAdjacentHTML('beforeend', milestoneHTML(tail));

  function milestoneHTML(m) {
    return `<section class="milestone" data-alt="${m.alt}"${m.chute ? ' data-chute' : ''}>
      <div class="inner"><div class="big">${esc(m.big)}</div><p>${esc(m.text)}</p></div></section>`;
  }

  $('#letter-body').innerHTML = LETTER.map(p => `<p>${esc(p)}</p>`).join('');

  const markers = [...document.querySelectorAll('[data-alt]')].map(el => ({ el, alt: +el.dataset.alt }));
  const chuteAlt = (MILESTONES.find(m => m.chute) || { alt: 1000 }).alt;

  const SKY = [[0, [15, 47, 102]], [.3, [37, 96, 184]], [.6, [79, 155, 224]], [.85, [159, 212, 243]], [1, [215, 240, 251]]];
  const skyColor = p => {
    for (let i = 1; i < SKY.length; i++) {
      if (p <= SKY[i][0]) {
        const [p0, c0] = SKY[i - 1], [p1, c1] = SKY[i];
        const t = (p - p0) / (p1 - p0);
        const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
        return c;
      }
    }
    return SKY[SKY.length - 1][1];
  };

  const cloudsEl = $('#clouds');
  const clouds = Array.from({ length: 10 }, () => {
    const el = document.createElement('div');
    el.className = 'cloud';
    const w = 120 + Math.random() * 160;
    el.style.width = w + 'px';
    el.style.height = w * .45 + 'px';
    [[0, .35, .5, .65], [.25, .1, .55, .9], [.55, .3, .45, .7]].forEach(([l, t, s, h]) => {
      const b = document.createElement('i');
      Object.assign(b.style, { left: l * 100 + '%', top: t * 100 + '%', width: s * 100 + '%', height: h * 100 + '%' });
      el.appendChild(b);
    });
    cloudsEl.appendChild(el);
    return { el, x: Math.random() * 100 - 10, y: Math.random(), speed: .35 + Math.random() * .9, s: .6 + Math.random() * .8 };
  });

  const altNum = $('#alt-num'), altFill = $('#alt-fill'), sky = $('#sky');

  function altitudeNow() {
    const ref = scrollY + innerHeight / 2;
    const pts = markers.map(m => ({ y: m.el.offsetTop + m.el.offsetHeight / 2, alt: m.alt }));
    if (ref <= pts[0].y) return pts[0].alt;
    for (let i = 1; i < pts.length; i++) {
      if (ref <= pts[i].y) {
        const t = (ref - pts[i - 1].y) / (pts[i].y - pts[i - 1].y);
        return pts[i - 1].alt + (pts[i].alt - pts[i - 1].alt) * t;
      }
    }
    return 0;
  }

  let ticking = false;
  function frame() {
    ticking = false;
    const alt = Math.max(0, altitudeNow());
    const p = 1 - alt / TOP;
    altNum.textContent = fmt(alt);
    altFill.style.transform = `scaleY(${alt / TOP})`;
    const c = skyColor(p);
    sky.style.background = `linear-gradient(rgb(${c.map(v => v * .9 | 0)}), rgb(${c}))`;
    document.body.classList.toggle('chute', alt <= chuteAlt);
    document.body.classList.toggle('landed', alt <= 0 && scrollY + innerHeight > $('#landing .letter').offsetTop + $('#landing').offsetTop + 200);
    const H = innerHeight + 300;
    const fade = alt < 120 ? alt / 120 : 1;
    clouds.forEach(cl => {
      const y = (((cl.y * H - scrollY * cl.speed) % H) + H) % H - 150;
      cl.el.style.transform = `translate3d(${cl.x}vw, ${y}px, 0) scale(${cl.s})`;
      cl.el.style.opacity = .85 * fade;
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: .25 });
  document.querySelectorAll('.card, .milestone .inner').forEach(el => io.observe(el));

  $('#jump').addEventListener('click', () => {
    document.body.classList.remove('locked');
    document.body.classList.add('flying');
    const first = $('.stop, .milestone');
    scrollTo({ top: first.offsetTop - innerHeight * .08, behavior: 'smooth' });
  });

  $('#again').addEventListener('click', () => {
    scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      document.body.classList.add('locked');
      document.body.classList.remove('flying', 'chute');
      document.querySelectorAll('.in').forEach(el => el.classList.remove('in'));
      landed = false;
    }, 900);
  });

  const jumpDay = new Date(JUMP_DATE + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((jumpDay - today) / 864e5);
  if (days > 1) { $('#cd-num').textContent = days; $('#cd-label').textContent = 'ימים לקפיצה האמיתית'; }
  else if (days === 1) { $('#cd-num').textContent = '1'; $('#cd-label').textContent = 'יום אחד לקפיצה! 😱'; }
  else if (days === 0) { $('#cd-num').textContent = '🪂'; $('#cd-label').textContent = 'היום קופצים!!!'; }
  else { $('#cd-num').textContent = '🦅'; $('#cd-label').textContent = 'קפצת. אנחנו כל כך גאים בך.'; }

  const cv = $('#confetti'), ctx = cv.getContext('2d');
  let parts = [], landed = false;
  function burst() {
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const cols = ['#ff4fa3', '#ffb13b', '#36d1c4', '#7b6cff', '#fff', '#7fcf6b'];
    parts = Array.from({ length: 180 }, () => ({
      x: innerWidth / 2, y: innerHeight * .55,
      vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 4,
      r: 4 + Math.random() * 5, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6, va: (Math.random() - .5) * .4
    }));
    requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
    parts = parts.filter(p => p.y < innerHeight + 30);
    if (parts.length) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !landed) { landed = true; burst(); }
  }), { threshold: .5 }).observe($('#landing .letter'));

  let taps = 0, tapT;
  $('#altimeter').addEventListener('click', () => {
    taps++; clearTimeout(tapT); tapT = setTimeout(() => taps = 0, 1200);
    if (taps < 5) return;
    taps = 0;
    for (let i = 0; i < 26; i++) {
      const t = document.createElement('div');
      t.className = 'tofu';
      t.textContent = ['🧊', '🥢', '🥗', '🌱', '🍜'][i % 5];
      t.style.left = Math.random() * 95 + 'vw';
      t.style.animationDuration = 2.2 + Math.random() * 2 + 's';
      t.style.animationDelay = Math.random() * 1.2 + 's';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 5000);
    }
  });
};
