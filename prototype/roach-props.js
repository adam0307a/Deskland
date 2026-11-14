'use strict';

// Deskland · Roach Town (小强剧场 / Hamam Böceği Sokağı)
// Pre-baked Canvas2D character atlas + instanced WebGL2 renderer:
// Viral Turkish AI cockroach meme cast: leather-vest juice drinker, necktie student,
// factory hard-hat & hairnet crew, plaid clinic roach, pink-feather diva, red-dress couple,
// streetlamp boulevard & floating reaction bubbles.

const ROACH_COLS = 8;
const ROACH_ROWS = 4;
const ROACH_CELL = 128;

let roachAtlasTex = null;
let roachInstPR = null;
let roachInstVAO = null;
let roachInstBufA = null;
let roachInstBufB = null;
let roachInstCap = 0;

function rRoundRect(ctx, x, y, w, h, r) {
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

function rPaintCarapaceRoach(ctx, ox, oy, kind) {
  // Base 3D-shaded bipedal cartoon cockroach matching viral meme aesthetics
  // kind:
  //   0 = vest_juice   (leather vest + white tee + juice box straw)
  //   1 = student      (white collared shirt + navy tie + crest)
  //   2 = worker       (white hard hat + neon yellow safety vest)
  //   3 = hairnet      (factory hairnet + yellow boots)
  //   4 = plaid        (green-white plaid shirt + oversized round eyes)
  //   5 = diva         (curled lashes + red lips + pink feather boa)
  //   6 = torn         (tattered grey street shirt + big tired eyes)
  //   7 = polo         (taupe polo + chill casual trousers)
  //   8 = couple_him   (dark leather/denim street jacket)
  //   9 = couple_her   (blonde updo bun + red slit dress + red heels)
  //  10 = lil_friend   (smaller white-tee sidekick)
  //  11 = doctor       (white lab coat, stethoscope, clipboard, pens)
  //  12 = crazy_jacket (padded-room white straitjacket + red fishing rod)
  //  13 = crazy_gown   (light cyan dotted hospital patient gown)
  //  15 = charging     (holding power plug cable, shocked spiky antennae & blue sparks)
  //   9 = couple_her   (blonde updo bun + red slit dress + red heels)
  //  10 = lil_friend   (smaller white-tee sidekick)
  ctx.save();
  ctx.translate(ox + 64, oy + 68);

  const scale = kind === 10 ? 0.84 : 1.0;
  ctx.scale(scale, scale);

  const armRaise = kind === 5 ? -1 : 0; // diva waves one arm high

  // Back wing shell peeking behind shoulders (translucent amber-brown chitin)
  ctx.save();
  ctx.fillStyle = kind === 9 ? '#8e4520' : '#733519';
  ctx.strokeStyle = '#3f1b0b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(-10, 4, 13, 24, 0.24, 0, Math.PI * 2);
  ctx.ellipse(10, 4, 13, 24, -0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Articulated legs (lower pair + mid legs)
  ctx.strokeStyle = '#5e2912';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.8;
  // Left leg
  ctx.beginPath();
  ctx.moveTo(-7, 20);
  ctx.lineTo(-10, 34);
  ctx.lineTo(-13, 47);
  ctx.lineTo(-18, 49);
  ctx.stroke();
  // Right leg
  ctx.beginPath();
  ctx.moveTo(7, 20);
  ctx.lineTo(10, 34);
  ctx.lineTo(13, 47);
  ctx.lineTo(18, 49);
  ctx.stroke();

  // Yellow factory boots for hairnet worker, red heels for lady
  if (kind === 3) {
    ctx.fillStyle = '#e7bd2a';
    ctx.strokeStyle = '#6d5409';
    ctx.lineWidth = 1.3;
    rRoundRect(ctx, -20, 42, 11, 8, 2); ctx.fill(); ctx.stroke();
    rRoundRect(ctx, 9, 42, 11, 8, 2); ctx.fill(); ctx.stroke();
  } else if (kind === 9) {
    ctx.fillStyle = '#c81c28';
    ctx.beginPath();
    ctx.moveTo(-19, 49); ctx.lineTo(-9, 45); ctx.lineTo(-9, 50); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(19, 49); ctx.lineTo(9, 45); ctx.lineTo(9, 50); ctx.closePath(); ctx.fill();
  }

  // Segmented thorax/abdomen torso
  const bodyGrad = ctx.createRadialGradient(-4, 2, 3, 0, 6, 26);
  bodyGrad.addColorStop(0, '#df9256');
  bodyGrad.addColorStop(0.55, '#a85a2c');
  bodyGrad.addColorStop(1, '#5d2b12');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#3c1a09';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 7, 15.5, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Carapace belly segments
  ctx.strokeStyle = 'rgba(62, 24, 8, 0.55)';
  ctx.lineWidth = 1.4;
  for (let s = 0; s < 4; s++) {
    const sy = 5 + s * 5.6;
    ctx.beginPath();
    ctx.arc(0, sy - 5, 13.5 - s * 0.9, 0.28, Math.PI - 0.28);
    ctx.stroke();
  }

  // Outfits over torso!
  if (kind === 0) {
    // White tee + open dark biker leather vest
    ctx.fillStyle = '#f2f3f5';
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#252930';
    ctx.beginPath();
    ctx.moveTo(-14, -7); ctx.lineTo(-4, -8); ctx.lineTo(-3, 19); ctx.lineTo(-15, 17); ctx.closePath();
    ctx.moveTo(14, -7); ctx.lineTo(4, -8); ctx.lineTo(3, 19); ctx.lineTo(15, 17); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9aa4b2';
    ctx.fillRect(-10, 0, 2, 2);
    ctx.fillRect(8, 0, 2, 2);
  } else if (kind === 1) {
    // Crisp white school shirt + navy tie + tiny emblem
    ctx.fillStyle = '#f7f8fa';
    ctx.strokeStyle = '#cad0db';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 3, 14.5, 15.5, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Tie
    ctx.fillStyle = '#243c6d';
    ctx.beginPath();
    ctx.moveTo(-2.5, -7); ctx.lineTo(2.5, -7); ctx.lineTo(3.5, 11); ctx.lineTo(0, 15); ctx.lineTo(-3.5, 11);
    ctx.closePath(); ctx.fill();
    // School crest
    ctx.fillStyle = '#d4a63a';
    ctx.fillRect(5.5, -1, 4.5, 5);
  } else if (kind === 2) {
    // Hi-vis neon yellow safety vest with silver reflective stripes
    ctx.fillStyle = '#c5e22e';
    ctx.strokeStyle = '#6c7c10';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e7edf2';
    ctx.fillRect(-13, 3, 26, 3.2);
    ctx.fillRect(-11, 10, 22, 3);
  } else if (kind === 4) {
    // Green-white plaid shirt
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 3, 15, 15, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#dde5dd';
    ctx.fillRect(-18, -15, 36, 36);
    ctx.fillStyle = 'rgba(42, 92, 66, 0.72)';
    for (let x = -15; x <= 15; x += 6) ctx.fillRect(x, -15, 2.5, 36);
    for (let y = -12; y <= 18; y += 6) ctx.fillRect(-18, y, 36, 2.5);
    ctx.restore();
  } else if (kind === 6) {
    // Tattered grey street t-shirt
    ctx.fillStyle = '#6f7d8c';
    ctx.beginPath();
    ctx.ellipse(0, 3, 14.8, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a85a2c';
    ctx.beginPath(); ctx.arc(-6, 7, 2.6, 0, Math.PI * 2); ctx.arc(5, 11, 2.2, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 7) {
    // Warm taupe polo + dark shorts
    ctx.fillStyle = '#8b715a';
    ctx.beginPath(); ctx.ellipse(0, 2, 15, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d3138';
    ctx.fillRect(-12, 13, 24, 9);
  } else if (kind === 8) {
    // Dark Beyoglu street jacket + brown trousers
    ctx.fillStyle = '#383d46';
    ctx.beginPath(); ctx.ellipse(0, 3, 15.5, 16.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20242a';
    ctx.fillRect(-2, -9, 4, 26);
  } else if (kind === 9) {
    // Red evening slit dress
    ctx.fillStyle = '#cf2428';
    ctx.strokeStyle = '#7b1114';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-11, -10); ctx.lineTo(11, -10);
    ctx.lineTo(14, 30); ctx.lineTo(3, 30); ctx.lineTo(1, 18); ctx.lineTo(-2, 30); ctx.lineTo(-14, 30);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (kind === 10) {
    // White tee with tiny cute graphic squiggle
    ctx.fillStyle = '#eef1f5';
    ctx.beginPath(); ctx.ellipse(0, 3, 14.5, 14.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d3540';
    ctx.fillRect(-7, 0, 14, 2);
    ctx.fillRect(-5, 4, 10, 2);
  } else if (kind === 11) {
    // Doctor white coat over grey collared shirt + pens + stethoscope
    ctx.fillStyle = '#737d87';
    ctx.beginPath(); ctx.ellipse(0, 3, 15, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#c0cad6';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, -9); ctx.lineTo(-16, -6); ctx.lineTo(-17, 25); ctx.lineTo(-3, 25); ctx.closePath();
    ctx.moveTo(4, -9); ctx.lineTo(16, -6); ctx.lineTo(17, 25); ctx.lineTo(3, 25); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Pocket pens
    ctx.fillStyle = '#244b96'; ctx.fillRect(8, 3, 2, 7);
    ctx.fillStyle = '#c83232'; ctx.fillRect(11, 4, 2, 6);
    // Stethoscope around neck
    ctx.strokeStyle = '#252a32';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, -4, 9.5, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = '#b9c6d4';
    ctx.beginPath(); ctx.arc(0, 8, 3.2, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 12) {
    // White strapped straitjacket (deli gömleği)
    ctx.fillStyle = '#f3f4f6';
    ctx.strokeStyle = '#b8bfc9';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 4, 16.5, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Crossed straitjacket straps & buckles
    ctx.strokeStyle = '#cdd3dc';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-14, -2); ctx.lineTo(13, 10);
    ctx.moveTo(14, -2); ctx.lineTo(-13, 10);
    ctx.stroke();
    ctx.fillStyle = '#9aa3b0';
    ctx.fillRect(-3, 2, 6, 4);
  } else if (kind === 13) {
    // Pale mint dotted hospital gown (hasta önlüğü)
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 7, 16.5, 22, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#dceef0';
    ctx.fillRect(-20, -18, 40, 50);
    ctx.fillStyle = '#7bb4c2';
    for (let gy = -10; gy < 28; gy += 7) {
      for (let gx = -12; gx <= 12; gx += 7) {
        ctx.beginPath(); ctx.arc(gx + (gy % 14 === 0 ? 3 : 0), gy, 1.3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#9abdc5';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 7, 16.5, 22, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === 15) {
    // Electric blue aura + plug cord held out for charging
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.ellipse(0, 3, 14.5, 15.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(12, 8); ctx.bezierCurveTo(26, 4, 24, -10, 34, -12);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    rRoundRect(ctx, 32, -16, 7, 8, 1.5); ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(39, -15, 5, 1.8);
    ctx.fillRect(39, -11, 5, 1.8);
  }

  // Arms
  ctx.strokeStyle = '#6c3116';
  ctx.lineWidth = 3.2;
  // Left arm (raised high for Diva, folded for Straitjacket, clipboard for Doctor)
  ctx.beginPath();
  ctx.moveTo(-13, -3);
  if (armRaise) {
    ctx.lineTo(-23, -18);
    ctx.lineTo(-30, -34);
  } else if (kind === 12) {
    ctx.lineTo(-18, 5);
    ctx.lineTo(-4, 12);
  } else if (kind === 0) {
    ctx.lineTo(-20, 6);
    ctx.lineTo(-16, 18);
  } else {
    ctx.lineTo(-21, 7);
    ctx.lineTo(-18, 19);
  }
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(13, -3);
  if (kind === 12) {
    ctx.lineTo(18, 5);
    ctx.lineTo(4, 12);
  } else if (kind === 15) {
    ctx.lineTo(24, 1);
    ctx.lineTo(31, -8);
  } else {
    ctx.lineTo(22, 8);
    ctx.lineTo(18, 20);
  }
  ctx.stroke();

  // Doctor clipboard (kind 11) or Straitjacket red fishing rod (kind 12)!
  if (kind === 11) {
    ctx.save();
    ctx.translate(18, 14);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#a47244';
    rRoundRect(ctx, -7, -9, 14, 18, 2); ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-5, -6, 10, 13);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-3.5, -3, 7, 1.5);
    ctx.fillRect(-3.5, 1, 5.5, 1.5);
    ctx.restore();
  } else if (kind === 12) {
    ctx.strokeStyle = '#c82630';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(4, 12); ctx.lineTo(28, -14);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(235, 244, 255, 0.8)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(28, -14); ctx.lineTo(28, 12);
    ctx.stroke();
  }

  // Extra insect middle arms peeking softly
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = '#53230f';
  ctx.beginPath();
  ctx.moveTo(-13, 6); ctx.lineTo(-20, 15);
  ctx.moveTo(13, 6); ctx.lineTo(20, 15);
  ctx.stroke();

  // Diva's fluffy pink feather boa draped diagonally!
  if (kind === 5) {
    const pinks = ['#f69acb', '#ec72b6', '#ffbbe0', '#e55aa8'];
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const fx = -10 + t * 24;
      const fy = 4 + t * 14 + (t > 0.65 ? (t - 0.65) * 18 : 0);
      ctx.fillStyle = pinks[i % pinks.length];
      ctx.beginPath();
      ctx.arc(fx + Math.sin(i * 2.1) * 2.5, fy + Math.cos(i * 1.7) * 2, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Orange juice box with bent white straw in front of vest_juice!
  if (kind === 0) {
    ctx.save();
    ctx.translate(-17, 25);
    ctx.fillStyle = '#e7ede0';
    ctx.strokeStyle = '#476832';
    ctx.lineWidth = 1.1;
    rRoundRect(ctx, -6, -8, 12, 16, 1.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5da43e';
    ctx.fillRect(-5.5, -7.5, 11, 4.5);
    ctx.fillStyle = '#f59c24';
    ctx.beginPath(); ctx.arc(0, 3, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(1, -8); ctx.lineTo(2, -14); ctx.lineTo(7, -17);
    ctx.stroke();
    ctx.restore();
  }

  // Head
  const headY = -20;
  const hGrad = ctx.createRadialGradient(-4, headY - 4, 2, 0, headY, 17);
  hGrad.addColorStop(0, '#eaa267');
  hGrad.addColorStop(0.65, '#b6612f');
  hGrad.addColorStop(1, '#5c2911');
  ctx.fillStyle = hGrad;
  ctx.strokeStyle = '#3b1908';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, headY, 15, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Long expressive antennae (zigzag electrified for charging_roach)
  if (kind === 15) {
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-5, headY - 12); ctx.lineTo(-14, headY - 22); ctx.lineTo(-9, headY - 28); ctx.lineTo(-22, headY - 36);
    ctx.moveTo(5, headY - 12); ctx.lineTo(14, headY - 22); ctx.lineTo(9, headY - 28); ctx.lineTo(22, headY - 36);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#4c200b';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-5, headY - 12);
    ctx.quadraticCurveTo(-18, headY - 34, -30, headY - 26);
    ctx.moveTo(5, headY - 12);
    ctx.quadraticCurveTo(18, headY - 34, 30, headY - 26);
    ctx.stroke();
  }

  // Eyes (cute cartoon sclera for most, huge glossy black eyes for Hospital Plaid)
  if (kind === 4) {
    ctx.fillStyle = '#121316';
    ctx.beginPath();
    ctx.ellipse(-6.2, headY - 2, 5.2, 6.0, 0, 0, Math.PI * 2);
    ctx.ellipse(6.2, headY - 2, 5.2, 6.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-7.6, headY - 4, 1.8, 0, Math.PI * 2);
    ctx.arc(4.8, headY - 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 9) {
    // Stylish dark sunglasses + blonde updo bun!
    ctx.fillStyle = '#181a20';
    rRoundRect(ctx, -12, headY - 5, 10, 6.5, 2.5); ctx.fill();
    rRoundRect(ctx, 2, headY - 5, 10, 6.5, 2.5); ctx.fill();
    ctx.strokeStyle = '#d4aa52'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-2, headY - 2); ctx.lineTo(2, headY - 2); ctx.stroke();
    // Blonde bun & hair wave
    ctx.fillStyle = '#dfbe74';
    ctx.strokeStyle = '#7f6224';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, headY - 17, 7.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, headY - 10, 14.5, 6, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#fbfaf5';
    ctx.strokeStyle = '#3c1b0c';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(-5.6, headY - 2, 4.7, 5.2, 0, 0, Math.PI * 2);
    ctx.ellipse(5.6, headY - 2, 4.7, 5.2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1d120c';
    ctx.beginPath();
    ctx.arc(-5.0, headY - 1.5, 2.4, 0, Math.PI * 2);
    ctx.arc(5.0, headY - 1.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6.0, headY - 2.8, 0.9, 0, Math.PI * 2);
    ctx.arc(4.0, headY - 2.8, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Eyelashes for Diva
    if (kind === 5) {
      ctx.strokeStyle = '#181010';
      ctx.lineWidth = 1.3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-5.6 + i * 2, headY - 6.8);
        ctx.lineTo(-6.2 + i * 2.5, headY - 10.2);
        ctx.moveTo(5.6 + i * 2, headY - 6.8);
        ctx.lineTo(6.2 + i * 2.5, headY - 10.2);
        ctx.stroke();
      }
    } else if (kind === 12 || kind === 13) {
      // Wide unhinged asymmetric crazy pupils + swirling brows
      ctx.fillStyle = '#fbfaf5';
      ctx.beginPath();
      ctx.ellipse(-6.0, headY - 2, 5.4, 6.2, 0, 0, Math.PI * 2);
      ctx.ellipse(6.0, headY - 1, 5.0, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#140c08';
      ctx.beginPath();
      ctx.arc(-7.4, headY - 3.6, 1.7, 0, Math.PI * 2);
      ctx.arc(4.3, headY + 0.6, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1f0d06'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-10, headY - 9); ctx.lineTo(-2, headY - 7);
      ctx.moveTo(2, headY - 8); ctx.lineTo(10, headY - 10);
      ctx.stroke();
    } else if (kind === 15) {
      // Shocked glowing cyan electric pupils
      ctx.fillStyle = '#e0f8ff';
      ctx.beginPath();
      ctx.ellipse(-5.8, headY - 2, 5.2, 5.8, 0, 0, Math.PI * 2);
      ctx.ellipse(5.8, headY - 2, 5.2, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(-5.6, headY - 2, 2.3, 0, Math.PI * 2);
      ctx.arc(5.6, headY - 2, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6.4, headY - 3, 0.9, 0, Math.PI * 2);
      ctx.arc(4.8, headY - 3, 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 11) {
      // Doctor's thin round glasses
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(-5.6, headY - 2, 5.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(5.6, headY - 2, 5.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.3, headY - 2); ctx.lineTo(0.3, headY - 2);
      ctx.stroke();
    }
  }

  // Mouth expression
  if (kind === 12 || kind === 13) {
    // Wide shouting "LÜLÜLÜLÜ!" mouth + pink tongue
    ctx.fillStyle = '#2b0d0a';
    ctx.beginPath();
    ctx.ellipse(0, headY + 6.8, 6.2, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(0, headY + 8.8, 3.8, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3.6, headY + 3.0, 7.2, 1.8);
  } else if (kind === 15) {
    // Buzzing jitter mouth from electric charge
    ctx.strokeStyle = '#38160b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5, headY + 6.5);
    ctx.lineTo(-2.5, headY + 4.8);
    ctx.lineTo(0, headY + 7.5);
    ctx.lineTo(2.5, headY + 4.8);
    ctx.lineTo(5, headY + 6.5);
    ctx.stroke();
  } else if (kind === 5) {
    // Diva red lipstick smile
    ctx.fillStyle = '#c82034';
    ctx.beginPath();
    ctx.ellipse(0, headY + 7.2, 5.8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3.6, headY + 6.2, 7.2, 1.8);
  } else if (kind === 1 || kind === 4 || kind === 7 || kind === 11) {
    // Happy school / friendly grin
    ctx.fillStyle = '#38160b';
    ctx.beginPath();
    ctx.arc(0, headY + 5.5, 6.2, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4.2, headY + 5.6, 8.4, 2.0);
  } else if (kind === 6) {
    // Worried/flat street mouth
    ctx.strokeStyle = '#3d190a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4.5, headY + 7.5); ctx.quadraticCurveTo(0, headY + 5.5, 4.5, headY + 7.5);
    ctx.stroke();
  } else {
    // Smirk
    ctx.strokeStyle = '#3d190a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, headY + 4.5, 5.5, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }

  // Headgear: White construction hard hat (kind 2) / factory hygiene hairnet (kind 3)
  if (kind === 2) {
    ctx.fillStyle = '#eef2f5';
    ctx.strokeStyle = '#738291';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, headY - 6, 13.5, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    rRoundRect(ctx, -16, headY - 8.5, 32, 3.6, 1.5);
    ctx.fill(); ctx.stroke();
  } else if (kind === 3) {
    ctx.fillStyle = 'rgba(235, 245, 255, 0.85)';
    ctx.strokeStyle = '#9bb5ca';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, headY - 8.5, 14.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}

function rPaintStreetLamp(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  // Warm amber glow halo
  const halo = ctx.createRadialGradient(0, -34, 4, 0, -34, 44);
  halo.addColorStop(0, 'rgba(255, 224, 146, 0.92)');
  halo.addColorStop(0.35, 'rgba(255, 178, 72, 0.42)');
  halo.addColorStop(1, 'rgba(255, 160, 48, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, -34, 44, 0, Math.PI * 2); ctx.fill();

  // Cast-iron pole
  ctx.fillStyle = '#252a32';
  ctx.fillRect(-3, -24, 6, 76);
  rRoundRect(ctx, -9, 44, 18, 9, 2); ctx.fill();
  // Lantern housing
  ctx.fillStyle = '#ffdf93';
  rRoundRect(ctx, -8, -42, 16, 18, 3); ctx.fill();
  ctx.strokeStyle = '#232830';
  ctx.lineWidth = 2;
  ctx.strokeRect(-8, -42, 16, 18);
  ctx.fillStyle = '#1f242c';
  ctx.beginPath();
  ctx.moveTo(-12, -42); ctx.lineTo(0, -52); ctx.lineTo(12, -42); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function rPaintJuiceProp(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 72);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(2, 22, 18, 6, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#eff4e2';
  ctx.strokeStyle = '#476b32';
  ctx.lineWidth = 2.2;
  rRoundRect(ctx, -16, -20, 32, 42, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5ba33d';
  ctx.fillRect(-15, -19, 30, 11);
  ctx.fillStyle = '#f8a224';
  ctx.beginPath(); ctx.arc(0, 7, 9, 0, Math.PI * 2); ctx.fill();
  // Straw
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(3, -20); ctx.lineTo(4, -34); ctx.lineTo(17, -41);
  ctx.stroke();
  ctx.restore();
}

function rPaintTeaGlass(ctx, ox, oy) {
  // Iconic Turkish tulip tea glass on saucer
  ctx.save();
  ctx.translate(ox + 64, oy + 72);
  ctx.fillStyle = '#eceff5';
  ctx.strokeStyle = '#8b95a5';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, 18, 22, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Glass & deep ruby tea
  ctx.fillStyle = '#8c1f16';
  ctx.beginPath();
  ctx.moveTo(-11, -14); ctx.quadraticCurveTo(-7, 2, -10, 16);
  ctx.lineTo(10, 16); ctx.quadraticCurveTo(7, 2, 11, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function rPaintBubble(ctx, ox, oy, sym) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  ctx.fillStyle = 'rgba(255, 250, 240, 0.94)';
  ctx.strokeStyle = 'rgba(92, 54, 28, 0.55)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, -4, 24, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  if (sym === 0) {
    // Red heart
    ctx.fillStyle = '#e53548';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-18, -2, -12, -18, 0, -8);
    ctx.bezierCurveTo(12, -18, 18, -2, 0, 8);
    ctx.fill();
  } else if (sym === 1) {
    // Music note
    ctx.fillStyle = '#d94898';
    ctx.beginPath();
    ctx.ellipse(-6, 5, 5.5, 4, -0.3, 0, Math.PI * 2);
    ctx.ellipse(6, 2, 5.5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-1.5, -13, 3, 18);
    ctx.fillRect(10.5, -15, 3, 17);
    ctx.fillRect(-1.5, -15, 15, 4.5);
  } else {
    // Tiny sparkle star
    ctx.fillStyle = '#f2a829';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 13 : 5;
      const a = (i / 8) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r - 4);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 4);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function rPaintBedRoach(ctx, ox, oy) {
  // White iron hospital bed with straitjacket patient roach shouting on pillow
  ctx.save();
  ctx.translate(ox + 64, oy + 64);

  // Back & front metal headboard / footboard bars
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Headboard (left)
  ctx.moveTo(-48, -22); ctx.lineTo(-48, 28);
  ctx.moveTo(-48, -14); ctx.lineTo(-34, -14);
  // Footboard (right)
  ctx.moveTo(48, -10); ctx.lineTo(48, 28);
  ctx.stroke();

  // Mattress & white hospital sheets
  ctx.fillStyle = '#e2e8f0';
  rRoundRect(ctx, -47, 2, 94, 16, 4);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Fluffy white pillow under patient head
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(-30, -1, 14, 7.5, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.2; ctx.stroke();

  // Roach head resting on pillow (facing up/right)
  ctx.fillStyle = '#7b3e1a';
  ctx.beginPath();
  ctx.ellipse(-26, -7, 13, 10.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Antennae sticking straight up wildly
  ctx.strokeStyle = '#5a2910'; ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-30, -16); ctx.quadraticCurveTo(-36, -34, -22, -40);
  ctx.moveTo(-24, -16); ctx.quadraticCurveTo(-20, -34, -8, -36);
  ctx.stroke();

  // Crazy eyes + shouting open mouth
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-28, -11, 3.8, 0, Math.PI * 2);
  ctx.arc(-20, -10, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(-28.8, -11.8, 1.4, 0, Math.PI * 2);
  ctx.arc(-19.2, -9.2, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b0d0a';
  ctx.beginPath();
  ctx.ellipse(-21, -4, 4.5, 3.2, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Patient body in tied straitjacket under light cyan blanket
  ctx.fillStyle = '#f1f5f9';
  rRoundRect(ctx, -16, -9, 36, 15, 6);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.stroke();
  // Jacket straps
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-6, -8); ctx.lineTo(4, 5);
  ctx.moveTo(4, -8); ctx.lineTo(-6, 5);
  ctx.stroke();
  // Cyan blanket over legs
  ctx.fillStyle = '#bae6fd';
  rRoundRect(ctx, 8, -7, 36, 14, 5);
  ctx.fill();
  ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.2; ctx.stroke();

  // Waving roach feet sticking up from blanket end
  ctx.strokeStyle = '#5a2910'; ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(41, -3); ctx.lineTo(48, -11);
  ctx.moveTo(41, 2); ctx.lineTo(47, -3);
  ctx.stroke();

  ctx.restore();
}

function rPaintWallOutlet(ctx, ox, oy) {
  // White EU wall power outlet mounted on plaster curb block
  ctx.save();
  ctx.translate(ox + 64, oy + 64);

  // Small concrete/plaster pedestal block on wall edge
  ctx.fillStyle = '#cbd5e1';
  rRoundRect(ctx, -28, -26, 56, 62, 6);
  ctx.fill();
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();

  // White twin Schuko wall socket plate
  ctx.fillStyle = '#f8fafc';
  rRoundRect(ctx, -20, -18, 40, 46, 5);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();

  // Circular recessed socket cavity
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(0, 5, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.3; ctx.stroke();

  // Twin prong holes + ground clips
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-5.2, 5, 2.5, 0, Math.PI * 2);
  ctx.arc(5.2, 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-1.2, -7.5, 2.4, 3.2);
  ctx.fillRect(-1.2, 14.3, 2.4, 3.2);

  // Tiny green/amber LED indicator
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(0, -12, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function rPaintZapSpark(ctx, ox, oy) {
  // Bright electric cyan/gold lightning discharge sprite
  ctx.save();
  ctx.translate(ox + 64, oy + 64);

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.72)');
  glow.addColorStop(0.55, 'rgba(56, 189, 248, 0.25)');
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();

  // Jagged lightning arcs
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const rays = [[-26, -18, -10, -6, 0, 0], [28, -14, 12, -2, 0, 0], [-20, 22, -6, 10, 0, 0], [22, 20, 8, 8, 0, 0]];
  for (const r of rays) {
    ctx.beginPath();
    ctx.moveTo(r[0], r[1]); ctx.lineTo(r[2], r[3]); ctx.lineTo(r[4], r[5]);
    ctx.stroke();
  }

  // Central gold bolt
  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(3, -18); ctx.lineTo(-9, 2); ctx.lineTo(-1, 2);
  ctx.lineTo(-4, 18); ctx.lineTo(10, -3); ctx.lineTo(1, -3);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.restore();
}

function rPaintTextBubble(ctx, ox, oy, text, bg, border, fg) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);

  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.4;
  rRoundRect(ctx, -60, -24, 120, 36, 12);
  ctx.fill();
  ctx.stroke();

  // Speech tail
  ctx.beginPath();
  ctx.moveTo(-10, 11); ctx.lineTo(-16, 25); ctx.lineTo(3, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-11, 8, 15, 5);

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = text.length > 12
    ? '900 11.5px "Segoe UI", "DejaVu Sans", sans-serif'
    : text.length > 9
      ? '900 13px "Segoe UI", "DejaVu Sans", sans-serif'
      : '900 15px "Segoe UI", "DejaVu Sans", sans-serif';
  ctx.fillText(text, 0, -6, 108);

  ctx.restore();
}

function rPaintSoftShadow(ctx, ox, oy) {
  ctx.save();
  ctx.translate(ox + 64, oy + 64);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 38);
  g.addColorStop(0, 'rgba(12, 8, 6, 0.52)');
  g.addColorStop(0.6, 'rgba(12, 8, 6, 0.22)');
  g.addColorStop(1, 'rgba(12, 8, 6, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function buildRoachAtlas() {
  const c = document.createElement('canvas');
  c.width = ROACH_COLS * ROACH_CELL;
  c.height = ROACH_ROWS * ROACH_CELL;
  const ctx = c.getContext('2d');

  // Row 0: 8 cockroach meme leads
  for (let i = 0; i < 8; i++) rPaintCarapaceRoach(ctx, i * ROACH_CELL, 0, i);

  // Row 1: couple, buddy, doctor, crazy jacket/gown, bed patient, wall charger
  rPaintCarapaceRoach(ctx, 0 * ROACH_CELL, 1 * ROACH_CELL, 8);
  rPaintCarapaceRoach(ctx, 1 * ROACH_CELL, 1 * ROACH_CELL, 9);
  rPaintCarapaceRoach(ctx, 2 * ROACH_CELL, 1 * ROACH_CELL, 10);
  rPaintCarapaceRoach(ctx, 3 * ROACH_CELL, 1 * ROACH_CELL, 11); // doctor
  rPaintCarapaceRoach(ctx, 4 * ROACH_CELL, 1 * ROACH_CELL, 12); // crazy_jacket
  rPaintCarapaceRoach(ctx, 5 * ROACH_CELL, 1 * ROACH_CELL, 13); // crazy_gown
  rPaintBedRoach(ctx, 6 * ROACH_CELL, 1 * ROACH_CELL);          // bed_roach
  rPaintCarapaceRoach(ctx, 7 * ROACH_CELL, 1 * ROACH_CELL, 15); // charging

  // Row 2: streetlamp, juice box, tea glass, emoji bubbles, wall outlet, electric zap
  rPaintStreetLamp(ctx, 0 * ROACH_CELL, 2 * ROACH_CELL);
  rPaintJuiceProp(ctx, 1 * ROACH_CELL, 2 * ROACH_CELL);
  rPaintTeaGlass(ctx, 2 * ROACH_CELL, 2 * ROACH_CELL);
  rPaintBubble(ctx, 3 * ROACH_CELL, 2 * ROACH_CELL, 0);
  rPaintBubble(ctx, 4 * ROACH_CELL, 2 * ROACH_CELL, 1);
  rPaintBubble(ctx, 5 * ROACH_CELL, 2 * ROACH_CELL, 2);
  rPaintWallOutlet(ctx, 6 * ROACH_CELL, 2 * ROACH_CELL);
  rPaintZapSpark(ctx, 7 * ROACH_CELL, 2 * ROACH_CELL);

  // Row 3: soft shadow & Turkish meme speech bubbles
  rPaintSoftShadow(ctx, 0 * ROACH_CELL, 3 * ROACH_CELL);
  rPaintTextBubble(ctx, 1 * ROACH_CELL, 3 * ROACH_CELL, 'LÜLÜLÜLÜ!', '#fff7ed', '#9a3412', '#b91c1c');
  rPaintTextBubble(ctx, 2 * ROACH_CELL, 3 * ROACH_CELL, 'DUKTUR DUKTUR!', '#ecfeff', '#0e7490', '#0f172a');
  rPaintTextBubble(ctx, 3 * ROACH_CELL, 3 * ROACH_CELL, '⚡ ŞARJ %99', '#fefce8', '#0284c7', '#0369a1');

  return c;
}

function initRoachProps() {
  if (roachInstPR) return;
  const canvas = buildRoachAtlas();
  roachAtlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, roachAtlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);

  const vs = `#version 300 es
  layout(location=0) in vec2 aQuad;
  layout(location=1) in vec4 aPosScaleRot; // x, y, size, rot
  layout(location=2) in vec3 aTileAlpha;   // col, row, alpha
  uniform vec2 uRes;
  uniform vec2 uGridAtlas;
  out vec2 vUV;
  out float vAlpha;
  void main() {
    float c = cos(aPosScaleRot.w), s = sin(aPosScaleRot.w);
    vec2 p = vec2(aQuad.x * c - aQuad.y * s, aQuad.x * s + aQuad.y * c) * aPosScaleRot.z + aPosScaleRot.xy;
    vec2 ndc = (p / uRes) * 2.0 - 1.0;
    gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
    vUV = (aQuad + 0.5 + aTileAlpha.xy) / uGridAtlas;
    vAlpha = aTileAlpha.z;
  }`;

  const fs = `#version 300 es
  precision highp float;
  uniform sampler2D uAtlas;
  in vec2 vUV;
  in float vAlpha;
  out vec4 O;
  void main() {
    vec4 t = texture(uAtlas, vUV);
    if (t.a * vAlpha < 0.01) discard;
    O = vec4(t.rgb, t.a * vAlpha);
  }`;

  roachInstPR = makeProg(vs, fs);
  roachInstVAO = gl.createVertexArray();
  gl.bindVertexArray(roachInstVAO);

  const q = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
  roachInstBufA = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, roachInstBufA);
  gl.bufferData(gl.ARRAY_BUFFER, q, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  roachInstBufB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, roachInstBufB);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 28, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);

  if (typeof FB !== 'undefined' && FB && !roaches.length) {
    rebuildRoachProps();
    syncRoachProps();
  }
}

/* ======================================================================
   街头小强生态：避开图标岛巡街、情侣同行、街角驻足、冒泡互动
   ====================================================================== */
let streetProps = [];
let trees = streetProps; // share.js settle alias
let roaches = [];
let bubbles = [];
let bubbleTimer = 0;
let roachIntroDone = false;

function rHash(a, b, k) {
  let h = Math.imul((a | 0) + 19, 374761393) ^ Math.imul((b | 0) + 41, 668265263) ^ Math.imul((seed | 0) + (k | 0) * 31, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rWalkableGradient(px, py) {
  const e = 8;
  const gx = sampleField(FB, px + e, py) - sampleField(FB, px - e, py);
  const gy = sampleField(FB, px, py + e) - sampleField(FB, px, py - e);
  const len = Math.max(0.001, Math.hypot(gx, gy));
  return { x: gx / len, y: gy / len };
}

function spawnRoachMember(i, total) {
  // Cast priority: doctor (11), crazy straitjacket (12), crazy gown (13), wall charger (15), plus street stars
  const castOrder = [11, 12, 13, 15, 0, 5, 8, 9, 1, 2, 4, 6, 12, 15, 3, 7, 10, 11];
  const kind = i < castOrder.length ? castOrder[i] : (i % 16 === 14 ? 12 : (i % 16));
  const col = kind < 8 ? kind : kind - 8;
  const row = kind < 8 ? 0 : 1;

  let sx = W * (0.1 + 0.8 * rHash(i, 11, 1));
  let sy = H * (0.12 + 0.76 * rHash(i, 23, 2));
  if (FB) {
    const maxXFrac = i < 6 ? 0.68 : 0.88;
    for (let t = 0; t < 50; t++) {
      const tx = W * (0.06 + (maxXFrac - 0.06) * rHash(i, t * 7 + 3, 3));
      const ty = H * (0.08 + 0.84 * rHash(i, t * 13 + 5, 4));
      if (sampleField(FB, tx, ty) > 0.06) { sx = tx; sy = ty; break; }
    }
  }
  const ang = rHash(i, 37, 5) * Math.PI * 2;
  const speed = (kind === 12 || kind === 13 ? 34 : 26) + rHash(i, 43, 6) * 20;
  return {
    id: i, kind, col, row,
    x: sx, y: sy,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    baseSpeed: speed,
    phase: rHash(i, 59, 7) * 6.28,
    stopTimer: 0,
    chargeTimer: 0,
    chargeCooldown: i < 4 ? 0.1 : 1.5,
    targetOutlet: null,
    moveTimer: 0.8 + rHash(i, 67, 8) * 2.2,
    facing: Math.cos(ang) >= 0 ? 1 : -1,
    size: kind === 10 ? 74 : (kind === 9 ? 94 : 90),
  };
}

function rebuildRoachProps() {
  roaches = [];
  bubbles = [];
  roachIntroDone = false;
  const count = Math.max(0, Math.round(P.crowd == null ? 12 : P.crowd));
  for (let i = 0; i < count; i++) roaches.push(spawnRoachMember(i, count));

  // Keep couple (kind 8 & 9) walking right next to each other at spawn
  const him = roaches.find(r => r.kind === 8);
  const her = roaches.find(r => r.kind === 9);
  if (him && her) {
    her.x = Math.min(W - 40, him.x + 28);
    her.y = him.y + 4;
    her.vx = him.vx;
    her.vy = him.vy;
  }
}

function syncStreetProps() {
  streetProps.length = 0;
  if (!FB || (P.props || 0) <= 0.04) return;

  const isTooClose = (px, py, minD) => {
    for (const p of streetProps) {
      if (Math.hypot(p.x - px, p.y - py) < minD) return true;
    }
    return false;
  };

  // 1. Hospital beds (2-3 stationary clinic beds with lying "LÜLÜLÜLÜ!" patients)
  const targetBeds = (P.props || 0.9) > 0.55 ? 3 : 2;
  let placedBeds = 0;
  for (let attempt = 0; attempt < 220 && placedBeds < targetBeds; attempt++) {
    const px = W * (0.14 + 0.72 * rHash(attempt, 401, 21));
    const py = H * (0.18 + 0.64 * rHash(attempt, 503, 22));
    if (sampleField(FB, px, py) < 0.16) continue;
    if (isTooClose(px, py, 200)) continue;
    streetProps.push({
      type: 'bed',
      x: px, y: py, col: 6, row: 1,
      size: 110,
      phase: rHash(attempt, 607, 23) * 6.28,
      shoutTimer: 0.15 + placedBeds * 0.75,
      born: performance.now(),
    });
    placedBeds++;
  }

  // 2. Wall power outlets along icon island walls (first) + screen border walls (fallback)
  const targetOutlets = 3;
  let placedOutlets = 0;
  for (let attempt = 0; attempt < 320 && placedOutlets < targetOutlets; attempt++) {
    const px = W * (0.06 + 0.88 * rHash(attempt, 701, 31));
    const py = H * (0.09 + 0.80 * rHash(attempt, 809, 32));
    const s = sampleField(FB, px, py);
    if (s < 0.025 || s > 0.12) continue;
    if (isTooClose(px, py, 160)) continue;
    streetProps.push({
      type: 'outlet',
      x: px, y: py, col: 6, row: 2,
      size: 48,
      phase: rHash(attempt, 907, 33) * 6.28,
      born: performance.now(),
    });
    placedOutlets++;
  }
  const wallAnchors = [
    [54, H * 0.34], [W - 54, H * 0.42], [54, H * 0.68], [W - 54, H * 0.72],
  ];
  for (const [wx, wy] of wallAnchors) {
    if (placedOutlets >= targetOutlets) break;
    if (sampleField(FB, wx, wy) < 0.04 || isTooClose(wx, wy, 120)) continue;
    streetProps.push({
      type: 'outlet',
      x: wx, y: wy, col: 6, row: 2,
      size: 48,
      phase: placedOutlets * 1.7,
      born: performance.now(),
    });
    placedOutlets++;
  }

  // 3. Streetlamps, juice boxes & Turkish tea glasses on open cobblestone spots
  const targetProps = Math.round(5 + 10 * (P.props || 0.9)) + placedBeds + placedOutlets;
  for (let attempt = 0; attempt < 260 && streetProps.length < targetProps; attempt++) {
    const px = W * (0.05 + 0.90 * rHash(attempt, 101, 11));
    const py = H * (0.07 + 0.84 * rHash(attempt, 211, 12));
    if (sampleField(FB, px, py) < 0.14) continue;
    if (isTooClose(px, py, 135)) continue;

    const r = rHash(attempt, 307, 13);
    const col = r < 0.56 ? 0 : (r < 0.82 ? 1 : 2);
    streetProps.push({
      type: 'prop',
      x: px, y: py, col, row: 2,
      size: col === 0 ? 112 : 42,
      phase: r * 6.28,
      born: performance.now(),
    });
  }
}

function syncRoachProps() {
  syncStreetProps();
  const target = Math.max(0, Math.round(P.crowd == null ? 12 : P.crowd));
  if (roaches.length < target) {
    for (let i = roaches.length; i < target; i++) roaches.push(spawnRoachMember(i, target));
  } else if (roaches.length > target) {
    roaches.length = target;
  }
}

function rPushBubble(x, y, col, row, dur) {
  if (bubbles.length >= 22) return;
  bubbles.push({ x, y, age: 0, dur: dur || 1.7, col, row: row == null ? 2 : row });
}

function stepRoachProps(dt, timeSec) {
  if (!FB) return;
  const spdMul = Math.max(0.15, P.speed == null ? 1.0 : P.speed);

  let him = null, her = null;
  const outlets = [];
  const beds = [];
  const crazies = [];
  for (const p of streetProps) {
    if (p.type === 'outlet') outlets.push(p);
    else if (p.type === 'bed') beds.push(p);
  }
  for (const r of roaches) {
    if (r.kind === 8) him = r;
    if (r.kind === 9) her = r;
    if (r.kind === 12 || r.kind === 13) crazies.push(r);
  }

  // Opening clinic tableau once outlets & beds exist: charger plugged in + live speech bubbles
  if (!roachIntroDone && roaches.length && (outlets.length || beds.length)) {
    roachIntroDone = true;
    const charger = roaches.find(r => r.kind === 15);
    if (charger && outlets.length) {
      const o = outlets[Math.min(1, outlets.length - 1)];
      charger.x = o.x + 22;
      charger.y = o.y + 8;
      charger.targetOutlet = o;
      charger.chargeTimer = 3.2;
      rPushBubble(charger.x, charger.y - charger.size * 0.56, 3, 3, 2.4);
    }
    const doc = roaches.find(r => r.kind === 11);
    if (doc) rPushBubble(doc.x, doc.y - doc.size * 0.54, 2, 3, 2.6);
    for (const b of beds) rPushBubble(b.x - 14, b.y - 46, 1, 3, 2.6);
    for (const c of crazies) rPushBubble(c.x, c.y - c.size * 0.54, 1, 3, 2.6);
  }

  // Stationary bed patients shout "LÜLÜLÜLÜ!" periodically
  for (const b of beds) {
    b.shoutTimer -= dt * spdMul;
    if (b.shoutTimer <= 0) {
      b.shoutTimer = 2.6 + Math.random() * 2.0;
      rPushBubble(b.x - 14, b.y - 46, 1, 3, 2.3);
    }
  }

  for (const r of roaches) {
    if (r.chargeCooldown > 0) r.chargeCooldown -= dt;

    // Wall-outlet self-charging behavior for kind 15
    if (r.kind === 15 && r.chargeTimer > 0) {
      r.chargeTimer -= dt;
      if (Math.random() < dt * 1.1) {
        rPushBubble(r.x, r.y - r.size * 0.54, 3, 3, 1.9);
      }
      if (r.chargeTimer <= 0) {
        r.chargeCooldown = 3.5 + Math.random() * 2.5;
        r.targetOutlet = null;
        r.moveTimer = 2.0;
      }
      continue;
    }

    if (r.stopTimer > 0) {
      r.stopTimer -= dt;
      continue;
    }

    // Charging roach steers toward nearest wall outlet when ready
    if (r.kind === 15 && r.chargeCooldown <= 0 && outlets.length) {
      if (!r.targetOutlet) {
        let best = outlets[0], bestD = 1e9;
        for (const o of outlets) {
          const d = Math.hypot(o.x - r.x, o.y - r.y);
          if (d < bestD) { bestD = d; best = o; }
        }
        r.targetOutlet = best;
      }
      const tx = r.targetOutlet.x + 22, ty = r.targetOutlet.y + 8;
      const dx = tx - r.x, dy = ty - r.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 28) {
        r.chargeTimer = 3.6 + Math.random() * 2.0;
        rPushBubble(r.x, r.y - r.size * 0.54, 3, 3, 2.1);
        continue;
      }
      r.vx += (dx / dist) * 150 * dt;
      r.vy += (dy / dist) * 150 * dt;
    }

    // Doctor (kind 11) walks rounds to beds or crazy patients and says "DUKTUR DUKTUR!"
    if (r.kind === 11 && r.moveTimer < 0.8) {
      const target = beds.length && (!crazies.length || Math.random() < 0.55)
        ? beds[r.id % beds.length]
        : (crazies.length ? crazies[r.id % crazies.length] : null);
      if (target) {
        const dx = target.x - r.x, dy = target.y - r.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 38 && dist < 420) {
          r.vx += (dx / dist) * 65 * dt;
          r.vy += (dy / dist) * 65 * dt;
        }
      }
    }

    r.moveTimer -= dt;
    if (r.moveTimer <= 0) {
      if (Math.random() < 0.52) {
        r.stopTimer = (r.kind === 12 || r.kind === 13) ? (1.1 + Math.random() * 1.4) : (1.5 + Math.random() * 2.1);
        r.moveTimer = 2.2 + Math.random() * 3.4;
        if (r.kind === 11) {
          rPushBubble(r.x, r.y - r.size * 0.52, 2, 3, 2.0);
        } else if (r.kind === 12 || r.kind === 13) {
          const textCol = Math.random() < 0.72 ? 1 : 2; // mostly "LÜLÜLÜLÜ!", sometimes "DUKTUR DUKTUR!"
          rPushBubble(r.x, r.y - r.size * 0.54, textCol, 3, 2.0);
        } else if (Math.random() < 0.65) {
          const sym = r.kind === 5 ? 4 : (r.kind === 9 || r.kind === 8 ? 3 : 5);
          rPushBubble(r.x, r.y - r.size * 0.48, sym, 2, 1.5);
        }
        continue;
      } else {
        const turn = (Math.random() - 0.5) * ((r.kind === 12 || r.kind === 13) ? 2.4 : 1.4);
        const c = Math.cos(turn), s = Math.sin(turn);
        const nvx = r.vx * c - r.vy * s;
        const nvy = r.vx * s + r.vy * c;
        r.vx = nvx; r.vy = nvy;
        r.moveTimer = 2.0 + Math.random() * 3.0;
      }
    }

    // Gentle couple cohesion: her walks cheerfully beside him
    if (r === her && him) {
      const tx = him.x + 26, ty = him.y + 3;
      r.vx += (tx - r.x) * 1.6 * dt;
      r.vy += (ty - r.y) * 1.6 * dt;
    }

    let nx = r.x + r.vx * spdMul * dt;
    let ny = r.y + r.vy * spdMul * dt;

    // Bounce off screen margins
    if (nx < 34) { nx = 34; r.vx = Math.abs(r.vx); }
    if (nx > W - 34) { nx = W - 34; r.vx = -Math.abs(r.vx); }
    if (ny < 46) { ny = 46; r.vy = Math.abs(r.vy); }
    if (ny > H - 64) { ny = H - 64; r.vy = -Math.abs(r.vy); }

    // Steer away from icon curb islands (stay on cobblestone lanes s > 0.04)
    const sd = sampleField(FB, nx, ny);
    if (sd < 0.04) {
      const g = rWalkableGradient(nx, ny);
      const dot = r.vx * g.x + r.vy * g.y;
      if (dot < 0) {
        r.vx -= 1.85 * dot * g.x;
        r.vy -= 1.85 * dot * g.y;
      } else {
        r.vx += g.x * 32 * dt;
        r.vy += g.y * 32 * dt;
      }
      nx = r.x + g.x * 18 * dt;
      ny = r.y + g.y * 18 * dt;
    }

    // Normalize cruise velocity
    const curSpd = Math.hypot(r.vx, r.vy);
    if (curSpd > 0.01) {
      r.vx = (r.vx / curSpd) * r.baseSpeed;
      r.vy = (r.vy / curSpd) * r.baseSpeed;
    }
    r.x = nx; r.y = ny;
  }

  // Ambient speech & reaction bubbles
  bubbleTimer += dt * spdMul;
  if (bubbleTimer > 0.72 && roaches.length) {
    bubbleTimer = 0;
    const star = roaches[Math.floor(Math.random() * roaches.length)];
    if (star.kind === 11) {
      rPushBubble(star.x, star.y - star.size * 0.52, 2, 3, 2.3);
    } else if (star.kind === 12 || star.kind === 13) {
      rPushBubble(star.x, star.y - star.size * 0.52, Math.random() < 0.72 ? 1 : 2, 3, 2.3);
    } else if (star.kind === 15 && star.chargeTimer > 0) {
      rPushBubble(star.x, star.y - star.size * 0.52, 3, 3, 2.0);
    } else {
      const col = (star.kind === 8 || star.kind === 9) ? 3 : (star.kind === 5 ? 4 : 5);
      rPushBubble(star.x + (Math.random() - 0.5) * 14, star.y - star.size * 0.45, col, 2, 1.5);
    }
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].age += dt;
    bubbles[i].y -= 18 * dt;
    if (bubbles[i].age >= bubbles[i].dur) bubbles.splice(i, 1);
  }
}

function drawRoachProps(timeSec) {
  initRoachProps();
  const items = [];
  const zaps = [];
  const spdMul = Math.max(0.15, P.speed == null ? 1.0 : P.speed);

  // Build unified Y-sorted draw queue (props, beds, outlets + roaches)
  const actors = [];
  if ((P.props || 0) > 0.04) {
    for (const p of streetProps) {
      let sway = 0, bounceY = 0;
      if (p.type === 'bed') {
        // Hospital bed wiggles when shouting "LÜLÜLÜLÜ!"
        sway = Math.sin(timeSec * 8.5 + p.phase) * 0.035;
        bounceY = Math.abs(Math.sin(timeSec * 6.0 + p.phase)) * 2.2;
      } else if (p.type === 'prop' && p.col !== 0) {
        sway = Math.sin(timeSec * 1.4 + p.phase) * 0.04;
      }
      actors.push({
        sortY: p.y + p.size * 0.28,
        x: p.x,
        y: p.y - bounceY,
        size: p.size,
        rot: sway,
        col: p.col,
        row: p.row,
        alpha: 0.98,
        shadowSize: p.type === 'bed' ? 92 : (p.col === 0 && p.type === 'prop' ? 54 : 30),
        shadowOffY: p.type === 'bed' ? 28 + bounceY : (p.col === 0 && p.type === 'prop' ? 44 : 18),
      });
    }
  }

  for (const r of roaches) {
    const charging = r.kind === 15 && r.chargeTimer > 0;
    const crazy = r.kind === 12 || r.kind === 13;
    const moving = r.stopTimer <= 0 && !charging;
    const jitterX = charging ? Math.sin(timeSec * 48 + r.phase) * 2.2 : 0;
    const bounce = charging
      ? Math.abs(Math.sin(timeSec * 28 + r.phase)) * 3.0
      : moving
        ? Math.abs(Math.sin(timeSec * ((crazy ? 8.0 : 5.5) * spdMul) + r.phase)) * (crazy ? 6.5 : 4.5)
        : Math.sin(timeSec * 2.8 + r.phase) * (crazy ? 3.0 : 1.5);
    const tilt = charging
      ? Math.sin(timeSec * 42 + r.phase) * 0.14
      : moving
        ? Math.sin(timeSec * ((crazy ? 8.0 : 5.5) * spdMul) + r.phase) * (crazy ? 0.17 : 0.09)
        : (r.kind === 5 || crazy ? Math.sin(timeSec * 4.5 + r.phase) * 0.16 : Math.sin(timeSec * 1.8 + r.phase) * 0.04);
    actors.push({
      sortY: r.y + r.size * 0.34,
      x: r.x + jitterX,
      y: r.y - bounce,
      size: r.size,
      rot: tilt,
      col: r.col,
      row: r.row,
      alpha: 1.0,
      shadowSize: r.size * 0.72,
      shadowOffY: r.size * 0.35 + bounce,
    });

    if (charging && r.targetOutlet) {
      zaps.push({
        x: (r.x + r.targetOutlet.x) * 0.5,
        y: (r.y + r.targetOutlet.y) * 0.5 - 6,
        size: 46 + Math.sin(timeSec * 36) * 8,
        rot: timeSec * 7.0 + r.phase,
        alpha: 0.72 + 0.26 * Math.sin(timeSec * 40),
      });
    }
  }

  actors.sort((a, b) => a.sortY - b.sortY);

  // Soft shadows first, then sprites
  for (const a of actors) {
    items.push({ x: a.x, y: a.y + a.shadowOffY, size: a.shadowSize, rot: 0, col: 0, row: 3, alpha: 0.85 * a.alpha });
  }
  for (const a of actors) {
    items.push({ x: a.x, y: a.y, size: a.size, rot: a.rot, col: a.col, row: a.row, alpha: a.alpha });
  }

  // Electric discharge flashes between outlet and charging roach
  for (const z of zaps) {
    items.push({ x: z.x, y: z.y, size: z.size, rot: z.rot, col: 7, row: 2, alpha: z.alpha });
  }

  // Reaction & Turkish speech bubbles on top
  for (const b of bubbles) {
    const t = b.age / b.dur;
    const pop = Math.min(1, t * 4);
    const isText = b.row === 3;
    items.push({
      x: b.x + Math.sin(t * 6) * (isText ? 2.5 : 5),
      y: b.y,
      size: (isText ? 96 : 26) * (0.74 + 0.30 * pop),
      rot: Math.sin(t * 5) * (isText ? 0.04 : 0.12),
      col: b.col,
      row: b.row == null ? 2 : b.row,
      alpha: t < 0.72 ? 0.98 : (1 - t) / 0.28,
    });
  }

  if (!items.length) return;
  const data = new Float32Array(items.length * 7);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const o = i * 7;
    data[o] = it.x;
    data[o + 1] = it.y;
    data[o + 2] = it.size;
    data[o + 3] = it.rot;
    data[o + 4] = it.col;
    data[o + 5] = it.row;
    data[o + 6] = it.alpha;
  }

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
  gl.useProgram(roachInstPR.p);
  gl.bindVertexArray(roachInstVAO);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, roachAtlasTex);
  gl.uniform1i(roachInstPR.U.uAtlas, 0);
  gl.uniform2f(roachInstPR.U.uRes, cv.width / cv._scale, cv.height / cv._scale);
  gl.uniform2f(roachInstPR.U.uGridAtlas, ROACH_COLS, ROACH_ROWS);

  gl.bindBuffer(gl.ARRAY_BUFFER, roachInstBufB);
  if (items.length > roachInstCap) {
    roachInstCap = Math.max(items.length, 64);
    gl.bufferData(gl.ARRAY_BUFFER, roachInstCap * 28, gl.DYNAMIC_DRAW);
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, items.length);
  gl.bindVertexArray(null);
  gl.disable(gl.BLEND);
}
