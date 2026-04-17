import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'releases');
mkdirSync(outDir, { recursive: true });

// ── Design system: Developer Tool / IDE palette ───
const C = {
  bg: '#0F172A',
  bgDeep: '#020617',
  card: '#1B2336',
  surface: '#1E293B',
  surfaceHover: '#273349',
  muted: '#272F42',
  mutedFg: '#94A3B8',
  border: '#334155',
  borderLight: '#475569',
  fg: '#F8FAFC',
  fgSoft: '#CBD5E1',
  accent: '#22C55E',
  accentSoft: 'rgba(34, 197, 94, 0.15)',
  primary: '#DC2626',
  primarySoft: 'rgba(220, 38, 38, 0.15)',
  warn: '#F59E0B',
  warnSoft: 'rgba(245, 158, 11, 0.12)',
  info: '#3B82F6',
  infoSoft: 'rgba(59, 130, 246, 0.12)',
  pink: '#EC4899',
  cyan: '#06B6D4',
};

const SEVERITY = ['#DC2626', '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#06B6D4'];

// ── Helpers ───────────────────────────────────────
function drawBg(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, C.bgDeep);
  grad.addColorStop(0.5, C.bg);
  grad.addColorStop(1, C.bgDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // subtle grid
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // top glow
  const glow = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 0.4);
  glow.addColorStop(0, 'rgba(34, 197, 94, 0.06)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h * 0.4);
}

function drawRIcon(ctx, x, y, size) {
  ctx.save();
  ctx.fillStyle = C.primary;
  ctx.shadowColor = C.primary;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.55}px "SF Mono", Monaco, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('R', x + size / 2, y + size / 2);
  ctx.restore();
}

function drawColorBar(ctx, x, y, w, h) {
  const bw = w / SEVERITY.length;
  for (let i = 0; i < SEVERITY.length; i++) {
    ctx.fillStyle = SEVERITY[i];
    ctx.beginPath();
    ctx.roundRect(x + i * bw, y, bw - 2, h, 3);
    ctx.fill();
  }
}

function drawWindow(ctx, x, y, w, h) {
  ctx.fillStyle = C.card;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  // title bar
  ctx.fillStyle = C.surface;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 32, [10, 10, 0, 0]);
  ctx.fill();
  const dots = [C.primary, C.warn, C.accent];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = dots[i];
    ctx.beginPath();
    ctx.arc(x + 20 + i * 18, y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = C.mutedFg;
  ctx.font = '12px "SF Mono", Monaco, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('application.log', x + w / 2, y + 20);
  ctx.textAlign = 'left';
}

