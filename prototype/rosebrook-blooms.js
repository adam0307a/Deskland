// Rose Brook: gouache-style blooming roses, wildflowers, ferns, drifting petals & butterflies.
// Baked once into a 2x Canvas2D sprite atlas and rendered in a single instanced WebGL2 draw call
// so 30fps stays effortless on integrated GPUs while icon drops unfurl lush flowers & roses.
const RB_FLOWER_VARIANTS = 8; // 0..3 roses & buds, 4..7 daisies, lavender, buttercups, ferns
const RB_PETAL_VARIANTS = 4;  // 8..9 drifting petals, 10..11 garden butterflies
const RB_ATLAS_COLS = RB_FLOWER_VARIANTS + RB_PETAL_VARIANTS;
const RB_SPRITE_SZ = 128;

let rbAtlasTex = null;
let rbInstPR = null;
let rbInstVAO = null;
let rbInstBufA = null;
let rbInstBufB = null;
let rbMaxInst = 0;

function makeRoseBrookAtlas() {
  const S = 2;
  const cv = document.createElement('canvas');
  cv.width = RB_ATLAS_COLS * RB_SPRITE_SZ * S;
  cv.height = RB_SPRITE_SZ * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);

  function drawShadow(cx, cy, rx, ry) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 48, 22, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy + 6, rx, ry, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLeaf(cx, cy, ang, len, wid, cDark, cLight) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, cDark);
    g.addColorStop(1, cLight);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(225, 252, 200, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(len * 0.78, 0);
    ctx.stroke();
    ctx.restore();
  }

  function paintRose(colIdx, outerC, midC, innerC, hiC, radius, layers) {
    const cx = colIdx * RB_SPRITE_SZ + 64;
    const cy = 64;
    drawShadow(cx, cy, radius * 1.05, radius * 0.88);
    // Ring of serrated emerald rose leaves
    for (let i = 0; i < 5; i++) {
      const a = i * (Math.PI * 2 / 5) + 0.35 + colIdx * 0.4;
      drawLeaf(cx, cy, a, radius * 1.48, radius * 0.46, '#23592d', '#4b9249');
    }
    // Layered spiral rose petals (outside -> center)
    for (let l = 0; l < layers; l++) {
      const f = l / Math.max(1, layers - 1);
      const count = Math.max(4, 7 - l);
      const rRing = radius * (0.94 - f * 0.62);
      const pRad = radius * (0.56 - f * 0.24);
      const cA = f < 0.4 ? outerC : f < 0.78 ? midC : innerC;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + l * 0.72 + colIdx;
        const px = cx + Math.cos(a) * rRing * 0.46;
        const py = cy + Math.sin(a) * rRing * 0.46;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI * 0.5);
        const g = ctx.createRadialGradient(0, -pRad * 0.35, 1, 0, 0, pRad * 1.15);
        g.addColorStop(0, hiC);
        g.addColorStop(0.55, cA);
        g.addColorStop(1, outerC);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, pRad * 0.92, pRad * 0.74, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 245, 248, 0.28)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(0, -pRad * 0.08, pRad * 0.76, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Tight rose heart spiral & dew drop
    ctx.fillStyle = innerC;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hiC;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let t = 0; t < 16; t++) {
      const a = t * 0.45, rr = t * radius * 0.015;
      const sx = cx + Math.cos(a) * rr, sy = cy + Math.sin(a) * rr;
      if (t === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.22, cy - radius * 0.25, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintDaisy(colIdx, petalA, petalB, coreC, petals, rad) {
    const cx = colIdx * RB_SPRITE_SZ + 64;
    const cy = 64;
    drawShadow(cx, cy, rad * 0.92, rad * 0.8);
    for (let i = 0; i < 4; i++) {
      drawLeaf(cx, cy, i * 1.57 + 0.4, rad * 1.32, rad * 0.34, '#2d6a36', '#5cab55');
    }
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, rad, 0);
      g.addColorStop(0, petalB);
      g.addColorStop(1, petalA);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(rad * 0.56, 0, rad * 0.46, rad * 0.21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const cg = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, rad * 0.34);
    cg.addColorStop(0, '#fff3a8');
    cg.addColorStop(0.7, coreC);
    cg.addColorStop(1, '#b87616');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintCluster(colIdx, c1, c2, c3) {
    const cx = colIdx * RB_SPRITE_SZ + 64;
    const cy = 64;
    drawShadow(cx, cy, 26, 22);
    for (let i = 0; i < 5; i++) {
      drawLeaf(cx, cy, i * 1.25 + 0.2, 34, 10, '#235c2f', '#52a34b');
    }
    const pts = [[-10, -8, 11], [10, -6, 10], [-7, 9, 10], [9, 8, 9], [0, 0, 12]];
    for (const [dx, dy, rr] of pts) {
      for (let k = 0; k < 5; k++) {
        const a = k * 1.256 + dx;
        ctx.fillStyle = k % 2 ? c1 : c2;
        ctx.beginPath();
        ctx.arc(cx + dx + Math.cos(a) * rr * 0.45, cy + dy + Math.sin(a) * rr * 0.45, rr * 0.44, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = c3;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, rr * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function paintFern(colIdx) {
    const cx = colIdx * RB_SPRITE_SZ + 64;
    const cy = 64;
    drawShadow(cx, cy, 28, 22);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.25;
      drawLeaf(cx, cy, a, 24 + (i % 2) * 10, 9.5, '#1e572b', '#62b356');
    }
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.7;
      drawLeaf(cx, cy, a, 16, 6.5, '#2d763a', '#87d16a');
    }
  }

  function paintPetal(colIdx, cTop, cBot) {
    const cx = colIdx * RB_SPRITE_SZ + 64;
    const cy = 64;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.35);
    const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 14);
    g.addColorStop(0, cTop);
    g.addColorStop(1, cBot);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.bezierCurveTo(12, -10, 11, 7, 0, 11);
    ctx.bezierCurveTo(-11, 7, -12, -10, 0, -11);
    ctx.fill();
    ctx.restore();
  }

  function paintButterfly(colIdx, wingOuter, wingInner) {
    const cx = colIdx * RB_SPRITE_SZ + 64;
    const cy = 64;
    ctx.save();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.scale(s, 1);
      const g = ctx.createRadialGradient(s * 6, -4, 1, 12, 0, 18);
      g.addColorStop(0, wingInner);
      g.addColorStop(1, wingOuter);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(9, -5, 9, 6.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(7, 5, 6.5, 4.8, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#2d2420';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 1.8, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 0..3: Crimson Rose, Pink Garden Rose, Cream-Gold Tea Rose, Ruby Rosebud
  paintRose(0, '#961231', '#d9234b', '#ff6484', '#ffc0ce', 29, 4);
  paintRose(1, '#c93c62', '#f26b90', '#ffa4be', '#ffe5ee', 28, 4);
  paintRose(2, '#cf892f', '#f4bd58', '#ffe38e', '#fff9df', 26, 4);
  paintRose(3, '#82102c', '#bd1c42', '#eb4e72', '#ffa1b8', 21, 3);
  // 4..7: White Daisy, Lavender Blossom Cluster, Buttercup Cluster, Emerald Fern Tuft
  paintDaisy(4, '#ffffff', '#e6ecd8', '#f2ae28', 11, 27);
  paintCluster(5, '#9d7ae6', '#c2a6ff', '#fff0a6');
  paintCluster(6, '#f6c83e', '#ffe477', '#d97a16');
  paintFern(7);
  // 8..9: Drifting Rose Petals
  paintPetal(8, '#ff7d9b', '#c61b41');
  paintPetal(9, '#ffc4d4', '#ec5b82');
  // 10..11: Butterflies (Gold & Sky)
  paintButterfly(10, '#f5a631', '#ffe885');
  paintButterfly(11, '#58b8eb', '#c8f0ff');

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE6);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

const RB_INST_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aInstA; // x, y, scale, variant
layout(location = 1) in vec4 aInstB; // rot, phase, sway, alpha
uniform vec2 uRes;
uniform float uTime, uBreeze;
out vec2 vUV;
out float vAlpha;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vec2 local = (corner - 0.5) * ${RB_SPRITE_SZ}.0 * aInstA.z;
  float c = cos(aInstB.x), s = sin(aInstB.x);
  vec2 rotP = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  float gust = sin(uTime * (1.25 + 0.75 * uBreeze) + aInstB.y + aInstA.x * 0.006);
  rotP.x += gust * 3.8 * aInstB.z * (0.25 + 0.75 * min(uBreeze, 2.2));
  vec2 p = aInstA.xy + rotP;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
  vUV = vec2((corner.x + aInstA.w) / ${RB_ATLAS_COLS}.0, corner.y);
  vAlpha = aInstB.w;
}`;

const RB_INST_FS = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
in vec2 vUV;
in float vAlpha;
out vec4 o;
void main() {
  vec4 c = texture(uAtlas, vUV);
  float a = c.a * vAlpha;
  if (a < 0.01) discard;
  o = vec4(c.rgb, a);
}`;

function ensureRoseBrookResources() {
  if (!rbAtlasTex) rbAtlasTex = makeRoseBrookAtlas();
  if (!rbInstPR) {
    const mk = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, RB_INST_VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, RB_INST_FS));
    gl.linkProgram(p);
    const U = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      U[nm] = gl.getUniformLocation(p, nm);
    }
    rbInstPR = { p, U };

    rbInstVAO = gl.createVertexArray();
    gl.bindVertexArray(rbInstVAO);
    rbInstBufA = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rbInstBufA);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);

    rbInstBufB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rbInstBufB);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
  }
}

