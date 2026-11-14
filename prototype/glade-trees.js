// Woodland Glade: gouache-style animated trees & perched/gliding woodland birds.
// Baked once into a 2x Canvas2D sprite atlas and rendered in a single instanced WebGL2 draw call
// (sorted back-to-front by trunk base Y) to keep 30fps effortless on integrated GPUs.
const GLADE_TREE_VARIANTS = 8;
const GLADE_BIRD_VARIANTS = 3;
const GLADE_ATLAS_COLS = GLADE_TREE_VARIANTS + GLADE_BIRD_VARIANTS;
const GLADE_SPRITE_W = 128;
const GLADE_SPRITE_H = 168;
const GLADE_BASE_Y = 146; // Trunk base anchor inside sprite cell

let gladeAtlasTex = null;
let gladeInstPR = null;
let gladeInstVAO = null;
let gladeInstBufA = null;
let gladeInstBufB = null;
let gladeMaxInst = 0;

function makeGladeSpriteAtlas() {
  const S = 2;
  const cv = document.createElement('canvas');
  cv.width = GLADE_ATLAS_COLS * GLADE_SPRITE_W * S;
  cv.height = GLADE_SPRITE_H * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);

  const hash = (a, b) => {
    let x = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  function drawShadow(cx, by, rx, ry) {
    ctx.save();
    ctx.fillStyle = 'rgba(54, 88, 44, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx + 12, by + 3, rx, ry, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTrunk(cx, by, w, h, col) {
    ctx.save();
    ctx.fillStyle = col || '#6b4d39';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, by);
    ctx.lineTo(cx - w * 0.36, by - h);
    ctx.lineTo(cx + w * 0.36, by - h);
    ctx.lineTo(cx + w * 0.5, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(cx, by - h, w * 0.42, h);
    ctx.restore();
  }

  function paintConifer(cx, by, width, height, tiers, cTop, cBot, cHi, seedBase) {
    drawShadow(cx, by, width * 0.48, 7.5);
    drawTrunk(cx, by, Math.max(6, width * 0.14), 22, '#624634');
    const trunkTop = by - 14;
    for (let t = 0; t < tiers; t++) {
      const f0 = t / tiers;
      const f1 = (t + 1.18) / tiers;
      const yBot = trunkTop - height * f0 * 0.78;
      const yTop = trunkTop - height * Math.min(1, f1);
      const halfW = width * 0.5 * (1.0 - f0 * 0.52);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + (hash(seedBase, t * 3) - 0.5) * 3, yTop);
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const u = i / steps;
        const px = cx + halfW * u + (hash(seedBase + 11, t * 13 + i) - 0.5) * 4;
        const py = yTop + (yBot - yTop) * u + (i < steps ? (hash(seedBase + 21, t * 17 + i) - 0.5) * 3 : 0);
        ctx.lineTo(px, py);
      }
      ctx.quadraticCurveTo(cx, yBot + 5, cx - halfW, yBot);
      for (let i = steps - 1; i >= 1; i--) {
        const u = i / steps;
        const px = cx - halfW * u + (hash(seedBase + 31, t * 19 + i) - 0.5) * 4;
        const py = yTop + (yBot - yTop) * u + (hash(seedBase + 41, t * 23 + i) - 0.5) * 3;
        ctx.lineTo(px, py);
      }
      ctx.closePath();

      const g = ctx.createLinearGradient(cx - halfW, yTop, cx + halfW * 0.7, yBot);
      g.addColorStop(0, cHi);
      g.addColorStop(0.35, cTop);
      g.addColorStop(1, cBot);
      ctx.fillStyle = g;
      ctx.fill();

      // Gouache branch texture strokes
      ctx.strokeStyle = 'rgba(18, 42, 30, 0.16)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const sy = yTop + (yBot - yTop) * (0.38 + k * 0.22);
        const sw = halfW * (0.28 + k * 0.16);
        ctx.beginPath();
        ctx.arc(cx - sw * 0.2, sy, sw * 0.5, 0.2, 1.3);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function paintRoundCrown(cx, by, rx, ry, lobes, cTop, cBot, cHi, scallops, seedBase) {
    drawShadow(cx, by, rx * 0.85, 8.5);
    drawTrunk(cx, by, Math.max(7, rx * 0.24), 32, '#6d4c37');
    const cy = by - 22 - ry * 0.85;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < lobes; i++) {
      const a0 = (i / lobes) * Math.PI * 2;
      const a1 = ((i + 0.5) / lobes) * Math.PI * 2;
      const a2 = ((i + 1) / lobes) * Math.PI * 2;
      const r0 = 0.88 + hash(seedBase, i * 7) * 0.18;
      const r1 = 1.02 + hash(seedBase + 5, i * 11) * 0.16;
      const x1 = cx + Math.cos(a1) * rx * r1;
      const y1 = cy + Math.sin(a1) * ry * r1;
      const x2 = cx + Math.cos(a2) * rx * r0;
      const y2 = cy + Math.sin(a2) * ry * r0;
      if (i === 0) ctx.moveTo(cx + Math.cos(a0) * rx * r0, cy + Math.sin(a0) * ry * r0);
      ctx.quadraticCurveTo(x1, y1, x2, y2);
    }
    ctx.closePath();

    const g = ctx.createRadialGradient(cx - rx * 0.32, cy - ry * 0.38, rx * 0.1, cx, cy, Math.max(rx, ry) * 1.15);
    g.addColorStop(0, cHi);
    g.addColorStop(0.5, cTop);
    g.addColorStop(1, cBot);
    ctx.fillStyle = g;
    ctx.fill();

    if (scallops) {
      ctx.strokeStyle = 'rgba(20, 48, 28, 0.16)';
      ctx.lineWidth = 1.25;
      for (let row = 0; row < 4; row++) {
        const sy = cy - ry * 0.45 + row * (ry * 0.34);
        const span = rx * (0.55 + (row === 1 || row === 2 ? 0.25 : 0));
        const count = 3 + (row % 2);
        for (let k = 0; k < count; k++) {
          const sx = cx - span * 0.65 + (k / Math.max(1, count - 1)) * span * 1.3;
          ctx.beginPath();
          ctx.arc(sx, sy, 6.2, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function paintCypress(cx, by, rx, height, cTop, cBot, cHi, seedBase) {
    drawShadow(cx, by, rx * 0.9, 6.5);
    drawTrunk(cx, by, Math.max(5.5, rx * 0.28), 24, '#604535');
    const bot = by - 16;
    const top = bot - height;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, top);
    ctx.bezierCurveTo(cx + rx * 0.9, top + height * 0.24, cx + rx * 1.15, bot - height * 0.18, cx, bot + 3);
    ctx.bezierCurveTo(cx - rx * 1.15, bot - height * 0.18, cx - rx * 0.9, top + height * 0.24, cx, top);
    ctx.closePath();

    const g = ctx.createLinearGradient(cx - rx, top, cx + rx, bot);
    g.addColorStop(0, cHi);
    g.addColorStop(0.42, cTop);
    g.addColorStop(1, cBot);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = 'rgba(15, 38, 28, 0.15)';
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 4; k++) {
      const yy = top + height * (0.28 + k * 0.16);
      const off = (hash(seedBase, k * 9) - 0.5) * rx * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + off - 4, yy);
      ctx.quadraticCurveTo(cx + off, yy + 4, cx + off + 5, yy - 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Paint 8 tree variants
  paintConifer(0 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 64, 118, 3, '#255c47', '#16382d', '#33745b', 10);
  paintConifer(1 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 56, 108, 3, '#97b552', '#708f3b', '#b4cf67', 20);
  paintRoundCrown(2 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 36, 38, 9, '#62a45d', '#3c7744', '#86c16c', true, 30);
  paintRoundCrown(3 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 32, 34, 8, '#286446', '#184031', '#3d8058', false, 40);
  paintCypress(4 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 21, 108, '#4e8a7e', '#32635f', '#6ca494', 50);
  paintConifer(5 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 62, 112, 4, '#36756a', '#1f4b48', '#4e9183', 60);
  paintRoundCrown(6 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 37, 33, 10, '#85ad58', '#5b833e', '#a3c66c', true, 70);
  paintCypress(7 * GLADE_SPRITE_W + 64, GLADE_BASE_Y, 22, 114, '#2c5b43', '#19392a', '#427858', 80);

  // Paint 3 tiny woodland bird variants (8: white tit, 9: red-breasted robin, 10: black-and-white magpie)
  const birds = [
    { body: '#f7f8f3', wing: '#d9e0d2', chest: '#f7f8f3', head: '#eef1e6', beak: '#d99838' },
    { body: '#6e5242', wing: '#523c30', chest: '#df633c', head: '#624839', beak: '#332820' },
    { body: '#232832', wing: '#f1f4f6', chest: '#f1f4f6', head: '#1c2028', beak: '#404856' },
  ];
  for (let b = 0; b < GLADE_BIRD_VARIANTS; b++) {
    const pal = birds[b];
    const ox = (GLADE_TREE_VARIANTS + b) * GLADE_SPRITE_W + 64;
    const oy = GLADE_SPRITE_H * 0.5;
    ctx.save();
    // Tail
    ctx.fillStyle = pal.wing;
    ctx.beginPath();
    ctx.moveTo(ox - 6, oy + 1);
    ctx.lineTo(ox - 16, oy + 5);
    ctx.lineTo(ox - 13, oy - 1);
    ctx.closePath();
    ctx.fill();
    // Body
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.ellipse(ox, oy, 8.5, 5.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Chest accent
    ctx.fillStyle = pal.chest;
    ctx.beginPath();
    ctx.ellipse(ox + 3, oy + 1.5, 5, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Wing highlight
    ctx.fillStyle = pal.wing;
    ctx.beginPath();
    ctx.ellipse(ox - 2, oy - 1, 6, 3.3, -0.25, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = pal.head;
    ctx.beginPath();
    ctx.arc(ox + 7, oy - 4, 4.2, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = pal.beak;
    ctx.beginPath();
    ctx.moveTo(ox + 10.5, oy - 5);
    ctx.lineTo(ox + 15, oy - 3.5);
    ctx.lineTo(ox + 10.5, oy - 2.2);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(ox + 8.3, oy - 4.6, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

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

const GLADE_INST_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aInstA; // x, y, scale, variant
layout(location = 1) in vec4 aInstB; // mirror, phase, swayAmt, alpha
uniform vec2 uRes;
uniform float uTime, uWind;
out vec2 vUV;
out float vAlpha;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  // Anchor horizontal center, trunk base at GLADE_BASE_Y / GLADE_SPRITE_H
  vec2 local = vec2(
    (corner.x - 0.5) * ${GLADE_SPRITE_W}.0,
    corner.y * ${GLADE_SPRITE_H}.0 - ${GLADE_BASE_Y}.0
  );
  local.x *= aInstB.x;
  // Sway more at the treetop, trunk base stays planted
  float heightFrac = clamp((${GLADE_BASE_Y}.0 - corner.y * ${GLADE_SPRITE_H}.0) / ${GLADE_BASE_Y}.0, 0.0, 1.0);
  float gust = sin(uTime * (0.95 + 0.55 * uWind) + aInstB.y + aInstA.x * 0.004 + aInstA.y * 0.002);
  local.x += gust * heightFrac * heightFrac * 6.5 * aInstB.z * (0.25 + 0.75 * min(uWind, 2.5));
  vec2 p = aInstA.xy + local * aInstA.z;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
  vUV = vec2((corner.x + aInstA.w) / ${GLADE_ATLAS_COLS}.0, corner.y);
  vAlpha = aInstB.w;
}`;

const GLADE_INST_FS = `#version 300 es
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

function ensureGladeResources() {
  if (!gladeAtlasTex) gladeAtlasTex = makeGladeSpriteAtlas();
  if (!gladeInstPR) {
    const mk = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, GLADE_INST_VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, GLADE_INST_FS));
    gl.linkProgram(p);
    const U = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      U[nm] = gl.getUniformLocation(p, nm);
    }
    gladeInstPR = { p, U };

    gladeInstVAO = gl.createVertexArray();
    gl.bindVertexArray(gladeInstVAO);
    gladeInstBufA = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gladeInstBufA);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);

    gladeInstBufB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gladeInstBufB);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
  }
}

function gladeRand(a, b, k) {
  let h = Math.imul((seed + a * 374761393) | 0, 668265263) ^ Math.imul(b + k * 97, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Exposes `trees` with `.grow` and `.want` so share.js settled() works seamlessly.
const trees = [];
const birds = [];
let gladeBufA = new Float32Array(0);
let gladeBufB = new Float32Array(0);

function rebuildGladeForest() {
  trees.length = 0;
  const dens = Math.max(0.2, Math.min(1.5, P.density));
  const stepX = Math.round(52 / Math.sqrt(dens));
  const stepY = Math.round(42 / Math.sqrt(dens));
  const cols = Math.ceil((W + stepX) / stepX) + 1;
  const rows = Math.ceil((H + stepY) / stepY) + 1;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const r1 = gladeRand(gx, gy, 1);
      const r2 = gladeRand(gx, gy, 2);
      const r3 = gladeRand(gx, gy, 3);
      const r4 = gladeRand(gx, gy, 4);
      const r5 = gladeRand(gx, gy, 5);
      // Slight skip to keep organic forest glades & natural variation
      if (r5 < 0.08) continue;
      const offsetX = (gy % 2) * (stepX * 0.5);
      const x = gx * stepX - 24 + offsetX + (r1 - 0.5) * stepX * 0.72;
      const y = gy * stepY - 10 + (r2 - 0.5) * stepY * 0.72;
      if (x < -30 || x > W + 30 || y < 12 || y > H + 56) continue;
      const variant = Math.floor(r3 * GLADE_TREE_VARIANTS);
      const scale = 0.72 + r4 * 0.48;
      trees.push({
        x, y,
        variant,
        scale,
        mirror: r1 < 0.5 ? -1 : 1,
        phase: r2 * Math.PI * 2,
        grow: 0,
        want: 1,
      });
    }
  }
  trees.sort((a, b) => a.y - b.y);
  updateGladeTargets(true);
  syncGladeBirds(true);
}

function updateGladeTargets(instant = false) {
  const sAt = typeof landS === 'function' ? landS : curS;
  for (const t of trees) {
    // Check tree trunk/canopy footprint against clearing SDF (`s < 0` is open glade)
    const sFoot = sAt(t.x, t.y);
    const sCrown = sAt(t.x, t.y - 24 * t.scale);
    const s = Math.min(sFoot, sCrown);
    t.want = !P.adaptive || s > 4 ? 1 : 0;
    if (instant) t.grow = t.want;
  }
}

function syncGladeBirds(reset = false) {
  if (reset) birds.length = 0;
  const want = Math.max(0, Math.min(10, Math.round(P.birds)));
  while (birds.length > want) birds.pop();
  const grown = trees.filter(t => t.want > 0.5 && t.x > 40 && t.x < W - 40 && t.y > 60 && t.y < H - TASKBAR - 20);
  while (birds.length < want && grown.length) {
    const t = grown[Math.floor(Math.random() * grown.length)];
    birds.push({
      tree: t,
      x: t.x,
      y: t.y - 82 * t.scale,
      variant: Math.floor(Math.random() * GLADE_BIRD_VARIANTS),
      mirror: Math.random() < 0.5 ? -1 : 1,
      wait: 2 + Math.random() * 5,
      fly: null,
    });
  }
}

function stepGladeForest(dt) {
  for (const t of trees) {
    if (t.grow === t.want) continue;
    if (t.grow < t.want) t.grow = Math.min(t.want, t.grow + dt * 1.45);
    else t.grow = Math.max(t.want, t.grow - dt * 1.75);
  }
  for (let i = birds.length - 1; i >= 0; i--) {
    const b = birds[i];
    if (b.fly) {
      b.fly.t += dt / b.fly.dur;
      if (b.fly.t >= 1) {
        b.tree = b.fly.to;
        b.x = b.tree.x;
        b.y = b.tree.y - 82 * b.tree.scale;
        b.fly = null;
        b.wait = 2.5 + Math.random() * 6;
      } else {
        const u = b.fly.t;
        const arc = Math.sin(u * Math.PI) * 26;
        b.x = b.fly.sx + (b.fly.tx - b.fly.sx) * u;
        b.y = b.fly.sy + (b.fly.ty - b.fly.sy) * u - arc;
      }
      continue;
    }
    if (!b.tree || b.tree.want < 0.5 || b.tree.grow < 0.6) {
      b.wait = 0;
    } else {
      b.x = b.tree.x;
      b.y = b.tree.y - 82 * b.tree.scale * b.tree.grow;
      b.wait -= dt;
    }
    if (b.wait <= 0) {
      const cands = trees.filter(t => t !== b.tree && t.want > 0.5 && t.grow > 0.8 && t.x > 30 && t.x < W - 30 && t.y > 50 && t.y < H - TASKBAR - 20);
      if (cands.length) {
        const dst = cands[Math.floor(Math.random() * cands.length)];
        const tx = dst.x, ty = dst.y - 82 * dst.scale;
        b.mirror = tx >= b.x ? 1 : -1;
        const dist = Math.hypot(tx - b.x, ty - b.y);
        b.fly = { sx: b.x, sy: b.y, tx, ty, to: dst, t: 0, dur: Math.max(0.7, Math.min(2.6, dist / 160)) };
      } else {
        b.wait = 2;
      }
    }
  }
}

function drawGladeForest(timeSec) {
  if (!trees.length && !birds.length) return;
  ensureGladeResources();

  const totalNeed = trees.length + birds.length;
  if (gladeBufA.length < totalNeed * 4) {
    gladeBufA = new Float32Array(totalNeed * 4);
    gladeBufB = new Float32Array(totalNeed * 4);
  }

  let count = 0;
  for (const t of trees) {
    if (t.grow <= 0.015) continue;
    const e = t.grow * t.grow * (3 - 2 * t.grow);
    const o = count * 4;
    gladeBufA[o] = t.x;
    gladeBufA[o + 1] = t.y;
    gladeBufA[o + 2] = t.scale * e;
    gladeBufA[o + 3] = t.variant;
    gladeBufB[o] = t.mirror;
    gladeBufB[o + 1] = t.phase;
    gladeBufB[o + 2] = 1.0;
    gladeBufB[o + 3] = Math.min(1, e * 1.15);
    count++;
  }

  for (const b of birds) {
    if (!b.fly && (!b.tree || b.tree.grow < 0.6)) continue;
    let bx = b.x, by = b.y;
    if (!b.fly && b.tree) {
      const gust = Math.sin(timeSec * (0.95 + 0.55 * P.wind) + b.tree.phase + b.tree.x * 0.004 + b.tree.y * 0.002);
      bx += gust * 4.5 * (0.25 + 0.75 * Math.min(P.wind, 2.5)) * b.tree.scale;
    }
    const o = count * 4;
    gladeBufA[o] = bx;
    gladeBufA[o + 1] = by + 55;
    gladeBufA[o + 2] = 0.88;
    gladeBufA[o + 3] = GLADE_TREE_VARIANTS + b.variant;
    gladeBufB[o] = b.mirror;
    gladeBufB[o + 1] = 0.0;
    gladeBufB[o + 2] = 0.0;
    gladeBufB[o + 3] = 0.96;
    count++;
  }

  if (!count) return;

  gl.useProgram(gladeInstPR.p);
  gl.bindVertexArray(gladeInstVAO);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.activeTexture(gl.TEXTURE6);
  gl.bindTexture(gl.TEXTURE_2D, gladeAtlasTex);
  gl.uniform1i(gladeInstPR.U.uAtlas, 6);
  gl.uniform2f(gladeInstPR.U.uRes, cv.width / cv._scale, cv.height / cv._scale);
  gl.uniform1f(gladeInstPR.U.uTime, timeSec);
  gl.uniform1f(gladeInstPR.U.uWind, P.wind);

  const subA = gladeBufA.subarray(0, count * 4);
  const subB = gladeBufB.subarray(0, count * 4);
  gl.bindBuffer(gl.ARRAY_BUFFER, gladeInstBufA);
  if (count > gladeMaxInst) {
    gl.bufferData(gl.ARRAY_BUFFER, subA, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, gladeInstBufB);
    gl.bufferData(gl.ARRAY_BUFFER, subB, gl.DYNAMIC_DRAW);
    gladeMaxInst = count;
  } else {
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, subA);
    gl.bindBuffer(gl.ARRAY_BUFFER, gladeInstBufB);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, subB);
  }

  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  gl.disable(gl.BLEND);
  gl.bindVertexArray(null);
}
