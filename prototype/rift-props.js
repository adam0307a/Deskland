'use strict';

// Deskland · Runic Rift (符文峡谷) 2D painter atlas + instanced WebGL2 renderer
// Original clean-room assets inspired by painterly top-down fantasy jungle lanes,
// carved runic stone pedestals, hextech ward lanterns, and luminous mana wisps.

const RIFT_COLS = 8;
const RIFT_ROWS = 3;
const RIFT_CELL = 128;

let riftAtlasTex = null;
let riftInstPR = null;
let riftInstVAO = null;
let riftInstBufA = null;
let riftInstBufB = null;
let riftInstCap = 0;

function riftDrawLeafCluster(ctx, cx, cy, rx, ry, baseCol, midCol, hiCol, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot || 0);

  // Soft dark contour & shadow base
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.ellipse(0, 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mid gouache fill
  ctx.fillStyle = midCol;
  ctx.beginPath();
  ctx.ellipse(-rx * 0.06, -1, rx * 0.9, ry * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();

  // Painterly top-left sunlit crown highlight
  ctx.fillStyle = hiCol;
  ctx.beginPath();
  ctx.ellipse(-rx * 0.18, -ry * 0.24, rx * 0.56, ry * 0.48, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Crisp stylized rim accent
  ctx.strokeStyle = 'rgba(13, 28, 22, 0.36)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 1.5, rx * 0.96, ry * 0.94, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function riftPaintTreeCell(ctx, ox, oy, variant) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64;
  const by = 108;

  // Ground ambient occlusion shadow
  ctx.fillStyle = 'rgba(10, 22, 18, 0.42)';
  ctx.beginPath();
  ctx.ellipse(cx + 5, by + 3, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gnarled root/trunk silhouette
  ctx.fillStyle = '#33251f';
  ctx.beginPath();
  ctx.moveTo(cx - 8, by + 2);
  ctx.quadraticCurveTo(cx - 5, by - 16, cx - 4, by - 28);
  ctx.lineTo(cx + 5, by - 28);
  ctx.quadraticCurveTo(cx + 6, by - 14, cx + 10, by + 2);
  ctx.closePath();
  ctx.fill();

  // Root moss touch
  ctx.fillStyle = '#376143';
  ctx.beginPath();
  ctx.ellipse(cx - 6, by, 7, 4, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 7, by + 1, 6, 3.5, 0.25, 0, Math.PI * 2);
  ctx.fill();

  if (variant === 0) {
    // Broad emerald jungle canopy with golden moss top
    riftDrawLeafCluster(ctx, cx - 18, by - 36, 22, 18, '#132a21', '#1e4635', '#3e734c', -0.2);
    riftDrawLeafCluster(ctx, cx + 18, by - 34, 21, 17, '#132a21', '#1b4030', '#386b46', 0.2);
    riftDrawLeafCluster(ctx, cx, by - 52, 27, 23, '#173428', '#295b41', '#6b9848', 0);
    riftDrawLeafCluster(ctx, cx - 5, by - 64, 17, 13, '#224a36', '#4a7f46', '#8db355', -0.15);
  } else if (variant === 1) {
    // Tiered highland Rift pine (teal-emerald)
    const tiers = [
      [cx, by - 30, 32, 14, '#11261f', '#1c4435', '#34694d'],
      [cx, by - 48, 25, 13, '#142f26', '#22523f', '#467f58'],
      [cx, by - 65, 19, 12, '#18372c', '#2d634a', '#649a5c'],
      [cx - 1, by - 80, 12, 11, '#1e4535', '#427b52', '#89b462'],
    ];
    for (const [x, y, rx, ry, a, b, c] of tiers) {
      riftDrawLeafCluster(ctx, x, y, rx, ry, a, b, c, 0);
    }
  } else if (variant === 2) {
    // Twin-crown ancient oak with faint cyan mana blossom specks
    riftDrawLeafCluster(ctx, cx - 15, by - 46, 23, 21, '#122921', '#214b39', '#4f824e', -0.25);
    riftDrawLeafCluster(ctx, cx + 14, by - 50, 22, 20, '#122921', '#1f4736', '#48794a', 0.22);
    riftDrawLeafCluster(ctx, cx, by - 64, 20, 17, '#1a3b2c', '#3b7149', '#7ea653', 0);
    ctx.fillStyle = '#4ff3e6';
    for (const [bx, byp, br] of [[cx - 16, by - 48, 2.2], [cx + 12, by - 56, 2.0], [cx - 2, by - 71, 1.8]]) {
      ctx.beginPath(); ctx.arc(bx, byp, br, 0, Math.PI * 2); ctx.fill();
    }
  } else if (variant === 3) {
    // Dense low Rift bush / riverfern clump (darker emerald)
    riftDrawLeafCluster(ctx, cx - 16, by - 22, 18, 14, '#11251e', '#1e4637', '#386e4c', -0.18);
    riftDrawLeafCluster(ctx, cx + 16, by - 21, 18, 14, '#11251e', '#1a3e30', '#316244', 0.2);
    riftDrawLeafCluster(ctx, cx, by - 31, 22, 17, '#163228', '#2a5a41', '#5c8d4d', 0);
  } else if (variant === 4) {
    // Sculpted bronze-autumn/amber elderwood tree for warm contrast
    riftDrawLeafCluster(ctx, cx - 15, by - 38, 20, 17, '#222b20', '#395534', '#6d8a42', -0.2);
    riftDrawLeafCluster(ctx, cx + 16, by - 37, 20, 17, '#222b20', '#334d2f', '#5d7c3c', 0.18);
    riftDrawLeafCluster(ctx, cx, by - 55, 25, 21, '#263421', '#4c6d37', '#9eb14f', 0);
    riftDrawLeafCluster(ctx, cx - 3, by - 66, 15, 11, '#3b4e27', '#738e42', '#bfd062', -0.1);
  } else {
    // Carved cliff spire stone + overgrown moss crown
    ctx.fillStyle = '#242b2f';
    ctx.beginPath();
    ctx.moveTo(cx - 24, by + 2);
    ctx.lineTo(cx - 18, by - 38);
    ctx.lineTo(cx - 4, by - 58);
    ctx.lineTo(cx + 15, by - 46);
    ctx.lineTo(cx + 23, by + 2);
    ctx.closePath();
    ctx.fill();

    // Sunlit stone facet
    ctx.fillStyle = '#475257';
    ctx.beginPath();
    ctx.moveTo(cx - 18, by - 38);
    ctx.lineTo(cx - 4, by - 58);
    ctx.lineTo(cx + 2, by - 32);
    ctx.lineTo(cx - 12, by + 2);
    ctx.lineTo(cx - 24, by + 2);
    ctx.closePath();
    ctx.fill();

    // Carved cyan rune line on cliff face
    ctx.strokeStyle = 'rgba(54, 240, 228, 0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, by - 40);
    ctx.lineTo(cx - 3, by - 25);
    ctx.lineTo(cx - 9, by - 14);
    ctx.stroke();

    riftDrawLeafCluster(ctx, cx + 4, by - 48, 17, 11, '#163127', '#2f6043', '#6b9749', 0.15);
  }
  ctx.restore();
}

function riftPaintWardCell(ctx, ox, oy, variant) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64, by = 104;

  // Ambient shadow + teal ground light pool
  const glow = ctx.createRadialGradient(cx, by - 44, 4, cx, by - 30, 52);
  if (variant === 0) {
    glow.addColorStop(0, 'rgba(72, 248, 236, 0.55)');
    glow.addColorStop(0.45, 'rgba(34, 184, 188, 0.22)');
  } else {
    glow.addColorStop(0, 'rgba(255, 214, 108, 0.55)');
    glow.addColorStop(0.45, 'rgba(208, 146, 56, 0.22)');
  }
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, by - 36, 52, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(8, 16, 18, 0.48)';
  ctx.beginPath(); ctx.ellipse(cx + 2, by + 2, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

  // Carved stone & antique brass pedestal
  ctx.fillStyle = '#333b40';
  ctx.beginPath();
  ctx.moveTo(cx - 17, by);
  ctx.lineTo(cx - 12, by - 24);
  ctx.lineTo(cx + 12, by - 24);
  ctx.lineTo(cx + 17, by);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#536067';
  ctx.beginPath();
  ctx.moveTo(cx - 17, by);
  ctx.lineTo(cx - 12, by - 24);
  ctx.lineTo(cx, by - 24);
  ctx.lineTo(cx - 2, by);
  ctx.closePath();
  ctx.fill();

  // Brass collar & framing prongs
  ctx.strokeStyle = '#c89e4c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 14, by - 24);
  ctx.lineTo(cx + 14, by - 24);
  ctx.stroke();

  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - 10, by - 24);
  ctx.lineTo(cx - 14, by - 46);
  ctx.lineTo(cx - 6, by - 55);
  ctx.moveTo(cx + 10, by - 24);
  ctx.lineTo(cx + 14, by - 46);
  ctx.lineTo(cx + 6, by - 55);
  ctx.stroke();

  // Floating Hextech crystal prism
  const cTop = variant === 0 ? '#a8fff7' : '#fff0b2';
  const cMid = variant === 0 ? '#2ae3d8' : '#f2b749';
  const cDark = variant === 0 ? '#128c96' : '#a86c1e';
  const cy = by - 50;

  ctx.fillStyle = cDark;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 11, cy);
  ctx.lineTo(cx, cy + 20);
  ctx.lineTo(cx - 11, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cMid;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 3, cy);
  ctx.lineTo(cx, cy + 20);
  ctx.lineTo(cx - 11, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cTop;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx + 2, cy - 4);
  ctx.lineTo(cx - 7, cy - 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function riftPaintWispCell(ctx, ox, oy, variant) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  const palettes = [
    ['rgba(195,255,250,0.98)', 'rgba(46,232,216,0.68)', 'rgba(30,170,180,0)'],
    ['rgba(215,240,255,0.98)', 'rgba(82,174,255,0.65)', 'rgba(40,108,215,0)'],
    ['rgba(255,244,196,0.98)', 'rgba(248,196,76,0.68)', 'rgba(204,132,34,0)'],
  ];
  const [core, mid, edge] = palettes[variant % palettes.length];
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 44);
  g.addColorStop(0, core);
  g.addColorStop(0.26, mid);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();

  // Sharp arcane diamond core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function riftPaintHeroBase(ctx, cx, by, glowRgb) {
  // Ground shadow + faint heroic aura under feet
  ctx.fillStyle = 'rgba(6, 14, 14, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, by + 2, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (glowRgb) {
    const g = ctx.createRadialGradient(cx, by - 2, 2, cx, by - 2, 28);
    g.addColorStop(0, `rgba(${glowRgb}, 0.42)`);
    g.addColorStop(1, `rgba(${glowRgb}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, by - 2, 28, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function riftPaintChibiHead(ctx, cx, hy, skinCol, hairCol, eyeCol) {
  // Rounded stylized chibi face with dark ink outline
  ctx.fillStyle = skinCol;
  ctx.strokeStyle = '#181e24';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, hy, 13.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Soft cheek blush
  ctx.fillStyle = 'rgba(244, 130, 135, 0.42)';
  ctx.beginPath();
  ctx.ellipse(cx - 7.5, hy + 3.5, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 7.5, hy + 3.5, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Expressive eyes (looking slightly forward-right for flip readability)
  ctx.fillStyle = eyeCol || '#1a2636';
  ctx.beginPath();
  ctx.ellipse(cx - 3.6, hy + 1.2, 2.0, 2.7, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 5.2, hy + 1.2, 2.0, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 3.1, hy + 0.3, 0.85, 0, Math.PI * 2);
  ctx.arc(cx + 5.7, hy + 0.3, 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Hair cap bangs
  ctx.fillStyle = hairCol;
  ctx.beginPath();
  ctx.arc(cx, hy - 3.5, 14.2, Math.PI * 0.98, Math.PI * 2.04);
  ctx.quadraticCurveTo(cx + 8, hy - 3, cx + 2, hy - 7);
  ctx.quadraticCurveTo(cx - 5, hy - 2, cx - 14, hy - 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function riftPaintHeroCell(ctx, ox, oy, kind) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64, by = 108;

  if (kind === 0) {
    // Col 3: Wind Ronin (Yasuo-inspired) - ponytail, blue sash, katana + gale arc
    riftPaintHeroBase(ctx, cx, by, '90, 225, 220');

    // Swirling wind arc behind
    ctx.strokeStyle = 'rgba(130, 245, 240, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - 2, by - 36, 32, Math.PI * 0.72, Math.PI * 1.48);
    ctx.stroke();

    // Flowing dark ponytail behind head
    ctx.fillStyle = '#1e2736';
    ctx.strokeStyle = '#11161d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, by - 58);
    ctx.quadraticCurveTo(cx - 30, by - 64, cx - 34, by - 42);
    ctx.quadraticCurveTo(cx - 21, by - 46, cx - 10, by - 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flowing sky-blue scarf & tunic
    ctx.fillStyle = '#263448';
    ctx.beginPath();
    ctx.moveTo(cx - 12, by - 40);
    ctx.lineTo(cx + 12, by - 40);
    ctx.lineTo(cx + 16, by - 8);
    ctx.lineTo(cx - 14, by - 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armored shoulder pauldron + sash
    ctx.fillStyle = '#8b99a8';
    ctx.beginPath();
    ctx.ellipse(cx - 12, by - 36, 8, 6, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38b6ff';
    ctx.beginPath();
    ctx.moveTo(cx - 14, by - 34);
    ctx.quadraticCurveTo(cx - 32, by - 22, cx - 26, by - 12);
    ctx.lineTo(cx - 10, by - 25);
    ctx.closePath();
    ctx.fill();

    // Steel katana held forward
    ctx.strokeStyle = '#d9eef7';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(cx + 8, by - 26);
    ctx.lineTo(cx + 38, by - 46);
    ctx.stroke();
    ctx.strokeStyle = '#d4a64a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 6, by - 23);
    ctx.lineTo(cx + 12, by - 30);
    ctx.stroke();

    riftPaintChibiHead(ctx, cx, by - 52, '#f4cbb2', '#1e2736', '#25394f');
    // Spiky hair tuft
    ctx.fillStyle = '#1e2736';
    ctx.beginPath();
    ctx.moveTo(cx - 8, by - 64);
    ctx.lineTo(cx - 2, by - 75);
    ctx.lineTo(cx + 5, by - 65);
    ctx.lineTo(cx + 12, by - 71);
    ctx.lineTo(cx + 13, by - 60);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 1) {
    // Col 4: Nine-Tail Fox Mage (Ahri-inspired) - fluffy tails, fox ears, cyan Spirit Orb
    riftPaintHeroBase(ctx, cx, by, '72, 238, 255');

    // Lush fan of fluffy tails
    const tailOffsets = [[-22, -34, -0.7], [-14, -42, -0.35], [-2, -45, 0], [10, -40, 0.35], [-26, -22, -1.0]];
    for (const [tx, ty, rot] of tailOffsets) {
      ctx.save();
      ctx.translate(cx + tx, by + ty);
      ctx.rotate(rot);
      ctx.fillStyle = '#fff5ea';
      ctx.strokeStyle = '#332124';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd480';
      ctx.beginPath();
      ctx.ellipse(0, -10, 5.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Crimson & ivory Ionian robe
    ctx.fillStyle = '#c82d46';
    ctx.strokeStyle = '#241418';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, by - 38);
    ctx.lineTo(cx + 10, by - 38);
    ctx.lineTo(cx + 17, by - 6);
    ctx.lineTo(cx - 15, by - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cream skirt & gold trim
    ctx.fillStyle = '#fff6ec';
    ctx.beginPath();
    ctx.moveTo(cx - 9, by - 22);
    ctx.lineTo(cx + 11, by - 22);
    ctx.lineTo(cx + 15, by - 7);
    ctx.lineTo(cx - 13, by - 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dfae4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, by - 22);
    ctx.lineTo(cx + 11, by - 22);
    ctx.stroke();

    riftPaintChibiHead(ctx, cx, by - 51, '#fde0d2', '#3a2220', '#d88c28');

    // Tall fox ears
    ctx.fillStyle = '#2d1a18';
    ctx.strokeStyle = '#181010';
    ctx.lineWidth = 1.8;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * 4, by - 62);
      ctx.lineTo(cx + dir * 13, by - 79);
      ctx.lineTo(cx + dir * 15, by - 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8a5a8';
      ctx.beginPath();
      ctx.moveTo(cx + dir * 7, by - 62);
      ctx.lineTo(cx + dir * 12, by - 73);
      ctx.lineTo(cx + dir * 13, by - 60);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2d1a18';
    }

    // Glowing cyan Spirit Orb in right hand
    const og = ctx.createRadialGradient(cx + 25, by - 26, 2, cx + 25, by - 26, 15);
    og.addColorStop(0, '#ffffff');
    og.addColorStop(0.38, '#5bf5ff');
    og.addColorStop(1, 'rgba(40, 210, 255, 0)');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(cx + 25, by - 26, 15, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 2) {
    // Col 5: Frost Archer (Ashe-inspired) - sapphire cape, white hair, glowing frost bow
    riftPaintHeroBase(ctx, cx, by, '110, 215, 255');

    // Deep royal-blue cloak
    ctx.fillStyle = '#1c447c';
    ctx.strokeStyle = '#10223d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, by - 42);
    ctx.lineTo(cx + 12, by - 42);
    ctx.lineTo(cx + 19, by - 6);
    ctx.lineTo(cx - 21, by - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gold chest crest
    ctx.fillStyle = '#e5be5c';
    ctx.beginPath();
    ctx.moveTo(cx, by - 36);
    ctx.lineTo(cx + 7, by - 28);
    ctx.lineTo(cx, by - 20);
    ctx.lineTo(cx - 7, by - 28);
    ctx.closePath();
    ctx.fill();

    // White braided locks & hood rim
    ctx.fillStyle = '#eef6fc';
    ctx.strokeStyle = '#4e6b88';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx - 12, by - 42, 4.5, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    riftPaintChibiHead(ctx, cx, by - 51, '#fbe3d8', '#eef6fc', '#2b9be8');

    // Frost hood & gold-ice crown
    ctx.strokeStyle = '#e5be5c';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(cx, by - 52, 15.5, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();
    ctx.fillStyle = '#6feaff';
    ctx.beginPath();
    ctx.moveTo(cx, by - 73);
    ctx.lineTo(cx + 4, by - 64);
    ctx.lineTo(cx - 4, by - 64);
    ctx.closePath();
    ctx.fill();

    // Luminous Crystalline Frost Bow
    ctx.strokeStyle = '#7bf5ff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx + 16, by - 28, 18, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + 18, by - 45);
    ctx.lineTo(cx + 14, by - 28);
    ctx.lineTo(cx + 18, by - 11);
    ctx.stroke();
  } else if (kind === 3) {
    // Col 6: Starlight Mage (Lux-inspired) - blonde hair, Demacian ivory/gold armor, radiant staff
    riftPaintHeroBase(ctx, cx, by, '255, 224, 128');

    // Azure cape & ivory-gold armor dress
    ctx.fillStyle = '#255fb0';
    ctx.strokeStyle = '#172844';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, by - 40);
    ctx.lineTo(cx + 14, by - 40);
    ctx.lineTo(cx + 19, by - 8);
    ctx.lineTo(cx - 19, by - 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f2f4f8';
    ctx.beginPath();
    ctx.moveTo(cx - 10, by - 40);
    ctx.lineTo(cx + 10, by - 40);
    ctx.lineTo(cx + 13, by - 11);
    ctx.lineTo(cx - 13, by - 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Demacian shoulder trim
    ctx.fillStyle = '#eac258';
    ctx.fillRect(cx - 13, by - 40, 26, 6);

    riftPaintChibiHead(ctx, cx, by - 52, '#fde2d0', '#f7cf56', '#3388e8');

    // Blonde side locks & circlet
    ctx.fillStyle = '#f7cf56';
    ctx.beginPath();
    ctx.ellipse(cx - 12, by - 44, 4, 10, 0.15, 0, Math.PI * 2);
    ctx.ellipse(cx + 12, by - 44, 4, 10, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Radiant golden prism staff
    ctx.strokeStyle = '#e5b84b';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(cx + 22, by - 4);
    ctx.lineTo(cx + 26, by - 66);
    ctx.stroke();
    const sg = ctx.createRadialGradient(cx + 26, by - 70, 2, cx + 26, by - 70, 16);
    sg.addColorStop(0, '#ffffff');
    sg.addColorStop(0.35, '#fff09c');
    sg.addColorStop(1, 'rgba(255, 220, 110, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(cx + 26, by - 70, 16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Col 7: Fluffy Rift Poro - iconic cute horned snow puffball with pink tongue
    riftPaintHeroBase(ctx, cx, by, null);
    const py = by - 26;

    // Fluffy scalloped cloud silhouette
    ctx.fillStyle = '#fafcff';
    ctx.strokeStyle = '#536270';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, py, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soft underbelly shading
    ctx.fillStyle = '#dce6f2';
    ctx.beginPath();
    ctx.ellipse(cx, py + 11, 18, 9, 0, 0, Math.PI);
    ctx.fill();

    // Curled brown horns
    ctx.fillStyle = '#9c6e4b';
    ctx.strokeStyle = '#472f1e';
    ctx.lineWidth = 1.8;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + dir * 16, py - 18, 7, 5, dir * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Cute wide eyes
    ctx.fillStyle = '#1d2228';
    ctx.beginPath();
    ctx.arc(cx - 8, py - 4, 3.3, 0, Math.PI * 2);
    ctx.arc(cx + 9, py - 4, 3.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 9, py - 5.2, 1.2, 0, Math.PI * 2);
    ctx.arc(cx + 8, py - 5.2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Happy giant pink Poro tongue sticking out!
    ctx.fillStyle = '#ff7fa3';
    ctx.strokeStyle = '#b54666';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx + 1, py + 11, 7.5, 9.5, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 1, py + 4);
    ctx.lineTo(cx + 1, py + 14);
    ctx.stroke();
  }
  ctx.restore();
}

function riftPaintTurretCell(ctx, ox, oy, team) {
  ctx.save();
  ctx.translate(ox, oy);
  const cx = 64, by = 112;
  const isBlue = team === 0;

  // Palette per team (Order stone+brass+cyan vs Chaos obsidian+bronze+crimson-amber)
  const stoneShadow = isBlue ? '#28343d' : '#251d24';
  const stoneMain   = isBlue ? '#4e5f6b' : '#40343e';
  const stoneLight  = isBlue ? '#7a8f9a' : '#655462';
  const metalCol    = isBlue ? '#d4ad52' : '#c67d38';
  const metalDark   = isBlue ? '#876726' : '#734219';
  const orbCore     = isBlue ? '#c6ffff' : '#ffe3a8';
  const orbMid      = isBlue ? '#2ee6df' : '#ff5e3a';
  const orbDark     = isBlue ? '#11798a' : '#9c1b1e';
  const haloRgb     = isBlue ? '48, 232, 224' : '255, 96, 56';

  // Wide turret foundation shadow + ambient ground glow
  ctx.fillStyle = 'rgba(7, 12, 14, 0.52)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, by + 3, 34, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  const orbY = by - 78;
  const halo = ctx.createRadialGradient(cx, orbY, 4, cx, orbY, 46);
  halo.addColorStop(0, `rgba(${haloRgb}, 0.58)`);
  halo.addColorStop(0.5, `rgba(${haloRgb}, 0.18)`);
  halo.addColorStop(1, `rgba(${haloRgb}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, orbY, 46, 0, Math.PI * 2);
  ctx.fill();

  // Heavy octagonal stepped stone plinth
  ctx.fillStyle = stoneShadow;
  ctx.strokeStyle = '#14181d';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 31, by);
  ctx.lineTo(cx - 26, by - 16);
  ctx.lineTo(cx + 26, by - 16);
  ctx.lineTo(cx + 31, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = stoneLight;
  ctx.beginPath();
  ctx.moveTo(cx - 31, by);
  ctx.lineTo(cx - 26, by - 16);
  ctx.lineTo(cx - 4, by - 16);
  ctx.lineTo(cx - 7, by);
  ctx.closePath();
  ctx.fill();

  // Carved tapered obelisk shaft
  ctx.fillStyle = stoneMain;
  ctx.beginPath();
  ctx.moveTo(cx - 22, by - 16);
  ctx.lineTo(cx - 15, by - 62);
  ctx.lineTo(cx + 15, by - 62);
  ctx.lineTo(cx + 22, by - 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left sunlit stone bevel
  ctx.fillStyle = stoneLight;
  ctx.beginPath();
  ctx.moveTo(cx - 22, by - 16);
  ctx.lineTo(cx - 15, by - 62);
  ctx.lineTo(cx - 2, by - 62);
  ctx.lineTo(cx - 4, by - 16);
  ctx.closePath();
  ctx.fill();

  // Glowing carved team rune inlay down the front face
  ctx.strokeStyle = orbMid;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, by - 55);
  ctx.lineTo(cx, by - 25);
  ctx.moveTo(cx - 6, by - 44);
  ctx.lineTo(cx, by - 50);
  ctx.lineTo(cx + 6, by - 44);
  ctx.stroke();

  // Tiered brass/bronze armor collar & cradle prongs
  ctx.fillStyle = metalDark;
  ctx.fillRect(cx - 18, by - 64, 36, 7);
  ctx.fillStyle = metalCol;
  ctx.fillRect(cx - 19, by - 66, 38, 4.5);

  ctx.strokeStyle = metalCol;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(cx - 14, by - 64);
  ctx.quadraticCurveTo(cx - 22, by - 78, cx - 10, by - 92);
  ctx.moveTo(cx + 14, by - 64);
  ctx.quadraticCurveTo(cx + 22, by - 78, cx + 10, by - 92);
  ctx.stroke();

  // Floating turret crystal orb in cradle
  ctx.fillStyle = orbDark;
  ctx.beginPath();
  ctx.arc(cx, orbY, 12.5, 0, Math.PI * 2);
  ctx.fill();

  const orbGrad = ctx.createRadialGradient(cx - 3.5, orbY - 4, 2, cx, orbY, 12.5);
  orbGrad.addColorStop(0, orbCore);
  orbGrad.addColorStop(0.55, orbMid);
  orbGrad.addColorStop(1, orbDark);
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(cx, orbY, 11.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(cx - 3, orbY - 3, 4.2, Math.PI * 0.9, Math.PI * 1.65);
  ctx.stroke();

  ctx.restore();
}

function initRiftAtlas() {
  if (!gl) return;
  if (!riftAtlasTex) {
    const c = document.createElement('canvas');
    c.width = RIFT_COLS * RIFT_CELL;
    c.height = RIFT_ROWS * RIFT_CELL;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);

    // Row 0: 6 trees/cliff shrubs + 2 ward lanterns
    for (let i = 0; i < 6; i++) riftPaintTreeCell(ctx, i * RIFT_CELL, 0, i);
    riftPaintWardCell(ctx, 6 * RIFT_CELL, 0, 0);
    riftPaintWardCell(ctx, 7 * RIFT_CELL, 0, 1);

    // Row 1: 3 arcane wisp sprites (cols 0..2) + 5 LoL-inspired champions & Poro (cols 3..7)
    for (let i = 0; i < 3; i++) riftPaintWispCell(ctx, i * RIFT_CELL, RIFT_CELL, i);
    for (let i = 0; i < 5; i++) riftPaintHeroCell(ctx, (3 + i) * RIFT_CELL, RIFT_CELL, i);

    // Row 2: Order Blue Turret (col 0) & Chaos Crimson Turret (col 1)
    riftPaintTurretCell(ctx, 0, 2 * RIFT_CELL, 0);
    riftPaintTurretCell(ctx, RIFT_CELL, 2 * RIFT_CELL, 1);

    riftAtlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, riftAtlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  if (!riftInstPR) {
    const VS = `#version 300 es
    layout(location=0) in vec4 aPosScale; // x, y, sizePx, rot
    layout(location=1) in vec4 aUvInfo;   // u0, v0, alpha, flipX
    uniform vec2 uRes;
    out vec2 vUv;
    out float vAlpha;
    void main() {
      int id = gl_VertexID;
      vec2 q = vec2(float(id & 1), float((id >> 1) & 1));
      if (id == 3) q = vec2(1.0, 0.0);
      else if (id == 4) q = vec2(0.0, 1.0);
      else if (id == 5) q = vec2(1.0, 1.0);

      vec2 local = vec2(q.x - 0.5, q.y - 0.86) * aPosScale.z;
      float c = cos(aPosScale.w), s = sin(aPosScale.w);
      vec2 rot = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
      vec2 pos = aPosScale.xy + rot;
      vec2 ndc = vec2(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0);
      gl_Position = vec4(ndc, 0.0, 1.0);

      float fx = aUvInfo.w < 0.0 ? (1.0 - q.x) : q.x;
      vUv = aUvInfo.xy + vec2(fx / ${RIFT_COLS}.0, q.y / ${RIFT_ROWS}.0);
      vAlpha = aUvInfo.z;
    }`;

    const FS = `#version 300 es
    precision mediump float;
    uniform sampler2D uAtlas;
    in vec2 vUv;
    in float vAlpha;
    out vec4 o;
    void main() {
      vec4 t = texture(uAtlas, vUv);
      t.a *= vAlpha;
      if (t.a < 0.015) discard;
      o = t;
    }`;

    const mk = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    riftInstPR = {
      p,
      uRes: gl.getUniformLocation(p, 'uRes'),
      uAtlas: gl.getUniformLocation(p, 'uAtlas'),
    };
    riftInstVAO = gl.createVertexArray();
    gl.bindVertexArray(riftInstVAO);
    riftInstBufA = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, riftInstBufA);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 1);

    riftInstBufB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, riftInstBufB);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
  }
}