function rbHash(a, b, k) {
  let h = Math.imul((seed + a * 374761393) | 0, 668265263) ^ Math.imul(b + k * 97, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ambientBlooms = [];
const iconBlooms = [];
const driftingPetals = [];
let prevIconList = [];
let rbBufA = new Float32Array(0);
let rbBufB = new Float32Array(0);

function spawnPetalBurst(cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const ang = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.7;
    const dist = 16 + Math.random() * 28;
    const spd = 22 + Math.random() * 34;
    driftingPetals.push({
      x: cx + Math.cos(ang) * dist,
      y: cy + Math.sin(ang) * dist,
      vx: Math.cos(ang) * spd + 14,
      vy: Math.sin(ang) * spd - 6,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 4.2,
      scale: 0.55 + Math.random() * 0.45,
      variant: Math.random() < 0.55 ? 8 : 9,
      phase: Math.random() * 6.28,
      life: 0,
      maxLife: 2.2 + Math.random() * 1.4,
      burst: true,
    });
  }
  while (driftingPetals.length > 90) driftingPetals.shift();
}

function rebuildRoseBrookGarden() {
  ambientBlooms.length = 0;
  const dens = Math.max(0.05, Math.min(1.5, P.roses));
  const stepX = Math.round(68 / Math.sqrt(dens));
  const stepY = Math.round(62 / Math.sqrt(dens));
  const cols = Math.ceil((W + stepX) / stepX) + 1;
  const rows = Math.ceil((H + stepY) / stepY) + 1;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const r0 = rbHash(gx, gy, 1);
      const r1 = rbHash(gx, gy, 2);
      const r2 = rbHash(gx, gy, 3);
      const r3 = rbHash(gx, gy, 4);
      const x = (gx - 0.5) * stepX + (r0 - 0.5) * stepX * 0.85;
      const y = (gy - 0.5) * stepY + (r1 - 0.5) * stepY * 0.85;
      const rd = Math.abs(y - brookCenterY(x)) - brookHalfWidth(x);
      // Skip items submerged inside stream; concentrate extra roses along lush riverbanks
      if (rd < 10) continue;
      const bankBoost = rd < 74 ? 0.92 : 0.45;
      if (r2 > dens * bankBoost) continue;

      let variant;
      if (rd < 62) {
        variant = r3 < 0.42 ? (Math.floor(r0 * 4) % 4) : (r3 < 0.74 ? 7 : 4 + (Math.floor(r1 * 3) % 3));
      } else {
        variant = r3 < 0.28 ? (Math.floor(r0 * 4) % 4) : (4 + (Math.floor(r2 * 4) % 4));
      }
      ambientBlooms.push({
        x, y,
        variant,
        rot: (r1 - 0.5) * 1.6,
        phase: r0 * Math.PI * 2,
        scale: (variant < 4 ? 0.48 : 0.42) + r2 * 0.34,
        sway: 0.6 + r3 * 0.6,
        cur: 0,
        want: 0,
      });
    }
  }
  syncRoseBrookBlooms(true, []);
}

