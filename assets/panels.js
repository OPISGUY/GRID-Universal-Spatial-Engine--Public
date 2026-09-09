/**
 * Four small animated panels, one per capability.
 *
 * Canvas 2D rather than WebGL: they are diagrams, not scenes, and four more
 * WebGL contexts alongside the hero is a cost with nothing to show for it.
 *
 * Each is an honest abstraction of a mechanism — a quadtree resolving, water
 * finding a level, a crowd through a bottleneck, a route around obstacles.
 * None of them depicts real data, and none is presented as doing so.
 */
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

function palette() {
  const s = getComputedStyle(document.documentElement);
  const v = (n, f) => (s.getPropertyValue(n).trim() || f);
  return {
    ink: v('--ink', '#eef3f5'),
    dim: v('--ink-3', '#5f6f7b'),
    rule: v('--line-2', '#2b3742'),
    hot: v('--signal', '#ffb020'),
    cool: v('--data', '#4fc9d9'),
    bg: v('--void', '#06080a'),
  };
}

/* ── addressing: a quadtree resolving to one cell ─────────────────────── */
function addressing(ctx, w, h, t, p) {
  const pad = Math.min(w, h) * 0.12;
  const size = Math.min(w, h) - pad * 2;
  const ox = (w - size) / 2, oy = (h - size) / 2;

  // which quadrant is chosen at each depth — stable per cycle, not per frame
  const cycle = Math.floor(t / 5200);
  const rnd = (i) => { const x = Math.sin(cycle * 97.13 + i * 41.7) * 43758.5453; return x - Math.floor(x); };
  const phase = ((t % 5200) / 5200) * 4;      // 0..4 across the cycle

  let x = ox, y = oy, s = size;
  ctx.lineWidth = 1;
  for (let d = 0; d < 4; d++) {
    const appear = Math.min(1, Math.max(0, phase - d));
    if (appear <= 0) break;

    ctx.globalAlpha = appear * 0.55;
    ctx.strokeStyle = p.rule;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s / 2, y + s);
    ctx.moveTo(x, y + s / 2); ctx.lineTo(x + s, y + s / 2);
    ctx.stroke();

    const q = Math.floor(rnd(d) * 4);
    const nx = x + (q % 2) * s / 2;
    const ny = y + Math.floor(q / 2) * s / 2;
    s /= 2; x = nx; y = ny;

    ctx.globalAlpha = appear;
    ctx.strokeStyle = d === 3 ? p.hot : p.cool;
    ctx.lineWidth = d === 3 ? 2 : 1.2;
    ctx.strokeRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = p.dim;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy, size, size);

  if (phase >= 4) {
    ctx.fillStyle = p.hot;
    ctx.globalAlpha = Math.min(1, (phase - 4) * 4);
    ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = 1;
  }
}

/* ── flood: water finding its level over a terrain section ────────────── */
function flood(ctx, w, h, t, p) {
  const ground = (x) => {
    const u = x / w;
    return h * (0.78
      - 0.20 * Math.exp(-((u - 0.24) ** 2) / 0.012)
      - 0.28 * Math.exp(-((u - 0.72) ** 2) / 0.020)
      + 0.05 * Math.sin(u * 22));
  };

  const level = h * (0.66 - 0.09 * Math.sin(t / 2400));

  // water body, clipped to below the terrain line
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    ctx.lineTo(x, level + Math.sin(x / 26 + t / 420) * 1.6);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = p.cool;
  ctx.globalAlpha = 0.34;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = p.cool;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // terrain drawn over the water, so only the flooded parts show
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 3) ctx.lineTo(x, ground(x));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = p.bg;
  ctx.fill();
  ctx.strokeStyle = p.ink;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // buildings, and the ones standing in water go hot
  for (const u of [0.16, 0.30, 0.46, 0.60, 0.84]) {
    const x = u * w, gy = ground(x), bh = h * 0.14;
    const wet = gy > level;
    ctx.fillStyle = wet ? p.hot : p.dim;
    ctx.globalAlpha = wet ? 1 : 0.65;
    ctx.fillRect(x - 4, gy - bh, 8, bh);
  }
  ctx.globalAlpha = 1;
}

