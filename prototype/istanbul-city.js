'use strict';
/* İstanbul teması · statik katman (önbelleğe alınır): Boğaz, Haliç, çatılar, tarihi yapılar, köprüler */
const IST = {};
IST.rng = a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
IST.qb = (p, c, q, t) => [0, 1].map(i => (1 - t) * (1 - t) * p[i] + 2 * (1 - t) * t * c[i] + t * t * q[i]);
IST.hit = document.createElement('canvas').getContext('2d');   // kimlik dönüşümlü, isPointInPath testleri için
IST.rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
IST.PAL = [null,
  { land: '#d8c8a6', road: '#bdb199', edge: '#eadfc4', sea: ['#5fa9c7', '#a8d9df'], roof: ['#d6a88a', '#c98f73', '#e6cdb0', '#b9a08a', '#d9b37c'], park: '#8fa86b', tint: 'rgba(255,226,190,.10)', win: 0, sh: [-3, 3], glint: '255,245,220', ga: .5, sun: [.85, .15], sunCol: '255,214,160' },
  { land: '#dfd0ae', road: '#b9ad95', edge: '#ece1c6', sea: ['#1c7ea8', '#47b1c9'], roof: ['#c9694a', '#d98a62', '#e8d2b0', '#b7553d', '#d8a05a'], park: '#7f9f55', tint: 'rgba(255,255,255,0)', win: 0, sh: [1, 3], glint: '255,255,255', ga: .28, sun: [.5, 0], sunCol: '255,255,235' },
  { land: '#c9a98a', road: '#9a8068', edge: '#dcb88f', sea: ['#e0814f', '#18507c'], roof: ['#b8553f', '#c97652', '#d9a778', '#9c4638', '#c58c5a'], park: '#6f8a4c', tint: 'rgba(255,128,48,.17)', win: .28, sh: [5, 2], glint: '255,200,120', ga: .9, sun: [.08, .3], sunCol: '255,150,70' },
  { land: '#2b3047', road: '#1d2135', edge: '#3a4160', sea: ['#071833', '#13335c'], roof: ['#3a3f5e', '#454b6b', '#2f3552', '#51446a', '#3d4a66'], park: '#1d3a3c', tint: 'rgba(6,14,52,.40)', win: 1, sh: [2, 3], glint: '200,220,255', ga: .6, sun: [.7, .12], sunCol: '150,180,255' }
];
/* Coğrafya: Boğaz (S eğrisi), Haliç (kuzeybatıya uzanan koy), Boğaz Köprüsü ekseni */
IST.geo = (W, H) => {
  const cy = x => H * (.5 + .13 * Math.sin(x / W * 3.2 + .5)), hw = x => H * (.085 + .02 * Math.sin(x / W * 5 + 1)), bank = x => cy(x) - hw(x);
  const water = new Path2D(), horn = new Path2D();
  for (let i = 0; i <= 64; i++) { const x = W * (i / 64 * 1.1 - .05); i ? water.lineTo(x, bank(x)) : water.moveTo(x, bank(x)); }
  for (let i = 64; i >= 0; i--) { const x = W * (i / 64 * 1.1 - .05); water.lineTo(x, cy(x) + hw(x)); }
  water.closePath();
  const b0 = [W * .21, bank(W * .21) + 10], b1 = [W * .33, bank(W * .33) + 10], c0 = [W * .09, H * .27], c1 = [W * .2, H * .36], e0 = [-W * .04, H * .12], e1 = [-W * .04, H * .22];
  horn.moveTo(...b0); horn.quadraticCurveTo(...c0, ...e0); horn.lineTo(...e1); horn.quadraticCurveTo(...c1, ...b1); horn.closePath();
  const bx = W * .86;
  return { W, H, cy, hw, bank, water, horn, b0, b1, c0, c1, e0, e1, bx, by0: bank(bx) - 14, by1: cy(bx) + hw(bx) + 14, glints: [],
    inW: (x, y) => IST.hit.isPointInPath(water, x, y) || IST.hit.isPointInPath(horn, x, y) };
};
/* Üstten görünüm yapı taşları */
IST.dome = (c, x, y, r, lite, dark) => {
  const g = c.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); g.addColorStop(0, lite); g.addColorStop(1, dark);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = .8; c.beginPath();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.stroke();
};
IST.minaret = (c, x, y, s, sh) => {
  const n = Math.hypot(sh[0], sh[1]) || 1;
  c.strokeStyle = 'rgba(0,0,0,.26)'; c.lineWidth = s * .2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sh[0] / n * s * 2.4, y + sh[1] / n * s * 2.4); c.stroke();
  c.fillStyle = '#efe6d6'; c.beginPath(); c.arc(x, y, s * .3, 0, 6.2832); c.fill();
  c.fillStyle = '#9aa3ab'; c.beginPath(); c.arc(x, y, s * .14, 0, 6.2832); c.fill();
};
IST.hagia = (c, x, y, s, P, col) => {   // Ayasofya / Süleymaniye: gövde, ana kubbe, iki yarım kubbe, dört minare
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - s * 1.7 + P.sh[0] * 1.5, y - s * 1.4 + P.sh[1] * 1.5, s * 3.4, s * 2.8);
  c.fillStyle = col; c.fillRect(x - s * 1.7, y - s * 1.4, s * 3.4, s * 2.8);
  c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x - s * 1.7, y - s * 1.4, s * 3.4, s * .5);
  for (const k of [-1, 1]) IST.dome(c, x + k * s * 1.15, y, s * .8, '#b4bcc2', '#7e8993');
  IST.dome(c, x, y, s * 1.05, '#c8cfd3', '#7f8b95');
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) IST.minaret(c, x + a * s * 2, y + b * s * 1.6, s * .7, P.sh);
};
IST.blue = (c, x, y, s, P) => {   // Sultanahmet: kademeli kubbeler, avlu, altı minare
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - s * 1.5 + 3, y - s * 1.5 + 4, s * 3, s * 3);
  c.fillStyle = '#b9b2a4'; c.fillRect(x - s * 1.5, y - s * 1.5, s * 3, s * 3);
  c.fillStyle = '#cdbf9e'; c.fillRect(x - s * 3.6, y - s * 1.2, s * 2.1, s * 2.4);
  for (let i = 0; i < 3; i++) IST.dome(c, x - s * 3.1 + i * s * .72, y - s * .75, s * .3, '#aeb9c4', '#6f7f90'), IST.dome(c, x - s * 3.1 + i * s * .72, y + s * .75, s * .3, '#aeb9c4', '#6f7f90');
  for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) IST.dome(c, x + a * s * 1.05, y + b * s * 1.05, s * .6, '#aeb9c4', '#6f7f90');
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) IST.dome(c, x + a * s * 1.1, y + b * s * 1.1, s * .4, '#aeb9c4', '#6f7f90');
  IST.dome(c, x, y, s * .95, '#bfcad4', '#6b7c8f');
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) IST.minaret(c, x + a * s * 1.9, y + b * s * 1.9, s * .7, P.sh);
  IST.minaret(c, x - s * 3.6, y - s * 1.2, s * .7, P.sh); IST.minaret(c, x - s * 3.6, y + s * 1.2, s * .7, P.sh);
};
IST.galata = (c, x, y, s, P) => {   // Galata Kulesi: konik çatı, balkon halkası, uzun gölge
  const n = Math.hypot(P.sh[0], P.sh[1]) || 1;
  c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = s * .55; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + P.sh[0] / n * s * 2.6, y + P.sh[1] / n * s * 2.6); c.stroke();
  c.fillStyle = '#d8c7a8'; c.beginPath(); c.arc(x, y, s * .95, 0, 6.2832); c.fill();
  const g = c.createLinearGradient(x - s, y - s, x + s, y + s); g.addColorStop(0, '#c48c63'); g.addColorStop(.5, '#a06a45'); g.addColorStop(1, '#5e3a24');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, s * .64, 0, 6.2832); c.fill();
  c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(x, y, s * .08, 0, 6.2832); c.fill();
};
IST.maiden = (c, x, y, s) => {   // Kız Kulesi: kayalık adacık, beyaz kule, kırmızı çatı
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x, y, s * 1.5, s * 1, 0, 0, 6.2832); c.fill();
  c.fillStyle = '#8f8678'; c.beginPath(); c.ellipse(x, y, s * 1.15, s * .72, .3, 0, 6.2832); c.fill();
  c.fillStyle = '#efe9de'; c.beginPath(); c.arc(x, y, s * .38, 0, 6.2832); c.fill();
  c.fillStyle = '#c4553a'; c.beginPath(); c.arc(x, y, s * .24, 0, 6.2832); c.fill();
};
IST.hornBridge = (c, g, P) => {   // Galata Köprüsü + olta sallayan balıkçılar
  const A = IST.qb(g.b0, g.c0, g.e0, .2), B = IST.qb(g.b1, g.c1, g.e1, .2), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  c.lineCap = 'butt'; c.strokeStyle = '#7d838c'; c.lineWidth = 8; c.beginPath(); c.moveTo(A[0] - ux * 10, A[1] - uy * 10); c.lineTo(B[0] + ux * 10, B[1] + uy * 10); c.stroke();
  for (let d = 4; d < L; d += 10) {
    const px = A[0] + ux * d, py = A[1] + uy * d, side = d % 20 < 10 ? 1 : -1;
    c.fillStyle = 'rgba(255,240,190,' + (.5 + P.win * .5) + ')'; c.beginPath(); c.arc(px, py, 1.2, 0, 6.3); c.fill();
    c.fillStyle = '#2b2b2b'; c.beginPath(); c.arc(px - uy * 6.5 * side, py + ux * 6.5 * side, 1.4, 0, 6.3); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = .6; c.beginPath(); c.moveTo(px - uy * 6.5 * side, py + ux * 6.5 * side); c.lineTo(px - uy * 15 * side, py + ux * 15 * side); c.stroke();
  }
};
IST.build = (c, g, T, lm) => {
  const W = g.W, H = g.H, P = IST.PAL[T], R = IST.rng(1453), h = IST.hit, cs = Math.max(15, Math.min(W, H) / 38), s = Math.min(W, H) * .042;
  h.lineWidth = 24; c.fillStyle = P.land; c.fillRect(0, 0, W, H); c.lineJoin = 'round';
  for (const [w, col] of [[26, P.road], [14, P.edge]]) { c.lineWidth = w; c.strokeStyle = col; c.stroke(g.water); c.stroke(g.horn); }   // sahil yolu + kıyı şeridi
  const sg = c.createLinearGradient(0, 0, W, H * .3); sg.addColorStop(0, P.sea[0]); sg.addColorStop(1, P.sea[1]);
  c.fillStyle = sg; c.fill(g.water); c.fill(g.horn);
  for (let y = 0; y < H; y += cs) for (let x = 0; x < W; x += cs) {
    const px = x + cs * .5, py = y + cs * .5;
    if (g.inW(px, py) || h.isPointInStroke(g.water, px, py) || h.isPointInStroke(g.horn, px, py)) continue;
    const north = py < g.cy(px), r = R(), a = north ? .32 + .15 * Math.sin(px / W * 4) : -.22 + .1 * Math.cos(py / H * 5);
    if (r < (north ? .06 : .2)) {   // park: çınar ve selvi öbekleri
      c.fillStyle = P.park; c.beginPath(); c.arc(px, py, cs * .62, 0, 6.3); c.fill();
      c.fillStyle = 'rgba(15,55,30,.55)'; c.beginPath(); for (let i = 0; i < 3; i++) { const ox = (R() - .5) * cs * .7, oy = (R() - .5) * cs * .7; c.moveTo(px + ox + cs * .2, py + oy); c.arc(px + ox, py + oy, cs * .2, 0, 6.3); } c.fill();
    } else if (r < .985) {   // ev bloğu: kiremit çatı, gölge, mahya çizgisi
      const w = cs * (.62 + R() * .3), d = cs * (.5 + R() * .38);
      c.save(); c.translate(px + P.sh[0], py + P.sh[1]); c.rotate(a); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(-w / 2, -d / 2, w, d); c.restore();
      c.save(); c.translate(px, py); c.rotate(a); c.fillStyle = P.roof[R() * 5 | 0]; c.fillRect(-w / 2, -d / 2, w, d);
      c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(-w / 2, -d / 2, w, d / 2); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-w / 2, -.5, w, 1);
      if (P.win && R() < .7) for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(255,205,110,' + ((.35 + .5 * R()) * P.win).toFixed(2) + ')'; c.fillRect((R() - .5) * w, (R() - .5) * d, 1.8, 1.8); }
      c.restore();
    } else {   // mahalle camisi
      IST.dome(c, px, py, cs * .3, '#b6bfc6', '#76838f'); IST.minaret(c, px + cs * .38, py - cs * .28, cs * .22, P.sh);
    }
  }
  const TC = ['#d8322d', '#f2c230', '#c43a8f', '#f6f1e6', '#f08a2c'];   // Emirgan lale bahçesi
  const fx = W * .52, fy = g.cy(W * .6) + g.hw(W * .6) + H * .05, fw = W * .16, fh = H * .1;
  c.fillStyle = '#5d8a46'; IST.rr(c, fx - 6, fy - 6, fw + 12, fh + 12, 8); c.fill();
  for (let r = 0, y = fy; y < fy + fh; y += 7, r++) { c.fillStyle = TC[r % 5]; c.beginPath(); for (let x = fx; x < fx + fw; x += 6) { c.moveTo(x + 2.2, y); c.arc(x, y, 2.2, 0, 6.3); } c.fill(); }
  const nb = f => g.bank(W * f);
  if (lm) {
    IST.hagia(c, W * .47, nb(.47) - H * .2, s * .8, P, '#b4a690');      // Süleymaniye
    IST.hagia(c, W * .62, nb(.62) - H * .14, s * 1.05, P, '#c98b6d');   // Ayasofya
    IST.blue(c, W * .76, nb(.76) - H * .15, s * .95, P);                 // Sultanahmet
    IST.galata(c, W * .37, nb(.37) - H * .075, s * .9, P);
  }
  IST.hornBridge(c, g, P);
  const bx = g.bx, y0 = g.by0, y1 = g.by1;   // Boğaz Köprüsü: tabliye, kuleler, ana halatlar, askı çubukları
  c.lineCap = 'butt'; c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 9; c.beginPath(); c.moveTo(bx + P.sh[0] * 2, y0 + P.sh[1] * 2); c.lineTo(bx + P.sh[0] * 2, y1 + P.sh[1] * 2); c.stroke();
  c.strokeStyle = '#8b9199'; c.beginPath(); c.moveTo(bx, y0); c.lineTo(bx, y1); c.stroke();
  c.setLineDash([1, 5]); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 15; c.beginPath(); c.moveTo(bx, y0); c.lineTo(bx, y1); c.stroke(); c.setLineDash([]);
  c.strokeStyle = 'rgba(235,238,242,.85)'; c.lineWidth = 1.2; c.beginPath(); for (const dx of [-7, 7]) { c.moveTo(bx + dx, y0); c.lineTo(bx + dx, y1); } c.stroke();
  for (const f of [.2, .8]) { const py = y0 + (y1 - y0) * f; c.fillStyle = '#dfe2e6'; c.fillRect(bx - 6, py - 6, 12, 12); c.fillStyle = '#9ea5ad'; c.fillRect(bx - 6, py - 6, 12, 3); }
  if (lm) IST.maiden(c, W * .52, g.cy(W * .52) + H * .025, s);
};
/* Dinamik katmanın ihtiyacı olan şeyler: su dokusu ve su üstü parıltılar (zaman dilimi değişince yenilenir) */
IST.prep = (g, T) => {
  const P = IST.PAL[T], R = IST.rng(99), k = document.createElement('canvas'); k.width = k.height = 512;
  const c = k.getContext('2d'); c.scale(2, 2); c.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = R() * 256, y = R() * 256, l = 8 + R() * 18; c.strokeStyle = 'rgba(' + P.glint + ',' + (.1 + R() * .16).toFixed(2) + ')'; c.lineWidth = 1 + R() * 1.4;
    for (const dx of [0, -256]) for (const dy of [0, -256]) { c.beginPath(); c.moveTo(x + dx, y + dy); c.quadraticCurveTo(x + dx + l / 2, y + dy - 2.5, x + dx + l, y + dy); c.stroke(); }
  }
  IST.wpat = IST.hit.createPattern(k, 'repeat'); if (IST.wpat.setTransform) IST.wpat.setTransform(new DOMMatrix([.5, 0, 0, .5, 0, 0]));
  g.glints = []; const gx = g.W * Math.min(.9, P.sun[0] + .12);
  for (let i = 0; i < 500 && g.glints.length < 90; i++) { const x = gx + (R() - .5) * g.W * .28, y = R() * g.H; if (g.inW(x, y)) g.glints.push({ x, y, l: 4 + R() * 9, p: R() * 6.3 }); }
};
