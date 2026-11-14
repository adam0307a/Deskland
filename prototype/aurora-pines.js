// Aurora themes' snowy Nordic pines and warm glowing lanterns.
// Baked once into a 2x Canvas2D atlas texture and drawn as small WebGL quads
// so integrated GPUs stay fast at 30fps without per-pixel tree loops.
const AURORA_PINE_VARIANTS = 4;
const AURORA_LANTERN_VARIANT = 4;
const AURORA_ATLAS_COLS = 5;
const AURORA_SPRITE_W = 160;
const AURORA_SPRITE_H = 160;

let auroraAtlasTex = null;
let auroraSpritePR = null;

function makeAuroraSpriteAtlas() {
  const S = 2;
  const cv = document.createElement('canvas');
  cv.width = AURORA_ATLAS_COLS * AURORA_SPRITE_W * S;
  cv.height = AURORA_SPRITE_H * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);

  const hash = (a, b) => {
    let x = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  // Variants 0..3: Top-down snow-dusted pine trees
  for (let v = 0; v < AURORA_PINE_VARIANTS; v++) {
    const ox = v * AURORA_SPRITE_W;
    const cx = ox + AURORA_SPRITE_W * 0.5;
    const cy = AURORA_SPRITE_H * 0.5;
    const baseR = 26 + v * 2.5;

    // Ground shadow cast toward bottom-right (+0.6, +0.8)
    ctx.save();
    ctx.fillStyle = 'rgba(14, 24, 46, 0.34)';
    for (let t = 0; t < 3; t++) {
      const r = baseR * (0.98 - t * 0.2);
      ctx.beginPath();
      ctx.ellipse(cx + 12 + t * 2, cy + 16 + t * 2, r * 0.95, r * 0.85, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Multi-tiered star/needle foliage + northwest snow dusting
    const tiers = 4;
    for (let tier = 0; tier < tiers; tier++) {
      const f = tier / (tiers - 1);
      const r = baseR * (1.0 - f * 0.62);
      const arms = 11 + (v % 3) * 2 + (tier % 2) * 2;
      const tierRot = v * 0.9 + tier * 0.43;
      const tx = cx - f * 3.5;
      const ty = cy - f * 4.5;

      // Dark pine silhouette
      ctx.beginPath();
      for (let i = 0; i < arms * 2; i++) {
        const ang = tierRot + (i * Math.PI) / arms;
        const j = hash(v * 97 + tier * 31, i);
        const rad = i % 2 === 0 ? r * (0.88 + j * 0.26) : r * (0.54 + j * 0.14);
        const px = tx + Math.cos(ang) * rad;
        const py = ty + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const shade = Math.round(tier * 12);
      const g = ctx.createRadialGradient(tx - r * 0.25, ty - r * 0.25, r * 0.1, tx, ty, r);
      g.addColorStop(0, `rgb(${42 + shade}, ${78 + shade}, ${76 + shade})`);
      g.addColorStop(1, `rgb(${20 + (shade >> 1)}, ${44 + (shade >> 1)}, ${52 + (shade >> 1)})`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = 'rgba(11, 23, 34, 0.45)';
      ctx.stroke();

      // Twilight snow patches resting on north-west facing branches
      ctx.beginPath();
      for (let i = 0; i < arms; i++) {
        const ang = tierRot + (i * 2 * Math.PI) / arms;
        if (Math.cos(ang) * -0.6 + Math.sin(ang) * -0.8 < -0.1) continue;
        const j = hash(v * 53 + tier * 17, i + 40);
        const rad = r * (0.62 + j * 0.25);
        const px = tx + Math.cos(ang) * rad;
        const py = ty + Math.sin(ang) * rad;
        const sr = r * (0.19 + j * 0.11);
        ctx.moveTo(px + sr, py);
        ctx.arc(px, py, sr, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(182, 212, 238, ${0.42 + f * 0.26})`;
      ctx.fill();
    }
  }

  // Variant 4: Cozy warm Nordic lantern with wide golden glow pool
  {
    const ox = AURORA_LANTERN_VARIANT * AURORA_SPRITE_W;
    const cx = ox + AURORA_SPRITE_W * 0.5;
    const cy = AURORA_SPRITE_H * 0.5;

    // Wide amber ground halo
    const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 74);
    halo.addColorStop(0.0, 'rgba(255, 224, 140, 0.85)');
    halo.addColorStop(0.18, 'rgba(255, 178, 76, 0.52)');
    halo.addColorStop(0.48, 'rgba(232, 130, 52, 0.20)');
    halo.addColorStop(1.0, 'rgba(232, 130, 52, 0.0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 74, 0, Math.PI * 2);
    ctx.fill();

    // Subtle dark lantern shadow
    ctx.fillStyle = 'rgba(12, 18, 34, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 5, 6.5, 5.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Dark iron roof cap
    ctx.fillStyle = '#202636';
    ctx.beginPath();
    ctx.arc(cx, cy, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Bright warm flame core
    const core = ctx.createRadialGradient(cx, cy, 0.4, cx, cy, 4.6);
    core.addColorStop(0, '#fffdf0');
    core.addColorStop(0.55, '#ffd466');
    core.addColorStop(1, '#f08a24');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 4.6, 0, Math.PI * 2);
    ctx.fill();
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

const AURORA_SPRITE_VS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uSprite;   // x, y, scale, variant
uniform float uMirror;
uniform float uTime;
uniform float uSway;
out vec2 spriteUV;
void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vec2 local = (corner - 0.5) * vec2(${AURORA_SPRITE_W}.0, ${AURORA_SPRITE_H}.0);
  local.x *= uMirror;
  float a = sin(uTime * 0.9 + uSprite.w * 1.9 + uSprite.x * 0.01) * 0.035 * uSway;
  local = mat2(cos(a), sin(a), -sin(a), cos(a)) * local;
  vec2 p = uSprite.xy + local * uSprite.z;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
  spriteUV = vec2((corner.x + uSprite.w) / ${AURORA_ATLAS_COLS}.0, corner.y);
}`;

const AURORA_SPRITE_FS = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform float uOpacity;
uniform float uPulse;
in vec2 spriteUV;
out vec4 o;
void main() {
  vec4 c = texture(uAtlas, spriteUV);
  if (c.a < 0.004) discard;
  float alpha = c.a * uOpacity * uPulse;
  o = vec4(c.rgb * uPulse, alpha);
}`;

function ensureAuroraSpriteResources() {
  if (!auroraAtlasTex) auroraAtlasTex = makeAuroraSpriteAtlas();
  if (!auroraSpritePR) {
    const mk = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, AURORA_SPRITE_VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, AURORA_SPRITE_FS));
    gl.linkProgram(p);
    const U = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      U[nm] = gl.getUniformLocation(p, nm);
    }
    auroraSpritePR = { p, U };
  }
}

function auroraSpotClear(x, y, pad) {
  return icons.every(ic => {
    const l = ic.x - pad, t = ic.y - pad, r = ic.x + ic.w + pad, b = ic.y + ic.h + pad;
    return x < l || x > r || y < t || y > b;
  });
}

// Exposes `trees` with `.grow` and `.want` so share.js settled() waits cleanly.
const trees = [];
const lanterns = [];

function auroraRand(i, k) {
  let h = Math.imul((seed + i * 131) | 0, 374761393) ^ Math.imul(k + 19, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rebuildAuroraProps() {
  trees.length = 0;
  lanterns.length = 0;
  const sAt = typeof landS === 'function' ? landS : curS;
  const wantPines = Math.max(0, Math.min(12, Math.round(P.pines)));
  const wantLanterns = Math.max(0, Math.min(6, Math.round(P.lanterns)));

  const placed = [];
  for (let attempt = 0; attempt < 900 && trees.length < wantPines; attempt++) {
    const x = 44 + auroraRand(attempt, 1) * Math.max(40, W - 88);
    const y = 44 + auroraRand(attempt, 2) * Math.max(40, H - TASKBAR - 88);
    const s = sAt(x, y);
    if (s > -14) continue;
    if (!auroraSpotClear(x, y, 22)) continue;
    if (placed.some(p => Math.hypot(p.x - x, p.y - y) < 58)) continue;
    const scale = 0.72 + auroraRand(attempt, 3) * 0.42;
    const item = {
      x, y,
      scale,
      variant: Math.floor(auroraRand(attempt, 4) * AURORA_PINE_VARIANTS),
      mirror: auroraRand(attempt, 5) < 0.5 ? -1 : 1,
      grow: 0,
      want: 1,
    };
    trees.push(item);
    placed.push(item);
  }

  for (let attempt = 0; attempt < 2200 && lanterns.length < wantLanterns; attempt++) {
    const x = 48 + auroraRand(attempt + 1200, 1) * Math.max(40, W - 96);
    const y = 48 + auroraRand(attempt + 1200, 2) * Math.max(40, H - TASKBAR - 96);
    const s = sAt(x, y);
    if (s > -2 || s < -54) continue;
    if (!auroraSpotClear(x, y, 16)) continue;
    if (lanterns.some(p => Math.hypot(p.x - x, p.y - y) < 90)) continue;
    if (trees.some(p => Math.hypot(p.x - x, p.y - y) < 38)) continue;
    const item = {
      x, y,
      scale: 0.92 + auroraRand(attempt + 1200, 3) * 0.2,
      variant: AURORA_LANTERN_VARIANT,
      mirror: 1,
      phase: auroraRand(attempt + 1200, 4) * Math.PI * 2,
      grow: 0,
      want: 1,
    };
    lanterns.push(item);
  }
}

function stepAuroraProps(dt) {
  for (const t of trees) t.grow = Math.min(t.want, t.grow + dt * 1.4);
  for (const l of lanterns) l.grow = Math.min(l.want, l.grow + dt * 1.6);
}

function drawAuroraProps(timeSec) {
  if (!trees.length && !lanterns.length) return;
  ensureAuroraSpriteResources();
  const { p, U } = auroraSpritePR;
  gl.useProgram(p);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.activeTexture(gl.TEXTURE6);
  gl.bindTexture(gl.TEXTURE_2D, auroraAtlasTex);
  gl.uniform1i(U.uAtlas, 6);
  gl.uniform2f(U.uRes, cv.width / cv._scale, cv.height / cv._scale);
  gl.uniform1f(U.uTime, timeSec);

  for (const t of trees) {
    if (t.grow <= 0.01) continue;
    const ease = t.grow * t.grow * (3 - 2 * t.grow);
    gl.uniform4f(U.uSprite, t.x, t.y, t.scale * ease, t.variant);
    gl.uniform1f(U.uMirror, t.mirror);
    gl.uniform1f(U.uSway, 1.0);
    gl.uniform1f(U.uOpacity, 0.96 * ease);
    gl.uniform1f(U.uPulse, 1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  for (const l of lanterns) {
    if (l.grow <= 0.01) continue;
    const ease = l.grow * l.grow * (3 - 2 * l.grow);
    const flicker = 0.93 + 0.07 * Math.sin(timeSec * 3.1 + l.phase) * Math.cos(timeSec * 1.7 + l.phase);
    gl.uniform4f(U.uSprite, l.x, l.y, l.scale * ease, l.variant);
    gl.uniform1f(U.uMirror, 1.0);
    gl.uniform1f(U.uSway, 0.0);
    gl.uniform1f(U.uOpacity, 0.95 * ease);
    gl.uniform1f(U.uPulse, flicker);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  gl.disable(gl.BLEND);
}