function riftHash(a, b, k) {
  let h = Math.imul((seed + a * 374761393) | 0, 668265263) ^ Math.imul(b + k * 97, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Signed approximate distance from diagonal serpentine Rift River in normalized space (mirrors fragment shader).
function riftRiverCenterNormY(u) {
  const sOff = (seed % 997) * 0.37;
  return 0.56 - 0.18 * (u - 0.5) + 0.095 * Math.sin(u * 4.6 + sOff * 0.7) + 0.035 * Math.cos(u * 9.2 - sOff);
}
function riftRiverDistPx(x, y) {
  const u = x / Math.max(1, W);
  const v = y / Math.max(1, H);
  return Math.abs(v - riftRiverCenterNormY(u)) * H;
}

// Exposes `trees` with `.grow` and `.want` so share.js settled() works seamlessly.
const trees = [];
const wards = [];
const wisps = [];
const heroes = [];
const turrets = [];
let riftBufA = new Float32Array(0);
let riftBufB = new Float32Array(0);

function rebuildRiftProps() {
  trees.length = 0;
  const stepX = 56;
  const stepY = 46;
  const cols = Math.ceil((W + stepX) / stepX) + 1;
  const rows = Math.ceil((H + stepY) / stepY) + 1;

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const r1 = riftHash(gx, gy, 1);
      const r2 = riftHash(gx, gy, 2);
      const r3 = riftHash(gx, gy, 3);
      const r4 = riftHash(gx, gy, 4);
      const r5 = riftHash(gx, gy, 5);
      if (r5 < 0.14) continue;

      const offsetX = (gy % 2) * (stepX * 0.5);
      const x = gx * stepX - 20 + offsetX + (r1 - 0.5) * stepX * 0.68;
      const y = gy * stepY - 8 + (r2 - 0.5) * stepY * 0.68;
      if (x < -28 || x > W + 28 || y < 14 || y > H + 52) continue;

      // Keep the winding river channel clear of large trees so riverbanks stand out
      if (riftRiverDistPx(x, y) < 38) continue;

      trees.push({
        x, y,
        variant: Math.floor(r3 * 6),
        scale: 0.76 + r4 * 0.44,
        mirror: r1 < 0.5 ? -1 : 1,
        phase: r2 * Math.PI * 2,
        grow: 0,
        want: 1,
      });
    }
  }
  trees.sort((a, b) => a.y - b.y);
  syncRiftWardsAndWisps(true);
  updateRiftTargets(true);
}