const LOG_SETS = {
  errors: [
    { t: '09:12:33  [ERROR]  CUDA out of memory', kw: 'ERROR', c: C.primary },
    { t: '09:12:34  [WARN]   deprecated API call', kw: 'WARN', c: C.warn },
    { t: '09:12:35  RuntimeError: expected float', kw: 'RuntimeError', c: C.pink },
    { t: '09:12:36  [INFO]   model loaded success', kw: null, c: null },
    { t: '09:12:37  SIGSEGV in worker thread #4', kw: 'SIGSEGV', c: C.primary },
    { t: '09:12:38  [ERROR]  connection refused', kw: 'ERROR', c: C.primary },
    { t: '09:12:39  ValueError: invalid shape', kw: 'ValueError', c: '#F97316' },
    { t: '09:12:40  [DEBUG]  checkpoint saved', kw: null, c: null },
    { t: '09:12:41  OOM killer invoked pid=1842', kw: 'OOM', c: C.pink },
    { t: '09:12:42  [WARN]   timeout 30s exceeded', kw: 'WARN', c: C.warn },
    { t: '09:12:43  segfault at 0x7fff0010a000', kw: 'segfault', c: C.primary },
    { t: '09:12:44  [INFO]   training complete', kw: null, c: null },
  ],
  density: [
    { t: '10:01:01  error: disk full /dev/sda1', kw: 'error', c: C.primary },
    { t: '10:01:01  error: write failed ENOSPC', kw: 'error', c: C.primary },
    { t: '10:01:02  error: sync timeout 5000ms', kw: 'error', c: C.primary },
    { t: '10:01:03  warn: retry attempt #3', kw: 'warn', c: C.warn },
    { t: '10:01:04  error: io exception sector', kw: 'error', c: C.primary },
    { t: '10:01:05  error: corrupt block 0xFF', kw: 'error', c: C.primary },
    { t: '10:02:10  info: recovered after fsck', kw: null, c: null },
    { t: '10:05:33  info: system stable', kw: null, c: null },
    { t: '10:08:15  warn: latency > 200ms', kw: 'warn', c: C.warn },
    { t: '10:10:02  info: checkpoint ok', kw: null, c: null },
    { t: '10:12:01  error: oom killed pid=5521', kw: 'error', c: C.primary },
    { t: '10:12:02  error: alloc failed 4096MB', kw: 'error', c: C.primary },
  ],
  regex: [
    { t: '2026-04-17 ERROR  main.py:42 in run', kw: 'ERROR', c: C.primary },
    { t: '2026-04-17 WARN   config.py:8 deprecated', kw: 'WARN', c: C.warn },
    { t: '2026-04-17 INFO   server started :8080', kw: null, c: null },
    { t: 'Traceback (most recent call last):', kw: 'Traceback', c: C.pink },
    { t: '  File "app.py", line 127, in run', kw: null, c: null },
    { t: '    raise RuntimeError("timeout")', kw: 'RuntimeError', c: C.pink },
    { t: 'RuntimeError: operation timed out', kw: 'RuntimeError', c: C.pink },
    { t: '2026-04-17 ERROR  db.py:89 conn lost', kw: 'ERROR', c: C.primary },
    { t: 'ConnectionRefusedError: [Errno 111]', kw: 'ConnectionRefusedError', c: '#F97316' },
    { t: '2026-04-17 INFO   retrying in 5s...', kw: null, c: null },
    { t: '2026-04-17 CRITICAL  crash detected', kw: 'CRITICAL', c: C.primary },
    { t: 'SystemExit: code 1', kw: 'SystemExit', c: '#F97316' },
  ],
};

