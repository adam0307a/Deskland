/*!
 * ThinkingOrbs 3D Dot Engine for DiyarDesk
 * Ported from haplollc/ThinkingOrbs (MIT) / Jakub Antalik's thinking-orbs engine.
 * Pure deterministic 3D math for all 9 orb designs (no DOM dependency).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThinkingOrbsEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DESIGN_IDS = [
    'working',
    'searching',
    'solving',
    'listening',
    'connecting',
    'weaving',
    'composing',
    'breathing',
    'shaping'
  ];

  var DESIGN_TO_MODE = {
    working: 'orbits',
    searching: 'globe',
    solving: 'rubik',
    listening: 'wave',
    connecting: 'web',
    weaving: 'braid',
    composing: 'ribbon',
    breathing: 'ring',
    shaping: 'morph'
  };

  function frac(x) {
    return x - Math.floor(x);
  }

  function lerp(a, b, f) {
    return a + (b - a) * f;
  }

  function hashD(a, b) {
    var h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  function vnoise(x, y) {
    var xi = Math.floor(x);
    var yi = Math.floor(y);
    var fx = x - xi;
    var fy = y - yi;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    var a = hashD(xi, yi);
    var b = hashD(xi + 1, yi);
    var c = hashD(xi, yi + 1);
    var d = hashD(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

  function fibDir(i, n) {
    var y = 1 - (2 * (i + 0.5)) / n;
    var rad = Math.sqrt(Math.max(0, 1 - y * y));
    var a = i * GOLDEN_ANGLE;
    return [rad * Math.cos(a), y, rad * Math.sin(a)];
  }

  function angleDelta(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  }

  function radiusScale(size, p) {
    return Math.pow(size / 300, p);
  }

  function below(n) {
    return n > 0 ? Math.ceil(n) : 0;
  }

  function through(n) {
    return n >= 0 ? Math.floor(n) + 1 : 0;
  }

  function opt(o, key, fallback) {
    return o && o[key] !== undefined ? o[key] : fallback;
  }

  function makeProjector(yaw, tilt, cx, cy, scale, roll) {
    var st = Math.sin(tilt);
    var ct = Math.cos(tilt);
    var sy = Math.sin(yaw);
    var cyw = Math.cos(yaw);
    var sr = roll ? Math.sin(roll) : 0;
    var cr = roll ? Math.cos(roll) : 1;
    return function (x, y, z) {
      var x1 = x * cyw + z * sy;
      var z1 = -x * sy + z * cyw;
      var y1 = y * ct - z1 * st;
      var z2 = y * st + z1 * ct;
      if (roll) {
        var rx = x1 * cr - y1 * sr;
        var ry = x1 * sr + y1 * cr;
        x1 = rx;
        y1 = ry;
      }
      return [cx + x1 * scale, cy - y1 * scale, z2];
    };
  }

  function finalize(dots, lines, rMin) {
    var visible = [];
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (d.a < 0.02) continue;
      if (d.r < rMin) d.r = rMin;
      d._idx = i;
      visible.push(d);
    }
    visible.sort(function (a, b) {
      return a.z !== b.z ? a.z - b.z : a._idx - b._idx;
    });
    var visLines = [];
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].a >= 0.02) visLines.push(lines[j]);
    }
    return { dots: visible, lines: visLines };
  }

  // ---- 1. Orbits (working) ----
  function orbits(size, t, o) {
    var cx = size / 2;
    var cy = size / 2;
    var R = (size / 2) * 0.82;
    var pt = makeProjector(
      t * 0.12 + opt(o, 'hoverYaw', 0),
      0.3 + opt(o, 'hoverTilt', 0),
      cx,
      cy,
      1,
      opt(o, 'hoverRoll', 0)
    );
    var rs = radiusScale(size, opt(o, 'rsPow', 0.6));

    var orbitN = opt(o, 'orbitN', 12);
    var ghostN = opt(o, 'ghostN', 40);
    var particles = opt(o, 'particles', 3);
    var ghostR = opt(o, 'ghostR', 0.9);
    var ghostA = opt(o, 'ghostA', 0.5);
    var partR = opt(o, 'partR', 1.2);
    var partRDepth = opt(o, 'partRDepth', 1.6);

    var dots = [];
    var nOrbits = below(orbitN);
    var nGhost = below(ghostN);
    var nPart = below(particles);

    for (var orb = 0; orb < nOrbits; orb++) {
      var h1 = hashD(orb, 1.7);
      var h2 = hashD(orb, 5.2);
      var h3 = hashD(orb, 8.9);
      var ro = R * (0.45 + 0.52 * h1);
      var th = h1 * 2 * Math.PI;
      var phi = Math.acos(2 * h2 - 1);
      var nx = Math.sin(phi) * Math.cos(th);
      var ny = Math.cos(phi);
      var nz = Math.sin(phi) * Math.sin(th);
      var ux = -ny;
      var uy = nx;
      var uz = 0;
      var ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
      ux /= ul;
      uy /= ul;
      var vx = ny * uz - nz * uy;
      var vy = nz * ux - nx * uz;
      var vz = nx * uy - ny * ux;
      var speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1);

      for (var k = 0; k < nGhost; k++) {
        var a = (k / ghostN) * 2 * Math.PI;
        var ca = Math.cos(a);
        var sa = Math.sin(a);
        var p = pt(
          (ux * ca + vx * sa) * ro,
          (uy * ca + vy * sa) * ro,
          (uz * ca + vz * sa) * ro
        );
        var depth = (p[2] / ro + 1) / 2;
        dots.push({
          x: p[0],
          y: p[1],
          z: p[2],
          r: ghostR * rs,
          white: 0.72,
          a: ghostA * (0.4 + 0.6 * depth)
        });
      }

      for (var m = 0; m < nPart; m++) {
        var ap = t * speed + (m / particles) * 2 * Math.PI + h2 * 6;
        var cap = Math.cos(ap);
        var sap = Math.sin(ap);
        var pp = pt(
          (ux * cap + vx * sap) * ro,
          (uy * cap + vy * sap) * ro,
          (uz * cap + vz * sap) * ro
        );
        var pdepth = (pp[2] / ro + 1) / 2;
        dots.push({
          x: pp[0],
          y: pp[1],
          z: pp[2],
          r: (partR + partRDepth * pdepth) * rs,
          white: 0.3 - 0.22 * pdepth,
          a: 1
        });
      }
    }
    return finalize(dots, [], opt(o, 'rMin', 0.3));
  }

  // ---- 2. Globe (searching) ----
  function globe(size, t, o) {
    var spin = 0.5;
    var cx = size / 2;
    var cy = size / 2;
    var radius = (size / 2) * 0.82;
    var tilt = 0.4 + 0.06 * Math.sin(t * 0.35) + opt(o, 'hoverTilt', 0);
    var pt = makeProjector(
      t * spin + opt(o, 'hoverYaw', 0),
      tilt,
      cx,
      cy,
      radius,
      opt(o, 'hoverRoll', 0)
    );
    var scan = t * (spin + (1.7 - spin) * opt(o, 'scanMul', 1));
    var rs = radiusScale(size, opt(o, 'rsPow', 0.6));
    var dimBase = opt(o, 'dimBase', 1);
    var rBase = opt(o, 'rBase', 0.6);
    var rDepth = opt(o, 'rDepth', 1.7);
    var rBoost = opt(o, 'rBoost', 1);
    var inkFar = opt(o, 'inkFar', 0.62);
    var inkSpan = opt(o, 'inkSpan', 0.54);

    var dots = [];
    var latRings = opt(o, 'latRings', 17);
    var lonDensity = opt(o, 'lonDensity', 44);
    var nLat = through(latRings);
    for (var li = 0; li < nLat; li++) {
      var lat = -Math.PI / 2 + (li / latRings) * Math.PI;
      var cosLat = Math.cos(lat);
      var sinLat = Math.sin(lat);
      var lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
      for (var lj = 0; lj < lonCount; lj++) {
        var lon = (lj / lonCount) * 2 * Math.PI;
        var p = pt(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon));
        var z = p[2];
        var depth = (z + 1) / 2;
        var d = angleDelta(lon + t * spin, scan);
        var boost = Math.exp(-(d * d) / 0.18) * Math.max(0, z);
        dots.push({
          x: p[0],
          y: p[1],
          z: z,
          r: (rBase + rDepth * depth + rBoost * boost) * rs,
          white: inkFar - inkSpan * depth,
          a: dimBase + (1 - dimBase) * Math.min(1, boost),
          boost: boost
        });
      }
    }
    return finalize(dots, [], opt(o, 'rMin', 0.3));
  }

  // ---- 3. Rubik (solving) ----
  var movesCache = Object.create(null);

  function getMoves(count) {
    if (movesCache[count]) return movesCache[count];
    var list = [];
    for (var i = 0; i < count; i++) {
      var axis = Math.min(2, Math.floor(hashD(i, 2.3) * 3));
      var lo = -1.0 + 0.5 * Math.min(3, Math.floor(hashD(i, 5.9) * 4));
      var dir = hashD(i, 7.7) < 0.5 ? 1 : -1;
      list.push({ axis: axis, lo: lo, hi: lo + 0.5, ang: (dir * Math.PI) / 2 });
    }
    movesCache[count] = list;
    return list;
  }

  function solveCycle(time, count, slotDur, rest) {
    var cyc = 2 * count * slotDur + rest;
    var tc = time % cyc;
    if (tc < 0) tc += cyc;
    var amount = new Array(count);
    for (var i = 0; i < count; i++) amount[i] = 0;
    var active = -1;
    if (tc < 2 * count * slotDur) {
      var slot = Math.floor(tc / slotDur);
      var p = (tc - slot * slotDur) / slotDur;
      var cl = Math.min(1, p / 0.7);
      var ep = 1 - Math.pow(1 - cl, 3);
      if (slot < count) {
        for (var j = 0; j < slot; j++) amount[j] = 1;
        amount[slot] = ep;
        active = slot;
      } else {
        var u = 2 * count - 1 - slot;
        for (var k = 0; k < u; k++) amount[k] = 1;
        amount[u] = 1 - ep;
        active = u;
      }
    }
    return { amount: amount, active: active };
  }

  function applyMoves(px, py, pz, moves, amount, active) {
    var x = px;
    var y = py;
    var z = pz;
    var inActive = false;
    for (var i = 0; i < moves.length; i++) {
      if (amount[i] <= 0) continue;
      var mv = moves[i];
      var coord = mv.axis === 0 ? x : mv.axis === 1 ? y : z;
      if (coord < mv.lo || coord >= mv.hi) continue;
      if (i === active) inActive = true;
      var a = mv.ang * amount[i];
      var ca = Math.cos(a);
      var sa = Math.sin(a);
      if (mv.axis === 0) {
        var y2 = y * ca - z * sa;
        z = y * sa + z * ca;
        y = y2;
      } else if (mv.axis === 1) {
        var x2 = x * ca + z * sa;
        z = -x * sa + z * ca;
        x = x2;
      } else {
        var x3 = x * ca - y * sa;
        y = x * sa + y * ca;
        x = x3;
      }
    }
    return [x, y, z, inActive];
  }

  function rubik(size, t, o) {
    var cx = size / 2;
    var cy = size / 2;
    var R = (size / 2) * 0.82;
    var pt = makeProjector(
      t * 0.55 + opt(o, 'hoverYaw', 0),
      0.35 + 0.1 * Math.sin(t * 0.9) + opt(o, 'hoverTilt', 0),
      cx,
      cy,
      R,
      opt(o, 'hoverRoll', 0)
    );
    var rs = radiusScale(size, opt(o, 'rsPow', 0.6));
    var moveCount = Math.max(1, Math.floor(opt(o, 'moveCount', 14)));
    var moves = getMoves(moveCount);
    var sc = solveCycle(t, moveCount, 0.42, 1.2);
    var rBase = opt(o, 'rBase', 0.6);
    var rDepth = opt(o, 'rDepth', 1.7);
    var rActive = opt(o, 'rActive', 0.3);
    var inkFar = opt(o, 'inkFar', 0.62);
    var inkSpan = opt(o, 'inkSpan', 0.54);

    var dots = [];
    var latRings = opt(o, 'latRings', 15);
    var lonDensity = opt(o, 'lonDensity', 40);
    var nLat = through(latRings);
    for (var li = 0; li < nLat; li++) {
      var lat = -Math.PI / 2 + (li / latRings) * Math.PI;
      var cosLat = Math.cos(lat);
      var sinLat = Math.sin(lat);
      var lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
      for (var lj = 0; lj < lonCount; lj++) {
        var lon = (lj / lonCount) * 2 * Math.PI;
        var mv = applyMoves(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon), moves, sc.amount, sc.active);
        var p = pt(mv[0], mv[1], mv[2]);
        var zr = p[2];
        var depth = (zr + 1) / 2;
        var inAct = mv[3];
        dots.push({
          x: p[0],
          y: p[1],
          z: zr,
          r: (rBase + rDepth * depth + (inAct ? rActive : 0)) * rs,
          white: inkFar - inkSpan * depth - (inAct ? 0.14 : 0),
          a: 1,
          boost: inAct ? 0.65 : 0
        });
      }
    }
    return finalize(dots, [], opt(o, 'rMin', 0.3));
  }

  // ---- 4. Wave (listening) ----
  function wave(size, t, o) {
    var cx = size / 2;
    var cy = size / 2;
    var R = (size / 2) * 0.874;
    var pt = makeProjector(
      t * 0.18 + opt(o, 'hoverYaw', 0),
      0.38 + opt(o, 'hoverTilt', 0),
      cx,
      cy,
      1,
      opt(o, 'hoverRoll', 0)
    );
    var rs = radiusScale(size, opt(o, 'rsPow', 0.6));
    var rBase = opt(o, 'rBase', 0.6);
    var rDepth = opt(o, 'rDepth', 1.7);

    var dots = [];
    var rings = opt(o, 'rings', 15);
    var lonDensity = opt(o, 'lonDensity', 40);
    var nRings = through(rings);
    for (var ri = 0; ri < nRings; ri++) {
      var lat = -Math.PI / 2 + (ri / rings) * Math.PI;
      var cosLat = Math.cos(lat);
      var sinLat = Math.sin(lat);
      var w = 0.62 * Math.sin(t * 2.1 - ri * 0.52) + 0.38 * Math.sin(t * 1.27 + ri * 0.83);
      var rr = R * (0.88 + 0.105 * w);
      var lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity));
      for (var lj = 0; lj < lonCount; lj++) {
        var lon = (lj / lonCount) * 2 * Math.PI;
        var p = pt(cosLat * Math.cos(lon) * rr, sinLat * rr, cosLat * Math.sin(lon) * rr);
        var depth = (p[2] / R + 1) / 2;
        var crest = Math.max(0, w);
        dots.push({
          x: p[0],
          y: p[1],
          z: p[2],
          r: (rBase + rDepth * depth) * (1 + 0.4 * crest) * rs,
          white: 0.66 - 0.56 * depth - 0.1 * crest,
          a: 1,
          boost: crest * 0.55
        });
      }
    }
    return finalize(dots, [], opt(o, 'rMin', 0.3));
  }

  // ---- 5. Web (connecting) ----
  function web(size, t, o) {
    var cx = size / 2;
    var cy = size / 2;
    var R = (size / 2) * 0.8 * opt(o, 'spread', 1);
    var pt = makeProjector(
      t * 0.12 + opt(o, 'hoverYaw', 0),
      0.32 + opt(o, 'hoverTilt', 0),
      cx,
      cy,
      R,
      opt(o, 'hoverRoll', 0)
    );
    var rs = radiusScale(size, opt(o, 'rsPow', 0.6));

    var nodeN = opt(o, 'nodeN', 30);
    var thr = opt(o, 'thr', 0.72);
    var nodeR = opt(o, 'nodeR', 1.4);
    var nodeRDepth = opt(o, 'nodeRDepth', 1.8);
    var lineW = opt(o, 'lineW', 0.8);
    var nNodes = below(nodeN);

    var nodes = new Array(nNodes);
    var projNodes = new Array(nNodes);
    for (var i = 0; i < nNodes; i++) {
      var d = fibDir(i, nodeN);
      var x = d[0] + 0.3 * (vnoise(i * 0.31 + 9, t * 0.24) - 0.5) * 2;
      var y = d[1] + 0.3 * (vnoise(i * 0.53 + 27, t * 0.21) - 0.5) * 2;
      var z = d[2] + 0.3 * (vnoise(i * 0.77 + 55, t * 0.27) - 0.5) * 2;
      var l = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
      var nx = x / l;
      var ny = y / l;
      var nz = z / l;
      nodes[i] = [nx, ny, nz];
      projNodes[i] = pt(nx, ny, nz);
    }

    var lines = [];
    var dots = [];

    for (var a = 0; a < nNodes; a++) {
      for (var b = a + 1; b < nNodes; b++) {
        var dx = nodes[a][0] - nodes[b][0];
        var dy = nodes[a][1] - nodes[b][1];
        var dz = nodes[a][2] - nodes[b][2];
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist >= thr) continue;
        var p1 = projNodes[a];
        var p2 = projNodes[b];
        var ldepth = ((p1[2] + p2[2]) / 2 + 1) / 2;
        lines.push({
          x1: p1[0],
          y1: p1[1],
          x2: p2[0],
          y2: p2[1],
          white: 0.42,
          a: (1 - dist / thr) * (0.3 + 0.55 * ldepth),
          w: Math.max(0.6, lineW * rs)
        });
      }
    }

    for (var k = 0; k < nNodes; k++) {
      var pk = projNodes[k];
      var depth = (pk[2] + 1) / 2;
      var pulse = 1 + 0.25 * Math.sin(t * 1.4 + k * 2.7);
      dots.push({
        x: pk[0],
        y: pk[1],
        z: pk[2],
        r: (nodeR + nodeRDepth * depth) * pulse * rs,
        white: 0.55 - 0.45 * depth,
        a: 1
      });
    }

    var signals = opt(o, 'signals', 5);
    var nSig = below(signals);
    for (var s = 0; s < nSig; s++) {
      var seg = Math.floor(t * 0.55 + s * 7.31);
      var sa = Math.floor(hashD(seg, s * 3.1 + 1.7) * nodeN);
      var sb = Math.floor(hashD(seg, s * 5.7 + 4.2) * nodeN);
      if (sa === sb || sa >= nNodes || sb >= nNodes) continue;
      var f = frac(t * 0.55 + s * 7.31);
      var sx = lerp(nodes[sa][0], nodes[sb][0], f);
      var sy = lerp(nodes[sa][1], nodes[sb][1], f);
      var sz = lerp(nodes[sa][2], nodes[sb][2], f);
      var sl = Math.max(1e-6, Math.sqrt(sx * sx + sy * sy + sz * sz));
      var ps = pt(sx / sl, sy / sl, sz / sl);
      var sdepth = (ps[2] + 1) / 2;
      dots.push({
        x: ps[0],
        y: ps[1],
        z: ps[2],
        r: (nodeR * 1.5 + nodeRDepth * sdepth) * rs,
        white: 0.05,
        a: 0.5 + 0.5 * sdepth,
        boost: 0.9
      });
    }

    return finalize(dots, lines, opt(o, 'rMin', 0.3));
  }

  // ---- 6. Braid (weaving) ----
  function braid(size, t, o) {
    var cx = size / 2;
    var cy = size / 2;
    var R = (size / 2) * 0.76;
    var pt = makeProjector(
      t * 0.4 + opt(o, 'hoverYaw', 0),
      0.3 + opt(o, 'hoverTilt', 0),
      cx,
      cy,
      1,
      opt(o, 'hoverRoll', 0)
    );
    var rs = radiusScale(size, opt(o, 'rsPow', 0.6));
    var rBase = opt(o, 'rBase', 1.2);
    var rDepth = opt(o, 'rDepth', 1.8);

    var dots = [];
    var ghostN = opt(o, 'ghostN', 150);
    var nGhost = below(ghostN);
    for (var i = 0; i < nGhost; i++) {
      var d = fibDir(i, ghostN);
      var pg = pt(d[0] * R, d[1] * R, d[2] * R);
      var gdepth = (pg[2] / R + 1) / 2;
      dots.push({
        x: pg[0],
        y: pg[1],
        z: pg[2],
        r: 0.8 * rs,
        white: 0.78,
        a: 0.1 + 0.22 * gdepth
      });
    }

    var strandN = opt(o, 'strandN', 52);
    var turns = opt(o, 'turns', 3);
    var nStrand = below(strandN);
    for (var s = 0; s < 3; s++) {
      var phase = (s / 3) * 2 * Math.PI;
      for (var k = 0; k < nStrand; k++) {
        var u = (frac(k / strandN + t * 0.045) * 2 - 1) * 0.96;
        var surf = Math.sqrt(Math.max(0, 1 - u * u));
        var endFade = Math.min(1, (1 - Math.abs(u)) / 0.1);
        var a = u * Math.PI * turns + phase;
        var weave = 1 + 0.075 * Math.sin(u * Math.PI * turns * 2 + phase * 2 + t * 0.8);
        var rr = surf * R * weave;
        var ps = pt(Math.cos(a) * rr, u * R * weave, Math.sin(a) * rr);
        var depth = (ps[2] / R + 1) / 2;
        dots.push({
          x: ps[0],
          y: ps[1],
          z: ps[2],
          r: (rBase + rDepth * depth) * rs,
          white: 0.55 - 0.45 * depth,
          a: endFade * (0.45 + 0.55 * depth)
        });
      }
    }
    return finalize(dots, [], opt(o, 'rMin', 0.3));
  }

  // ---- 7 & 8. Ribbon (composing) & Ring (breathing, faceOn = 1) ----
  function ribbon(size, t, o) {
    var cx = size / 2;
    var cy = size / 2;
    var R = (size / 2) * 0.78;
    var spin = opt(o, 'spin', 1);
    var camTilt = 0.3;
    var faceOn = opt(o, 'faceOn', 0) !== 0;
    var pt = makeProjector(
      t * 0.1 * spin + opt(o, 'hoverYaw', 0) * (faceOn ? 0.65 : 1),
      camTilt + opt(o, 'hoverTilt', 0) * (faceOn ? 0.65 : 1),
      cx,
      cy,
      1,
      opt(o, 'hoverRoll', 0)
    );
    var rs = radiusScale(size, opt(o, 'rsPow', 0.6));
    var wobMul = opt(o, 'wobMul', 1);
    var rBase = opt(o, 'rBase', 1.1);
    var rDepth = opt(o, 'rDepth', 1.7);

    var dots = [];
    var ghostN = opt(o, 'ghostN', 150);
    var nGhost = below(ghostN);
    for (var i = 0; i < nGhost; i++) {
      var d = fibDir(i, ghostN);
      var pg = pt(d[0] * R, d[1] * R, d[2] * R);
      var gdepth = (pg[2] / R + 1) / 2;
      dots.push({
        x: pg[0],
        y: pg[1],
        z: pg[2],
        r: 0.8 * rs,
        white: 0.78,
        a: 0.1 + 0.22 * gdepth
      });
    }

    var ya = t * 0.24 * spin;
    var ta = faceOn ? -camTilt : 0.55 + 0.3 * Math.sin(t * 0.18) * spin;
    var ux = Math.cos(ya);
    var uy = 0;
    var uz = Math.sin(ya);
    var vx = -uz * Math.sin(ta);
    var vy = Math.cos(ta);
    var vz = ux * Math.sin(ta);
    var nx = uy * vz - uz * vy;
    var ny = uz * vx - ux * vz;
    var nz = ux * vy - uy * vx;

    var wobAmp = 0.23 * wobMul;
    var baseR = faceOn ? R / (1 + 0.85 * wobAmp) : R;

    var baseLanes = opt(o, 'lanes', 5);
    var segs = opt(o, 'segs', 88);
    var lanes = Math.max(1, Math.round(baseLanes * opt(o, 'bandMul', 1)));
    var mid = (lanes - 1) / 2;
    var nSegs = below(segs);

    for (var w = 0; w < lanes; w++) {
      var laneOff = (w - mid) * 0.075;
      var edge = Math.abs(w - mid) / Math.max(1, mid);
      for (var k = 0; k < nSegs; k++) {
        var a = (k / segs) * 2 * Math.PI;
        var ca = Math.cos(a);
        var sa = Math.sin(a);
        var wob = (0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1)) * wobMul;
        var radial = faceOn ? 1 + wob : 1;
        var off = faceOn ? laneOff : laneOff + wob;
        var x = ux * ca + vx * sa + nx * off;
        var y = uy * ca + vy * sa + ny * off;
        var z = uz * ca + vz * sa + nz * off;
        var l = Math.sqrt(x * x + y * y + z * z) || 1;
        var rr = baseR * radial;
        var pr = pt((x / l) * rr, (y / l) * rr, (z / l) * rr);
        var depth = (pr[2] / R + 1) / 2;
        dots.push({
          x: pr[0],
          y: pr[1],
          z: pr[2],
          r: (rBase + rDepth * depth) * (1 - 0.25 * edge) * rs,
          white: 0.52 - 0.44 * depth + 0.18 * edge,
          a: 0.4 + 0.6 * depth
        });
      }
    }
    return finalize(dots, [], opt(o, 'rMin', 0.3));
  }

  // ---- 9. Morph (shaping) ----
  function PolyPath(verts) {
    var lengths = new Array(verts.length);
    var total = 0;
    for (var i = 0; i < verts.length; i++) {
      var a = verts[i];
      var b = verts[(i + 1) % verts.length];
      var l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      lengths[i] = l;
      total += l;
    }
    return function at(f) {
      var target = f * total;
      var i = 0;
      while (target > lengths[i] && i < verts.length - 1) {
        target -= lengths[i];
        i++;
      }
      var a = verts[i];
      var b = verts[(i + 1) % verts.length];
      var ff = lengths[i] !== 0 ? Math.min(1, target / lengths[i]) : 0;
      return [a[0] + (b[0] - a[0]) * ff, a[1] + (b[1] - a[1]) * ff];
    };
  }

  var triangleAt = PolyPath([[0.0, -0.26], [0.24, 0.16], [-0.24, 0.16]]);
  var squareAt = PolyPath([[0, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [-0.2, -0.2]]);

  function shapePoint(shape, f) {
    if (shape === 0) {
      var a = -Math.PI / 2 + f * 2 * Math.PI;
      return [Math.cos(a) * 0.24, Math.sin(a) * 0.24];
    }
    if (shape === 1) return triangleAt(f);
    return squareAt(f);
  }

  var MORPH_HOLD = 1.4;
  var MORPH_TIME = 0.9;

  function morph(size, t, o) {
    var K = 3;
    var segDur = MORPH_HOLD + MORPH_TIME;
    var tc = t % (segDur * K);
    if (tc < 0) tc += segDur * K;
    var k = Math.floor(tc / segDur);
    var local = tc - k * segDur;
    var m = 0;
    if (local > MORPH_HOLD) {
      var mx = (local - MORPH_HOLD) / MORPH_TIME;
      m = mx * mx * (3 - 2 * mx);
    }
    var sprd = opt(o, 'spread', 1);
    var M = 160;
    var pts = new Array(M);
    for (var i = 0; i < M; i++) {
      var f = i / M;
      var a = shapePoint(k, f);
      var b = shapePoint((k + 1) % K, f);
      pts[i] = [(a[0] + (b[0] - a[0]) * m) * sprd, (a[1] + (b[1] - a[1]) * m) * sprd];
    }
    var L = new Array(M);
    var total = 0;
    for (var j = 0; j < M; j++) {
      var pa = pts[j];
      var pb = pts[(j + 1) % M];
      var l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      L[j] = l;
      total += l;
    }

    var n = Math.max(6, Math.round(34 * opt(o, 'iconD', 1)));
    var re = opt(o, 'rDot', 0.021) * 1.35 * sprd;
    var pulse = 1 + 0.02 * Math.sin(local * 3.1);

    // Subtle 3D tilt illusion on hover for the 2D morph outline
    var hYaw = opt(o, 'hoverYaw', 0);
    var hTilt = opt(o, 'hoverTilt', 0);
    var cYaw = Math.cos(hYaw * 0.55);
    var cTilt = Math.cos(hTilt * 0.55);
    var sYaw = Math.sin(hYaw * 0.55);

    var dots = new Array(n);
    var c2 = size / 2;
    var seg = 0;
    var acc = 0;
    for (var k2 = 0; k2 < n; k2++) {
      var target = (k2 / n) * total;
      while (acc + L[seg] < target && seg < M - 1) {
        acc += L[seg];
        seg++;
      }
      var s0 = pts[seg];
      var s1 = pts[(seg + 1) % M];
      var sf = L[seg] !== 0 ? Math.min(1, (target - acc) / L[seg]) : 0;
      var px = (s0[0] + (s1[0] - s0[0]) * sf) * pulse;
      var py = (s0[1] + (s1[1] - s0[1]) * sf) * pulse;
      var tx = px * cYaw;
      var ty = py * cTilt;
      var tz = px * sYaw;
      dots[k2] = {
        x: c2 + tx * size,
        y: c2 + ty * size,
        z: tz,
        r: Math.max(0.35, re * size),
        white: 0.1 + Math.max(-0.08, Math.min(0.18, -tz * 0.35)),
        a: 1
      };
    }
    return finalize(dots, [], opt(o, 'rMin', 0.25));
  }

  // ---- Presets & Desktop Wallpaper Profile Scaling ----
  var BASE_PROFILES = {
    globe: { latRings: 17, lonDensity: 44, rBase: 0.6, rDepth: 1.7, rBoost: 1.0, inkFar: 0.62, inkSpan: 0.54, rsPow: 0.6, rMin: 0.3 },
    orbits: { orbitN: 12, ghostN: 40, ghostR: 0.9, ghostA: 0.5, particles: 3, partR: 1.2, partRDepth: 1.6, rsPow: 0.6, rMin: 0.3 },
    rubik: { latRings: 15, lonDensity: 40, moveCount: 14, rBase: 0.6, rDepth: 1.7, rActive: 0.3, inkFar: 0.62, inkSpan: 0.54, rsPow: 0.6, rMin: 0.3 },
    wave: { rings: 15, lonDensity: 40, rBase: 0.6, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
    web: { nodeN: 30, thr: 0.72, signals: 5, nodeR: 1.4, nodeRDepth: 1.8, lineW: 0.8, rsPow: 0.6, rMin: 0.3 },
    braid: { strandN: 52, turns: 3.0, ghostN: 150, rBase: 1.2, rDepth: 1.8, rsPow: 0.6, rMin: 0.3 },
    ribbon: { lanes: 5, segs: 88, ghostN: 150, rBase: 1.1, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
    ring: { lanes: 5, segs: 88, ghostN: 0, faceOn: 1, rBase: 1.1, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
    morph: { rDot: 0.021, iconD: 1, rMin: 0.25 }
  };

  // Wallpaper hero presets keep fine lattice detail while preserving the tuned speeds and extra parameters
  var WALLPAPER_PRESETS = {
    orbits: { speed: 1.45, count: 1.0, size: 1.05, extra: {} },
    globe: { speed: 1.75, count: 1.0, size: 1.05, extra: { scanMul: 4.08, dimBase: 0.42 } },
    rubik: { speed: 1.55, count: 1.0, size: 1.05, extra: {} },
    wave: { speed: 3.4, count: 1.0, size: 1.02, extra: {} },
    web: { speed: 2.6, count: 1.35, size: 0.95, extra: {} },
    braid: { speed: 1.45, count: 0.95, size: 1.0, extra: {} },
    ribbon: { speed: 2.0, count: 0.55, size: 0.95, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
    ring: { speed: 2.65, count: 0.55, size: 0.98, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
    morph: { speed: 2.0, count: 1.15, size: 0.34, extra: { spread: 1.45 } }
  };

  var COUNT_PAIRS = [
    ['latRings', 'lonDensity'],
    ['rings', 'lonDensity'],
    ['lanes', 'segs']
  ];
  var COUNT_KEYS = ['orbitN', 'ghostN', 'nodeN', 'strandN', 'signals'];
  var RADIUS_KEYS = ['rBase', 'rDepth', 'rActive', 'rDot', 'ghostR', 'partR', 'partRDepth', 'nodeR', 'nodeRDepth'];

  function scaleCounts(opts, scale) {
    var out = Object.assign({}, opts);
    var done = Object.create(null);
    var rt = Math.sqrt(Math.max(0.05, scale));
    for (var i = 0; i < COUNT_PAIRS.length; i++) {
      var a = COUNT_PAIRS[i][0];
      var b = COUNT_PAIRS[i][1];
      if (out[a] !== undefined && out[b] !== undefined && !done[a] && !done[b]) {
        out[a] = Math.max(2, Math.round(out[a] * rt));
        out[b] = Math.max(2, Math.round(out[b] * rt));
        done[a] = true;
        done[b] = true;
      }
    }
    for (var j = 0; j < COUNT_KEYS.length; j++) {
      var k = COUNT_KEYS[j];
      if (out[k] !== undefined && out[k] !== 0 && !done[k]) {
        out[k] = Math.max(1, Math.round(out[k] * scale));
      }
    }
    if (out.iconD !== undefined) out.iconD = Math.max(0.08, out.iconD * scale);
    return out;
  }

  function scaleRadii(opts, scale) {
    var out = Object.assign({}, opts);
    for (var i = 0; i < RADIUS_KEYS.length; i++) {
      var k = RADIUS_KEYS[i];
      if (out[k] !== undefined) out[k] = out[k] * scale;
    }
    out.rSizeMul = (out.rSizeMul || 1) * scale;
    return out;
  }

  function resolveDesign(designId, densityMul, sizeMul) {
    var id = DESIGN_TO_MODE[designId] ? designId : 'searching';
    var mode = DESIGN_TO_MODE[id];
    var preset = WALLPAPER_PRESETS[mode];
    var opts = Object.assign({}, BASE_PROFILES[mode]);
    var totalCount = preset.count * (densityMul !== undefined ? densityMul : 1);
    var totalSize = preset.size * (sizeMul !== undefined ? sizeMul : 1);
    if (totalCount !== 1) opts = scaleCounts(opts, totalCount);
    if (totalSize !== 1) opts = scaleRadii(opts, totalSize);
    Object.assign(opts, preset.extra);
    return { id: id, mode: mode, speed: preset.speed, opts: opts };
  }

  function frame(mode, size, t, opts) {
    var time = Number.isFinite(t) ? t : 0;
    switch (mode) {
      case 'orbits': return orbits(size, time, opts);
      case 'globe': return globe(size, time, opts);
      case 'rubik': return rubik(size, time, opts);
      case 'wave': return wave(size, time, opts);
      case 'web': return web(size, time, opts);
      case 'braid': return braid(size, time, opts);
      case 'ribbon':
      case 'ring': return ribbon(size, time, opts);
      case 'morph': return morph(size, time, opts);
      default: return globe(size, time, opts);
    }
  }

  return {
    DESIGN_IDS: DESIGN_IDS,
    DESIGN_TO_MODE: DESIGN_TO_MODE,
    resolveDesign: resolveDesign,
    frame: frame,
    scaleCounts: scaleCounts,
    scaleRadii: scaleRadii
  };
}));