function detectDroppedIcons(fromEmpty) {
  const dropped = [];
  if (fromEmpty) {
    for (const ic of icons) dropped.push({ ic, isNew: true });
    prevIconList = icons.map(ic => ({ x: ic.x + ic.w * 0.5, y: ic.y + ic.h * 0.5 }));
    return dropped;
  }
  const used = new Set();
  for (const ic of icons) {
    const cx = ic.x + ic.w * 0.5;
    const cy = ic.y + ic.h * 0.5;
    let bestIdx = -1, bestD = 1e9;
    for (let i = 0; i < prevIconList.length; i++) {
      if (used.has(i)) continue;
      const d = Math.hypot(prevIconList[i].x - cx, prevIconList[i].y - cy);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestD < 8) {
      used.add(bestIdx);
      dropped.push({ ic, isNew: false });
    } else {
      if (bestIdx >= 0) used.add(bestIdx);
      dropped.push({ ic, isNew: true });
    }
  }
  prevIconList = icons.map(ic => ({ x: ic.x + ic.w * 0.5, y: ic.y + ic.h * 0.5 }));
  return dropped;
}

function syncRoseBrookBlooms(fromEmpty, forcedDrops) {
  const now = performance.now();
  const fieldReady = typeof sampleField === 'function' && !!FB;

  for (const b of ambientBlooms) {
    const f = fieldReady ? sampleField(b.x, b.y) : 40;
    const rd = Math.abs(b.y - brookCenterY(b.x)) - brookHalfWidth(b.x);
    const onBank = rd > 12;
    const clearFactor = f > -10 ? 1.0 : 0.0;
    b.want = (onBank ? clearFactor : 0) * (P.roses > 0.02 ? 1 : 0);
    if (fromEmpty) b.cur = b.want;
  }

  // Rebuild icon wreaths matching current icon positions, preserving bloom birth timers for unmoved icons
  const oldByKey = new Map();
  for (const ib of iconBlooms) {
    const key = Math.round(ib.ix / 6) + ',' + Math.round(ib.iy / 6);
    if (!oldByKey.has(key)) oldByKey.set(key, ib.born);
  }

  const dropList = Array.isArray(forcedDrops) && forcedDrops.length
    ? icons.map(ic => ({
        ic,
        isNew: forcedDrops.some(d => Math.hypot(d.x - (ic.x + ic.w * 0.5), d.y - (ic.y + ic.h * 0.5)) < 24),
      }))
    : detectDroppedIcons(fromEmpty);

  iconBlooms.length = 0;
  const roseScale = 0.35 + P.roses * 0.75;
  const perIcon = Math.max(4, Math.round(6 + P.roses * 7));

  for (let idx = 0; idx < dropList.length; idx++) {
    const { ic, isNew } = dropList[idx];
    const cx = ic.x + ic.w * 0.5;
    const cy = ic.y + ic.h * 0.5;
    const rdCenter = Math.abs(cy - brookCenterY(cx)) - brookHalfWidth(cx);
    if (rdCenter < -8) continue;

    const key = Math.round(cx / 6) + ',' + Math.round(cy / 6);
    const bornBase = isNew ? now : (oldByKey.get(key) || (now - 1800));
    if (isNew && !fromEmpty) {
      spawnPetalBurst(cx, cy, Math.round(5 + P.roses * 7));
    }

    const baseRad = Math.max(ic.w, ic.h) * 0.56 + 10;
    for (let k = 0; k < perIcon; k++) {
      const h0 = rbHash(Math.round(cx), Math.round(cy), k * 7 + 11);
      const h1 = rbHash(Math.round(cx), Math.round(cy), k * 13 + 29);
      const ang = (k / perIcon) * Math.PI * 2 + (h0 - 0.5) * 0.42;
      const rad = baseRad + h1 * 18;
      const bx = cx + Math.cos(ang) * rad;
      const by = cy + Math.sin(ang) * rad;
      if (Math.abs(by - brookCenterY(bx)) - brookHalfWidth(bx) < 6) continue;
      // Rich mix centered on roses (variants 0..3) and companion daisies/lavender/ferns (4..7)
      const variant = (k % 2 === 0 || h0 < 0.58)
        ? Math.floor(h1 * 4) % 4
        : 4 + (Math.floor(h0 * 4) % 4);
      iconBlooms.push({
        ix: cx,
        iy: cy,
        x: bx,
        y: by,
        variant,
        rot: (h1 - 0.5) * 1.4,
        phase: h0 * 6.28,
        scale: ((variant < 4 ? 0.52 : 0.44) + h0 * 0.26) * Math.min(1.15, roseScale),
        sway: 0.7 + h1 * 0.5,
        born: bornBase + k * 42,
      });
    }
  }

  syncAmbientPetals();
}