function drawLogs(ctx, x, y, w, h, count, set) {
  const logs = set || LOG_SETS.errors;
  const lh = h / count;
  ctx.font = '12px "SF Mono", Monaco, monospace';
  for (let i = 0; i < count; i++) {
    const log = logs[i % logs.length];
    const ly = y + i * lh + lh * 0.72;
    if (log.kw && log.c) {
      const idx = log.t.indexOf(log.kw);
      const before = log.t.substring(0, idx);
      const after = log.t.substring(idx + log.kw.length);
      ctx.fillStyle = C.mutedFg;
      ctx.fillText(before, x + 12, ly);
      const bw = ctx.measureText(before).width;
      const kwW = ctx.measureText(log.kw).width;
      // highlight bg
      ctx.fillStyle = log.c;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.roundRect(x + 12 + bw - 3, ly - 11, kwW + 6, 15, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = log.c;
      ctx.fillText(log.kw, x + 12 + bw, ly);
      ctx.fillStyle = C.mutedFg;
      ctx.fillText(after, x + 12 + bw + kwW, ly);
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.fillText(log.t, x + 12, ly);
    }
  }
}

function drawPopup(ctx, px, py, pw, ph, opts = {}) {
  ctx.fillStyle = C.card;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 10);
  ctx.fill();
  ctx.stroke();

  // header
  drawRIcon(ctx, px + 14, py + 12, 28);
  ctx.fillStyle = C.fg;
  ctx.font = 'bold 15px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RSearch', px + 50, py + 31);

  // toggle ON
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.roundRect(px + pw - 52, py + 18, 36, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px + pw - 30, py + 28, 7, 0, Math.PI * 2);
  ctx.fill();

  // divider
  ctx.strokeStyle = C.border;
  ctx.beginPath();
  ctx.moveTo(px + 14, py + 50);
  ctx.lineTo(px + pw - 14, py + 50);
  ctx.stroke();

  // mode tabs
  const kwActive = opts.mode !== 'regex';
  ctx.fillStyle = kwActive ? C.surface : 'transparent';
  ctx.beginPath();
  ctx.roundRect(px + 14, py + 60, (pw - 28) / 2, 28, 6);
  ctx.fill();
  ctx.fillStyle = kwActive ? C.fg : C.mutedFg;
  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Keywords', px + 14 + (pw - 28) / 4, py + 78);

  ctx.fillStyle = kwActive ? 'transparent' : C.surface;
  ctx.beginPath();
  ctx.roundRect(px + pw / 2, py + 60, (pw - 28) / 2, 28, 6);
  ctx.fill();
  ctx.fillStyle = kwActive ? C.mutedFg : C.fg;
  ctx.fillText('Regex', px + pw / 2 + (pw - 28) / 4, py + 78);

  // input
  ctx.strokeStyle = C.borderLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px + 14, py + 100, pw - 28, 32, 6);
  ctx.stroke();
  ctx.fillStyle = C.mutedFg;
  ctx.font = '11px "SF Mono", Monaco, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(opts.input || 'error, fail, SIGSEGV, OOM...', px + 24, py + 120);

  // buttons
  ctx.fillStyle = C.primary;
  ctx.beginPath();
  ctx.roundRect(px + 14, py + 146, (pw - 36) / 2, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Search', px + 14 + (pw - 36) / 4, py + 165);

  ctx.fillStyle = C.surface;
  ctx.strokeStyle = C.border;
  ctx.beginPath();
  ctx.roundRect(px + pw / 2 + 4, py + 146, (pw - 36) / 2, 30, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.fgSoft;
  ctx.fillText('Clear', px + pw / 2 + 4 + (pw - 36) / 4, py + 165);

  // status
  ctx.textAlign = 'left';
  ctx.fillStyle = C.accent;
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillText(opts.status || 'Found 847 match(es)', px + 14, py + 200);
}

function save(canvas, name) {
  const p = path.join(outDir, name);
  writeFileSync(p, canvas.toBuffer('image/png'));
  console.log('  ' + name);
}

// ── Screenshot 1: Keywords + Highlights ───────────
function screenshot1() {
  const w = 1280, h = 800;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  drawBg(ctx, w, h);

  // title
  ctx.fillStyle = C.fg;
  ctx.font = 'bold 36px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RSearch', w / 2, 48);
  ctx.fillStyle = C.mutedFg;
  ctx.font = '16px -apple-system, sans-serif';
  ctx.fillText('363+ Error Keywords  ·  Auto-Highlight  ·  Severity Colors', w / 2, 78);

  drawWindow(ctx, 50, 110, 800, 630);
  drawLogs(ctx, 50, 146, 800, 594, 30, LOG_SETS.errors);

  drawPopup(ctx, 910, 110, 320, 220, {
    status: 'Found 847 match(es)',
  });

  // severity bar
  drawColorBar(ctx, 910, 360, 320, 14);
  ctx.fillStyle = C.mutedFg;
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Critical', 910, 390);
  ctx.textAlign = 'right';
  ctx.fillText('Info', 1230, 390);

  // feature badges
  ctx.textAlign = 'center';
  const badges = ['Privacy First', 'Open Source', 'Manifest V3'];
  for (let i = 0; i < 3; i++) {
    const bx = 935 + i * 105;
    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.roundRect(bx, 760, 95, 24, 12);
    ctx.fill();
    ctx.fillStyle = C.mutedFg;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText(badges[i], bx + 47, 776);
  }

  save(c, 'screenshot-1-1280x800.png');
}