function updateRiftTargets(snapNow) {
  for (const t of trees) {
    const d = FB ? landS(t.x, t.y) : 999;
    const clearByTurret = turrets.some(tr => Math.hypot(t.x - tr.x, t.y - tr.y) < 38);
    // Grow in jungle outskirts, smoothly clear inside stone sanctuaries & turret bases
    t.want = !clearByTurret && (!P.adaptive || d > 12) ? 1 : 0;
    if (snapNow) t.grow = t.want;
  }
}

function syncRiftWardsAndWisps(reset) {
  // Defense Turrets: Blue Order (top-left side of river) & Crimson Chaos (bottom-right side of river)
  const wantTurrets = Math.max(0, Math.min(6, Math.round(typeof P.turrets === 'number' ? P.turrets : 4)));
  turrets.length = 0;
  if (wantTurrets > 0) {
    const cands = [[], []];
    const tstep = 56;
    for (let y = 76; y < H - 72; y += tstep) {
      for (let x = 68; x < W - 68; x += tstep) {
        const s = FB ? landS(x, y) : 999;
        if (s >= 2 && s <= 46 && riftRiverDistPx(x, y) > 64) {
          const team = (y / Math.max(1, H)) < riftRiverCenterNormY(x / Math.max(1, W)) ? 0 : 1;
          const score = Math.abs(s - 20) + riftHash(x | 0, y | 0, 61) * 7;
          cands[team].push({ x, y, team, score, idx: (x * 11 + y * 17) | 0 });
        }
      }
    }
    cands[0].sort((a, b) => a.score - b.score);
    cands[1].sort((a, b) => a.score - b.score);

    const chosen = [];
    for (let k = 0; k < wantTurrets; k++) {
      const team = k % 2;
      let hit = cands[team].find(c => chosen.every(p => Math.hypot(p.x - c.x, p.y - c.y) > 185));
      if (!hit) {
        hit = cands[1 - team].find(c => chosen.every(p => Math.hypot(p.x - c.x, p.y - c.y) > 185));
      }
      if (!hit) {
        // Fallback strategic lane positions on either side of the river
        const fracX = team === 0 ? (0.18 + 0.24 * (k * 0.5)) : (0.58 + 0.24 * (k * 0.5));
        const rx = W * Math.min(0.88, Math.max(0.12, fracX));
        const riverY = H * riftRiverCenterNormY(rx / Math.max(1, W));
        const ry = Math.min(Math.max(84, riverY + (team === 0 ? -105 : 105)), H - 74);
        hit = { x: rx, y: ry, team, idx: k * 23 };
      }
      chosen.push(hit);
    }
    chosen.forEach(c => {
      turrets.push({
        x: c.x,
        y: c.y,
        team: c.team,
        phase: (c.idx % 63) * 0.1,
        grow: reset ? 1 : 0.2,
      });
    });
  }
  updateRiftTargets(reset);

  const wantWards = Math.max(0, Math.min(8, Math.round(P.wards)));
  wards.length = 0;

  if (wantWards > 0) {
    const candidates = [];
    const step = 44;
    for (let y = 52; y < H - 56; y += step) {
      for (let x = 52; x < W - 48; x += step) {
        const s = FB ? landS(x, y) : 999;
        // Ideal placement right along the glowing stone rim / cliffside path, clear of deep river
        if (s >= -2 && s <= 32 && riftRiverDistPx(x, y) > 54) {
          const score = Math.abs(s - 12) + riftHash(x | 0, y | 0, 17) * 6;
          candidates.push({ x, y, score, idx: (x * 7 + y * 13) | 0 });
        }
      }
    }
    candidates.sort((a, b) => a.score - b.score);

    const picked = [];
    for (const c of candidates) {
      if (picked.every(p => Math.hypot(p.x - c.x, p.y - c.y) > 155) &&
          turrets.every(tr => Math.hypot(tr.x - c.x, tr.y - c.y) > 95)) {
        picked.push(c);
        if (picked.length >= wantWards) break;
      }
    }

    // Fallback scenic riverbanks if adaptive is off or desktop is completely empty
    if (picked.length < wantWards) {
      for (let i = picked.length; i < wantWards; i++) {
        const rx = W * (0.14 + 0.72 * riftHash(i, 91, 3));
        const ry = H * (0.18 + 0.64 * riftHash(i, 92, 4));
        if (picked.every(p => Math.hypot(p.x - rx, p.y - ry) > 120)) {
          picked.push({ x: rx, y: ry, idx: i * 19 });
        }
      }
    }

    picked.forEach((c, i) => {
      wards.push({
        x: c.x,
        y: c.y,
        variant: i % 2,
        phase: (c.idx % 63) * 0.1,
        grow: reset ? 1 : 0.25,
      });
    });
  }

  const wantWisps = Math.max(0, Math.min(16, Math.round(P.wisps)));
  if (reset || wisps.length > wantWisps) wisps.length = Math.min(wisps.length, wantWisps);
  while (wisps.length < wantWisps) {
    const i = wisps.length;
    const onRiver = i % 2 === 0;
    const bx = W * (0.08 + 0.84 * riftHash(i, 12, 8));
    let by = H * (0.10 + 0.78 * riftHash(i, 14, 9));
    if (onRiver) {
      const u = bx / Math.max(1, W);
      const sOff = (seed % 997) * 0.37;
      by = H * (0.56 - 0.18 * (u - 0.5) + 0.095 * Math.sin(u * 4.6 + sOff * 0.7)) + (riftHash(i, 19, 2) - 0.5) * 44;
    }
    wisps.push({
      bx, by,
      x: bx, y: by,
      rx: 18 + 26 * riftHash(i, 21, 5),
      ry: 10 + 18 * riftHash(i, 22, 6),
      spd: 0.45 + 0.55 * riftHash(i, 23, 7),
      phase: riftHash(i, 24, 1) * Math.PI * 2,
      variant: i % 3,
      size: 24 + 14 * riftHash(i, 25, 3),
    });
  }

  // Roaming Rift champions + Poro (cols 3..7 on row 1)
  // Order: Fox Mage (4), Wind Ronin (3), Fluffy Poro (7), Frost Archer (5), Starlight Mage (6)
  const HERO_COLS = [4, 3, 7, 5, 6];
  const wantHeroes = Math.max(0, Math.min(5, Math.round(typeof P.heroes === 'number' ? P.heroes : 5)));
  if (reset || heroes.length > wantHeroes) heroes.length = Math.min(heroes.length, wantHeroes);
  while (heroes.length < wantHeroes) {
    const idx = heroes.length;
    const col = HERO_COLS[idx % HERO_COLS.length];
    const start = riftPickHeroTarget(idx, idx * 17);
    const dest = riftPickHeroTarget(idx, idx * 17 + 1);
    heroes.push({
      idx,
      col,
      isPoro: col === 7,
      x: start.x,
      y: start.y,
      tx: dest.x,
      ty: dest.y,
      flip: dest.x >= start.x ? 1 : -1,
      wait: 0.8 + riftHash(idx, 31, 4) * 2.4,
      stepCount: idx * 17 + 2,
      walkT: riftHash(idx, 32, 9) * 10,
      phase: riftHash(idx, 33, 2) * Math.PI * 2,
    });
  }
}

