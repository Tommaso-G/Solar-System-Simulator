import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ============================================================
   UTILITY: colori procedurali (nessuna texture esterna: tutto
   generato via canvas 2D, per restare autonomi e senza asset
   protetti da copyright).
   ============================================================ */

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
  let b = (num & 0x0000ff) + Math.round(2.55 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `rgb(${r}, ${g}, ${b})`;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRockyTexture(baseHex, seed = 1, craterCount = 90) {
  const w = 256, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed * 9973 + 1);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 3000; i++) {
    const x = rnd() * w, y = rnd() * h, s = rnd() * 1.6 + 0.4;
    ctx.fillStyle = rnd() > 0.5 ? shadeColor(baseHex, -18) : shadeColor(baseHex, 14);
    ctx.globalAlpha = 0.10;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < craterCount; i++) {
    const x = rnd() * w, y = rnd() * h * 0.92 + h * 0.04, r = rnd() * 6 + 1.5;
    [x - w, x, x + w].forEach((xx) => {
      const grad = ctx.createRadialGradient(xx, y, 0, xx, y, r);
      grad.addColorStop(0, shadeColor(baseHex, -32));
      grad.addColorStop(0.7, shadeColor(baseHex, -14));
      grad.addColorStop(0.85, shadeColor(baseHex, 20));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(xx, y, r, 0, Math.PI * 2); ctx.fill();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

function generateBandedTexture(baseHex, seed = 1, { bandCount = 14, storm = false } = {}) {
  const w = 256, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed * 7351 + 3);

  const shades = [-30, -14, 6, 22, -6, 14, -22];
  for (let y = 0; y < h; y++) {
    const bandT = (y / h) * bandCount;
    const shadeIdx = Math.floor(bandT) % shades.length;
    const wobble = Math.sin(y * 0.35 + seed) * 0.5 + Math.sin(y * 0.9 + seed * 2) * 0.25;
    const pct = shades[shadeIdx] + wobble * 6 + (rnd() - 0.5) * 6;
    ctx.fillStyle = shadeColor(baseHex, pct);
    ctx.fillRect(0, y, w, 1);
  }

  for (let i = 0; i < 60; i++) {
    const y = rnd() * h, amp = rnd() * 3 + 1, len = rnd() * 60 + 30, x0 = rnd() * w;
    ctx.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = rnd() * 2 + 0.5;
    ctx.beginPath();
    for (let x = 0; x <= len; x += 4) {
      const px = (x0 + x) % w;
      const py = y + Math.sin(x * 0.2) * amp;
      if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  if (storm) {
    const sx = w * 0.32, sy = h * 0.62, sw = 26, sh = 14;
    const grad = ctx.createRadialGradient(sx, sy, 1, sx, sy, sw);
    grad.addColorStop(0, shadeColor(baseHex, -40));
    grad.addColorStop(0.6, '#b5543f');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(sx, sy); ctx.scale(1, sh / sw); ctx.translate(-sx, -sy);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(sx, sy, sw, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

function generateEarthTexture(seed = 5) {
  const w = 256, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed);

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#0d2c50'); oceanGrad.addColorStop(0.5, '#1c4d7a'); oceanGrad.addColorStop(1, '#0d2c50');
  ctx.fillStyle = oceanGrad; ctx.fillRect(0, 0, w, h);

  const continentColors = ['#3f6b35', '#547a3a', '#7a6a3f', '#8a7449'];
  for (let i = 0; i < 16; i++) {
    const cx = rnd() * w, cy = rnd() * h * 0.8 + h * 0.1;
    const blobs = 5 + Math.floor(rnd() * 5);
    ctx.fillStyle = continentColors[Math.floor(rnd() * continentColors.length)];
    for (let b = 0; b < blobs; b++) {
      const bx = cx + (rnd() - 0.5) * 22, by = cy + (rnd() - 0.5) * 14, r = rnd() * 9 + 3;
      [bx - w, bx, bx + w].forEach((xx) => {
        ctx.beginPath(); ctx.arc(xx, by, r, 0, Math.PI * 2); ctx.fill();
      });
    }
  }
  ctx.fillStyle = 'rgba(235,245,250,0.9)';
  ctx.fillRect(0, 0, w, 5);
  ctx.fillRect(0, h - 5, w, 5);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * 10 + 4;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.18})`;
    [x - w, x, x + w].forEach((xx) => {
      ctx.beginPath(); ctx.ellipse(xx, y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

function generateSunTexture(seed = 2) {
  const w = 256, h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed);
  ctx.fillStyle = '#FDB813'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * 9 + 2;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const bright = rnd() > 0.5;
    grad.addColorStop(0, bright ? '#FFEFA8' : '#E8790F');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    [x - w, x, x + w].forEach((xx) => { ctx.beginPath(); ctx.arc(xx, y, r, 0, Math.PI * 2); ctx.fill(); });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

function generateRingTexture(seed = 9) {
  const w = 512, h = 8;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(seed);
  for (let x = 0; x < w; x++) {
    const t = x / w;
    let alpha = 0.75 - Math.abs(Math.sin(t * 22)) * 0.25;
    if (t > 0.42 && t < 0.47) alpha *= 0.15;
    alpha *= 0.6 + rnd() * 0.4;
    const warm = 200 + Math.floor(rnd() * 35);
    ctx.fillStyle = `rgba(${warm}, ${warm - 20}, ${warm - 60}, ${alpha})`;
    ctx.fillRect(x, 0, 1, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

function remapRingUVs(geometry, innerRadius, outerRadius) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = Math.sqrt(v3.x * v3.x + v3.y * v3.y);
    const u = (r - innerRadius) / (outerRadius - innerRadius);
    uv.setXY(i, u, 0.5);
  }
  uv.needsUpdate = true;
}

const atmoVertex = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const atmoFragment = `
uniform vec3 glowColor;
uniform float intensity;
varying vec3 vNormal;
void main() {
  float rim = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
  gl_FragColor = vec4(glowColor, clamp(rim, 0.0, 1.0) * intensity);
}`;

function makeAtmosphere(radius, colorHex, intensity) {
  const geo = new THREE.SphereGeometry(radius * 1.14, 28, 28);
  const mat = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(colorHex) }, intensity: { value: intensity } },
    vertexShader: atmoVertex, fragmentShader: atmoFragment,
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function makeGlowSprite(sizeWorld, colorHex, opacity) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(colorHex), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(sizeWorld, sizeWorld, 1);
  return sprite;
}

function auToUnits(au) {
  const a = Math.max(au, 0.02);
  return 16 * Math.pow(a, 0.3287);
}

/* ============================================================
   MOTORE TEMPORALE: epoca J2000.0 + longitudine media di ogni
   pianeta a quell'epoca (elementi orbitali approssimati, dato
   astronomico pubblico standard). Orbite modellate come cerchi
   (si trascura l'eccentricità): accurate a pochi gradi per le
   date recenti, non equivalenti a un'effemeride di precisione.
   ============================================================ */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DEG2RAD = Math.PI / 180;

const SPEED_PRESETS = [
  { label: '1×', sub: 'tempo reale', factor: 1 },
  { label: '60×', sub: '1 min/s', factor: 60 },
  { label: '3.600×', sub: '1 ora/s', factor: 3600 },
  { label: '86.400×', sub: '1 giorno/s', factor: 86400 },
  { label: '604.800×', sub: '1 sett./s', factor: 604800 },
  { label: '2.629.746×', sub: '1 mese/s', factor: 2629746 },
  { label: '31.557.600×', sub: '1 anno/s', factor: 31557600 },
  { label: '315.576.000×', sub: '10 anni/s', factor: 315576000 },
];

/* ============================================================
   DATI: pianeti, lune, caratteristiche.
   l0 = longitudine media (gradi) a J2000.0
   ============================================================ */

const PLANETS = [
  {
    id: 'mercurio', name: 'Mercurio', color: '#9c9187', texture: 'rocky', craters: 130,
    radius: 0.38, orbitRadius: 9, orbitPeriod: 88, spinPeriod: 58.6, tilt: 0.03, l0: 252.25,
    info: {
      diametro: '4.879 km', distanzaSole: '57,9 milioni di km (0,39 UA)',
      periodoOrbitale: '88 giorni terrestri', giorno: '58,6 giorni terrestri',
      temperatura: 'da -180°C a 430°C',
      curiosita: 'È il pianeta più piccolo e il più vicino al Sole: un anno su Mercurio dura meno di tre mesi terrestri.',
    },
    moons: [],
  },
  {
    id: 'venere', name: 'Venere', color: '#d9b463', texture: 'banded', bandCount: 8, atmosphere: '#f2d98c',
    radius: 0.58, orbitRadius: 12.5, orbitPeriod: 224.7, spinPeriod: -243, tilt: 3.1, l0: 181.98,
    info: {
      diametro: '12.104 km', distanzaSole: '108,2 milioni di km (0,72 UA)',
      periodoOrbitale: '224,7 giorni terrestri', giorno: '243 giorni terrestri (rotazione retrograda)',
      temperatura: '~465°C',
      curiosita: 'Ruota su se stesso in senso opposto agli altri pianeti: su Venere il Sole sorge a ovest.',
    },
    moons: [],
  },
  {
    id: 'terra', name: 'Terra', color: '#1c4d7a', texture: 'earth', atmosphere: '#5db2ff',
    radius: 0.6, orbitRadius: 16, orbitPeriod: 365.25, spinPeriod: 1, tilt: 23.4, l0: 100.46,
    info: {
      diametro: '12.742 km', distanzaSole: '149,6 milioni di km (1 UA)',
      periodoOrbitale: '365,25 giorni', giorno: '24 ore',
      temperatura: 'media 15°C',
      curiosita: "L'unico pianeta conosciuto con acqua liquida in superficie e vita.",
    },
    moons: [
      { id: 'luna', name: 'Luna', color: '#b9b5ab', texture: 'rocky', craters: 160, radius: 0.16, orbitRadius: 1.3, orbitPeriod: 27.3, tilt: 5.1,
        info: { diametro: '3.474 km', distanzaPianeta: '384.400 km dalla Terra', periodoOrbitale: '27,3 giorni', temperatura: 'da -173°C a 127°C',
          curiosita: "Mostra sempre la stessa faccia alla Terra: rotazione e rivoluzione hanno lo stesso periodo." } },
    ],
  },
  {
    id: 'marte', name: 'Marte', color: '#b3512f', texture: 'rocky', craters: 110, atmosphere: '#e8a06a',
    radius: 0.48, orbitRadius: 20, orbitPeriod: 687, spinPeriod: 1.03, tilt: 25.2, l0: 355.45,
    info: {
      diametro: '6.779 km', distanzaSole: '227,9 milioni di km (1,52 UA)',
      periodoOrbitale: '687 giorni terrestri', giorno: '24 ore e 37 minuti',
      temperatura: 'media -63°C',
      curiosita: 'Ospita Olympus Mons, il vulcano più alto del sistema solare (~22 km).',
    },
    moons: [
      { id: 'phobos', name: 'Phobos', color: '#8C7B6E', texture: 'rocky', craters: 60, radius: 0.09, orbitRadius: 0.85, orbitPeriod: 0.32, tilt: 1.1,
        info: { diametro: '22,7 km', distanzaPianeta: '9.377 km da Marte', periodoOrbitale: '7 ore e 39 minuti', temperatura: '~-40°C',
          curiosita: 'Orbita così vicino a Marte che completa un giro in meno di 8 ore.' } },
      { id: 'deimos', name: 'Deimos', color: '#9C8D80', texture: 'rocky', craters: 40, radius: 0.06, orbitRadius: 1.2, orbitPeriod: 1.26, tilt: 1.8,
        info: { diametro: '12,4 km', distanzaPianeta: '23.460 km da Marte', periodoOrbitale: '30 ore e 18 minuti', temperatura: '~-40°C',
          curiosita: 'La più piccola e la più lontana delle due lune di Marte.' } },
    ],
  },
  {
    id: 'giove', name: 'Giove', color: '#c99b6a', texture: 'banded', bandCount: 16, storm: true, atmosphere: '#e8c9a0',
    radius: 1.7, orbitRadius: 29, orbitPeriod: 4333, spinPeriod: 0.41, tilt: 3.1, l0: 34.40,
    info: {
      diametro: '139.820 km', distanzaSole: '778,5 milioni di km (5,2 UA)',
      periodoOrbitale: '~11,9 anni terrestri', giorno: '9 ore e 56 minuti',
      temperatura: 'media -110°C',
      curiosita: 'La Grande Macchia Rossa è una tempesta grande più della Terra, attiva da secoli.',
    },
    moons: [
      { id: 'io', name: 'Io', color: '#E8D24A', texture: 'rocky', craters: 50, radius: 0.16, orbitRadius: 2.4, orbitPeriod: 1.77, tilt: 0.05,
        info: { diametro: '3.643 km', distanzaPianeta: '421.700 km da Giove', periodoOrbitale: '1,77 giorni', temperatura: '~-130°C',
          curiosita: 'Il corpo più vulcanicamente attivo del sistema solare.' } },
      { id: 'europa', name: 'Europa', color: '#D9C9A8', texture: 'rocky', craters: 30, radius: 0.14, orbitRadius: 3.0, orbitPeriod: 3.55, tilt: 0.47,
        info: { diametro: '3.122 km', distanzaPianeta: '671.100 km da Giove', periodoOrbitale: '3,55 giorni', temperatura: '~-160°C',
          curiosita: 'Sotto la sua crosta di ghiaccio potrebbe nascondere un oceano d\u2019acqua liquida.' } },
      { id: 'ganimede', name: 'Ganimede', color: '#A99D8F', texture: 'rocky', craters: 70, radius: 0.2, orbitRadius: 3.7, orbitPeriod: 7.15, tilt: 0.2,
        info: { diametro: '5.268 km', distanzaPianeta: '1.070.400 km da Giove', periodoOrbitale: '7,15 giorni', temperatura: '~-160°C',
          curiosita: 'È la luna più grande del sistema solare, più grande persino di Mercurio.' } },
      { id: 'callisto', name: 'Callisto', color: '#7D7264', texture: 'rocky', craters: 100, radius: 0.19, orbitRadius: 4.4, orbitPeriod: 16.7, tilt: 0.19,
        info: { diametro: '4.821 km', distanzaPianeta: '1.882.700 km da Giove', periodoOrbitale: '16,7 giorni', temperatura: '~-160°C',
          curiosita: 'Una delle superfici più craterizzate e antiche del sistema solare.' } },
    ],
  },
  {
    id: 'saturno', name: 'Saturno', color: '#d8c48f', texture: 'banded', bandCount: 10, atmosphere: '#e8d9ad', hasRings: true,
    radius: 1.45, orbitRadius: 36, orbitPeriod: 10759, spinPeriod: 0.44, tilt: 26.7, l0: 49.95,
    info: {
      diametro: '116.460 km', distanzaSole: '1,43 miliardi di km (9,58 UA)',
      periodoOrbitale: '~29,4 anni terrestri', giorno: '10 ore e 42 minuti',
      temperatura: 'media -140°C',
      curiosita: 'I suoi anelli sono fatti quasi interamente di ghiaccio e roccia, spessi in media meno di 1 km.',
    },
    moons: [
      { id: 'titano', name: 'Titano', color: '#D9A441', texture: 'banded', bandCount: 6, radius: 0.19, orbitRadius: 3.4, orbitPeriod: 15.9, tilt: 0.3,
        info: { diametro: '5.150 km', distanzaPianeta: '1.221.900 km da Saturno', periodoOrbitale: '15,9 giorni', temperatura: '~-179°C',
          curiosita: "L'unica luna del sistema solare con un'atmosfera densa e laghi di metano liquido." } },
      { id: 'rea', name: 'Rea', color: '#C7C2B8', texture: 'rocky', craters: 50, radius: 0.13, orbitRadius: 2.7, orbitPeriod: 4.5, tilt: 0.35,
        info: { diametro: '1.527 km', distanzaPianeta: '527.100 km da Saturno', periodoOrbitale: '4,5 giorni', temperatura: '~-174°C',
          curiosita: 'La seconda luna più grande di Saturno, quasi interamente di ghiaccio.' } },
      { id: 'giapeto', name: 'Giapeto', color: '#8C8477', texture: 'rocky', craters: 45, radius: 0.13, orbitRadius: 4.6, orbitPeriod: 79.3, tilt: 15.5,
        info: { diametro: '1.469 km', distanzaPianeta: '3.560.800 km da Saturno', periodoOrbitale: '79,3 giorni', temperatura: '~-143°C',
          curiosita: 'Ha un lato scuro e uno chiaro nettamente distinti, come uno yin-yang cosmico.' } },
      { id: 'dione', name: 'Dione', color: '#B9B4AA', texture: 'rocky', craters: 40, radius: 0.1, orbitRadius: 2.3, orbitPeriod: 2.7, tilt: 0.02,
        info: { diametro: '1.123 km', distanzaPianeta: '377.400 km da Saturno', periodoOrbitale: '2,7 giorni', temperatura: '~-186°C',
          curiosita: 'Presenta scogliere di ghiaccio luminose visibili da grande distanza.' } },
    ],
  },
  {
    id: 'urano', name: 'Urano', color: '#7fd4d4', texture: 'banded', bandCount: 5, atmosphere: '#a6eaea',
    radius: 1.0, orbitRadius: 43, orbitPeriod: 30687, spinPeriod: -0.72, tilt: 97.8, l0: 313.23,
    info: {
      diametro: '50.724 km', distanzaSole: '2,87 miliardi di km (19,2 UA)',
      periodoOrbitale: '~84 anni terrestri', giorno: '17 ore e 14 minuti',
      temperatura: 'media -195°C',
      curiosita: "Ruota quasi sdraiato su un fianco: l'asse è inclinato di circa 98 gradi.",
    },
    moons: [
      { id: 'titania', name: 'Titania', color: '#A79E93', texture: 'rocky', craters: 35, radius: 0.11, orbitRadius: 2.6, orbitPeriod: 8.7, tilt: 0.1,
        info: { diametro: '1.578 km', distanzaPianeta: '436.300 km da Urano', periodoOrbitale: '8,7 giorni', temperatura: '~-203°C',
          curiosita: 'La luna più grande di Urano, con enormi canyon ghiacciati.' } },
      { id: 'oberon', name: 'Oberon', color: '#948C81', texture: 'rocky', craters: 40, radius: 0.11, orbitRadius: 3.2, orbitPeriod: 13.5, tilt: 0.1,
        info: { diametro: '1.523 km', distanzaPianeta: '583.500 km da Urano', periodoOrbitale: '13,5 giorni', temperatura: '~-203°C',
          curiosita: 'La più esterna delle grandi lune di Urano, con una superficie molto craterizzata.' } },
      { id: 'ariel', name: 'Ariel', color: '#BFC2C4', texture: 'rocky', craters: 20, radius: 0.08, orbitRadius: 1.7, orbitPeriod: 2.5, tilt: 0.3,
        info: { diametro: '1.158 km', distanzaPianeta: '191.000 km da Urano', periodoOrbitale: '2,5 giorni', temperatura: '~-213°C',
          curiosita: 'La più luminosa e riflettente tra le lune di Urano.' } },
      { id: 'umbriel', name: 'Umbriel', color: '#5F5A54', texture: 'rocky', craters: 55, radius: 0.08, orbitRadius: 2.0, orbitPeriod: 4.1, tilt: 0.36,
        info: { diametro: '1.169 km', distanzaPianeta: '266.000 km da Urano', periodoOrbitale: '4,1 giorni', temperatura: '~-213°C',
          curiosita: 'La più scura delle lune maggiori di Urano.' } },
      { id: 'miranda', name: 'Miranda', color: '#8F8A80', texture: 'rocky', craters: 25, radius: 0.05, orbitRadius: 1.3, orbitPeriod: 1.4, tilt: 4.3,
        info: { diametro: '472 km', distanzaPianeta: '129.900 km da Urano', periodoOrbitale: '1,4 giorni', temperatura: '~-213°C',
          curiosita: 'Ha una delle superfici più strane e frastagliate del sistema solare.' } },
    ],
  },
  {
    id: 'nettuno', name: 'Nettuno', color: '#3f5fd9', texture: 'banded', bandCount: 7, atmosphere: '#6f8fff',
    radius: 0.97, orbitRadius: 49, orbitPeriod: 60190, spinPeriod: 0.67, tilt: 28.3, l0: 304.88,
    info: {
      diametro: '49.244 km', distanzaSole: '4,5 miliardi di km (30,1 UA)',
      periodoOrbitale: '~165 anni terrestri', giorno: '16 ore e 6 minuti',
      temperatura: 'media -200°C',
      curiosita: 'Ha i venti più veloci del sistema solare, oltre 2.000 km/h.',
    },
    moons: [
      { id: 'tritone', name: 'Tritone', color: '#C3D4D8', texture: 'rocky', craters: 30, radius: 0.14, orbitRadius: 2.2, orbitPeriod: -5.9, tilt: 157,
        info: { diametro: '2.707 km', distanzaPianeta: '354.800 km da Nettuno', periodoOrbitale: '5,9 giorni (orbita retrograda)', temperatura: '~-235°C',
          curiosita: "Orbita in senso contrario alla rotazione di Nettuno: probabilmente è un oggetto catturato dalla fascia di Kuiper." } },
    ],
  },
];

const SUN = {
  id: 'sole', name: 'Sole', color: '#FDB813', radius: 3.2,
  info: {
    diametro: '1.392.700 km', distanzaSole: '—',
    periodoOrbitale: '—', giorno: '~27 giorni (rotazione media)',
    temperatura: '~5.500°C in superficie, ~15 milioni °C nel nucleo',
    curiosita: 'Contiene il 99,8% della massa dell\u2019intero sistema solare.',
  },
};

const PROBES = [
  { id: 'voyager1', name: 'Voyager 1', color: '#d7dde6', lonDeg: 5, incDeg: 35, fallbackAU: 163, jsonKey: 'voyager1_au',
    info: { tipo: 'Sonda interplanetaria', lanciata: '1977', velocita: '~17 km/s rispetto al Sole',
      curiosita: "È l'oggetto costruito dall'uomo più lontano dalla Terra: ha lasciato l'eliosfera nel 2012 ed è ora nello spazio interstellare." } },
  { id: 'voyager2', name: 'Voyager 2', color: '#d7dde6', lonDeg: 210, incDeg: -48, fallbackAU: 136, jsonKey: 'voyager2_au',
    info: { tipo: 'Sonda interplanetaria', lanciata: '1977', velocita: '~15,4 km/s rispetto al Sole',
      curiosita: 'Lanciata poche settimane prima di Voyager 1, è l\u2019unica sonda ad aver sorvolato tutti e quattro i giganti gassosi.' } },
  { id: 'new_horizons', name: 'New Horizons', color: '#c9b98a', lonDeg: 150, incDeg: 15, fallbackAU: 60, jsonKey: 'new_horizons_au',
    info: { tipo: 'Sonda interplanetaria', lanciata: '2006', velocita: '~14,5 km/s rispetto al Sole',
      curiosita: 'Nel 2015 ha effettuato il primo sorvolo ravvicinato di Plutone della storia.' } },
  { id: 'parker', name: 'Parker Solar Probe', color: '#f2c86b', lonDeg: 80, incDeg: 3, fallbackAU: 0.4, jsonKey: 'parker_solar_probe_au',
    info: { tipo: 'Sonda interplanetaria', lanciata: '2018', velocita: 'record: ~190 km/s al perielio',
      curiosita: 'Detiene il record di velocità e di vicinanza al Sole mai raggiunti da un oggetto costruito dall\u2019uomo.' } },
];

const ISS_DATA = {
  id: 'iss', name: 'ISS', color: '#dfe6ee', fallbackAltitudeKm: 408,
  info: { tipo: 'Stazione spaziale (orbita terrestre bassa)', lanciata: '1998 (primo modulo, Zarya)',
    periodoOrbitale: '~92,7 minuti (reale)', inclinazione: '51,6°',
    curiosita: 'Orbita la Terra circa ogni 92 minuti: chi la abita vede un\u2019alba o un tramonto ogni 45 minuti circa.' },
};

const SPACECRAFT_PROMPT = `Cerca dati aggiornati sul web e rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo, senza blocchi di codice, in questo formato esatto:
{"voyager1_au": <numero>, "voyager2_au": <numero>, "new_horizons_au": <numero>, "parker_solar_probe_au": <numero>, "iss_altitude_km": <numero>, "source_date": "<data approssimativa dei dati>"}
Usa la distanza eliocentrica in Unità Astronomiche (UA) per le quattro sonde, e l'altitudine media orbitale in km per la Stazione Spaziale Internazionale. Se non trovi un dato preciso, fornisci la stima più recente nota.`;

function buildInfoRows(body) {
  if (!body) return [];
  const info = body.info || {};
  const rows = [];
  if (body.kind === 'probe') {
    rows.push(['Tipo', info.tipo]);
    rows.push(['Lanciata', info.lanciata]);
    rows.push(['Dal Sole', info.distanzaSoleLive || 'in aggiornamento…']);
    rows.push(['Velocità', info.velocita]);
  } else if (body.kind === 'satellite') {
    rows.push(['Tipo', info.tipo]);
    rows.push(['Lanciata', info.lanciata]);
    rows.push(['Altitudine', info.altitudineLive || 'in aggiornamento…']);
    rows.push(['Periodo', info.periodoOrbitale]);
    rows.push(['Inclinazione', info.inclinazione]);
  } else {
    rows.push(['Diametro', info.diametro]);
    if (info.distanzaSole && info.distanzaSole !== '—') rows.push(['Dal Sole', info.distanzaSole]);
    if (info.distanzaPianeta) rows.push(['Distanza', info.distanzaPianeta]);
    if (info.periodoOrbitale && info.periodoOrbitale !== '—') rows.push(['Anno', info.periodoOrbitale]);
    if (info.giorno) rows.push(['Giorno', info.giorno]);
    rows.push(['Temp.', info.temperatura]);
  }
  return rows.filter(([, v]) => v);
}

export default function SolarSystemExplorer() {
  const mountRef = useRef(null);
  const overlayState = useRef({ pickables: [], labelTargets: [] });
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(true);
  const [direction, setDirection] = useState(1);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [labels, setLabels] = useState([]);
  const [reticle, setReticle] = useState(null);
  const [simTimeDisplay, setSimTimeDisplay] = useState(() => Date.now());
  const [spacecraftStatus, setSpacecraftStatus] = useState('loading');
  const [lastUpdated, setLastUpdated] = useState(null);

  const playingRef = useRef(playing);
  const directionRef = useRef(direction);
  const speedIndexRef = useRef(speedIndex);
  const showLabelsRef = useRef(showLabels);
  const selectedIdRef = useRef(null);
  const selectedRef = useRef(null);
  const simTimeRef = useRef(Date.now());

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { speedIndexRef.current = speedIndex; }, [speedIndex]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => {
    const orbitGroup = overlayState.current.orbitGroup;
    if (orbitGroup) orbitGroup.visible = showOrbits;
  }, [showOrbits]);
  useEffect(() => { selectedIdRef.current = selected ? selected.id : null; selectedRef.current = selected; }, [selected]);

  const resetToNow = () => {
    simTimeRef.current = Date.now();
    setSimTimeDisplay(simTimeRef.current);
    setDirection(1);
    setSpeedIndex(0);
    setPlaying(true);
  };

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#03050a');
    scene.fog = new THREE.FogExp2('#03050a', 0.0016);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#3a4a6b', '#050608', 0.35));
    const sunLight = new THREE.PointLight('#fff2d6', 7.5, 0, 1);
    scene.add(sunLight);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 3200;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starRnd = mulberry32(42);
    for (let i = 0; i < starCount; i++) {
      const r = 300 + starRnd() * 700;
      const theta = starRnd() * Math.PI * 2;
      const phi = Math.acos(2 * starRnd() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const temp = starRnd();
      const c = new THREE.Color();
      if (temp < 0.15) c.setRGB(0.65, 0.78, 1.0);
      else if (temp > 0.9) c.setRGB(1.0, 0.85, 0.6);
      else c.setRGB(0.92, 0.94, 0.98);
      starCol[i * 3] = c.r; starCol[i * 3 + 1] = c.g; starCol[i * 3 + 2] = c.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 });
    scene.add(new THREE.Points(starGeo, starMat));

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const makeOrbitLine = (radius, color, opacity, parent) => {
      const pts = [];
      const segs = 160;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const line = new THREE.LineLoop(geo, mat);
      (parent || orbitGroup).add(line);
      return line;
    };

    const sunGeo = new THREE.SphereGeometry(SUN.radius, 40, 40);
    const sunMat = new THREE.MeshBasicMaterial({ map: generateSunTexture(2) });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMesh.add(makeGlowSprite(SUN.radius * 3.4, '#FFD98A', 0.55));
    sunMesh.add(makeGlowSprite(SUN.radius * 6.2, '#FF8A3D', 0.22));
    const pickables = [{ mesh: sunMesh, body: SUN, getWorldPos: () => sunMesh.position.clone() }];

    const planetObjects = [];
    PLANETS.forEach((planet, pIdx) => {
      makeOrbitLine(planet.orbitRadius, '#3fe8d0', 0.22);

      const orbitPivot = new THREE.Group();
      scene.add(orbitPivot);

      const planetGroup = new THREE.Group();
      planetGroup.position.x = planet.orbitRadius;
      orbitPivot.add(planetGroup);

      const seed = pIdx + 10;
      let map;
      if (planet.texture === 'earth') map = generateEarthTexture(seed);
      else if (planet.texture === 'banded') map = generateBandedTexture(planet.color, seed, { bandCount: planet.bandCount, storm: planet.storm });
      else map = generateRockyTexture(planet.color, seed, planet.craters || 90);

      const geo = new THREE.SphereGeometry(planet.radius, 40, 40);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: planet.texture === 'banded' ? 0.65 : 0.92, metalness: 0.04, emissive: '#050505', emissiveIntensity: 0.15 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = (planet.tilt || 0) * (Math.PI / 180);
      planetGroup.add(mesh);

      if (planet.atmosphere) mesh.add(makeAtmosphere(planet.radius, planet.atmosphere, 0.9));

      if (planet.hasRings) {
        const ringGeo = new THREE.RingGeometry(planet.radius * 1.4, planet.radius * 2.35, 96);
        remapRingUVs(ringGeo, planet.radius * 1.4, planet.radius * 2.35);
        const ringMat = new THREE.MeshBasicMaterial({ map: generateRingTexture(seed), transparent: true, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 - 0.45;
        planetGroup.add(ring);
      }

      pickables.push({ mesh, body: { ...planet, kind: 'planet' }, getWorldPos: () => mesh.getWorldPosition(new THREE.Vector3()) });

      const moonObjects = [];
      planet.moons.forEach((moon, mIdx) => {
        makeOrbitLine(moon.orbitRadius, '#4a6a72', 0.28, planetGroup);
        const moonPivot = new THREE.Group();
        planetGroup.add(moonPivot);

        const mGroup = new THREE.Group();
        mGroup.position.x = moon.orbitRadius;
        moonPivot.add(mGroup);

        const mSeed = pIdx * 10 + mIdx + 100;
        const mMap = moon.texture === 'banded'
          ? generateBandedTexture(moon.color, mSeed, { bandCount: moon.bandCount || 6 })
          : generateRockyTexture(moon.color, mSeed, moon.craters || 40);
        const mGeo = new THREE.SphereGeometry(moon.radius, 22, 22);
        const mMat = new THREE.MeshStandardMaterial({ map: mMap, roughness: 0.88, metalness: 0.03 });
        const mMesh = new THREE.Mesh(mGeo, mMat);
        mGroup.add(mMesh);
        if (moon.id === 'titano') mMesh.add(makeAtmosphere(moon.radius, '#e8b464', 0.7));

        pickables.push({ mesh: mMesh, body: { ...moon, kind: 'moon', parentName: planet.name }, getWorldPos: () => mMesh.getWorldPosition(new THREE.Vector3()) });
        moonObjects.push({ pivot: moonPivot, phase0: mulberry32(pIdx * 10 + mIdx + 1)() * Math.PI * 2, period: moon.orbitPeriod });
      });

      planetObjects.push({ pivot: orbitPivot, group: planetGroup, spinMesh: mesh, moonObjects, body: planet });
    });

    const probeEntries = {};
    PROBES.forEach((probe) => {
      const group = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(0.22, 0.1, 0.1);
      const bodyMat = new THREE.MeshStandardMaterial({ color: probe.color, metalness: 0.65, roughness: 0.32 });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(bodyMesh);
      const panelGeo = new THREE.BoxGeometry(0.3, 0.015, 0.12);
      const panelMat = new THREE.MeshStandardMaterial({ color: '#16264a', metalness: 0.2, roughness: 0.5 });
      const panelL = new THREE.Mesh(panelGeo, panelMat); panelL.position.x = -0.26; group.add(panelL);
      const panelR = new THREE.Mesh(panelGeo, panelMat); panelR.position.x = 0.26; group.add(panelR);
      const beaconGeo = new THREE.SphereGeometry(0.035, 10, 10);
      const beaconMat = new THREE.MeshStandardMaterial({ color: '#5df2e0', emissive: '#5df2e0', emissiveIntensity: 0.6 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 0.07;
      group.add(beacon);
      scene.add(group);

      const initialUnits = auToUnits(probe.fallbackAU);
      const lonRad = probe.lonDeg * Math.PI / 180, incRad = probe.incDeg * Math.PI / 180;
      const initialPos = new THREE.Vector3(
        initialUnits * Math.cos(incRad) * Math.cos(lonRad),
        initialUnits * Math.sin(incRad),
        initialUnits * Math.cos(incRad) * Math.sin(lonRad)
      );
      group.position.copy(initialPos);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), initialPos.clone()]);
      const lineMat = new THREE.LineBasicMaterial({ color: probe.color, transparent: true, opacity: 0.28 });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);

      pickables.push({
        mesh: bodyMesh, body: { ...probe, radius: 0.3, kind: 'probe' },
        getWorldPos: () => group.getWorldPosition(new THREE.Vector3()),
      });

      probeEntries[probe.id] = { group, line, beacon, targetPos: initialPos.clone(), lonRad, incRad };
    });
    overlayState.current.probeEntries = probeEntries;

    const earthEntry = planetObjects.find((p) => p.body.id === 'terra');
    let issState = null;
    if (earthEntry) {
      const issPivot = new THREE.Group();
      issPivot.rotation.z = (51.6 * Math.PI) / 180;
      earthEntry.group.add(issPivot);

      const issOrbitRadius = earthEntry.body.radius * 1.6;
      const issMount = new THREE.Group();
      issMount.position.x = issOrbitRadius;
      issPivot.add(issMount);

      const issBodyGeo = new THREE.BoxGeometry(0.05, 0.02, 0.02);
      const issBodyMat = new THREE.MeshStandardMaterial({ color: ISS_DATA.color, metalness: 0.6, roughness: 0.35, emissive: '#223344', emissiveIntensity: 0.3 });
      const issBody = new THREE.Mesh(issBodyGeo, issBodyMat);
      issMount.add(issBody);
      const issPanelGeo = new THREE.BoxGeometry(0.09, 0.004, 0.03);
      const issPanelMat = new THREE.MeshStandardMaterial({ color: '#16264a', metalness: 0.2, roughness: 0.5 });
      const issPanelA = new THREE.Mesh(issPanelGeo, issPanelMat); issPanelA.position.x = -0.08; issMount.add(issPanelA);
      const issPanelB = new THREE.Mesh(issPanelGeo, issPanelMat); issPanelB.position.x = 0.08; issMount.add(issPanelB);

      pickables.push({
        mesh: issBody, body: { ...ISS_DATA, radius: 0.3, kind: 'satellite', parentName: 'Terra' },
        getWorldPos: () => issBody.getWorldPosition(new THREE.Vector3()),
      });
      issState = { pivot: issPivot, phase0: 0, period: 92.68 / 1440 };
    }
    overlayState.current.issState = issState;

    overlayState.current.orbitGroup = orbitGroup;
    overlayState.current.pickables = pickables;
    orbitGroup.visible = showOrbits;

    const camState = {
      theta: 0.9, phi: 1.15, radius: 78, target: new THREE.Vector3(0, 0, 0),
      focusId: null, transitioning: false, targetRadius: 78,
    };
    overlayState.current.camState = camState;

    let isDragging = false;
    let lastX = 0, lastY = 0, downX = 0, downY = 0;
    let pinchDist = null;

    const updateCameraPosition = () => {
      const { theta, phi, radius, target } = camState;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(target);
    };
    updateCameraPosition();

    const onPointerDown = (e) => { isDragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY; };
    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      camState.theta -= dx * 0.006;
      camState.phi = Math.min(Math.max(camState.phi - dy * 0.006, 0.15), Math.PI - 0.15);
      lastX = e.clientX; lastY = e.clientY;
    };
    const onPointerUp = (e) => {
      isDragging = false;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 5) handlePick(e.clientX, e.clientY);
    };
    const onWheel = (e) => {
      e.preventDefault();
      camState.transitioning = false;
      camState.radius = Math.min(Math.max(camState.radius * (1 + e.deltaY * 0.0012), 3), 340);
    };
    const onTouchStart = (e) => {
      if (e.touches.length === 2) pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchDist != null) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        camState.transitioning = false;
        camState.radius = Math.min(Math.max(camState.radius * (1 + (pinchDist - d) * 0.004), 3), 340);
        pinchDist = d;
      }
    };
    const onTouchEnd = () => { pinchDist = null; };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const handlePick = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(pickables.map((p) => p.mesh));
      if (hits.length > 0) {
        const found = pickables.find((p) => p.mesh === hits[0].object);
        if (found) focusOnBody(found.body);
      }
    };

    const focusOnBody = (body) => {
      setSelected(body);
      camState.focusId = body.id;
      camState.transitioning = true;
      camState.targetRadius = Math.max((body.radius || 1) * 9, 3.5);
    };
    overlayState.current.focusOnBody = focusOnBody;
    overlayState.current.resetCamera = () => {
      setSelected(null);
      camState.focusId = null;
      camState.transitioning = true;
      camState.targetRadius = 78;
    };

    const dom = renderer.domElement;
    dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });
    dom.addEventListener('touchend', onTouchEnd);

    const handleResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    let cancelled = false;
    async function fetchSpacecraftData() {
      setSpacecraftStatus('loading');
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{ role: 'user', content: SPACECRAFT_PROMPT }],
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          }),
        });
        const data = await response.json();
        const textBlocks = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text);
        const raw = textBlocks.join('\n').replace(/```json|```/g, '').trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        if (cancelled) return;

        PROBES.forEach((probe) => {
          const val = Number(parsed[probe.jsonKey]);
          const au = Number.isFinite(val) && val > 0 ? val : probe.fallbackAU;
          const entry = probeEntries[probe.id];
          if (!entry) return;
          const units = auToUnits(au);
          entry.targetPos = new THREE.Vector3(
            units * Math.cos(entry.incRad) * Math.cos(entry.lonRad),
            units * Math.sin(entry.incRad),
            units * Math.cos(entry.incRad) * Math.sin(entry.lonRad)
          );
          probe.info.distanzaSoleLive = `${au.toFixed(1)} UA (~${Math.round(au * 149.6)} milioni di km)`;
        });

        const altVal = Number(parsed.iss_altitude_km);
        const alt = Number.isFinite(altVal) && altVal > 0 ? altVal : ISS_DATA.fallbackAltitudeKm;
        ISS_DATA.info.altitudineLive = `~${Math.round(alt)} km`;

        setSpacecraftStatus('ok');
        setLastUpdated(new Date());
        if (selectedRef.current && (selectedRef.current.kind === 'probe' || selectedRef.current.kind === 'satellite')) {
          setSelected({ ...selectedRef.current });
        }
      } catch (err) {
        if (!cancelled) setSpacecraftStatus('error');
      }
    }
    fetchSpacecraftData();
    const spacecraftInterval = setInterval(fetchSpacecraftData, 5 * 60 * 1000);

    let rafId;
    let last = performance.now();
    let labelsWereShown = true;
    const tmpVec = new THREE.Vector3();

    function labelParentSelected(p) {
      const selId = selectedIdRef.current;
      if (!selId) return false;
      const parentPlanet = PLANETS.find((pl) => pl.name === p.body.parentName);
      return parentPlanet && parentPlanet.id === selId;
    }

    const animate = (now) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (playingRef.current) {
        const effFactor = directionRef.current * SPEED_PRESETS[speedIndexRef.current].factor;
        simTimeRef.current += dt * 1000 * effFactor;
      }
      const daysSinceEpoch = (simTimeRef.current - J2000_MS) / 86400000;
      setSimTimeDisplay(simTimeRef.current);

      planetObjects.forEach((p) => {
        const angle = (p.body.l0 + 360 * daysSinceEpoch / p.body.orbitPeriod) * DEG2RAD;
        p.pivot.rotation.y = angle;
        if (p.body.spinPeriod) p.spinMesh.rotation.y = daysSinceEpoch * (2 * Math.PI / p.body.spinPeriod);
        p.moonObjects.forEach((m) => {
          m.pivot.rotation.y = m.phase0 + (2 * Math.PI * daysSinceEpoch / m.period);
        });
      });
      if (issState) issState.pivot.rotation.y = issState.phase0 + (2 * Math.PI * daysSinceEpoch / issState.period);

      Object.values(probeEntries).forEach((entry) => {
        entry.group.position.lerp(entry.targetPos, 0.01);
        const posAttr = entry.line.geometry.attributes.position;
        posAttr.setXYZ(1, entry.group.position.x, entry.group.position.y, entry.group.position.z);
        posAttr.needsUpdate = true;
        entry.beacon.material.emissiveIntensity = 0.3 + 0.7 * Math.abs(Math.sin(now * 0.003));
      });

      if (camState.focusId) {
        const target = pickables.find((p) => p.body.id === camState.focusId);
        if (target) camState.target.lerp(target.getWorldPos(), camState.transitioning ? 0.06 : 0.15);
      } else {
        camState.target.lerp(tmpVec.set(0, 0, 0), 0.06);
      }
      if (camState.transitioning) {
        camState.radius += (camState.targetRadius - camState.radius) * 0.06;
        if (Math.abs(camState.radius - camState.targetRadius) < 0.05) camState.transitioning = false;
      }
      updateCameraPosition();

      if (showLabelsRef.current) {
        const camPos = camera.position;
        const items = [];
        let reticlePos = null;
        pickables.forEach((p) => {
          const hideByDefault = p.body.kind === 'moon' || p.body.kind === 'satellite';
          const wp = p.getWorldPos();
          const proj = wp.clone().project(camera);
          const visible = proj.z <= 1;
          if (p.body.id === selectedIdRef.current && visible) {
            reticlePos = { x: (proj.x * 0.5 + 0.5) * 100, y: (1 - (proj.y * 0.5 + 0.5)) * 100 };
          }
          if (hideByDefault && !labelParentSelected(p)) return;
          if (!visible) return;
          const dist = camPos.distanceTo(wp);
          items.push({ id: p.body.id, name: p.body.name, x: (proj.x * 0.5 + 0.5) * 100, y: (1 - (proj.y * 0.5 + 0.5)) * 100, dist });
        });
        setLabels(items);
        setReticle(reticlePos);
        labelsWereShown = true;
      } else if (labelsWereShown) {
        setLabels([]); setReticle(null); labelsWereShown = false;
      }

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      clearInterval(spacecraftInterval);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      if (mount.contains(dom)) mount.removeChild(dom);
    };
  }, []);

  const infoRows = buildInfoRows(selected);
  const isDynamic = selected && (selected.kind === 'probe' || selected.kind === 'satellite');
  const simDate = new Date(simTimeDisplay);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', minHeight: 560, background: '#03050a', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 160px rgba(0,0,0,0.75)' }} />

      {[
        { top: 14, left: 14, borderTop: '2px solid', borderLeft: '2px solid' },
        { top: 14, right: 14, borderTop: '2px solid', borderRight: '2px solid' },
        { bottom: 14, left: 14, borderBottom: '2px solid', borderLeft: '2px solid' },
        { bottom: 14, right: 14, borderBottom: '2px solid', borderRight: '2px solid' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 26, height: 26, borderColor: 'rgba(63,232,208,0.55)', pointerEvents: 'none', ...s }} />
      ))}

      {labels.map((l) => (
        <div key={l.id} style={{
          position: 'absolute', left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -150%)',
          color: '#cfeeeb', fontSize: Math.max(10, Math.min(14, 850 / l.dist)), fontWeight: 500,
          textShadow: '0 1px 5px rgba(0,0,0,0.95)', pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '0.02em',
        }}>{l.name}</div>
      ))}

      {reticle && (
        <div style={{ position: 'absolute', left: `${reticle.x}%`, top: `${reticle.y}%`, transform: 'translate(-50%, -50%)', width: 34, height: 34, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(63,232,208,0.85)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: -5, left: '50%', width: 1, height: 6, background: 'rgba(63,232,208,0.85)' }} />
          <div style={{ position: 'absolute', bottom: -5, left: '50%', width: 1, height: 6, background: 'rgba(63,232,208,0.85)' }} />
          <div style={{ position: 'absolute', left: -5, top: '50%', height: 1, width: 6, background: 'rgba(63,232,208,0.85)' }} />
          <div style={{ position: 'absolute', right: -5, top: '50%', height: 1, width: 6, background: 'rgba(63,232,208,0.85)' }} />
        </div>
      )}

      <div style={{ position: 'absolute', top: 26, left: 30, color: '#e4f7f5', pointerEvents: 'none' }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: '0.03em' }}>Sistema Solare</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, marginTop: 7, color: '#dff5f2' }}>
          {simDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })} · {simDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div style={{ fontSize: 11, color: '#5c9a92', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: playing ? '#3fe8d0' : '#5c6a72', display: 'inline-block' }} />
          {playing ? (direction === 1 ? 'avanti' : 'indietro') : 'in pausa'} · {SPEED_PRESETS[speedIndex].sub}
        </div>
        <div style={{ fontSize: 10.5, color: '#4a7a74', marginTop: 3 }}>
          {spacecraftStatus === 'loading' && 'sonde: ricerca dati in corso…'}
          {spacecraftStatus === 'ok' && lastUpdated && `sonde: aggiornate alle ${lastUpdated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
          {spacecraftStatus === 'error' && 'sonde: dati non disponibili, uso valori approssimati'}
        </div>
      </div>

      {showIntro && (
        <div style={{
          position: 'absolute', top: 26, right: 30, maxWidth: 270, background: 'rgba(6,10,18,0.85)',
          border: '1px solid rgba(63,232,208,0.35)', clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          padding: '14px 16px', color: '#bcd8d4', fontSize: 12, lineHeight: 1.6,
        }}>
          Il sistema parte dalla data e ora attuali, a velocità reale. Usa i comandi in basso per accelerare il tempo (futuro) o invertirlo (passato); "adesso" riporta all'istante presente. Le posizioni dei pianeti seguono un modello orbitale circolare semplificato, non un'effemeride di precisione.
          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <button onClick={() => setShowIntro(false)} style={ctrlBtnStyle(false)}>Ho capito</button>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: 30, right: 30, bottom: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {selected && (
          <div style={{
            alignSelf: 'flex-start', width: 300, maxWidth: '100%',
            background: 'rgba(5,8,15,0.9)', border: `1px solid ${selected.color || '#3fe8d0'}66`,
            clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)',
            padding: '16px 18px', color: '#eef6f5', boxShadow: '0 10px 32px rgba(0,0,0,0.55)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: selected.color || '#888', display: 'inline-block', boxShadow: `0 0 8px ${selected.color || '#888'}` }} />
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>{selected.name}</span>
              </div>
              <button onClick={() => overlayState.current.resetCamera && overlayState.current.resetCamera()} style={{
                background: 'transparent', border: 'none', color: '#5c9a92', fontSize: 17, cursor: 'pointer', lineHeight: 1, fontFamily: 'inherit',
              }} aria-label="Chiudi">×</button>
            </div>
            {selected.parentName && (
              <div style={{ fontSize: 11, color: '#5c9a92', marginTop: 3 }}>
                {selected.kind === 'satellite' ? 'in orbita attorno a' : 'satellite di'} {selected.parentName}
              </div>
            )}
            <div style={{ marginTop: 13, display: 'grid', gridTemplateColumns: '104px 1fr', rowGap: 6, fontSize: 12 }}>
              {infoRows.map(([label, value]) => (
                <React.Fragment key={label}>
                  <span style={{ color: '#5c9a92' }}>{label}</span><span>{value}</span>
                </React.Fragment>
              ))}
            </div>
            {isDynamic && (
              <div style={{ marginTop: 8, fontSize: 10.5, color: '#4a7a74' }}>
                {spacecraftStatus === 'ok' && lastUpdated ? `dato aggiornato alle ${lastUpdated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : 'aggiornamento in corso…'}
              </div>
            )}
            <div style={{ marginTop: 11, fontSize: 12, color: '#a9c9c5', lineHeight: 1.55, borderTop: '1px solid rgba(63,232,208,0.2)', paddingTop: 10 }}>
              {selected.info.curiosita}
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
          background: 'rgba(5,8,15,0.85)', border: '1px solid rgba(63,232,208,0.3)',
          clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)', padding: '9px 18px',
        }}>
          <button onClick={() => setPlaying((p) => !p)} style={ctrlBtnStyle(playing)}>{playing ? '❚❚' : '►'}</button>
          <button onClick={() => setDirection((d) => -d)} style={ctrlBtnStyle(false)}>{direction === 1 ? '► avanti' : '◄ indietro'}</button>
          <div style={{ width: 1, height: 18, background: 'rgba(63,232,208,0.3)' }} />
          {SPEED_PRESETS.map((sp, i) => (
            <button key={sp.label} onClick={() => setSpeedIndex(i)} style={ctrlBtnStyle(speedIndex === i)}>{sp.sub}</button>
          ))}
          <div style={{ width: 1, height: 18, background: 'rgba(63,232,208,0.3)' }} />
          <button onClick={resetToNow} style={ctrlBtnStyle(false)}>adesso</button>
        </div>

        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
          background: 'rgba(5,8,15,0.85)', border: '1px solid rgba(63,232,208,0.3)',
          clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)', padding: '11px 18px',
        }}>
          <button onClick={() => setShowOrbits((v) => !v)} style={ctrlBtnStyle(showOrbits)}>Orbite</button>
          <button onClick={() => setShowLabels((v) => !v)} style={ctrlBtnStyle(showLabels)}>Etichette</button>
          <button onClick={() => overlayState.current.resetCamera && overlayState.current.resetCamera()} style={ctrlBtnStyle(false)}>Vista d'insieme</button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '100%' }}>
            {PLANETS.map((p) => (
              <button key={p.id} onClick={() => overlayState.current.focusOnBody && overlayState.current.focusOnBody({ ...p, kind: 'planet' })}
                title={p.name}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: selected && selected.id === p.id ? '2px solid #eef6f5' : '1px solid rgba(63,232,208,0.35)',
                  background: p.color, cursor: 'pointer', padding: 0,
                  boxShadow: selected && selected.id === p.id ? `0 0 8px ${p.color}` : 'none',
                }} />
            ))}
            <div style={{ width: 1, height: 18, background: 'rgba(63,232,208,0.3)', margin: '0 2px' }} />
            {[...PROBES, ISS_DATA].map((p) => (
              <button key={p.id} onClick={() => overlayState.current.focusOnBody && overlayState.current.focusOnBody(p.id === 'iss' ? { ...p, radius: 0.3, kind: 'satellite', parentName: 'Terra' } : { ...p, radius: 0.3, kind: 'probe' })}
                title={p.name}
                style={{
                  width: 18, height: 18, borderRadius: 3,
                  border: selected && selected.id === p.id ? '2px solid #eef6f5' : '1px solid rgba(63,232,208,0.35)',
                  background: p.color, cursor: 'pointer', padding: 0,
                  boxShadow: selected && selected.id === p.id ? `0 0 8px ${p.color}` : 'none',
                }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ctrlBtnStyle(active) {
  return {
    background: active ? 'rgba(63,232,208,0.16)' : 'transparent',
    border: `1px solid ${active ? 'rgba(63,232,208,0.85)' : 'rgba(63,232,208,0.4)'}`,
    color: '#dff5f2',
    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
    padding: '6px 11px',
    fontSize: 11.5,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: 'nowrap',
  };
}