function syncAmbientPetals() {
  const want = Math.max(0, Math.round(P.petals || 0));
  const curAmbient = driftingPetals.filter(p => !p.burst).length;
  if (curAmbient < want) {
    for (let i = curAmbient; i < want; i++) {
      const isButterfly = i % 5 === 0;
      driftingPetals.push({
        x: Math.random() * (W || 1280),
        y: Math.random() * (H || 720),
        vx: (isButterfly ? 22 : 16) + Math.random() * 18,
        vy: (Math.random() - 0.35) * 14,
        rot: Math.random() * 6.28,
        vrot: isButterfly ? 0 : (Math.random() - 0.5) * 1.8,
        scale: isButterfly ? (0.48 + Math.random() * 0.22) : (0.42 + Math.random() * 0.34),
        variant: isButterfly ? (10 + (i % 2)) : (8 + (i % 2)),
        phase: Math.random() * 6.28,
        life: 0,
        maxLife: 1e9,
        burst: false,
      });
    }
  } else if (curAmbient > want) {
    let remove = curAmbient - want;
    for (let i = driftingPetals.length - 1; i >= 0 && remove > 0; i--) {
      if (!driftingPetals[i].burst) {
        driftingPetals.splice(i, 1);
        remove--;
      }
    }
  }
}