function riftPickHeroTarget(idx, step) {
  // Prefer open spots on carved stone sanctuaries near icons or riverbank clearings
  if (typeof icons !== 'undefined' && icons.length && riftHash(idx, step, 41) < 0.78) {
    const ic = icons[Math.floor(riftHash(idx, step, 42) * icons.length) % icons.length];
    const ang = riftHash(idx, step, 43) * Math.PI * 2;
    const rad = 42 + riftHash(idx, step, 44) * 24;
    const px = Math.min(Math.max(40, ic.x + ic.w * 0.5 + Math.cos(ang) * rad), W - 40);
    const py = Math.min(Math.max(56, ic.y + ic.h * 0.55 + Math.sin(ang) * rad), H - 56);
    if (riftRiverDistPx(px, py) > 36) return { x: px, y: py };
  }
  const rx = W * (0.12 + 0.76 * riftHash(idx, step, 45));
  const u = rx / Math.max(1, W);
  const sOff = (seed % 997) * 0.37;
  const riverY = H * (0.56 - 0.18 * (u - 0.5) + 0.095 * Math.sin(u * 4.6 + sOff * 0.7));
  const side = riftHash(idx, step, 46) < 0.5 ? -1 : 1;
  const ry = Math.min(Math.max(60, riverY + side * (56 + riftHash(idx, step, 47) * 32)), H - 62);
  return { x: rx, y: ry };
}