// ── Screenshot 2: Top 3 Density Hotspots ──────────
function screenshot2() {
  const w = 1280, h = 800;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  drawBg(ctx, w, h);

  ctx.fillStyle = C.fg;
  ctx.font = 'bold 32px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Top 3 Error Density Hotspots', w / 2, 48);
  ctx.fillStyle = C.mutedFg;
  ctx.font = '15px -apple-system, sans-serif';
  ctx.fillText('Sliding window algorithm detects error clusters — click to jump', w / 2, 75);

  drawWindow(ctx, 50, 105, 800, 640);
  drawLogs(ctx, 50, 141, 800, 604, 30, LOG_SETS.density);

  // density bars on right edge of log window
  const segments = [
    { y: 145, h: 130, o: 0.5, label: '#1  156 matches', preview: 'error: disk full / write failed' },
    { y: 380, h: 90, o: 0.3, label: '#2  89 matches', preview: 'error: io exception / corrupt' },
    { y: 590, h: 70, o: 0.18, label: '#3  52 matches', preview: 'error: oom killed / alloc fail' },
  ];
  for (const s of segments) {
    ctx.fillStyle = `rgba(220, 38, 38, ${s.o})`;
    ctx.beginPath();
    ctx.roundRect(832, s.y, 10, s.h, 5);
    ctx.fill();
  }

  // hotspot cards
  const px = 910, py = 105;
  ctx.fillStyle = C.card;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, 320, 460, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = C.fg;
  ctx.font = 'bold 14px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Top 3 Density Areas', px + 16, py + 28);
  ctx.fillStyle = C.mutedFg;
  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillText('Click to jump to high density areas', px + 16, py + 46);

  for (let i = 0; i < segments.length; i++) {
    const cy = py + 65 + i * 125;
    ctx.fillStyle = C.surface;
    ctx.strokeStyle = i === 0 ? C.primary : C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px + 16, cy, 288, 110, 8);
    ctx.fill();
    ctx.stroke();

    // rank badge
    ctx.fillStyle = C.primary;
    ctx.beginPath();
    ctx.roundRect(px + 28, cy + 14, 32, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${i + 1}`, px + 44, cy + 29);

    // info
    ctx.textAlign = 'left';
    ctx.fillStyle = C.fg;
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(segments[i].label, px + 72, cy + 29);
    ctx.fillStyle = C.mutedFg;
    ctx.font = '10px "SF Mono", Monaco, monospace';
    ctx.fillText(segments[i].preview, px + 28, cy + 55);

    // navigate hint
    ctx.fillStyle = C.accent;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText('Click to navigate  →', px + 28, cy + 90);
  }

  save(c, 'screenshot-2-1280x800.png');
}

// ── Screenshot 3: Regex + Auto-Search ─────────────
function screenshot3() {
  const w = 1280, h = 800;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  drawBg(ctx, w, h);

  ctx.fillStyle = C.fg;
  ctx.font = 'bold 32px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Regex Mode + Auto-Search', w / 2, 48);
  ctx.fillStyle = C.mutedFg;
  ctx.font = '15px -apple-system, sans-serif';
  ctx.fillText('Full regex support  ·  Auto-highlights on every page load & tab switch', w / 2, 75);

  drawWindow(ctx, 50, 105, 800, 640);
  drawLogs(ctx, 50, 141, 800, 604, 30, LOG_SETS.regex);

  drawPopup(ctx, 910, 105, 320, 220, {
    mode: 'regex',
    input: '(Error|CRITICAL|Traceback)',
    status: 'Found 312 match(es)',
  });

  // auto-search card
  const ax = 910, ay = 350;
  ctx.fillStyle = C.accentSoft;
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(ax, ay, 320, 70, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.accent;
  ctx.font = 'bold 13px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Auto-Search: ON', ax + 16, ay + 26);
  ctx.fillStyle = C.fgSoft;
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillText('Highlights apply on every page load', ax + 16, ay + 48);

  // preset card
  const bx = 910, by = 440;
  ctx.fillStyle = C.infoSoft;
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.beginPath();
  ctx.roundRect(bx, by, 320, 70, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.info;
  ctx.font = 'bold 13px -apple-system, sans-serif';
  ctx.fillText('Preset: Default (363 keywords)', bx + 16, by + 26);
  ctx.fillStyle = C.fgSoft;
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillText('3 customizable slots  ·  CSV import/export', bx + 16, by + 48);

  // feature badges
  ctx.textAlign = 'center';
  const badges = ['Privacy First', 'Open Source', 'Manifest V3'];
  for (let i = 0; i < 3; i++) {
    const bx2 = 935 + i * 105;
    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.roundRect(bx2, 760, 95, 24, 12);
    ctx.fill();
    ctx.fillStyle = C.mutedFg;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText(badges[i], bx2 + 47, 776);
  }

  save(c, 'screenshot-3-1280x800.png');
}

// ── Small Promo 440x280 ──────────────────────────
function smallPromo() {
  const w = 440, h = 280;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  drawBg(ctx, w, h);

  drawRIcon(ctx, 30, 30, 44);
  ctx.fillStyle = C.fg;
  ctx.font = 'bold 28px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RSearch', 84, 60);

  ctx.fillStyle = C.mutedFg;
  ctx.font = '13px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Error Log Search & Highlighter', w / 2, 100);

  const pills = ['363+ Patterns', 'Auto-Highlight', 'Top 3 Hotspots'];
  for (let i = 0; i < 3; i++) {
    const px = 40 + i * 126;
    ctx.fillStyle = C.surface;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(px, 120, 118, 26, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.fgSoft;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pills[i], px + 59, 137);
  }

  drawColorBar(ctx, 40, 170, 360, 14);
  ctx.fillStyle = C.mutedFg;
  ctx.font = '10px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Critical', 40, 200);
  ctx.textAlign = 'right';
  ctx.fillText('Info', 400, 200);

  ctx.fillStyle = C.mutedFg;
  ctx.font = '11px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Open Source  ·  Privacy First  ·  Manifest V3', w / 2, 250);

  save(c, 'small-promo-440x280.png');
}

// ── Marquee 1400x560 ─────────────────────────────
function marquee() {
  const w = 1400, h = 560;
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  drawBg(ctx, w, h);

  // left: branding
  drawRIcon(ctx, 80, 80, 64);
  ctx.fillStyle = C.fg;
  ctx.font = 'bold 48px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RSearch', 160, 125);

  ctx.fillStyle = C.mutedFg;
  ctx.font = '18px -apple-system, sans-serif';
  ctx.fillText('Advanced Error Log Search & Highlighter', 80, 180);

  const pills = ['363+ Patterns', 'Auto-Search', 'Top 3 Hotspots', '8 Severity Colors', 'Regex + Keywords'];
  for (let i = 0; i < pills.length; i++) {
    const px = 80 + i * 135;
    ctx.fillStyle = C.surface;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(px, 220, 125, 28, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.fgSoft;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pills[i], px + 62, 238);
  }

  drawColorBar(ctx, 80, 280, 500, 16);
  ctx.fillStyle = C.mutedFg;
  ctx.font = '11px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Critical', 80, 314);
  ctx.textAlign = 'right';
  ctx.fillText('Info', 580, 314);

  // right: log window
  drawWindow(ctx, 780, 40, 560, 470);
  drawLogs(ctx, 780, 76, 560, 434, 22, LOG_SETS.errors);

  // bottom tagline
  ctx.fillStyle = C.mutedFg;
  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Open Source  ·  Privacy First  ·  Manifest V3  ·  For Developers', w / 2, h - 20);

  save(c, 'marquee-promo-1400x560.png');
}

console.log('Generating store images (dark terminal theme)...');
screenshot1();
screenshot2();
screenshot3();
smallPromo();
marquee();
console.log('Done — 5 images in releases/');
