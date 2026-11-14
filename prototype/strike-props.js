'use strict';

// Deskland · Bombsite Dust (炙热沙城) 2D painter atlas + instanced WebGL2 renderer
// Clean-room CS2 / Dust-inspired tactical assets: wooden supply crates, oil drums,
// sandbags, bullet-hole decals, spent brass shell casings, patrolling chickens,
// tactical smoke plumes, bombsite stencils, and a physics soccer ball.

const STRIKE_COLS = 8;
const STRIKE_ROWS = 3;
const STRIKE_CELL = 128;

let strikeAtlasTex = null;
let strikeInstPR = null;
let strikeInstVAO = null;
let strikeInstBufA = null;
let strikeInstBufB = null;
let strikeInstCap = 0;

function strikeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function strikePaintCrate(ctx, ox, oy, variant) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64;
  const cy = 66;

  // Cast shadow (sun from top-left)
  ctx.fillStyle = 'rgba(28, 19, 12, 0.42)';
  strikeRoundRect(ctx, cx - 32 + 7, cy - 32 + 9, 68, 68, 6);
  ctx.fill();

  const w = variant === 1 ? 74 : 64;
  const h = variant === 1 ? 66 : 64;
  const x0 = cx - w * 0.5;
  const y0 = cy - h * 0.5;

  // Main wooden crate face
  const grad = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
  grad.addColorStop(0, '#c29258');
  grad.addColorStop(0.55, '#a4743f');
  grad.addColorStop(1, '#7a5228');
  ctx.fillStyle = grad;
  strikeRoundRect(ctx, x0, y0, w, h, 4);
  ctx.fill();

  // Horizontal wooden slats
  ctx.strokeStyle = 'rgba(58, 34, 14, 0.55)';
  ctx.lineWidth = 1.6;
  for (let i = 1; i < 4; i++) {
    const sy = y0 + (h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x0 + 4, sy);
    ctx.lineTo(x0 + w - 4, sy);
    ctx.stroke();
  }

  // Diagonal bracing plank
  ctx.fillStyle = 'rgba(176, 128, 72, 0.82)';
  ctx.beginPath();
  ctx.moveTo(x0 + 7, y0 + h - 12);
  ctx.lineTo(x0 + 13, y0 + h - 6);
  ctx.lineTo(x0 + w - 7, y0 + 12);
  ctx.lineTo(x0 + w - 13, y0 + 6);
  ctx.closePath();
  ctx.fill();

  // Outer timber frame border
  ctx.strokeStyle = '#68431e';
  ctx.lineWidth = 5;
  strikeRoundRect(ctx, x0 + 2.5, y0 + 2.5, w - 5, h - 5, 3);
  ctx.stroke();

  // Subtle top-left bevel highlight
  ctx.strokeStyle = 'rgba(255, 224, 176, 0.42)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0 + 3, y0 + h - 4);
  ctx.lineTo(x0 + 3, y0 + 3);
  ctx.lineTo(x0 + w - 4, y0 + 3);
  ctx.stroke();

  // Dark steel corner brackets & rivets
  ctx.fillStyle = '#36393c';
  const corners = [
    [x0 + 1, y0 + 1],
    [x0 + w - 11, y0 + 1],
    [x0 + 1, y0 + h - 11],
    [x0 + w - 11, y0 + h - 11],
  ];
  for (const [bx, by] of corners) {
    ctx.fillRect(bx, by, 10, 10);
    ctx.fillStyle = '#8b9196';
    ctx.beginPath();
    ctx.arc(bx + 5, by + 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#36393c';
  }

  if (variant === 1) {
    // Stacked upper mini crate / olive tarp corner
    ctx.fillStyle = 'rgba(24, 16, 10, 0.34)';
    strikeRoundRect(ctx, cx - 12, cy - 22, 42, 38, 4);
    ctx.fill();

    const g2 = ctx.createLinearGradient(cx - 16, cy - 26, cx + 24, cy + 12);
    g2.addColorStop(0, '#5a6b48');
    g2.addColorStop(1, '#39452c');
    ctx.fillStyle = g2;
    strikeRoundRect(ctx, cx - 16, cy - 26, 40, 36, 4);
    ctx.fill();
    ctx.strokeStyle = '#28301e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tarp tie strap
    ctx.strokeStyle = '#d3b27b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 8);
    ctx.lineTo(cx + 22, cy - 8);
    ctx.stroke();
  } else {
    // Subtle military stencil chevron on single crate
    ctx.strokeStyle = 'rgba(42, 26, 12, 0.56)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 4);
    ctx.lineTo(cx, cy - 11);
    ctx.lineTo(cx + 8, cy - 4);
    ctx.moveTo(cx - 8, cy + 4);
    ctx.lineTo(cx, cy - 3);
    ctx.lineTo(cx + 8, cy + 4);
    ctx.stroke();
  }

  ctx.restore();
}