function stepRiftProps(dt, timeSec) {
  const rate = dt * 2.8;
  for (const t of trees) {
    if (t.grow < t.want) t.grow = Math.min(t.want, t.grow + rate);
    else if (t.grow > t.want) t.grow = Math.max(t.want, t.grow - rate * 1.45);
  }
  for (const w of wards) {
    if (w.grow < 1) w.grow = Math.min(1, w.grow + rate);
  }
  for (const tr of turrets) {
    if (tr.grow < 1) tr.grow = Math.min(1, tr.grow + rate);
  }
  const driftT = timeSec * (0.3 + P.wind * 0.7);
  for (const sp of wisps) {
    sp.x = sp.bx + Math.sin(driftT * sp.spd + sp.phase) * sp.rx;
    sp.y = sp.by + Math.cos(driftT * sp.spd * 0.82 + sp.phase * 1.3) * sp.ry;
  }

  const moveSpdBase = 26 * (0.5 + 0.5 * P.wind);
  for (const h of heroes) {
    if (h.wait > 0) {
      h.wait -= dt;
      h.walkT = 0;
      if (h.wait <= 0) {
        const next = riftPickHeroTarget(h.idx, h.stepCount++);
        h.tx = next.x;
        h.ty = next.y;
        if (Math.abs(h.tx - h.x) > 2) h.flip = h.tx >= h.x ? 1 : -1;
      }
    } else {
      const dx = h.tx - h.x;
      const dy = h.ty - h.y;
      const dist = Math.hypot(dx, dy);
      const step = (h.isPoro ? moveSpdBase * 1.25 : moveSpdBase) * dt;
      if (dist <= step + 1) {
        h.x = h.tx;
        h.y = h.ty;
        h.wait = 2.0 + riftHash(h.idx, h.stepCount, 51) * 3.0;
        h.walkT = 0;
      } else {
        h.x += (dx / dist) * step;
        h.y += (dy / dist) * step;
        h.walkT += dt * (h.isPoro ? 9.5 : 6.8);
      }
    }
  }
}

