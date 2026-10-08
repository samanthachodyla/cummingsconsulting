// Cinematic hero: a slow dolly down a cold aisle — server racks, blinking LEDs,
// and cool air rising from perforated floor tiles. ~4 KB instead of a multi-MB video.
// Pauses when off-screen or the tab is hidden; draws one still frame for reduced motion.
(() => {
  const canvas = document.getElementById('aisle');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const W = 1, H = 1.1, D = 1.25, FAR = 34, SPEED = 0.32;
  let w, h, F, cx, cy, raf = 0, last = 0, t = 0, visible = true;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = Math.max(w * 0.42, h * 0.75);
    cx = w / 2; cy = h * 0.46;
  }
  const px = (x, z) => cx + (x / z) * F;
  const py = (y, z) => cy + (y / z) * F;
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const fog = z => Math.min(1, z / (FAR * 0.8));

  // cool-air particles
  const parts = Array.from({ length: 260 }, () => spawn({}, true));
  function spawn(p, anywhere) {
    p.x = (Math.random() * 2 - 1) * W * 0.85;
    p.y = anywhere ? Math.random() * 2 * H - H : H;
    p.z = anywhere ? 0.5 + Math.random() * FAR : 2 + Math.random() * (FAR - 2);
    p.vy = -(0.08 + Math.random() * 0.22);
    p.vz = -(0.15 + Math.random() * 0.35);
    return p;
  }

  function quad(a, b, c, d, fill) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  function frame(dt) {
    t += dt;
    const travel = t * SPEED, off = travel % D, base = Math.floor(travel / D);

    // backdrop + glow at the end of the aisle
    ctx.fillStyle = '#03090b'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    g.addColorStop(0, 'rgba(70,170,200,.38)'); g.addColorStop(0.25, 'rgba(20,70,90,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // floor tiles, with cold air glowing from the perforated centre strip
    const T = 0.62, toff = travel % T;
    for (let k = Math.ceil(FAR / T); k >= 0; k--) {
      const z0 = Math.max(0.2, k * T - toff), z1 = z0 + T;
      const f = fog(z0);
      quad([px(-W, z0), py(H, z0)], [px(W, z0), py(H, z0)], [px(W, z1), py(H, z1)], [px(-W, z1), py(H, z1)],
        `rgba(${18 - 10 * f},${30 - 12 * f},${34 - 10 * f},1)`);
      quad([px(-0.38, z0), py(H, z0)], [px(0.38, z0), py(H, z0)], [px(0.38, z1 - 0.05), py(H, z1 - 0.05)], [px(-0.38, z1 - 0.05), py(H, z1 - 0.05)],
        `rgba(80,190,230,${0.16 * (1 - f)})`);
      ctx.strokeStyle = `rgba(120,200,220,${0.12 * (1 - f)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px(-W, z0), py(H, z0)); ctx.lineTo(px(W, z0), py(H, z0)); ctx.stroke();
    }
    // ceiling + light fixtures
    quad([px(-W, 0.2), py(-H, 0.2)], [px(W, 0.2), py(-H, 0.2)], [px(W, FAR), py(-H, FAR)], [px(-W, FAR), py(-H, FAR)], '#05090b');
    const L = 2.5, loff = travel % L;
    for (let k = Math.ceil(FAR / L); k >= 0; k--) {
      const z0 = k * L - loff + 0.8; if (z0 < 0.3) continue;
      const a = 0.55 * (1 - fog(z0));
      quad([px(-0.12, z0), py(-H, z0)], [px(0.12, z0), py(-H, z0)], [px(0.12, z0 + 0.6), py(-H, z0 + 0.6)], [px(-0.12, z0 + 0.6), py(-H, z0 + 0.6)],
        `rgba(200,235,240,${a})`);
    }

    // racks, far to near
    for (let i = Math.ceil(FAR / D); i >= 0; i--) {
      const z0 = i * D - off, z1 = z0 + D * 0.94;
      if (z1 < 0.25) continue;
      const zz0 = Math.max(0.25, z0), f = fog(zz0), id = i + base;
      for (const s of [-1, 1]) {
        const shade = 16 + 14 * f;
        quad([px(s * W, zz0), py(-H, zz0)], [px(s * W, zz0), py(H, zz0)], [px(s * W, z1), py(H, z1)], [px(s * W, z1), py(-H, z1)],
          `rgb(${shade},${shade + 9},${shade + 13})`);
        // rack door edge + server-slot lines catch the aisle light
        ctx.strokeStyle = `rgba(140,200,215,${0.28 * (1 - f)})`; ctx.lineWidth = Math.max(0.5, (0.01 / zz0) * F);
        ctx.beginPath(); ctx.moveTo(px(s * W, z1), py(-H, z1)); ctx.lineTo(px(s * W, z1), py(H, z1)); ctx.stroke();
        ctx.strokeStyle = `rgba(140,200,215,${0.07 * (1 - f)})`; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 1; j < 14; j++) {
          const ly = -H + j * 0.145 + 0.1;
          ctx.moveTo(px(s * W, zz0), py(ly, zz0)); ctx.lineTo(px(s * W, z1), py(ly, z1));
        }
        ctx.stroke();
        // LEDs
        for (let j = 0; j < 14; j++) {
          const r = hash(id * 2 + (s > 0), j);
          if (r < 0.35) continue;
          const lz = z0 + 0.12 + r * (D * 0.75);
          if (lz < 0.3) continue;
          const on = Math.sin(t * (1 + r * 5) + r * 40) > -0.3;
          if (!on) continue;
          const ly = -H + 0.18 + j * 0.145;
          const a = (1 - fog(lz)) * (0.6 + 0.4 * r);
          const col = r > 0.93 ? `rgba(255,180,80,${a})` : r > 0.6 ? `rgba(90,220,160,${a})` : `rgba(90,190,255,${a})`;
          const rad = Math.max(0.7, (0.011 / lz) * F);
          ctx.fillStyle = col;
          ctx.fillRect(px(s * W, lz) - rad, py(ly, lz) - rad * 0.5, rad * 2, rad);
        }
      }
    }

    // cool air
    ctx.lineCap = 'round';
    for (const p of parts) {
      const z0 = p.z, y0 = p.y;
      p.z += p.vz * dt; p.y += p.vy * dt;
      if (p.z < 0.4 || p.y < -H * 0.6) { spawn(p, false); continue; }
      const a = (1 - fog(p.z)) * 0.75 * Math.min(1, (H - p.y) * 2);
      ctx.strokeStyle = `rgba(150,220,255,${a})`;
      ctx.lineWidth = Math.max(0.6, (0.012 / p.z) * F);
      ctx.beginPath(); ctx.moveTo(px(p.x, z0), py(y0, z0)); ctx.lineTo(px(p.x, p.z), py(p.y, p.z)); ctx.stroke();
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    frame(dt);
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  function start() { if (!raf && !still) { last = 0; raf = requestAnimationFrame(loop); } }

  resize();
  if (still) { t = 6; frame(0); }
  addEventListener('resize', () => { resize(); if (still) frame(0); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  start();
})();