function stepRoseBrook(dt) {
  const morphRate = Math.min(1, dt * 3.8);
  for (const b of ambientBlooms) {
    b.cur += (b.want - b.cur) * morphRate;
  }
  const breeze = P.breeze || 1;
  for (let i = driftingPetals.length - 1; i >= 0; i--) {
    const p = driftingPetals[i];
    p.life += dt;
    if (p.burst && p.life >= p.maxLife) {
      driftingPetals.splice(i, 1);
      continue;
    }
    const flutter = Math.sin(p.life * 2.6 + p.phase);
    p.x += (p.vx * (0.55 + 0.45 * breeze) + flutter * 10) * dt;
    p.y += (p.vy + Math.cos(p.life * 2.1 + p.phase) * 12) * dt;
    if (p.burst) {
      p.vx *= Math.pow(0.45, dt);
      p.vy += 8 * dt;
    }
    p.rot += p.vrot * dt;
    if (!p.burst) {
      if (p.x > W + 40) p.x = -36;
      if (p.x < -40) p.x = W + 36;
      if (p.y > H + 40) p.y = -36;
      if (p.y < -40) p.y = H + 36;
    }
  }
}

function backOutEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

function drawRoseBrookBlooms(now) {
  ensureRoseBrookResources();
  const list = [];
  for (const b of ambientBlooms) {
    if (b.cur < 0.03) continue;
    const sc = b.scale * Math.min(1.0, b.cur);
    list.push([b.x, b.y, sc, b.variant, b.rot, b.phase, b.sway, Math.min(1, b.cur * 1.15)]);
  }
  for (const ib of iconBlooms) {
    const t = Math.max(0, (now - ib.born) / 720);
    const e = backOutEase(t);
    if (e <= 0.01) continue;
    const spin = (1 - Math.min(1, t)) * 0.55;
    list.push([ib.x, ib.y, ib.scale * e, ib.variant, ib.rot + spin, ib.phase, ib.sway, Math.min(1, t * 2.2)]);
  }
  for (const p of driftingPetals) {
    const fadeOut = p.burst ? Math.max(0, 1 - Math.max(0, p.life - (p.maxLife - 0.7)) / 0.7) : 1;
    const wingPulse = p.variant >= 10 ? 0.68 + 0.32 * Math.sin(now * 0.014 + p.phase) : 1.0;
    list.push([p.x, p.y, p.scale * wingPulse, p.variant, p.rot, p.phase, 0.35, 0.92 * fadeOut]);
  }
  const n = list.length;
  if (n === 0) return;
  if (n > rbMaxInst) {
    rbMaxInst = n + 64;
    rbBufA = new Float32Array(rbMaxInst * 4);
    rbBufB = new Float32Array(rbMaxInst * 4);
  }
  // Sort back-to-front by Y (drifting petals float on top)
  list.sort((a, b) => (a[3] >= 8 ? a[1] + 5000 : a[1]) - (b[3] >= 8 ? b[1] + 5000 : b[1]));
  for (let i = 0; i < n; i++) {
    const it = list[i];
    const j = i * 4;
    rbBufA[j] = it[0]; rbBufA[j + 1] = it[1]; rbBufA[j + 2] = it[2]; rbBufA[j + 3] = it[3];
    rbBufB[j] = it[4]; rbBufB[j + 1] = it[5]; rbBufB[j + 2] = it[6]; rbBufB[j + 3] = it[7];
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(rbInstPR.p);
  gl.activeTexture(gl.TEXTURE6);
  gl.bindTexture(gl.TEXTURE_2D, rbAtlasTex);
  gl.uniform1i(rbInstPR.U.uAtlas, 6);
  gl.uniform2f(rbInstPR.U.uRes, W, H);
  gl.uniform1f(rbInstPR.U.uTime, (now - T0) / 1000);
  gl.uniform1f(rbInstPR.U.uBreeze, P.breeze || 1);

  gl.bindVertexArray(rbInstVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, rbInstBufA);
  gl.bufferData(gl.ARRAY_BUFFER, rbBufA.subarray(0, n * 4), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, rbInstBufB);
  gl.bufferData(gl.ARRAY_BUFFER, rbBufB.subarray(0, n * 4), gl.DYNAMIC_DRAW);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
}

if (typeof FB !== 'undefined' && FB) {
  rebuildRoseBrookGarden();
}