/* ── crowds: flow through a bottleneck ────────────────────────────────── */
const crowd = [];
function crowds(ctx, w, h, t, p, dt) {
  const gapY = h / 2, gapH = h * 0.17;
  const wallX = w * 0.56;

  while (crowd.length < 190) {
    crowd.push({ x: Math.random() * wallX, y: Math.random() * h, v: 0.5 + Math.random() * 0.5 });
  }

  // the barrier: solid and light, or it disappears at panel size
  ctx.strokeStyle = p.ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(wallX, 6); ctx.lineTo(wallX, gapY - gapH / 2);
  ctx.moveTo(wallX, gapY + gapH / 2); ctx.lineTo(wallX, h - 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (const a of crowd) {
    const upstream = a.x < wallX - 3;
    // funnel towards the gap, then release straight through it
    const aim = upstream ? gapY + (a.y - gapY) * 0.05 : a.y;
    a.y += (aim - a.y) * (upstream ? 0.075 : 0.02);
    // congestion: slow right up against the barrier
    const squeeze = upstream ? Math.max(0.25, Math.min(1, (wallX - a.x) / (w * 0.22))) : 1;
    a.x += a.v * dt * 0.05 * squeeze;
    if (a.x > w + 4) { a.x = -4; a.y = Math.random() * h; }

    const packed = squeeze < 0.7 && upstream;
    ctx.fillStyle = packed ? p.hot : p.cool;
    ctx.globalAlpha = packed ? 1 : 0.62;
    ctx.beginPath();
    ctx.arc(a.x, a.y, packed ? 2.6 : 2.0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── robotics: a route found around obstacles, then walked ────────────── */
function robotics(ctx, w, h, t, p) {
  const cycle = 5600;
  const phase = (t % cycle) / cycle;
  const obs = [[0.30, 0.26], [0.30, 0.74], [0.58, 0.30], [0.58, 0.78], [0.80, 0.52]];
  const ow = w * 0.13, oh = h * 0.20;

  ctx.strokeStyle = p.rule;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(w * i / 6, 0); ctx.lineTo(w * i / 6, h);
    ctx.moveTo(0, h * i / 6); ctx.lineTo(w, h * i / 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const [u, v] of obs) {                     // solid blocks, clearly in the way
    ctx.fillStyle = p.rule;
    ctx.fillRect(u * w - ow / 2, v * h - oh / 2, ow, oh);
    ctx.strokeStyle = p.dim;
    ctx.lineWidth = 1;
    ctx.strokeRect(u * w - ow / 2, v * h - oh / 2, ow, oh);
  }

  // the route threads the gaps between them rather than wandering
  const wpts = [[0.05, 0.50], [0.18, 0.50], [0.30, 0.50], [0.44, 0.52],
                [0.58, 0.54], [0.70, 0.40], [0.80, 0.26], [0.90, 0.34], [0.97, 0.46]];
  const drawn = Math.min(1, phase * 1.7);

  ctx.strokeStyle = p.cool;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(wpts[0][0] * w, wpts[0][1] * h);
  const upto = drawn * (wpts.length - 1);
  for (let i = 1; i < wpts.length; i++) {
    const f = Math.min(1, Math.max(0, upto - (i - 1)));
    if (f <= 0) break;
    const [px, py] = wpts[i - 1], [cx, cy] = wpts[i];
    ctx.lineTo((px + (cx - px) * f) * w, (py + (cy - py) * f) * h);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (phase > 0.62) {
    const g = Math.min(1, (phase - 0.62) / 0.34) * (wpts.length - 1);
    const i = Math.min(Math.floor(g), wpts.length - 2);
    const f = g - i;
    const [px, py] = wpts[i], [cx, cy] = wpts[i + 1];
    const x = (px + (cx - px) * f) * w, y = (py + (cy - py) * f) * h;
    ctx.fillStyle = p.hot;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.hot; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

const DRAW = { addressing, flood, crowds, robotics };

function mount(canvas) {
  const kind = canvas.dataset.panel;
  const fn = DRAW[kind];
  if (!fn) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let w = 0, h = 0;

  const size = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    w = r.width; h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener('resize', size);

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(now - last, 50);
    last = now;
    ctx.clearRect(0, 0, w, h);
    fn(ctx, w, h, now, palette(), dt);
    if (!still) requestAnimationFrame(frame);
  };
  // A single frame when motion is reduced: the panel still shows its idea.
  if (still) frame(3000);
  else requestAnimationFrame(frame);
}

document.querySelectorAll('canvas[data-panel]').forEach(mount);
