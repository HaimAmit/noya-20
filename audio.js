window.Sound = (() => {
  const KEY = 'noya20-muted';
  let ctx, master, windGain, windFilter, raf, getState;
  let muted = localStorage.getItem(KEY) === '1';
  let lastY = 0, speed = 0, wasChute = false, wasLanded = false;

  const vibrate = p => navigator.vibrate && !muted && navigator.vibrate(p);

  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(3);
    src.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.Q.value = .7;
    windFilter.frequency.value = 600;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    src.connect(windFilter).connect(windGain).connect(master);
    src.start();
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    const st = getState();
    const dy = Math.abs(scrollY - lastY);
    lastY = scrollY;
    speed += (Math.min(dy, 60) - speed) * .08;
    const s = Math.min(speed / 25, 1);
    const t = ctx.currentTime;
    let g, f;
    if (st.landed || st.alt <= 0) { g = 0; f = 300; }
    else if (st.chute) { g = .03 + s * .07; f = 350 + s * 250; }
    else { g = .06 + s * .22; f = 500 + s * 900; }
    windGain.gain.setTargetAtTime(g, t, .15);
    windFilter.frequency.setTargetAtTime(f, t, .2);
    if (st.chute && !wasChute) pop();
    if (st.landed && !wasLanded) land();
    wasChute = st.chute;
    wasLanded = st.landed;
  }

  function pop() {
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(.4);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + .35);
    n.connect(lp).connect(g).connect(master); n.start(t); n.stop(t + .4);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + .3);
    og.gain.setValueAtTime(.7, t); og.gain.exponentialRampToValueAtTime(.001, t + .35);
    o.connect(og).connect(master); o.start(t); o.stop(t + .4);
    vibrate([70, 40, 140]);
  }

  function land() {
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((hz, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = hz;
      const s = t + .1 + i * .11;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.22, s + .02); g.gain.exponentialRampToValueAtTime(.001, s + .9);
      o.connect(g).connect(master); o.start(s); o.stop(s + 1);
    });
    vibrate([40, 30, 40, 30, 220]);
  }

  return {
    start(fn) {
      getState = fn;
      if (!ctx) init();
      ctx.resume();
      lastY = scrollY; speed = 0; wasChute = false; wasLanded = false;
      cancelAnimationFrame(raf); tick();
    },
    stop() {
      cancelAnimationFrame(raf);
      if (windGain) windGain.gain.setTargetAtTime(0, ctx.currentTime, .1);
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      localStorage.setItem(KEY, muted ? '1' : '0');
      if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, .05);
      return muted;
    },
  };
})();
