'use strict';
/* İstanbul teması · hareketli parçalar: su, vapur, martı, çini meydan, ahşap iskele, sokak kedisi */
IST.pat = (w, h, f) => {   // 2x çözünürlüklü, 1x boyutlu tekrar eden desen
  const k = document.createElement('canvas'); k.width = w * 2; k.height = h * 2; const c = k.getContext('2d'); c.scale(2, 2); f(c);
  const p = IST.hit.createPattern(k, 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix([.5, 0, 0, .5, 0, 0])); return p;
};
IST.pats = () => IST.P_ || (IST.P_ = {
  marble: IST.pat(24, 24, c => {   // mermer zemin + sekiz köşeli Selçuklu yıldızı
    c.fillStyle = '#efe5d0'; c.fillRect(0, 0, 24, 24); c.strokeStyle = 'rgba(150,104,64,.28)'; c.lineWidth = .8; c.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 4 : 8.5; c.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); } c.closePath(); c.stroke();
  }),
  tile: IST.pat(14, 14, c => {   // İznik çinisi: turkuaz/kobalt dama, mercan ve fildişi benekler
    c.fillStyle = '#1d4f93'; c.fillRect(0, 0, 14, 14); c.fillStyle = '#2aa6b8'; c.fillRect(0, 0, 7, 7); c.fillRect(7, 7, 7, 7);
    c.fillStyle = '#efe5d0'; c.beginPath(); c.arc(3.5, 10.5, 1.6, 0, 6.3); c.arc(10.5, 3.5, 1.6, 0, 6.3); c.fill();
    c.fillStyle = '#e2674a'; c.beginPath(); c.arc(3.5, 3.5, 1, 0, 6.3); c.arc(10.5, 10.5, 1, 0, 6.3); c.fill();
  }),
  plank: IST.pat(14, 7, c => { c.fillStyle = '#8c5b36'; c.fillRect(0, 0, 14, 7); c.fillStyle = '#7a4c2c'; c.fillRect(0, 6, 14, 1); c.fillStyle = 'rgba(255,220,170,.10)'; c.fillRect(0, 0, 14, 2); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(6, 0, 1, 6); })
});
IST.hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
/* Su: iki kat kayan dalga dokusu + güneş/ay parıltıları + geceleri renk değiştiren köprü ışıkları */
IST.sea = (c, g, t, o, P) => {
  for (const pth of [g.water, g.horn]) {
    c.save(); c.clip(pth);
    for (const [sp, al, ang] of [[14, .55, .2], [9, .35, 2.9]]) {
      const ox = (t * sp * o.flow * Math.cos(ang)) % 256, oy = (t * sp * o.flow * Math.sin(ang)) % 256;
      c.globalAlpha = al; c.save(); c.translate(ox, oy); c.fillStyle = IST.wpat; c.fillRect(-ox - 256, -oy - 256, g.W + 512, g.H + 512); c.restore();
    }
    c.restore();
  }
  for (const q of g.glints) { const a = (.5 + .5 * Math.sin(t * 2.2 + q.p)) * P.ga * Math.min(1.5, o.glow) * .8; c.fillStyle = 'rgba(' + P.glint + ',' + a.toFixed(3) + ')'; c.fillRect(q.x, q.y, q.l, 1.4); }
  if (P.win > .5 && o.glow > 0) for (let i = 0; i < 30; i++) { c.fillStyle = 'hsla(' + ((i * 12 + t * 50) % 360) + ',90%,62%,' + (.8 * Math.min(1, o.glow)).toFixed(2) + ')'; c.beginPath(); c.arc(g.bx, g.by0 + (g.by1 - g.by0) * i / 29, 2.2, 0, 6.3); c.fill(); }
};
/* Vapurlar */
IST.mkFerries = (n, R) => Array.from({ length: n }, (_, i) => ({ u: R(), dir: i % 2 ? -1 : 1, lane: [-.45, .4, 0, .6, -.2, .2][i % 6] * (i % 2 ? -1 : 1), sp: .016 + R() * .008, x: 0, y: 0, a: 0, L: 60 }));
IST.stepFerries = (fs, g, o, dt) => {
  for (const f of fs) {
    f.u += f.dir * f.sp * dt * o.flow * 2; if (f.u > 1.12) f.u = -.12; if (f.u < -.12) f.u = 1.12;
    const at = u => { const x = u * g.W; return [x, g.cy(x) + f.lane * g.hw(x) * .62]; }, [x, y] = at(f.u), [x2, y2] = at(f.u + .01 * f.dir);
    f.x = x; f.y = y; f.a = Math.atan2(y2 - y, x2 - x); f.L = Math.max(46, Math.min(96, g.W * .05));
  }
};
IST.ferry = (c, f, P, o) => {
  const L = f.L; c.save(); c.translate(f.x, f.y); c.rotate(f.a);
  const wf = c.createLinearGradient(-L * .45, 0, -L * 2.4, 0), wl = c.createLinearGradient(-L * .45, 0, -L * 2.4, 0);
  wf.addColorStop(0, 'rgba(255,255,255,.16)'); wf.addColorStop(1, 'rgba(255,255,255,0)'); wl.addColorStop(0, 'rgba(255,255,255,.6)'); wl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = wf; c.beginPath(); c.moveTo(-L * .45, -L * .1); c.lineTo(-L * 2.4, -L * .34); c.lineTo(-L * 2.4, L * .34); c.lineTo(-L * .45, L * .1); c.closePath(); c.fill();
  c.strokeStyle = wl; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-L * .45, -L * .1); c.lineTo(-L * 2.4, -L * .34); c.moveTo(-L * .45, L * .1); c.lineTo(-L * 2.4, L * .34); c.stroke();
  const hull = () => { c.beginPath(); c.moveTo(L * .5, 0); c.bezierCurveTo(L * .38, -L * .17, L * .2, -L * .17, L * .1, -L * .17); c.lineTo(-L * .45, -L * .17); c.lineTo(-L * .5, -L * .1); c.lineTo(-L * .5, L * .1); c.lineTo(-L * .45, L * .17); c.lineTo(L * .1, L * .17); c.bezierCurveTo(L * .2, L * .17, L * .38, L * .17, L * .5, 0); c.closePath(); };
  c.save(); c.translate(3, 4); hull(); c.fillStyle = 'rgba(0,0,0,.25)'; c.fill(); c.restore();
  hull(); c.fillStyle = '#f4f1ea'; c.fill(); c.strokeStyle = '#3d4a58'; c.lineWidth = 1; c.stroke();
  c.fillStyle = '#c9d2d8'; c.fillRect(-L * .38, -L * .11, L * .5, L * .22); c.fillStyle = '#e9e5dc'; c.fillRect(-L * .1, -L * .09, L * .2, L * .18);
  for (const fx of [-.28, -.14]) { c.fillStyle = '#e45d2a'; c.beginPath(); c.arc(L * fx, 0, L * .075, 0, 6.3); c.fill(); c.fillStyle = '#2a2a2a'; c.beginPath(); c.arc(L * fx, 0, L * .042, 0, 6.3); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(L * .5, 0, L * .05, -1.4, 1.4); c.fill();   // pruva köpüğü
  if (P.win > .1) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,214,130,' + (.8 * P.win * Math.min(1, o.glow)).toFixed(2) + ')'; for (let i = 0; i < 7; i++) { c.fillRect(-L * .4 + i * L * .13, -L * .15, 2, 2); c.fillRect(-L * .4 + i * L * .13, L * .13, 2, 2); } }
  c.restore();
};
/* Martılar: eliptik yörüngede dönen, kanat çırpan ve suya gölge düşüren sürü */
IST.mkGulls = (n, W, H) => { const R = IST.rng(31); return Array.from({ length: n }, () => ({ cx: R() * W, cy: R() * H, rx: 60 + R() * 120, ry: 30 + R() * 60, sp: .25 + R() * .3, d: R() < .5 ? 1 : -1, ph: R() * 6.3, fl: R() * 6.3, s: 6 + R() * 4 })); };
IST.drawGulls = (c, gs, t) => {
  for (const q of gs) {
    const a = q.ph + t * q.sp * q.d, x = q.cx + Math.cos(a) * q.rx, y = q.cy + Math.sin(a) * q.ry, hd = Math.atan2(Math.cos(a) * q.ry * q.d, -Math.sin(a) * q.rx * q.d), fl = Math.sin(t * 8 + q.fl);
    for (const sh of [1, 0]) {
      c.save(); c.translate(x + sh * 14, y + sh * 20); c.rotate(hd); const s = q.s * (sh ? .8 : 1), wy = s * (1.5 + fl * .5);
      c.fillStyle = sh ? 'rgba(0,0,0,.13)' : '#f5f4ef'; c.strokeStyle = 'rgba(70,80,90,.55)'; c.lineWidth = .7;
      c.beginPath(); c.moveTo(s * .7, 0); c.lineTo(-s * .1, -s * .25); c.lineTo(-s * .4, -wy); c.lineTo(-s * .85, -wy * .8); c.lineTo(-s * .55, 0); c.lineTo(-s * .85, wy * .8); c.lineTo(-s * .4, wy); c.lineTo(-s * .1, s * .25); c.closePath(); c.fill(); if (!sh) c.stroke(); c.restore();
    }
  }
};
/* İkonun çevresi: karada çini meydan + lale kuşağı + kedi, denizde ahşap iskele + kayık + halka dalgalar */
IST.tulips = (c, x, y, w, h, t) => {
  const col = ['#d8322d', '#f2c230', '#c43a8f', '#f6f1e6', '#f08a2c'], st = 14, pts = [];
  for (let u = 0; u <= w; u += st) pts.push([x + u, y - 6], [x + u, y + h + 6]);
  for (let v = st; v < h; v += st) pts.push([x - 6, y + v], [x + w + 6, y + v]);
  pts.forEach(([px, py], i) => { const sw = Math.sin(t * 1.4 + i) * .9; c.fillStyle = '#3f7a3a'; c.beginPath(); c.ellipse(px, py + 2.5, 1.6, 3.4, 0, 0, 6.3); c.fill(); c.fillStyle = col[i % 5]; c.beginPath(); c.ellipse(px + sw, py - 1, 2.5, 3.3, 0, 0, 6.3); c.fill(); });
};
IST.cat = (c, x, y, a, col, t) => {
  c.save(); c.translate(x, y); c.rotate(a); const w = Math.sin(t * 1.6);
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(1.5, 2, 7, 4.2, 0, 0, 6.3); c.fill();
  c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-11, w * 4 + 2, -13, -3 + w * 3); c.stroke();
  c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 7, 4.2, 0, 0, 6.3); c.fill(); c.beginPath(); c.arc(7, 0, 3.4, 0, 6.3); c.fill();
  c.beginPath(); c.moveTo(7.6, -2.4); c.lineTo(9, -5); c.lineTo(10, -2); c.moveTo(7.6, 2.4); c.lineTo(9, 5); c.lineTo(10, 2); c.fill(); c.restore();
};
IST.plaza = (c, p, t, o, P) => {
  const k = Math.min(1, p.k * 1.25); if (k <= .01) return;
  const e = o.pad * p.k, x = p.x - e, y = p.y - e * .6, w = p.w + 2 * e, h = p.h + 1.6 * e, cx = x + w / 2, cy = y + h / 2, pt = IST.pats();
  c.save(); c.globalAlpha = k;
  if (!p.sea) {
    if (o.tulips && p.k > .35) IST.tulips(c, x, y, w, h, t);
    IST.rr(c, x + P.sh[0], y + P.sh[1], w, h, 11); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
    IST.rr(c, x, y, w, h, 11); c.fillStyle = pt.tile; c.fill();
    IST.rr(c, x + 8, y + 8, w - 16, h - 16, 6); c.fillStyle = pt.marble; c.fill(); c.strokeStyle = 'rgba(80,50,30,.35)'; c.lineWidth = 1; c.stroke();
    if (o.cats && IST.hash(p.id, 3.3) > .45) { const q = IST.hash(p.id, 9.1), cc = ['#d98a3d', '#2c2c33', '#9aa0aa', '#f0ede6'][q * 4 | 0]; IST.cat(c, q < .5 ? x + 22 : x + w - 22, y + h - 20, q * 12, cc, t); }
  } else {
    for (let i = 0; i < 2; i++) { const u = (t * .3 + i * .5) % 1; c.strokeStyle = 'rgba(255,255,255,' + ((1 - u) * .35).toFixed(3) + ')'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx, cy, w / 2 + 6 + u * 26, h / 2 + 6 + u * 26, 0, 0, 6.3); c.stroke(); }
    IST.rr(c, x + 3, y + 4, w, h, 6); c.fillStyle = 'rgba(0,10,30,.35)'; c.fill();
    IST.rr(c, x, y, w, h, 6); c.fillStyle = pt.plank; c.fill(); c.strokeStyle = '#c9a06a'; c.lineWidth = 2; c.stroke();
    for (const [bx, by] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { c.fillStyle = '#2b2b30'; c.beginPath(); c.arc(bx, by, 3.6, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(bx - 1, by - 1, 1.2, 0, 6.3); c.fill(); }
    c.save(); c.translate(x + w + 15, y + h * .4 + Math.sin(t * 1.3 + p.id) * 1.3); c.rotate(1.57 + Math.sin(t + p.id) * .05);   // bağlı kayık
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(2, 2, 15, 5, 0, 0, 6.3); c.fill(); c.fillStyle = '#c4553a'; c.beginPath(); c.ellipse(0, 0, 15, 5, 0, 0, 6.3); c.fill(); c.fillStyle = '#f0e6d0'; c.fillRect(-9, -1, 18, 2); c.restore();
  }
  if (P.win > .1 && o.glow > 0) { const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .8); g.addColorStop(0, 'rgba(255,200,110,' + (.34 * P.win * Math.min(1.5, o.glow)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,200,110,0)'); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(cx - w, cy - h, w * 2, h * 2); }
  c.restore();
};