function drawRiftProps(timeSec) {
  if (!gl) return;
  initRiftAtlas();

  const items = [];
  const wind = P.wind;
  for (const t of trees) {
    if (t.grow <= 0.01) continue;
    const ease = t.grow * t.grow * (3 - 2 * t.grow);
    const sway = Math.sin(timeSec * 1.5 + t.phase + t.x * 0.01) * 0.038 * wind;
    items.push({
      sortY: t.y,
      x: t.x,
      y: t.y,
      size: 88 * t.scale * (0.28 + 0.72 * ease),
      rot: sway,
      col: t.variant,
      row: 0,
      alpha: Math.min(1, ease * 1.2),
      flip: t.mirror,
    });
  }

  for (const w of wards) {
    const ease = w.grow * w.grow * (3 - 2 * w.grow);
    const hover = Math.sin(timeSec * 2.2 + w.phase) * 2.5 * wind;
    const pulse = 0.68 + 0.32 * P.glow + 0.14 * Math.sin(timeSec * 3.1 + w.phase);
    items.push({
      sortY: w.y + 4,
      x: w.x,
      y: w.y + hover,
      size: 70 * (0.4 + 0.6 * ease),
      rot: 0,
      col: 6 + w.variant,
      row: 0,
      alpha: Math.min(1, ease * pulse),
      flip: 1,
    });
  }

  for (const tr of turrets) {
    const ease = tr.grow * tr.grow * (3 - 2 * tr.grow);
    items.push({
      sortY: tr.y + 6,
      x: tr.x,
      y: tr.y,
      size: 98 * (0.42 + 0.58 * ease),
      rot: 0,
      col: tr.team,
      row: 2,
      alpha: Math.min(1, ease * 1.15),
      flip: tr.team === 1 ? -1 : 1,
    });
    // Pulsing arcane beacon core hovered over the turret crystal cradle
    const orbPulse = (0.42 + 0.58 * P.glow) * (0.72 + 0.28 * Math.sin(timeSec * 3.4 + tr.phase));
    items.push({
      sortY: tr.y + 7,
      x: tr.x,
      y: tr.y - 58 * (0.42 + 0.58 * ease),
      size: 34 * (0.75 + 0.35 * P.glow),
      rot: timeSec * 0.7 + tr.phase,
      col: tr.team === 0 ? 0 : 2,
      row: 1,
      alpha: Math.min(1, ease * orbPulse),
      flip: 1,
    });
  }

  for (const h of heroes) {
    const walking = h.wait <= 0;
    const hop = walking
      ? Math.abs(Math.sin(h.walkT)) * (h.isPoro ? 5.5 : 3.2)
      : Math.sin(timeSec * 2.8 + h.phase) * 1.4;
    const tilt = walking ? Math.sin(h.walkT) * 0.055 : 0;
    items.push({
      sortY: h.y + 8,
      x: h.x,
      y: h.y - hop,
      size: h.isPoro ? 44 : 66,
      rot: tilt,
      col: h.col,
      row: 1,
      alpha: 1,
      flip: h.flip,
    });
  }

  for (const sp of wisps) {
    const twinkle = (0.42 + 0.58 * P.glow) * (0.72 + 0.28 * Math.sin(timeSec * 3.6 + sp.phase));
    items.push({
      sortY: sp.y + 80, // float slightly over treetops & water
      x: sp.x,
      y: sp.y,
      size: sp.size * (0.85 + 0.35 * P.glow),
      rot: timeSec * 0.4 + sp.phase,
      col: sp.variant,
      row: 1,
      alpha: Math.min(1, twinkle),
      flip: 1,
    });
  }

  if (!items.length) return;
  items.sort((a, b) => a.sortY - b.sortY);

  const count = items.length;
  if (count > riftInstCap) {
    riftInstCap = Math.max(count + 64, Math.ceil(count * 1.25));
    riftBufA = new Float32Array(riftInstCap * 4);
    riftBufB = new Float32Array(riftInstCap * 4);
  }

  for (let i = 0; i < count; i++) {
    const it = items[i];
    const k = i * 4;
    riftBufA[k] = it.x;
    riftBufA[k + 1] = it.y;
    riftBufA[k + 2] = it.size;
    riftBufA[k + 3] = it.rot;

    riftBufB[k] = it.col / RIFT_COLS;
    riftBufB[k + 1] = it.row / RIFT_ROWS;
    riftBufB[k + 2] = it.alpha;
    riftBufB[k + 3] = it.flip;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(riftInstPR.p);
  gl.bindVertexArray(riftInstVAO);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, riftAtlasTex);
  gl.uniform1i(riftInstPR.uAtlas, 0);
  gl.uniform2f(riftInstPR.uRes, cv.width / cv._scale, cv.height / cv._scale);

  gl.bindBuffer(gl.ARRAY_BUFFER, riftInstBufA);
  gl.bufferData(gl.ARRAY_BUFFER, riftBufA.subarray(0, count * 4), gl.DYNAMIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, riftInstBufB);
  gl.bufferData(gl.ARRAY_BUFFER, riftBufB.subarray(0, count * 4), gl.DYNAMIC_DRAW);

  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
}