function strikePaintOilDrum(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64;
  const cy = 66;

  // Ground cast shadow
  ctx.fillStyle = 'rgba(26, 18, 12, 0.44)';
  ctx.beginPath();
  ctx.ellipse(cx + 7, cy + 8, 29, 27, 0, 0, Math.PI * 2);
  ctx.fill();

  // Drum body rim
  const g = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 30);
  g.addColorStop(0, '#587856');
  g.addColorStop(0.75, '#3b543a');
  g.addColorStop(1, '#223122');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fill();

  // Hazard orange/yellow rim band
  ctx.strokeStyle = '#d27d2d';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 23, 0, Math.PI * 2);
  ctx.stroke();

  // Recessed lid with specular edge
  ctx.fillStyle = '#475e45';
  ctx.beginPath();
  ctx.arc(cx, cy, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 235, 200, 0.34)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, 18.5, Math.PI * 0.85, Math.PI * 1.75);
  ctx.stroke();

  // Bung caps
  ctx.fillStyle = '#252a2b';
  ctx.beginPath();
  ctx.arc(cx - 8, cy - 6, 3.6, 0, Math.PI * 2);
  ctx.arc(cx + 7, cy + 7, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function strikePaintSandbags(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64;
  const cy = 66;

  // Shadow
  ctx.fillStyle = 'rgba(28, 20, 12, 0.38)';
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy + 7, 44, 22, -0.15, 0, Math.PI * 2);
  ctx.fill();

  const bags = [
    [-22, 5, 19, 10, 0.12, '#aa946b', '#87724d'],
    [0, 7, 20, 10, -0.05, '#b69f74', '#8e7953'],
    [22, 4, 19, 10, -0.2, '#a89268', '#836e49'],
    [-12, -5, 19, 10, 0.08, '#c5af82', '#9c865d'],
    [12, -6, 19, 10, -0.12, '#cbb68a', '#9f8a62'],
  ];
  for (const [bx, by, rx, ry, rot, c1, c2] of bags) {
    ctx.save();
    ctx.translate(cx + bx, cy + by);
    ctx.rotate(rot);
    const bg = ctx.createLinearGradient(-rx, -ry, rx, ry);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(54, 42, 24, 0.52)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Seam line
    ctx.strokeStyle = 'rgba(72, 56, 32, 0.36)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.65, 0);
    ctx.lineTo(rx * 0.65, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function strikePaintWeaponCase(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64;
  const cy = 66;

  // Shadow
  ctx.fillStyle = 'rgba(20, 15, 10, 0.46)';
  strikeRoundRect(ctx, cx - 26 + 5, cy - 18 + 6, 56, 38, 5);
  ctx.fill();

  // Matte tactical polymer case
  const g = ctx.createLinearGradient(cx - 28, cy - 18, cx + 28, cy + 18);
  g.addColorStop(0, '#464d52');
  g.addColorStop(1, '#262b2f');
  ctx.fillStyle = g;
  strikeRoundRect(ctx, cx - 27, cy - 18, 54, 36, 5);
  ctx.fill();
  ctx.strokeStyle = '#181c1f';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Protective ribs
  ctx.strokeStyle = 'rgba(170, 185, 196, 0.2)';
  ctx.lineWidth = 2;
  for (const dx of [-16, -6, 6, 16]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy - 12);
    ctx.lineTo(cx + dx, cy + 12);
    ctx.stroke();
  }

  // Brass latch & tactical crimson status indicator
  ctx.fillStyle = '#c89b3c';
  ctx.fillRect(cx - 18, cy + 12, 8, 5);
  ctx.fillRect(cx + 10, cy + 12, 8, 5);

  ctx.fillStyle = '#ff3828';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd2c8';
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strikePaintDesertPlanter(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64;
  const cy = 66;

  ctx.fillStyle = 'rgba(24, 18, 12, 0.36)';
  ctx.beginPath();
  ctx.ellipse(cx + 6, cy + 7, 30, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Terracotta sandstone pot rim
  ctx.fillStyle = '#b4744c';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5c402c';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  // Stylized top-down agave / palm fronds
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    const fg = ctx.createLinearGradient(0, 0, 34, 0);
    fg.addColorStop(0, '#3a5e2f');
    fg.addColorStop(1, '#7aa453');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(20, -8, 35, 0);
    ctx.quadraticCurveTo(20, 8, 0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(24, 42, 18, 0.5)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#99be68';
  ctx.beginPath();
  ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strikePaintSmokeCanister(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  ctx.rotate(-0.48);

  // Cast shadow
  ctx.fillStyle = 'rgba(20, 15, 10, 0.38)';
  strikeRoundRect(ctx, -17 + 3, -8 + 4, 34, 16, 4);
  ctx.fill();

  // Steel olive canister body
  const g = ctx.createLinearGradient(-16, -8, 16, 8);
  g.addColorStop(0, '#8d998d');
  g.addColorStop(0.5, '#667267');
  g.addColorStop(1, '#3e463f');
  ctx.fillStyle = g;
  strikeRoundRect(ctx, -16, -7.5, 32, 15, 4);
  ctx.fill();

  // Tactical cyan/yellow stripe
  ctx.fillStyle = '#4ea6d6';
  ctx.fillRect(-5, -7.5, 8, 15);
  ctx.fillStyle = '#c8ced2';
  ctx.fillRect(14, -4.5, 5, 9);

  // Pulled spoon & ring near canister
  ctx.strokeStyle = '#d4d9dc';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(23, -8, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function strikePaintShellCasings(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox, oy);
  const shells = [
    [52, 60, -0.55],
    [68, 54, 0.72],
    [63, 73, 0.24],
    [77, 67, -1.05],
  ];
  for (const [x, y, rot] of shells) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(18, 12, 8, 0.36)';
    ctx.fillRect(-6 + 1.5, -2.5 + 2, 13, 5);

    const bg = ctx.createLinearGradient(-6, -2.5, -6, 2.5);
    bg.addColorStop(0, '#f7da78');
    bg.addColorStop(0.45, '#cfa038');
    bg.addColorStop(1, '#845f1a');
    ctx.fillStyle = bg;
    strikeRoundRect(ctx, -6.5, -2.6, 13, 5.2, 1.4);
    ctx.fill();

    // Neck bottleneck & dark mouth
    ctx.fillStyle = '#3a2b14';
    ctx.fillRect(5.5, -1.9, 1.8, 3.8);
    ctx.restore();
  }
  ctx.restore();
}

function strikeDrawSingleCrater(ctx, x, y, r, seedOffset) {
  ctx.save();
  ctx.translate(x, y);

  // Soot gunpowder scorch halo
  const soot = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.5);
  soot.addColorStop(0, 'rgba(18, 14, 11, 0.52)');
  soot.addColorStop(0.55, 'rgba(38, 32, 26, 0.24)');
  soot.addColorStop(1, 'rgba(38, 32, 26, 0)');
  ctx.fillStyle = soot;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Radial concrete fracture cracks
  ctx.strokeStyle = 'rgba(28, 22, 18, 0.78)';
  ctx.lineCap = 'round';
  const crackCount = 6;
  for (let i = 0; i < crackCount; i++) {
    const a = (i / crackCount) * Math.PI * 2 + Math.sin(seedOffset + i * 2.3) * 0.45;
    const len = r * (1.7 + 0.9 * ((i * 37 + seedOffset * 13) % 5) / 4);
    ctx.lineWidth = i % 2 === 0 ? 1.5 : 1.0;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
    const midA = a + Math.sin(i * 4.1 + seedOffset) * 0.22;
    ctx.lineTo(Math.cos(midA) * len * 0.58, Math.sin(midA) * len * 0.58);
    ctx.lineTo(Math.cos(a - 0.08) * len, Math.sin(a - 0.08) * len);
    ctx.stroke();
  }

  // Pale shattered plaster spall ring
  ctx.fillStyle = '#b9ae9c';
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rad = r * (1.28 + 0.24 * Math.sin(i * 3.7 + seedOffset));
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Inner dark shadow slope + deep bullet entry bore
  ctx.fillStyle = '#4c443c';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#120e0b';
  ctx.beginPath();
  ctx.arc(-r * 0.08, -r * 0.08, r * 0.62, 0, Math.PI * 2);
  ctx.fill();

  // Sunlit lower-right crater rim edge for crisp 3D depth
  ctx.strokeStyle = 'rgba(244, 232, 210, 0.58)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, -0.35, Math.PI * 0.65);
  ctx.stroke();

  ctx.restore();
}

function strikePaintBulletDecal(ctx, ox, oy, variant) {
  ctx.save();
  ctx.translate(ox, oy);
  if (variant === 0) {
    // 3-round rifle burst cluster
    strikeDrawSingleCrater(ctx, 50, 56, 7.2, 1.3);
    strikeDrawSingleCrater(ctx, 73, 52, 6.5, 4.1);
    strikeDrawSingleCrater(ctx, 64, 75, 7.8, 7.6);
  } else if (variant === 1) {
    // Heavy caliber single crater + scattered plaster chips
    strikeDrawSingleCrater(ctx, 64, 64, 11.5, 2.9);
    ctx.fillStyle = '#c4b8a5';
    for (const [dx, dy, s] of [[-19, 10, 3.2], [20, -12, 2.8], [13, 21, 2.6], [-16, -18, 2.4]]) {
      ctx.beginPath();
      ctx.arc(64 + dx, 64 + dy, s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Ricochet gouge streak + terminal entry crater
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(-0.42);
    ctx.fillStyle = 'rgba(30, 24, 18, 0.34)';
    ctx.beginPath();
    ctx.ellipse(-6, 0, 26, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#bfb3a0';
    ctx.beginPath();
    ctx.ellipse(-8, 0, 22, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    strikeDrawSingleCrater(ctx, 78, 56, 6.6, 5.4);
  }
  ctx.restore();
}

function strikePaintSiteStencil(ctx, ox, oy, letter) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  ctx.rotate(letter === 'A' ? -0.18 : 0.14);

  const mainCol = letter === 'A' ? 'rgba(182, 54, 42, 0.72)' : 'rgba(210, 154, 46, 0.72)';
  const edgeCol = letter === 'A' ? 'rgba(225, 108, 76, 0.48)' : 'rgba(246, 202, 104, 0.48)';

  // Stencil border frame
  ctx.strokeStyle = mainCol;
  ctx.lineWidth = 4.2;
  ctx.setLineDash([12, 5]);
  strikeRoundRect(ctx, -34, -34, 68, 68, 8);
  ctx.stroke();
  ctx.setLineDash([]);

  // Clean stenciled letter
  ctx.font = '900 44px "Arial Black", Impact, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = mainCol;
  ctx.fillText(letter, 0, 2);
  ctx.strokeStyle = edgeCol;
  ctx.lineWidth = 1.4;
  ctx.strokeText(letter, 0, 2);

  // Scuff dust streaks across stencil paint
  ctx.strokeStyle = 'rgba(214, 188, 148, 0.42)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-26, 14);
  ctx.lineTo(28, -10);
  ctx.moveTo(-18, -22);
  ctx.lineTo(20, 22);
  ctx.stroke();
  ctx.restore();
}

function strikePaintChickenCell(ctx, ox, oy, variant) {
  // variant 0: classic white walk, 1: flapping panic, 2: russet desert hen, 3: tactical headband chicken
  ctx.save();
  ctx.translate(ox + 64, oy + 66);

  const flap = variant === 1;
  const bodyA = variant === 2 ? '#e6c398' : '#fcfaf2';
  const bodyB = variant === 2 ? '#a57146' : '#cfc7b8';
  const outline = variant === 2 ? '#59371e' : '#6c6458';

  // Ground shadow
  ctx.fillStyle = 'rgba(22, 16, 10, 0.34)';
  ctx.beginPath();
  ctx.ellipse(3, flap ? 10 : 5, 19, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  if (flap) ctx.translate(0, -5);

  // Spread wings when startled/flapping
  if (flap) {
    ctx.fillStyle = bodyA;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.8;
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.beginPath();
      ctx.ellipse(6, -18, 12, 7.5, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Tail feathers (left / rear)
  ctx.fillStyle = variant === 2 ? '#8f5a33' : '#e4ddd0';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.6;
  for (const [ang, len] of [[-0.3, 14], [0, 16], [0.28, 13]]) {
    ctx.save();
    ctx.translate(-15, 0);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(-len * 0.45, 0, len * 0.55, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Plump oval body (facing +X)
  const bg = ctx.createRadialGradient(2, -4, 3, -1, 0, 22);
  bg.addColorStop(0, bodyA);
  bg.addColorStop(1, bodyB);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 19, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Folded top wing contour
  if (!flap) {
    ctx.fillStyle = variant === 2 ? '#b88254' : '#ece6da';
    ctx.beginPath();
    ctx.ellipse(-3, -6, 11, 5.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(85, 70, 54, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Head
  ctx.fillStyle = bodyA;
  ctx.beginPath();
  ctx.arc(14, -2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Tactical mini headband easter egg on variant 3
  if (variant === 3) {
    ctx.fillStyle = '#d1362c';
    ctx.fillRect(6, -8, 16, 4.5);
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.lineTo(-2, -10);
    ctx.lineTo(0, -4);
    ctx.closePath();
    ctx.fill();
  }

  // Sharp orange beak
  ctx.fillStyle = '#f28b20';
  ctx.beginPath();
  ctx.moveTo(22, -4);
  ctx.lineTo(31, -1.5);
  ctx.lineTo(22, 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#994b08';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Vivid crimson comb on top of head
  ctx.fillStyle = '#df2929';
  ctx.beginPath();
  ctx.arc(11, -9, 3.6, 0, Math.PI * 2);
  ctx.arc(15, -10, 4.0, 0, Math.PI * 2);
  ctx.arc(18, -8, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye dot
  ctx.fillStyle = '#181818';
  ctx.beginPath();
  ctx.arc(18, -4.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(18.6, -5.1, 0.7, 0, Math.PI * 2);
  ctx.fill();

  if (flap) {
    // Micro fluttering feather tufts
    ctx.fillStyle = bodyA;
    for (const [fx, fy, fr] of [[-24, -18, 0.4], [-14, 22, -0.5], [22, -21, 0.7]]) {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(fr);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function strikePaintSoccerBall(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  const r = 42;

  // Clip spherical soccer ball
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Warm sun-lit leather base shading
  const base = ctx.createRadialGradient(-14, -14, 4, 2, 2, r * 1.15);
  base.addColorStop(0, '#ffffff');
  base.addColorStop(0.55, '#ede7db');
  base.addColorStop(0.88, '#bab1a0');
  base.addColorStop(1, '#7c7364');
  ctx.fillStyle = base;
  ctx.fillRect(-r - 2, -r - 2, r * 2 + 4, r * 2 + 4);

  // Classic black pentagons
  const drawPent = (px, py, pr, rot, tilt = 1) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(1, tilt);
    ctx.fillStyle = '#202226';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const vx = Math.cos(a) * pr;
      const vy = Math.sin(a) * pr;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawPent(0, -1, 14, 0, 1);
  // Stitched hex seam lines radiating from center pentagon
  ctx.strokeStyle = 'rgba(42, 42, 46, 0.72)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13 - 1);
    ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
    ctx.stroke();
    drawPent(Math.cos(a) * 35, Math.sin(a) * 35, 11.5, a + Math.PI, 0.72);
  }

  // Slight sandstone/dust scuff & crisp top-left highlight
  ctx.fillStyle = 'rgba(182, 146, 98, 0.16)';
  ctx.beginPath();
  ctx.ellipse(10, 14, 18, 10, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
  ctx.beginPath();
  ctx.ellipse(-15, -16, 13, 8, -0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Outer crisp contour ring (outside clip)
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  ctx.strokeStyle = 'rgba(28, 24, 20, 0.7)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function strikePaintGroundShadow(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  const g = ctx.createRadialGradient(0, 0, 6, 0, 0, 44);
  g.addColorStop(0, 'rgba(24, 16, 10, 0.56)');
  g.addColorStop(0.6, 'rgba(24, 16, 10, 0.28)');
  g.addColorStop(1, 'rgba(24, 16, 10, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strikePaintSmokePuff(ctx, ox, oy, warm) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  const blobs = [
    [0, 0, 34, warm ? 'rgba(232, 212, 182, 0.32)' : 'rgba(218, 224, 230, 0.36)'],
    [-16, -8, 24, warm ? 'rgba(240, 222, 194, 0.28)' : 'rgba(234, 238, 242, 0.32)'],
    [16, 9, 22, warm ? 'rgba(212, 190, 158, 0.26)' : 'rgba(186, 194, 204, 0.28)'],
  ];
  for (const [bx, by, br, c] of blobs) {
    const g = ctx.createRadialGradient(bx, by, 2, bx, by, br);
    g.addColorStop(0, c);
    g.addColorStop(0.7, c.replace(/0\.\d+\)$/, '0.12)'));
    g.addColorStop(1, 'rgba(220,220,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function strikePaintImpactDust(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 48);
  g.addColorStop(0, 'rgba(255, 228, 178, 0.0)');
  g.addColorStop(0.45, 'rgba(242, 216, 172, 0.45)');
  g.addColorStop(0.8, 'rgba(196, 164, 118, 0.24)');
  g.addColorStop(1, 'rgba(196, 164, 118, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 232, 180, 0.72)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 28, Math.sin(a) * 28, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function strikePaintSparkFlare(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
  g.addColorStop(0, 'rgba(255, 252, 232, 0.95)');
  g.addColorStop(0.35, 'rgba(255, 194, 84, 0.65)');
  g.addColorStop(1, 'rgba(255, 140, 36, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function strikePaintTargetChalk(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  ctx.strokeStyle = 'rgba(244, 236, 216, 0.48)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.stroke();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.beginPath();
    ctx.moveTo(dx * 16, dy * 16);
    ctx.lineTo(dx * 34, dy * 34);
    ctx.stroke();
  }
  ctx.restore();
}

function buildStrikeAtlasCanvas() {
  const cvAtlas = document.createElement('canvas');
  cvAtlas.width = STRIKE_COLS * STRIKE_CELL;
  cvAtlas.height = STRIKE_ROWS * STRIKE_CELL;
  const ctx = cvAtlas.getContext('2d');

  // Row 0: Tactical cover crates, oil drum, sandbags, weapon case, palm planter, canister, shell casings
  strikePaintCrate(ctx, 0 * STRIKE_CELL, 0, 0);
  strikePaintCrate(ctx, 1 * STRIKE_CELL, 0, 1);
  strikePaintOilDrum(ctx, 2 * STRIKE_CELL, 0);
  strikePaintSandbags(ctx, 3 * STRIKE_CELL, 0);
  strikePaintWeaponCase(ctx, 4 * STRIKE_CELL, 0);
  strikePaintDesertPlanter(ctx, 5 * STRIKE_CELL, 0);
  strikePaintSmokeCanister(ctx, 6 * STRIKE_CELL, 0);
  strikePaintShellCasings(ctx, 7 * STRIKE_CELL, 0);

  // Row 1: Bullet hole decals, Site A stencil, CS2 Chickens (4 poses/variants)
  strikePaintBulletDecal(ctx, 0 * STRIKE_CELL, STRIKE_CELL, 0);
  strikePaintBulletDecal(ctx, 1 * STRIKE_CELL, STRIKE_CELL, 1);
  strikePaintBulletDecal(ctx, 2 * STRIKE_CELL, STRIKE_CELL, 2);
  strikePaintSiteStencil(ctx, 3 * STRIKE_CELL, STRIKE_CELL, 'A');
  strikePaintChickenCell(ctx, 4 * STRIKE_CELL, STRIKE_CELL, 0);
  strikePaintChickenCell(ctx, 5 * STRIKE_CELL, STRIKE_CELL, 1);
  strikePaintChickenCell(ctx, 6 * STRIKE_CELL, STRIKE_CELL, 2);
  strikePaintChickenCell(ctx, 7 * STRIKE_CELL, STRIKE_CELL, 3);

  // Row 2: CS2 Soccer ball, shadow disc, smoke clouds, dust impact, spark flare, Site B stencil, chalk reticle
  strikePaintSoccerBall(ctx, 0 * STRIKE_CELL, 2 * STRIKE_CELL);
  strikePaintGroundShadow(ctx, 1 * STRIKE_CELL, 2 * STRIKE_CELL);
  strikePaintSmokePuff(ctx, 2 * STRIKE_CELL, 2 * STRIKE_CELL, false);
  strikePaintSmokePuff(ctx, 3 * STRIKE_CELL, 2 * STRIKE_CELL, true);
  strikePaintImpactDust(ctx, 4 * STRIKE_CELL, 2 * STRIKE_CELL);
  strikePaintSparkFlare(ctx, 5 * STRIKE_CELL, 2 * STRIKE_CELL);
  strikePaintSiteStencil(ctx, 6 * STRIKE_CELL, 2 * STRIKE_CELL, 'B');
  strikePaintTargetChalk(ctx, 7 * STRIKE_CELL, 2 * STRIKE_CELL);

  return cvAtlas;
}

const STRIKE_INST_VS = `#version 300 es
layout(location = 0) in vec2 aQuad;
layout(location = 1) in vec2 aPos;
layout(location = 2) in float aSize;
layout(location = 3) in float aRot;
layout(location = 4) in vec2 aCell;
layout(location = 5) in float aAlpha;
layout(location = 6) in float aFlip;

uniform vec2 uRes;
uniform vec2 uGridAtlas;

out vec2 vUv;
out float vAlpha;

void main() {
  float c = cos(aRot);
  float s = sin(aRot);
  vec2 q = vec2(aQuad.x * aFlip, aQuad.y);
  vec2 rot = vec2(q.x * c - q.y * s, q.x * s + q.y * c) * aSize;
  vec2 wp = aPos + rot;
  vec2 ndc = vec2(wp.x / uRes.x * 2.0 - 1.0, 1.0 - wp.y / uRes.y * 2.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
  vUv = (aCell + (aQuad + 0.5)) / uGridAtlas;
  vAlpha = aAlpha;
}`;

const STRIKE_INST_FS = `#version 300 es
precision highp float;
in vec2 vUv;
in float vAlpha;
uniform sampler2D uAtlas;
out vec4 o;
void main() {
  vec4 t = texture(uAtlas, vUv);
  if (t.a * vAlpha < 0.01) discard;
  o = vec4(t.rgb, t.a * vAlpha);
}`;

function initStrikeAtlas() {
  if (strikeAtlasTex || !gl) return;
  const atlasCanvas = buildStrikeAtlasCanvas();
  strikeAtlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, strikeAtlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  strikeInstPR = program(STRIKE_INST_VS, STRIKE_INST_FS);
  strikeInstVAO = gl.createVertexArray();
  gl.bindVertexArray(strikeInstVAO);

  const quad = new Float32Array([
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
  ]);
  strikeInstBufA = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, strikeInstBufA);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  strikeInstBufB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, strikeInstBufB);
  const STRIDE = 8 * 4;
  const attrs = [
    [1, 2, 0],
    [2, 1, 8],
    [3, 1, 12],
    [4, 2, 16],
    [5, 1, 24],
    [6, 1, 28],
  ];
  for (const [loc, cnt, off] of attrs) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, cnt, gl.FLOAT, false, STRIDE, off);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindVertexArray(null);
}

/* ======================================================================
   场景实体状态：木箱掩体 (trees 兼容别名), 弹孔贴花, 烟雾尘埃, 小鸡, 足球
   ====================================================================== */
let crates = [];
let trees = crates; // share.js settle compatibility alias
let canisters = [];
let siteDecals = [];
let bulletDecals = [];
let smokePuffs = [];
let chickens = [];
let balls = [];
let impactBursts = [];
let prevIconList = [];

function strikeHash(a, b, k) {
  let h = Math.imul((a | 0) + 11, 374761393) ^ Math.imul((b | 0) + 29, 668265263) ^ Math.imul((seed | 0) + (k | 0) * 19, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function strikePointInIcon(px, py, pad) {
  if (typeof icons === 'undefined' || !icons.length) return false;
  for (const ic of icons) {
    if (px >= ic.x - pad && px <= ic.x + ic.w + pad && py >= ic.y - pad && py <= ic.y + ic.h + pad) return true;
  }
  return false;
}

function strikeDistanceToIcons(px, py) {
  if (typeof icons === 'undefined' || !icons.length) return 999;
  let best = 999;
  for (const ic of icons) {
    const dx = Math.max(ic.x - px, 0, px - (ic.x + ic.w));
    const dy = Math.max(ic.y - py, 0, py - (ic.y + ic.h));
    const d = Math.hypot(dx, dy);
    if (d < best) best = d;
  }
  return best;
}

function strikeIsClearForProp(px, py, minDist) {
  return landS(px, py) > minDist && strikeDistanceToIcons(px, py) > 32;
}

function rebuildStrikeProps() {
  if (!W || !H) return;
  crates = [];
  trees = crates;
  canisters = [];
  siteDecals = [];
  smokePuffs = [];

  // Two weathered bombsite stencil marks ('A' and 'B') in opposite courtyard halves
  siteDecals.push({
    x: W * (0.24 + 0.08 * strikeHash(1, 2, 1)),
    y: H * (0.28 + 0.10 * strikeHash(2, 3, 2)),
    size: 86,
    rot: -0.15 + strikeHash(3, 4, 3) * 0.28,
    col: 3,
    row: 1,
    alpha: 0.72,
  });
  siteDecals.push({
    x: W * (0.72 + 0.08 * strikeHash(4, 5, 4)),
    y: H * (0.64 + 0.08 * strikeHash(5, 6, 5)),
    size: 84,
    rot: 0.1 + strikeHash(6, 7, 6) * 0.25,
    col: 6,
    row: 2,
    alpha: 0.72,
  });

  // Scatter crates, drums, sandbags, planters across desert courtyard using jittered grid
  const cell = 78 / Math.sqrt(Math.max(0.25, P.crates || 1));
  const cols = Math.ceil(W / cell);
  const rows = Math.ceil((H - 44) / cell);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (strikeHash(c, r, 11) > 0.62) continue;
      const x = (c + 0.2 + 0.6 * strikeHash(c, r, 12)) * cell;
      const y = (r + 0.2 + 0.6 * strikeHash(c, r, 13)) * cell;
      if (x < 34 || x > W - 34 || y < 34 || y > H - 72) continue;

      let tooClose = false;
      for (let i = Math.max(0, crates.length - 16); i < crates.length; i++) {
        if (Math.hypot(crates[i].x - x, crates[i].y - y) < 46) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const rv = strikeHash(c, r, 14);
      let spriteCol = 0;
      let size = 44 + strikeHash(c, r, 15) * 18;
      if (rv < 0.28) spriteCol = 0;
      else if (rv < 0.48) { spriteCol = 1; size += 10; }
      else if (rv < 0.66) { spriteCol = 2; size = 38 + strikeHash(c, r, 16) * 10; }
      else if (rv < 0.82) { spriteCol = 3; size = 54 + strikeHash(c, r, 17) * 14; }
      else if (rv < 0.92) { spriteCol = 5; size = 48 + strikeHash(c, r, 18) * 12; }
      else { spriteCol = 4; size = 40; }

      const ok = strikeIsClearForProp(x, y, 26) ? 1 : 0;
      crates.push({
        x, y,
        col: spriteCol,
        size,
        rot: (strikeHash(c, r, 19) - 0.5) * 1.15,
        phase: strikeHash(c, r, 20) * Math.PI * 2,
        grow: ok,
        want: ok,
        isCase: spriteCol === 4,
      });
    }
  }

  // Discarded smoke canisters & drifting tactical smoke plumes
  const smokeSpots = Math.max(4, Math.min(18, Math.round(6 + P.smoke * 12)));
  for (let i = 0; i < smokeSpots; i++) {
    const sx = W * (0.08 + 0.84 * strikeHash(i, 71, 31));
    const sy = H * (0.08 + 0.78 * strikeHash(i, 72, 32));
    if (i < 5) {
      canisters.push({ x: sx, y: sy, rot: strikeHash(i, 73, 33) * Math.PI * 2, size: 30, grow: 1 });
    }
    for (let k = 0; k < 2; k++) {
      smokePuffs.push({
        bx: sx + (strikeHash(i, k, 34) - 0.5) * 56,
        by: sy + (strikeHash(i, k, 35) - 0.5) * 44,
        x: sx, y: sy,
        col: (i + k) % 2 === 0 ? 2 : 3,
        size: 92 + strikeHash(i, k, 36) * 68,
        spd: 0.25 + strikeHash(i, k, 37) * 0.45,
        phase: strikeHash(i, k, 38) * Math.PI * 2,
        rx: 28 + strikeHash(i, k, 39) * 34,
        ry: 16 + strikeHash(i, k, 40) * 20,
      });
    }
  }

  syncStrikeActors(true);
}

function syncBulletDecals(triggerImpacts) {
  bulletDecals = [];
  const density = typeof P.holes === 'number' ? P.holes : 1.0;
  if (typeof icons === 'undefined' || !icons.length || density <= 0.02) {
    prevIconList = typeof icons !== 'undefined' ? icons.map(ic => ({ x: ic.x, y: ic.y })) : [];
    return;
  }

  // Detect newly moved / dropped icons to fire fresh dust/spark impact bursts + kick soccer ball!
  if (triggerImpacts && prevIconList.length) {
    for (let i = 0; i < icons.length; i++) {
      const ic = icons[i];
      let matched = false;
      for (const old of prevIconList) {
        if (Math.hypot(ic.x - old.x, ic.y - old.y) < 16) { matched = true; break; }
      }
      if (!matched) {
        impactBursts.push({
          x: ic.x + ic.w * 0.5,
          y: ic.y + ic.h * 0.45,
          age: 0,
          dur: 0.48,
          size: 74,
          rot: strikeHash(i, Math.round(ic.x), 91) * Math.PI * 2,
        });
      }
    }
  }
  prevIconList = icons.map(ic => ({ x: ic.x, y: ic.y }));

  const perIcon = Math.max(1, Math.min(7, Math.round(3.5 * density)));
  for (let i = 0; i < icons.length; i++) {
    const ic = icons[i];
    const cx = ic.x + ic.w * 0.5;
    const cy = ic.y + ic.h * 0.44;
    for (let k = 0; k < perIcon; k++) {
      const h1 = strikeHash(i * 13 + k, Math.round(ic.x * 0.25), 51);
      const h2 = strikeHash(i * 17 + k, Math.round(ic.y * 0.25), 52);
      const h3 = strikeHash(i * 23 + k, k, 53);
      const ang = (k / perIcon) * Math.PI * 2 + h1 * 1.4;
      const rad = 18 + h2 * Math.max(22, (P.sigma || 82) * 0.58);
      const dx = cx + Math.cos(ang) * rad;
      const dy = cy + Math.sin(ang) * rad * 0.88;
      if (dx < 8 || dx > W - 8 || dy < 8 || dy > H - 40) continue;

      if (k === perIcon - 1 && h3 < 0.75) {
        // Spent brass shell casings scattered along edge of impact zone
        bulletDecals.push({
          x: dx, y: dy,
          row: 0, col: 7,
          size: 28 + h1 * 8,
          rot: h3 * Math.PI * 2,
          alpha: 0.92,
        });
      } else {
        // Bullet crater cluster / shatter / ricochet scar
        const dCol = h3 < 0.46 ? 0 : h3 < 0.8 ? 1 : 2;
        bulletDecals.push({
          x: dx, y: dy,
          row: 1, col: dCol,
          size: 32 + h1 * 16,
          rot: h2 * Math.PI * 2,
          alpha: 0.86,
        });
      }
    }
  }
}

function strikeFindOpenSpot(idx, salt) {
  let best = { x: W * 0.55, y: H * 0.55 };
  let bestScore = -1e9;
  for (let t = 0; t < 24; t++) {
    const px = 56 + strikeHash(idx + t * 3, salt, 61) * Math.max(80, W - 112);
    const py = 56 + strikeHash(idx + t * 5, salt, 62) * Math.max(80, H - 116);
    const dIcons = strikeDistanceToIcons(px, py);
    const sVal = landS(px, py);
    const score = Math.min(dIcons, 140) + Math.min(sVal, 80) * 0.5;
    if (score > bestScore) { bestScore = score; best = { x: px, y: py }; }
  }
  return best;
}

function strikeKickBallAway(b, fromX, fromY, extraSpeed) {
  let bestDirX = b.x - fromX;
  let bestDirY = b.y - fromY;
  const rawLen = Math.hypot(bestDirX, bestDirY);
  if (rawLen < 2) {
    const ang = strikeHash(b.idx, Math.round(b.x + b.y), 77) * Math.PI * 2;
    bestDirX = Math.cos(ang);
    bestDirY = Math.sin(ang);
  } else {
    bestDirX /= rawLen;
    bestDirY /= rawLen;
  }

  // Evaluate 12 radial escape lanes and pick one landing well clear of icons and screen borders
  let bestScore = -1e9;
  const baseAng = Math.atan2(bestDirY, bestDirX);
  for (let i = 0; i < 12; i++) {
    const a = baseAng + (i / 12) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const tx = b.x + dx * 135;
    const ty = b.y + dy * 135;
    if (tx < 42 || tx > W - 42 || ty < 42 || ty > H - 82) continue;
    const dIcon = strikeDistanceToIcons(tx, ty);
    const alignment = dx * bestDirX + dy * bestDirY;
    const score = dIcon + alignment * 28;
    if (score > bestScore) {
      bestScore = score;
      bestDirX = dx;
      bestDirY = dy;
    }
  }

  const speed = (extraSpeed || 330) + strikeHash(b.idx, Math.round(fromX), 79) * 95;
  b.vx = bestDirX * speed;
  b.vy = bestDirY * speed;
  b.vz = 155 + strikeHash(b.idx, Math.round(fromY), 80) * 65;
  b.spin = (b.vx >= 0 ? 1 : -1) * (4.5 + speed * 0.015);
  b.x = Math.min(Math.max(36, b.x + bestDirX * 14), W - 36);
  b.y = Math.min(Math.max(36, b.y + bestDirY * 14), H - 72);

  impactBursts.push({
    x: b.x, y: b.y,
    age: 0, dur: 0.36, size: 54,
    rot: Math.atan2(bestDirY, bestDirX),
  });
}

function strikeCheckBallIconOverlap(allowTeleportFallback) {
  if (typeof icons === 'undefined' || !icons.length) return;
  for (const b of balls) {
    const pad = b.r + 14;
    for (const ic of icons) {
      const cx = ic.x + ic.w * 0.5;
      const cy = ic.y + ic.h * 0.5;
      const nearestX = Math.max(ic.x, Math.min(b.x, ic.x + ic.w));
      const nearestY = Math.max(ic.y, Math.min(b.y, ic.y + ic.h));
      const dx = b.x - nearestX;
      const dy = b.y - nearestY;
      const dist = Math.hypot(dx, dy);
      if (dist < pad) {
        strikeKickBallAway(b, cx, cy, 340);
        // Push clear of padded icon bounds and launch cleanly toward open courtyard at realistic speed
        if (allowTeleportFallback && strikePointInIcon(b.x, b.y, b.r + 6)) {
          const free = strikeFindOpenSpot(b.idx + 3, Math.round(ic.x + ic.y));
          const fdx = free.x - b.x;
          const fdy = free.y - b.y;
          const fd = Math.max(1, Math.hypot(fdx, fdy));
          const kickSpd = 380 + strikeHash(b.idx, Math.round(ic.x), 81) * 70;
          b.x = Math.min(Math.max(36, b.x + (fdx / fd) * (ic.w * 0.65 + b.r + 12)), W - 36);
          b.y = Math.min(Math.max(36, b.y + (fdy / fd) * (ic.h * 0.65 + b.r + 12)), H - 72);
          b.vx = (fdx / fd) * kickSpd;
          b.vy = (fdy / fd) * kickSpd;
          b.vz = 195;
          b.spin = (b.vx >= 0 ? 1 : -1) * 8.5;
        }
        break;
      }
    }
  }
}

function syncStrikeActors(resetAll) {
  const wantBalls = Math.max(0, Math.min(3, Math.round(P.ball)));
  if (resetAll) balls = [];
  if (balls.length > wantBalls) balls.length = wantBalls;
  while (balls.length < wantBalls) {
    const idx = balls.length;
    const spot = strikeFindOpenSpot(idx, 101 + idx * 17);
    const kickAng = strikeHash(idx, 19, 83) * Math.PI * 2;
    balls.push({
      idx,
      x: spot.x,
      y: spot.y,
      z: 0,
      vx: Math.cos(kickAng) * 58,
      vy: Math.sin(kickAng) * 58,
      vz: 0,
      r: 21,
      rot: strikeHash(idx, 20, 84) * Math.PI * 2,
      spin: 2.2,
    });
  }

  const wantChickens = Math.max(0, Math.min(10, Math.round(P.chickens)));
  if (resetAll) chickens = [];
  if (chickens.length > wantChickens) chickens.length = wantChickens;
  while (chickens.length < wantChickens) {
    const idx = chickens.length;
    const start = strikeFindOpenSpot(idx + 10, 211 + idx * 23);
    const dest = strikeFindOpenSpot(idx + 10, 212 + idx * 23);
    const variantRoll = strikeHash(idx, 25, 86);
    const baseCol = variantRoll < 0.62 ? 4 : variantRoll < 0.88 ? 6 : 7;
    chickens.push({
      idx,
      baseCol,
      x: start.x,
      y: start.y,
      tx: dest.x,
      ty: dest.y,
      flip: dest.x >= start.x ? 1 : -1,
      wait: 0.6 + strikeHash(idx, 27, 87) * 2.0,
      panicT: 0,
      stepCount: idx * 19 + 3,
      walkT: strikeHash(idx, 28, 88) * 8,
    });
  }

  // Scare chickens if an icon moved onto them
  for (const ch of chickens) {
    if (strikeDistanceToIcons(ch.x, ch.y) < 34) {
      const safe = strikeFindOpenSpot(ch.idx, ch.stepCount++);
      ch.tx = safe.x;
      ch.ty = safe.y;
      ch.flip = ch.tx >= ch.x ? 1 : -1;
      ch.wait = 0;
      ch.panicT = 1.4;
    }
  }

  strikeCheckBallIconOverlap(true);
}

function updateStrikeTargets(snap) {
  for (const t of crates) {
    const ok = strikeIsClearForProp(t.x, t.y, 26) ? 1 : 0;
    t.want = ok;
    if (snap) t.grow = ok;
  }
  syncBulletDecals(!snap);
  syncStrikeActors(false);
}

function syncStrikeSettings(rebuildAll) {
  if (rebuildAll) rebuildStrikeProps();
  else syncBulletDecals(false);
  syncStrikeActors(false);
}

function strikePointerKick(px, py, mvx, mvy) {
  let kicked = false;
  for (const b of balls) {
    const dx = b.x - px;
    const dy = b.y - py;
    const d = Math.hypot(dx, dy);
    if (d < b.r + 18) {
      const speed = Math.min(460, Math.max(210, Math.hypot(mvx || 0, mvy || 0) * 1.4 + 220));
      strikeKickBallAway(b, px, py, speed);
      kicked = true;
    }
  }
  for (const ch of chickens) {
    if (Math.hypot(ch.x - px, ch.y - py) < 42) {
      const safe = strikeFindOpenSpot(ch.idx, ch.stepCount++);
      ch.tx = safe.x;
      ch.ty = safe.y;
      ch.flip = ch.tx >= ch.x ? 1 : -1;
      ch.wait = 0;
      ch.panicT = 1.3;
    }
  }
  return kicked;
}

function stepStrikeProps(dt, timeSec) {
  const rate = dt * 3.0;
  for (const c of crates) {
    if (c.grow < c.want) c.grow = Math.min(c.want, c.grow + rate);
    else if (c.grow > c.want) c.grow = Math.max(c.want, c.grow - rate * 1.5);
  }

  // Update brief muzzle/kick dust bursts
  for (let i = impactBursts.length - 1; i >= 0; i--) {
    impactBursts[i].age += dt;
    if (impactBursts[i].age >= impactBursts[i].dur) impactBursts.splice(i, 1);
  }

  // Drift tactical smoke plumes softly with wind
  const driftT = timeSec * (0.28 + 0.72 * (P.wind || 0));
  for (const s of smokePuffs) {
    s.x = s.bx + Math.sin(driftT * s.spd + s.phase) * s.rx;
    s.y = s.by + Math.cos(driftT * s.spd * 0.8 + s.phase * 1.3) * s.ry;
  }

  // CS2 Soccer ball physics: roll, bounce on floor, collide with screen walls, crates & icons
  const friction = Math.exp(-dt * 1.38);
  for (const b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.vz -= 720 * dt;
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -45) b.vz = -b.vz * 0.52;
      else b.vz = 0;
    }

    const speed = Math.hypot(b.vx, b.vy);
    b.rot += (b.vx >= 0 ? 1 : -1) * (speed / Math.max(12, b.r)) * dt + b.spin * dt * 0.22;
    b.spin *= friction;
    b.vx *= friction;
    b.vy *= friction;
    if (speed < 3 && b.z === 0) { b.vx = 0; b.vy = 0; }

    // Screen border collisions (respect taskbar at bottom)
    const minX = b.r + 12, maxX = Math.max(minX + 10, W - b.r - 12);
    const minY = b.r + 12, maxY = Math.max(minY + 10, H - b.r - 58);
    if (b.x < minX) { b.x = minX; b.vx = Math.abs(b.vx) * 0.82; }
    if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * 0.82; }
    if (b.y < minY) { b.y = minY; b.vy = Math.abs(b.vy) * 0.82; }
    if (b.y > maxY) { b.y = maxY; b.vy = -Math.abs(b.vy) * 0.82; }

    // Collide softly against active wooden crates / drums
    for (let i = 0; i < crates.length; i++) {
      const c = crates[i];
      if (c.want < 0.5 || c.grow < 0.6) continue;
      const cr = c.size * 0.38 + b.r;
      const dx = b.x - c.x;
      const dy = b.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.1 && d < cr) {
        const nx = dx / d, ny = dy / d;
        b.x = c.x + nx * cr;
        b.y = c.y + ny * cr;
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx = (b.vx - 1.76 * dot * nx);
          b.vy = (b.vy - 1.76 * dot * ny);
          b.vz = Math.max(b.vz, 65);
        }
      }
    }

    // Bounce / kick cleanly away if approaching any icon!
    if (typeof icons !== 'undefined' && icons.length) {
      for (const ic of icons) {
        const nearestX = Math.max(ic.x - 4, Math.min(b.x, ic.x + ic.w + 4));
        const nearestY = Math.max(ic.y - 4, Math.min(b.y, ic.y + ic.h + 4));
        const dx = b.x - nearestX;
        const dy = b.y - nearestY;
        const d = Math.hypot(dx, dy);
        if (d < b.r + 6) {
          strikeKickBallAway(b, ic.x + ic.w * 0.5, ic.y + ic.h * 0.5, 310);
          break;
        }
      }
    }
  }

  // Ball-to-ball collision when ball count > 1
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = a.r + b.r;
      if (d > 0.1 && d < minD) {
        const nx = dx / d, ny = dy / d;
        const overlap = (minD - d) * 0.5;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (dv > 0) {
          a.vx -= nx * dv * 0.85; a.vy -= ny * dv * 0.85;
          b.vx += nx * dv * 0.85; b.vy += ny * dv * 0.85;
        }
      }
    }
  }

  // Chicken patrol + panic scurry when a moving ball rolls nearby!
  const chSpeed = 28 * (0.55 + 0.45 * (P.wind || 0));
  for (const ch of chickens) {
    if (ch.panicT > 0) ch.panicT = Math.max(0, ch.panicT - dt);
    for (const b of balls) {
      if (Math.hypot(ch.x - b.x, ch.y - b.y) < 48 && Math.hypot(b.vx, b.vy) > 35 && ch.panicT <= 0.1) {
        const safe = strikeFindOpenSpot(ch.idx, ch.stepCount++);
        ch.tx = safe.x;
        ch.ty = safe.y;
        ch.flip = ch.tx >= ch.x ? 1 : -1;
        ch.wait = 0;
        ch.panicT = 1.4;
        break;
      }
    }

    if (ch.wait > 0) {
      ch.wait -= dt;
      ch.walkT = 0;
      if (ch.wait <= 0) {
        const next = strikeFindOpenSpot(ch.idx, ch.stepCount++);
        ch.tx = next.x;
        ch.ty = next.y;
        if (Math.abs(ch.tx - ch.x) > 2) ch.flip = ch.tx >= ch.x ? 1 : -1;
      }
    } else {
      const dx = ch.tx - ch.x;
      const dy = ch.ty - ch.y;
      const dist = Math.hypot(dx, dy);
      const step = (ch.panicT > 0 ? chSpeed * 3.1 : chSpeed) * dt;
      if (dist <= step + 1) {
        ch.x = ch.tx;
        ch.y = ch.ty;
        ch.wait = 1.4 + strikeHash(ch.idx, ch.stepCount, 93) * 2.6;
        ch.walkT = 0;
      } else {
        ch.x += (dx / dist) * step;
        ch.y += (dy / dist) * step;
        ch.walkT += dt * (ch.panicT > 0 ? 15.0 : 7.5);
      }
    }
  }
}

function drawStrikeProps(timeSec) {
  if (!gl) return;
  initStrikeAtlas();

  const floorItems = [];
  const entityItems = [];
  const smokeItems = [];
  const fxItems = [];

  // 1. Weathered Bombsite A/B stencil markings + chalk crosshair decals
  for (const st of siteDecals) {
    floorItems.push({
      x: st.x, y: st.y,
      size: st.size, rot: st.rot,
      col: st.col, row: st.row, alpha: st.alpha, flip: 1,
    });
  }

  // 2. Bullet hole craters & spent brass shell casings around icon pads
  for (const bd of bulletDecals) {
    floorItems.push({
      x: bd.x, y: bd.y,
      size: bd.size, rot: bd.rot,
      col: bd.col, row: bd.row, alpha: bd.alpha, flip: 1,
    });
  }

  // 3. Discarded tactical smoke canisters
  for (const cn of canisters) {
    floorItems.push({
      x: cn.x, y: cn.y,
      size: cn.size, rot: cn.rot,
      col: 6, row: 0, alpha: 0.92, flip: 1,
    });
  }

  // 4. Depth-sorted crates, chickens, and CS2 soccer balls
  for (const c of crates) {
    if (c.grow <= 0.01) continue;
    const ease = c.grow * c.grow * (3 - 2 * c.grow);
    entityItems.push({
      sortY: c.y,
      x: c.x, y: c.y,
      size: c.size * (0.28 + 0.72 * ease),
      rot: c.rot,
      col: c.col, row: 0,
      alpha: Math.min(1, ease * 1.1),
      flip: 1,
    });
    // Blinking crimson beacon glint on weapon/C4 hardcases
    if (c.isCase && ease > 0.75) {
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 6.2 + c.phase);
      if (pulse > 0.6) {
        fxItems.push({
          x: c.x, y: c.y,
          size: 16 + pulse * 10,
          rot: timeSec * 0.4,
          col: 5, row: 2,
          alpha: (pulse - 0.55) * 1.5,
          flip: 1,
        });
      }
    }
  }

  for (const ch of chickens) {
    const hop = ch.walkT > 0 ? Math.abs(Math.sin(ch.walkT)) * (ch.panicT > 0 ? 6.0 : 2.6) : 0;
    const waddle = ch.walkT > 0 ? Math.sin(ch.walkT) * 0.08 : Math.sin(timeSec * 2.2 + ch.idx) * 0.03;
    const col = ch.panicT > 0.05 ? 5 : ch.baseCol;
    entityItems.push({
      sortY: ch.y,
      x: ch.x, y: ch.y - hop,
      size: 48,
      rot: waddle,
      col, row: 1,
      alpha: 0.99,
      flip: ch.flip,
    });
  }

  for (const b of balls) {
    // Ground shadow directly on floor beneath bouncing ball
    const shadowScale = Math.max(0.55, 1.0 - b.z * 0.004);
    floorItems.push({
      x: b.x + 5 + b.z * 0.14,
      y: b.y + 6 + b.z * 0.16,
      size: b.r * 2.55 * shadowScale,
      rot: 0,
      col: 1, row: 2,
      alpha: Math.max(0.28, 0.72 - b.z * 0.003),
      flip: 1,
    });
    // Rolling & hopping soccer ball body
    entityItems.push({
      sortY: b.y + 2,
      x: b.x,
      y: b.y - b.z,
      size: b.r * 2.55 * (1 + b.z * 0.0028),
      rot: b.rot,
      col: 0, row: 2,
      alpha: 1.0,
      flip: 1,
    });
  }

  entityItems.sort((a, b) => a.sortY - b.sortY);

  // 5. Drifting tactical smoke & sunlit sand haze + active impact dust puffs
  const smokeAlpha = P.smoke || 0;
  if (smokeAlpha > 0.02) {
    for (const s of smokePuffs) {
      smokeItems.push({
        x: s.x, y: s.y,
        size: s.size,
        rot: Math.sin(timeSec * 0.25 + s.phase) * 0.4,
        col: s.col, row: 2,
        alpha: smokeAlpha * 0.65,
        flip: 1,
      });
    }
  }
  for (const imp of impactBursts) {
    const t = imp.age / imp.dur;
    fxItems.push({
      x: imp.x, y: imp.y,
      size: imp.size * (0.45 + 0.85 * t),
      rot: imp.rot + t * 0.35,
      col: 4, row: 2,
      alpha: (1 - t) * 0.9,
      flip: 1,
    });
  }

  const all = floorItems.concat(entityItems, smokeItems, fxItems);
  if (!all.length) return;

  const data = new Float32Array(all.length * 8);
  for (let i = 0; i < all.length; i++) {
    const it = all[i];
    const o = i * 8;
    data[o] = it.x;
    data[o + 1] = it.y;
    data[o + 2] = it.size;
    data[o + 3] = it.rot;
    data[o + 4] = it.col;
    data[o + 5] = it.row;
    data[o + 6] = it.alpha;
    data[o + 7] = it.flip;
  }

  gl.enable(gl.BLEND);
  // Keep canvas destination alpha strictly at 1.0 to avoid premultiplied alpha overflow artifacts
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
  gl.useProgram(strikeInstPR.p);
  gl.bindVertexArray(strikeInstVAO);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, strikeAtlasTex);
  gl.uniform1i(strikeInstPR.U.uAtlas, 0);
  gl.uniform2f(strikeInstPR.U.uRes, cv.width / cv._scale, cv.height / cv._scale);
  gl.uniform2f(strikeInstPR.U.uGridAtlas, STRIKE_COLS, STRIKE_ROWS);

  gl.bindBuffer(gl.ARRAY_BUFFER, strikeInstBufB);
  if (all.length > strikeInstCap) {
    strikeInstCap = Math.max(all.length, 64);
    gl.bufferData(gl.ARRAY_BUFFER, strikeInstCap * 32, gl.DYNAMIC_DRAW);
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, all.length);
  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
}
