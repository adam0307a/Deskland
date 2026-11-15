// Desert Oasis: top-down camels, Arab caravan travelers, Bedouin tent, date palms,
// desert shrubs & wind-blown sand dust sprites baked once into a 2x Canvas2D atlas
// and rendered via a single instanced WebGL2 draw call for effortless 30fps on iGPUs.
const DS_SPRITE_COUNT = 10;
const DS_SPRITE_SZ = 128;

let dsAtlasTex = null;
let dsInstPR = null;
let dsInstVAO = null;
let dsInstBufA = null;
let dsInstBufB = null;
let dsMaxInst = 0;

function makeDesertAtlas() {
  const S = 2;
  const cv = document.createElement('canvas');
  cv.width = DS_SPRITE_COUNT * DS_SPRITE_SZ * S;
  cv.height = DS_SPRITE_SZ * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);

  function shadow(cx, cy, rx, ry, rot = 0.25, alpha = 0.28) {
    ctx.save();
    ctx.translate(cx + 6, cy + 7);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(92, 54, 18, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Top-down dromedary camel facing +X (local center 0,0)
  function paintCamel(colIdx, coatDark, coatLight, saddleA, saddleB, stridePhase) {
    const cx = colIdx * DS_SPRITE_SZ + 64;
    const cy = 64;
    shadow(cx, cy, 34, 14, 0.12, 0.30);

    ctx.save();
    ctx.translate(cx, cy);

    // 4 legs stepping out cleanly beneath torso (top-down foreshortened hooves)
    const legs = [
      [14, -12, stridePhase],
      [14, 12, -stridePhase],
      [-15, -11, -stridePhase],
      [-15, 11, stridePhase],
    ];
    for (const [lx, ly, st] of legs) {
      ctx.fillStyle = coatDark;
      ctx.beginPath();
      ctx.ellipse(lx + st * 4.5, ly, 5.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Swishing tail
    ctx.strokeStyle = coatDark;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.quadraticCurveTo(-34, stridePhase * 4, -39, stridePhase * 6);
    ctx.stroke();

    // Muscular torso
    const bodyGrad = ctx.createRadialGradient(-2, -3, 3, -2, 0, 27);
    bodyGrad.addColorStop(0, coatLight);
    bodyGrad.addColorStop(0.75, coatDark);
    bodyGrad.addColorStop(1, '#7a5228');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 24, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Woven Bedouin saddle blanket & packs
    ctx.fillStyle = saddleA;
    ctx.beginPath();
    ctx.roundRect(-14, -11.5, 22, 23, 5);
    ctx.fill();
    ctx.fillStyle = saddleB;
    ctx.fillRect(-10, -11, 4.5, 22);
    ctx.fillRect(0.5, -11, 4.5, 22);
    ctx.strokeStyle = 'rgba(255, 235, 190, 0.65)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(-12, -9.5, 18, 19);

    // Single hump highlight protruding through saddle
    const humpGrad = ctx.createRadialGradient(-4, -2, 1, -3, 0, 10);
    humpGrad.addColorStop(0, coatLight);
    humpGrad.addColorStop(1, coatDark);
    ctx.fillStyle = humpGrad;
    ctx.beginPath();
    ctx.ellipse(-3, 0, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved neck stretching forward to +X
    const neckGrad = ctx.createLinearGradient(14, 0, 36, 0);
    neckGrad.addColorStop(0, coatDark);
    neckGrad.addColorStop(1, coatLight);
    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.moveTo(15, -5.5);
    ctx.quadraticCurveTo(28, -4.5, 36, -3.8);
    ctx.lineTo(36, 3.8);
    ctx.quadraticCurveTo(28, 4.5, 15, 5.5);
    ctx.closePath();
    ctx.fill();

    // Camel head + ears + halter
    ctx.fillStyle = coatLight;
    ctx.beginPath();
    ctx.ellipse(41, 0, 7.2, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.fillStyle = coatDark;
    ctx.beginPath();
    ctx.ellipse(37, -5.2, 2.5, 1.5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(37, 5.2, 2.5, 1.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Crimson bridle strap + lead rope tip
    ctx.strokeStyle = '#c83e2b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(43.5, -4);
    ctx.lineTo(43.5, 4);
    ctx.stroke();

    ctx.restore();
  }

  // Top-down Arab traveler facing +X
  function paintTraveler(colIdx, robeMain, robeTrim, keffiyehBase, keffiyehPattern, agalDark, hasStaff, step) {
    const cx = colIdx * DS_SPRITE_SZ + 64;
    const cy = 64;
    shadow(cx, cy, 16, 15, 0.2, 0.30);

    ctx.save();
    ctx.translate(cx, cy);

    // Stepping sandals peeking beneath flowing robe
    ctx.fillStyle = '#5c3b1e';
    ctx.beginPath();
    ctx.ellipse(step * 4, -5.5, 5, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(-step * 4, 5.5, 5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wide flowing kandura / bisht shoulders
    const robeGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, 18);
    robeGrad.addColorStop(0, robeMain);
    robeGrad.addColorStop(1, robeTrim);
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.ellipse(-1, 0, 12.5, 15.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle shoulder folds / cloak edge
    ctx.strokeStyle = 'rgba(220, 185, 115, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-1, 0, 13.5, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();

    // Walking wooden staff held slightly forward on the right side
    if (hasStaff) {
      ctx.strokeStyle = '#6f4722';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 15);
      ctx.lineTo(19, 13);
      ctx.stroke();
      ctx.fillStyle = '#4e3116';
      ctx.beginPath();
      ctx.arc(19, 13, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draping Keffiyeh (Ghutra) headscarf trailing slightly back (-X)
    ctx.fillStyle = keffiyehBase;
    ctx.beginPath();
    ctx.ellipse(-3, 0, 10.5, 9.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (keffiyehPattern) {
      ctx.strokeStyle = keffiyehPattern;
      ctx.lineWidth = 1.1;
      for (let d = -6; d <= 4; d += 3.5) {
        ctx.beginPath();
        ctx.moveTo(-10, d - 2);
        ctx.lineTo(4, d + 2);
        ctx.stroke();
      }
    }

    // Black Agal double cord ring on crown + crown highlight
    ctx.strokeStyle = agalDark;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = keffiyehBase;
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();

    // Tiny hint of sunlit nose/brow facing +X
    ctx.fillStyle = '#b97e52';
    ctx.beginPath();
    ctx.ellipse(6.5, 0, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Top-down Bedouin striped tent with woven rug outside
  function paintBedouinTent(colIdx) {
    const cx = colIdx * DS_SPRITE_SZ + 64;
    const cy = 64;
    shadow(cx, cy, 42, 30, 0.1, 0.34);

    ctx.save();
    ctx.translate(cx, cy);

    // Woven desert rug in front (+Y side)
    ctx.fillStyle = '#a83428';
    ctx.fillRect(-18, 12, 36, 22);
    ctx.fillStyle = '#e5b869';
    ctx.fillRect(-14, 15, 28, 3);
    ctx.fillRect(-14, 27, 28, 3);
    ctx.fillStyle = '#2d5c62';
    ctx.fillRect(-10, 20, 20, 5);

    // Guy ropes to wooden stakes
    ctx.strokeStyle = 'rgba(130, 92, 48, 0.72)';
    ctx.lineWidth = 1.2;
    for (const [rx, ry, tx, ty] of [[-28, -20, -44, -30], [28, -20, 44, -30], [-28, 14, -44, 24], [28, 14, 44, 24]]) {
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = '#5e3c1e';
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Striped Bedouin canopy
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-30, -24, 60, 40, 6);
    ctx.clip();
    const stripes = ['#4a2218', '#e6cfad', '#963122', '#e6cfad', '#382018', '#d7b278', '#963122', '#e6cfad', '#4a2218'];
    const sw = 60 / stripes.length;
    stripes.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(-30 + i * sw, -24, sw + 0.5, 40);
    });
    // Sun ridge shading
    const rg = ctx.createLinearGradient(0, -24, 0, 16);
    rg.addColorStop(0, 'rgba(255,245,220,0.22)');
    rg.addColorStop(0.45, 'rgba(255,255,255,0.0)');
    rg.addColorStop(1, 'rgba(38,16,8,0.28)');
    ctx.fillStyle = rg;
    ctx.fillRect(-30, -24, 60, 40);
    ctx.restore();

    // Ridge pole + wooden finials
    ctx.strokeStyle = '#6c4220';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-31, -4);
    ctx.lineTo(31, -4);
    ctx.stroke();

    ctx.restore();
  }

  // Top-down Date Palm (feathered radiating fronds + date clusters)
  function paintPalm(colIdx, frondCount, frondLen, cDark, cMid, cBright) {
    const cx = colIdx * DS_SPRITE_SZ + 64;
    const cy = 64;
    shadow(cx + 4, cy + 4, frondLen * 0.78, frondLen * 0.68, 0.15, 0.25);

    ctx.save();
    ctx.translate(cx, cy);

    // Date fruit clusters near crown center
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.4;
      ctx.fillStyle = '#c46c1c';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 4.5, 3, a, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < frondCount; i++) {
      const a = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.18 + colIdx * 0.4;
      const len = frondLen * (0.86 + (i % 3) * 0.08);
      ctx.save();
      ctx.rotate(a);

      // Feathered leaflets along spine
      const leaflets = 11;
      for (let k = 1; k <= leaflets; k++) {
        const t = k / (leaflets + 1);
        const px = 4 + t * (len - 6);
        const w = Math.sin(t * Math.PI) * 11.5;
        ctx.fillStyle = k % 2 === 0 ? cBright : (i % 2 === 0 ? cMid : cDark);
        ctx.beginPath();
        ctx.moveTo(px - 1.5, 0);
        ctx.quadraticCurveTo(px + 3, -w * 0.6, px + 6.5, -w);
        ctx.quadraticCurveTo(px + 2, -w * 0.3, px + 1.5, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px - 1.5, 0);
        ctx.quadraticCurveTo(px + 3, w * 0.6, px + 6.5, w);
        ctx.quadraticCurveTo(px + 2, w * 0.3, px + 1.5, 0);
        ctx.fill();
      }
      // Midrib spine
      ctx.strokeStyle = '#9bb556';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.94, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Palm heart
    ctx.fillStyle = '#524024';
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Desert sandstone rock + dry scrub
  function paintRockScrub(colIdx) {
    const cx = colIdx * DS_SPRITE_SZ + 64;
    const cy = 64;
    shadow(cx, cy, 24, 18, -0.2, 0.28);

    ctx.save();
    ctx.translate(cx, cy);
    // Warm layered sandstone rocks
    const rocks = [[-4, -2, 18, 13, '#b8824e', '#dfb47e'], [12, 6, 11, 8, '#9f6c3d', '#cfa06b'], [-14, 9, 9, 7, '#a87544', '#d4a673']];
    for (const [rx, ry, rw, rh, c1, c2] of rocks) {
      const g = ctx.createLinearGradient(rx - rw, ry - rh, rx + rw, ry + rh);
      g.addColorStop(0, c2);
      g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    // Small olive desert scrub tucked by the rocks
    for (let i = 0; i < 8; i++) {
      const a = i * 0.78 + 0.2;
      ctx.fillStyle = i % 2 ? '#6f8545' : '#8b9b54';
      ctx.beginPath();
      ctx.ellipse(-10 + Math.cos(a) * 6, -9 + Math.sin(a) * 5, 5.5, 3, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Lush oasis shore reed / green bush
  function paintOasisBush(colIdx) {
    const cx = colIdx * DS_SPRITE_SZ + 64;
    const cy = 64;
    shadow(cx, cy, 20, 17, 0.1, 0.25);
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 6 + (i % 3) * 4;
      ctx.fillStyle = i % 3 === 0 ? '#2b6f38' : i % 3 === 1 ? '#44914c' : '#6cb35c';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r, 7.5, 4.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tiny warm desert blossoms on the bush
    for (const [bx, by, c] of [[5, -6, '#f6d860'], [-7, 4, '#f08a5d'], [2, 8, '#f6d860']]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(bx, by, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Wind-blown sand wisp / shimmering dust grain
  function paintSandDust(colIdx) {
    const cx = colIdx * DS_SPRITE_SZ + 64;
    const cy = 64;
    const g = ctx.createLinearGradient(cx - 28, cy, cx + 28, cy);
    g.addColorStop(0, 'rgba(255, 236, 188, 0)');
    g.addColorStop(0.5, 'rgba(255, 236, 188, 0.72)');
    g.addColorStop(1, 'rgba(255, 236, 188, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 28, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 0: Golden cream camel (stride A)
  paintCamel(0, '#c28d4f', '#e7be82', '#a83428', '#e8b85c', 0.85);
  // 1: Cinnamon brown camel (stride B)
  paintCamel(1, '#9c6633', '#c89258', '#235a63', '#e2c27c', -0.85);
  // 2: Arab caravan guide (white thobe, red-checkered keffiyeh + black agal, walking staff)
  paintTraveler(2, '#f8f5ee', '#d6cdb8', '#fbf8f2', 'rgba(182, 42, 42, 0.55)', '#1e1b18', true, 0.8);
  // 3: Desert traveler (sandstone/indigo bisht over white robe, cream keffiyeh + gold trim)
  paintTraveler(3, '#2d4b63', '#1c3144', '#f7edd8', null, '#241e18', false, -0.7);
  // 4: Bedouin striped tent + woven rug
  paintBedouinTent(4);
  // 5: Mature lush date palm
  paintPalm(5, 9, 44, '#245d31', '#3b803f', '#60a64b');
  // 6: Young desert palm
  paintPalm(6, 7, 34, '#2d6836', '#4a8e46', '#72b456');
  // 7: Sandstone outcrop & desert scrub
  paintRockScrub(7);
  // 8: Lush oasis shore bush with desert blossoms
  paintOasisBush(8);
  // 9: Wind-blown sand wisp
  paintSandDust(9);

  return cv;
}

function initDesertSpriteBatch(gl) {
  const vsSrc = `#version 300 es
  in vec2 aQuad;
  in vec4 aBox;
  in vec4 aInfo;
  uniform vec2 uRes;
  out vec2 vUV;
  out float vAlpha;
  void main() {
    float c = cos(aBox.w), s = sin(aBox.w);
    vec2 p = aQuad * aBox.z;
    vec2 wp = aBox.xy + vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    vec2 clip = (wp / uRes) * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    float col = aInfo.x;
    vUV = vec2((col + aQuad.x + 0.5) / ${DS_SPRITE_COUNT.toFixed(1)}, aQuad.y + 0.5);
    vAlpha = aInfo.y;
  }`;

  const fsSrc = `#version 300 es
  precision highp float;
  uniform sampler2D uAtlas;
  in vec2 vUV;
  in float vAlpha;
  out vec4 o;
  void main() {
    vec4 t = texture(uAtlas, vUV);
    o = vec4(t.rgb * vAlpha, t.a * vAlpha);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  dsInstPR = gl.createProgram();
  gl.attachShader(dsInstPR, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(dsInstPR, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(dsInstPR);
  if (!gl.getProgramParameter(dsInstPR, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(dsInstPR));

  const atlas = makeDesertAtlas();
  dsAtlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, dsAtlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);

  dsInstVAO = gl.createVertexArray();
  gl.bindVertexArray(dsInstVAO);

  const qBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
  const locQ = gl.getAttribLocation(dsInstPR, 'aQuad');
  gl.enableVertexAttribArray(locQ);
  gl.vertexAttribPointer(locQ, 2, gl.FLOAT, false, 0, 0);

  dsMaxInst = 600;
  dsInstBufA = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dsInstBufA);
  gl.bufferData(gl.ARRAY_BUFFER, dsMaxInst * 16, gl.DYNAMIC_DRAW);
  const locA = gl.getAttribLocation(dsInstPR, 'aBox');
  gl.enableVertexAttribArray(locA);
  gl.vertexAttribPointer(locA, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(locA, 1);

  dsInstBufB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dsInstBufB);
  gl.bufferData(gl.ARRAY_BUFFER, dsMaxInst * 16, gl.DYNAMIC_DRAW);
  const locB = gl.getAttribLocation(dsInstPR, 'aInfo');
  gl.enableVertexAttribArray(locB);
  gl.vertexAttribPointer(locB, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(locB, 1);

  gl.bindVertexArray(null);
}

function drawDesertSprites(gl, W, H, dataA, dataB, count) {
  if (!dsInstPR || count <= 0) return;
  const n = Math.min(count, dsMaxInst);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(dsInstPR);
  gl.bindVertexArray(dsInstVAO);
  gl.uniform2f(gl.getUniformLocation(dsInstPR, 'uRes'), W, H);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dsAtlasTex);
  gl.uniform1i(gl.getUniformLocation(dsInstPR, 'uAtlas'), 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, dsInstBufA);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataA.subarray(0, n * 4));
  gl.bindBuffer(gl.ARRAY_BUFFER, dsInstBufB);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataB.subarray(0, n * 4));
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
}
