import * as THREE from 'three';
import { createRng } from '../core/rng';

export interface AAATextureSuite {
  mudAlbedo: THREE.CanvasTexture;
  mudRoughness: THREE.CanvasTexture;
  mudNormal: THREE.DataTexture;
  woodAlbedo: THREE.CanvasTexture;
  woodRoughness: THREE.CanvasTexture;
  woodNormal: THREE.DataTexture;
  thatchAlbedo: THREE.CanvasTexture;
  thatchNormal: THREE.DataTexture;
  stoneAlbedo: THREE.CanvasTexture;
  stoneNormal: THREE.DataTexture;
  birchAlbedo: THREE.CanvasTexture;
  hairAlbedo: THREE.CanvasTexture;
  chainmailAlbedo: THREE.CanvasTexture;
  chainmailRoughness: THREE.CanvasTexture;
  chainmailNormal: THREE.DataTexture;
  waterNormal: THREE.DataTexture;
  fireFlameSprite: THREE.CanvasTexture;
  svarogStreamTex: THREE.CanvasTexture;
  rayAlpha: THREE.CanvasTexture;
  mistSprite: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose(): void;
}

function heightToNormalDataTexture(
  heights: Float32Array,
  size: number,
  strength: number,
  maxAniso: number,
  repeat = 1,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * strength;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const nx = -dx * invLen;
      const ny = -dy * invLen;
      const nz = invLen;
      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = maxAniso;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function configureCanvasTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAniso: number,
  repeatX = 1,
  repeatY = repeatX,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createAAATextureSuite(maxAnisotropy: number, seed = 74129): AAATextureSuite {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));
  const rng = createRng(seed ^ 0x9e3779b9);

  // =========================================================================
  // 1. Velen Wet Peat, Mud Ruts, Moss & Glossy Rain Pockets (512x512)
  // =========================================================================
  const S = 512;
  const mudCanvas = document.createElement('canvas');
  mudCanvas.width = S;
  mudCanvas.height = S;
  const mctx = mudCanvas.getContext('2d')!;
  mctx.fillStyle = '#202621';
  mctx.fillRect(0, 0, S, S);

  const mudRoughCanvas = document.createElement('canvas');
  mudRoughCanvas.width = S;
  mudRoughCanvas.height = S;
  const mrctx = mudRoughCanvas.getContext('2d')!;
  mrctx.fillStyle = '#d9d9d9';
  mrctx.fillRect(0, 0, S, S);

  const mudHeights = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x / S) * Math.PI * 2;
      const ny = (y / S) * Math.PI * 2;
      mudHeights[y * S + x] =
        Math.sin(nx * 4 + Math.cos(ny * 3)) * 0.42 +
        Math.cos(ny * 7 - Math.sin(nx * 5)) * 0.3 +
        Math.sin(nx * 14 + ny * 11) * 0.14;
    }
  }

  for (let i = 0; i < 3600; i++) {
    const x = rng.range(0, S);
    const y = rng.range(0, S);
    const rad = rng.range(1.5, 9);
    const roll = rng.next();
    if (roll < 0.34) {
      mctx.fillStyle = 'rgba(20, 25, 22, 0.38)';
      mrctx.fillStyle = 'rgba(68, 68, 68, 0.28)';
    } else if (roll < 0.64) {
      mctx.fillStyle = 'rgba(50, 62, 42, 0.26)';
      mrctx.fillStyle = 'rgba(230, 230, 230, 0.32)';
    } else if (roll < 0.88) {
      mctx.fillStyle = 'rgba(60, 48, 34, 0.3)';
      mrctx.fillStyle = 'rgba(185, 185, 185, 0.25)';
    } else {
      mctx.fillStyle = 'rgba(82, 70, 50, 0.24)';
      mrctx.fillStyle = 'rgba(240, 240, 240, 0.3)';
    }
    mctx.beginPath();
    mctx.arc(x, y, rad, 0, Math.PI * 2);
    mctx.fill();
    mrctx.beginPath();
    mrctx.arc(x, y, rad, 0, Math.PI * 2);
    mrctx.fill();

    const ix = Math.floor(x) % S;
    const iy = Math.floor(y) % S;
    mudHeights[iy * S + ix] += (roll - 0.5) * 0.6;
  }

  // Deep glossy muddy ruts & rain sheen pockets (feathered smoothly)
  for (let i = 0; i < 28; i++) {
    const x = rng.range(36, S - 36);
    const y = rng.range(36, S - 36);
    const rad = rng.range(18, 48);
    const gA = mctx.createRadialGradient(x, y, rad * 0.1, x, y, rad);
    gA.addColorStop(0, 'rgba(10, 14, 13, 0.72)');
    gA.addColorStop(0.65, 'rgba(18, 23, 20, 0.35)');
    gA.addColorStop(1, 'rgba(18, 23, 20, 0)');
    mctx.fillStyle = gA;
    mctx.beginPath();
    mctx.arc(x, y, rad, 0, Math.PI * 2);
    mctx.fill();

    const gR = mrctx.createRadialGradient(x, y, rad * 0.12, x, y, rad);
    gR.addColorStop(0, 'rgba(26, 26, 26, 0.92)'); // ~0.10 wet mirror sheen
    gR.addColorStop(0.55, 'rgba(80, 80, 80, 0.55)');
    gR.addColorStop(1, 'rgba(190, 190, 190, 0)');
    mrctx.fillStyle = gR;
    mrctx.beginPath();
    mrctx.arc(x, y, rad, 0, Math.PI * 2);
    mrctx.fill();
  }

  const mudAlbedo = configureCanvasTex(mudCanvas, true, aniso, 14, 14);
  const mudRoughness = configureCanvasTex(mudRoughCanvas, false, aniso, 14, 14);
  const mudNormal = heightToNormalDataTexture(mudHeights, S, 2.8, aniso, 14);

  // =========================================================================
  // 2. Weathered Dark Timber / Bark PBR Set (256x256)
  // =========================================================================
  const W = 256;
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = W;
  woodCanvas.height = W;
  const wctx = woodCanvas.getContext('2d')!;
  wctx.fillStyle = '#3b3026';
  wctx.fillRect(0, 0, W, W);

  const woodRoughCanvas = document.createElement('canvas');
  woodRoughCanvas.width = W;
  woodRoughCanvas.height = W;
  const wrctx = woodRoughCanvas.getContext('2d')!;
  wrctx.fillStyle = '#dcdcdc';
  wrctx.fillRect(0, 0, W, W);

  const woodHeights = new Float32Array(W * W);
  for (let i = 0; i < 260; i++) {
    const x = rng.range(0, W);
    const bw = rng.range(1, 4.5);
    const dark = i % 3 === 0;
    wctx.fillStyle = dark
      ? 'rgba(20, 16, 13, 0.6)'
      : i % 5 === 0
        ? 'rgba(48, 60, 42, 0.28)'
        : 'rgba(78, 63, 49, 0.35)';
    wctx.fillRect(x, 0, bw, W);
    wrctx.fillStyle = dark ? 'rgba(240, 240, 240, 0.5)' : 'rgba(175, 175, 175, 0.4)';
    wrctx.fillRect(x, 0, bw, W);
    const ix = Math.floor(x) % W;
    for (let y = 0; y < W; y++) {
      woodHeights[y * W + ix] += dark ? -0.45 : 0.32;
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = rng.range(10, W - 10);
    const y = rng.range(10, W - 10);
    wctx.fillStyle = 'rgba(16, 13, 10, 0.68)';
    wctx.beginPath();
    wctx.ellipse(x, y, rng.range(3, 6), rng.range(8, 16), 0, 0, Math.PI * 2);
    wctx.fill();
  }
  const woodAlbedo = configureCanvasTex(woodCanvas, true, aniso, 2, 2);
  const woodRoughness = configureCanvasTex(woodRoughCanvas, false, aniso, 2, 2);
  const woodNormal = heightToNormalDataTexture(woodHeights, W, 3.3, aniso, 2);

  // =========================================================================
  // 3. Weathered Straw Thatch Roof (256x256)
  // =========================================================================
  const thatchCanvas = document.createElement('canvas');
  thatchCanvas.width = W;
  thatchCanvas.height = W;
  const tctx = thatchCanvas.getContext('2d')!;
  tctx.fillStyle = '#40372a';
  tctx.fillRect(0, 0, W, W);
  const thatchHeights = new Float32Array(W * W);
  for (let i = 0; i < 1050; i++) {
    const x = rng.range(0, W);
    const y = rng.range(0, W);
    const h = rng.range(10, 28);
    tctx.fillStyle =
      i % 6 === 0
        ? 'rgba(46, 62, 38, 0.6)'
        : i % 2 === 0
          ? 'rgba(88, 76, 54, 0.48)'
          : 'rgba(26, 22, 16, 0.55)';
    tctx.fillRect(x, y, 2, h);
    const ix = Math.floor(x) % W;
    const iy = Math.floor(y) % W;
    thatchHeights[iy * W + ix] += (i % 2 === 0 ? 1 : -1) * 0.65;
  }
  const thatchAlbedo = configureCanvasTex(thatchCanvas, true, aniso, 3, 2);
  const thatchNormal = heightToNormalDataTexture(thatchHeights, W, 3.6, aniso, 3);

  // =========================================================================
  // 4. Mossy Chiseled Barrow Stone (256x256)
  // =========================================================================
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = W;
  stoneCanvas.height = W;
  const stctx = stoneCanvas.getContext('2d')!;
  stctx.fillStyle = '#3c433e';
  stctx.fillRect(0, 0, W, W);
  const stoneHeights = new Float32Array(W * W);
  for (let i = 0; i < 720; i++) {
    const x = rng.range(0, W);
    const y = rng.range(0, W);
    const r = rng.range(3, 15);
    stctx.fillStyle =
      i % 4 === 0
        ? 'rgba(44, 62, 40, 0.45)'
        : i % 2 === 0
          ? 'rgba(24, 28, 26, 0.4)'
          : 'rgba(84, 90, 84, 0.3)';
    stctx.beginPath();
    stctx.arc(x, y, r, 0, Math.PI * 2);
    stctx.fill();
    stoneHeights[(Math.floor(y) % W) * W + (Math.floor(x) % W)] += i % 2 === 0 ? 0.55 : -0.55;
  }
  const stoneAlbedo = configureCanvasTex(stoneCanvas, true, aniso, 2, 2);
  const stoneNormal = heightToNormalDataTexture(stoneHeights, W, 3.0, aniso, 2);

  // =========================================================================
  // 5. Silver Birch Bark (Dark Lenticel Bands & Mossy Base, 256x256)
  // =========================================================================
  const birchCanvas = document.createElement('canvas');
  birchCanvas.width = W;
  birchCanvas.height = W;
  const bctx = birchCanvas.getContext('2d')!;
  bctx.fillStyle = '#9aa096';
  bctx.fillRect(0, 0, W, W);
  for (let i = 0; i < 160; i++) {
    const x = rng.range(0, W);
    const y = rng.range(0, W);
    const bw = rng.range(12, 46);
    const bh = rng.range(2, 6);
    bctx.fillStyle = i % 4 === 0 ? 'rgba(26, 28, 26, 0.78)' : 'rgba(54, 58, 52, 0.52)';
    bctx.fillRect(x, y, bw, bh);
  }
  const mossBaseGrad = bctx.createLinearGradient(0, W * 0.72, 0, W);
  mossBaseGrad.addColorStop(0, 'rgba(38, 46, 34, 0)');
  mossBaseGrad.addColorStop(1, 'rgba(30, 38, 28, 0.85)');
  bctx.fillStyle = mossBaseGrad;
  bctx.fillRect(0, W * 0.72, W, W * 0.28);
  const birchAlbedo = configureCanvasTex(birchCanvas, true, aniso, 1, 3);

  // =========================================================================
  // 6. Silver-Ash Stranded Hair Texture (128x128)
  // =========================================================================
  const hairCanvas = document.createElement('canvas');
  hairCanvas.width = 128;
  hairCanvas.height = 128;
  const hctx = hairCanvas.getContext('2d')!;
  hctx.fillStyle = '#9ea6a8';
  hctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 220; i++) {
    const x = rng.range(0, 128);
    hctx.fillStyle = i % 2 === 0 ? 'rgba(220, 226, 228, 0.45)' : 'rgba(82, 88, 92, 0.4)';
    hctx.fillRect(x, 0, rng.range(1, 2.2), 128);
  }
  const hairAlbedo = configureCanvasTex(hairCanvas, true, aniso, 2, 2);

  // =========================================================================
  // 7. Chainmail & Scratched Witcher Steel PBR Set (256x256)
  // =========================================================================
  const chainCanvas = document.createElement('canvas');
  chainCanvas.width = W;
  chainCanvas.height = W;
  const cctx = chainCanvas.getContext('2d')!;
  cctx.fillStyle = '#1a1e21';
  cctx.fillRect(0, 0, W, W);

  const chainRoughCanvas = document.createElement('canvas');
  chainRoughCanvas.width = W;
  chainRoughCanvas.height = W;
  const crctx = chainRoughCanvas.getContext('2d')!;
  crctx.fillStyle = '#b4b4b4';
  crctx.fillRect(0, 0, W, W);

  const chainHeights = new Float32Array(W * W);
  const step = 12;
  for (let row = 0; row < W / step; row++) {
    for (let col = 0; col < W / step; col++) {
      const cx = col * step + (row % 2 === 0 ? 0 : step * 0.5);
      const cy = row * step;
      cctx.strokeStyle = (row + col) % 3 === 0 ? '#747f86' : '#96a4ac';
      cctx.lineWidth = 2.2;
      cctx.beginPath();
      cctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      cctx.stroke();

      crctx.strokeStyle = '#383838';
      crctx.lineWidth = 2.2;
      crctx.beginPath();
      crctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      crctx.stroke();

      const ix = ((Math.floor(cx) % W) + W) % W;
      const iy = ((Math.floor(cy) % W) + W) % W;
      chainHeights[iy * W + ix] = 1.0;
    }
  }
  const chainmailAlbedo = configureCanvasTex(chainCanvas, true, aniso, 3, 3);
  const chainmailRoughness = configureCanvasTex(chainRoughCanvas, false, aniso, 3, 3);
  const chainmailNormal = heightToNormalDataTexture(chainHeights, W, 3.0, aniso, 3);

  // =========================================================================
  // 8. Animated Swamp Water Normal + Volumetric Flame + Soft Mist + Contact Shadow
  // =========================================================================
  const waterHeights = new Float32Array(W * W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x / W) * Math.PI * 2;
      const v = (y / W) * Math.PI * 2;
      waterHeights[y * W + x] =
        Math.sin(u * 3 + v * 2) * 0.35 +
        Math.cos(u * 5 - v * 4) * 0.25 +
        Math.sin(u * 9 + v * 7) * 0.15;
    }
  }
  const waterNormal = heightToNormalDataTexture(waterHeights, W, 1.5, aniso, 6);

  // Soft Flickering Slavic Fire Tongue Sprite (128x192)
  const flameCanvas = document.createElement('canvas');
  flameCanvas.width = 128;
  flameCanvas.height = 192;
  const fctx = flameCanvas.getContext('2d')!;
  const fg = fctx.createRadialGradient(64, 136, 4, 64, 108, 66);
  fg.addColorStop(0, 'rgba(255, 246, 200, 1)');
  fg.addColorStop(0.28, 'rgba(255, 168, 56, 0.92)');
  fg.addColorStop(0.62, 'rgba(217, 74, 24, 0.45)');
  fg.addColorStop(1, 'rgba(180, 32, 12, 0)');
  fctx.fillStyle = fg;
  fctx.beginPath();
  fctx.moveTo(64, 10);
  fctx.bezierCurveTo(106, 70, 118, 146, 64, 186);
  fctx.bezierCurveTo(10, 146, 22, 70, 64, 10);
  fctx.fill();
  const fireFlameSprite = new THREE.CanvasTexture(flameCanvas);
  fireFlameSprite.colorSpace = THREE.SRGBColorSpace;
  fireFlameSprite.needsUpdate = true;

  // Dense Roaring Svarog Fire Stream Texture (128x256, fills entire Y span)
  const svCanvas = document.createElement('canvas');
  svCanvas.width = 128;
  svCanvas.height = 256;
  const svctx = svCanvas.getContext('2d')!;
  const svVert = svctx.createLinearGradient(0, 256, 0, 0);
  svVert.addColorStop(0, 'rgba(255, 250, 210, 0)');
  svVert.addColorStop(0.1, 'rgba(255, 248, 200, 0.96)');
  svVert.addColorStop(0.32, 'rgba(255, 178, 56, 0.92)');
  svVert.addColorStop(0.7, 'rgba(235, 86, 20, 0.78)');
  svVert.addColorStop(1, 'rgba(180, 34, 10, 0)');
  svctx.fillStyle = svVert;
  svctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 24; i++) {
    const cx = 64 + rng.range(-26, 26);
    const cy = rng.range(36, 232);
    const rad = rng.range(16, 40);
    const g = svctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    g.addColorStop(0, i % 3 === 0 ? 'rgba(255, 245, 185, 0.9)' : 'rgba(255, 140, 32, 0.72)');
    g.addColorStop(1, 'rgba(210, 50, 12, 0)');
    svctx.fillStyle = g;
    svctx.beginPath();
    svctx.arc(cx, cy, rad, 0, Math.PI * 2);
    svctx.fill();
  }
  svctx.globalCompositeOperation = 'destination-in';
  const svHoriz = svctx.createLinearGradient(0, 0, 128, 0);
  svHoriz.addColorStop(0, 'rgba(255,255,255,0)');
  svHoriz.addColorStop(0.28, 'rgba(255,255,255,0.85)');
  svHoriz.addColorStop(0.5, 'rgba(255,255,255,1)');
  svHoriz.addColorStop(0.72, 'rgba(255,255,255,0.85)');
  svHoriz.addColorStop(1, 'rgba(255,255,255,0)');
  svctx.fillStyle = svHoriz;
  svctx.fillRect(0, 0, 128, 256);
  const svarogStreamTex = new THREE.CanvasTexture(svCanvas);
  svarogStreamTex.colorSpace = THREE.SRGBColorSpace;
  svarogStreamTex.needsUpdate = true;

  const mistCanvas = document.createElement('canvas');
  mistCanvas.width = 256;
  mistCanvas.height = 256;
  const msctx = mistCanvas.getContext('2d')!;
  for (let i = 0; i < 7; i++) {
    const ox = 128 + rng.range(-36, 36);
    const oy = 128 + rng.range(-24, 24);
    const rr = rng.range(60, 108);
    const g = msctx.createRadialGradient(ox, oy, rr * 0.08, ox, oy, rr);
    g.addColorStop(0, 'rgba(218, 232, 224, 0.34)');
    g.addColorStop(0.5, 'rgba(184, 202, 196, 0.16)');
    g.addColorStop(1, 'rgba(184, 202, 196, 0)');
    msctx.fillStyle = g;
    msctx.beginPath();
    msctx.arc(ox, oy, rr, 0, Math.PI * 2);
    msctx.fill();
  }
  const mistSprite = new THREE.CanvasTexture(mistCanvas);
  mistSprite.colorSpace = THREE.SRGBColorSpace;
  mistSprite.needsUpdate = true;

  // Soft vertical + edge-feathered volumetric god-ray alpha map (opaque grayscale for Three.js alphaMap)
  const rayCanvas = document.createElement('canvas');
  rayCanvas.width = 128;
  rayCanvas.height = 256;
  const rctx = rayCanvas.getContext('2d')!;
  rctx.fillStyle = '#000000';
  rctx.fillRect(0, 0, 128, 256);
  const rayRadial = rctx.createRadialGradient(64, 128, 4, 64, 128, 62);
  rayRadial.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  rayRadial.addColorStop(0.45, 'rgba(180, 180, 180, 0.52)');
  rayRadial.addColorStop(0.8, 'rgba(60, 60, 60, 0.14)');
  rayRadial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  rctx.save();
  rctx.translate(64, 128);
  rctx.scale(1.0, 2.0);
  rctx.translate(-64, -128);
  rctx.fillStyle = rayRadial;
  rctx.fillRect(0, 0, 128, 256);
  rctx.restore();
  const rayAlpha = new THREE.CanvasTexture(rayCanvas);
  rayAlpha.needsUpdate = true;

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d')!;
  const sgrad = sctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  sgrad.addColorStop(0, 'rgba(6, 8, 9, 0.84)');
  sgrad.addColorStop(0.52, 'rgba(6, 8, 9, 0.38)');
  sgrad.addColorStop(1, 'rgba(6, 8, 9, 0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  return {
    mudAlbedo,
    mudRoughness,
    mudNormal,
    woodAlbedo,
    woodRoughness,
    woodNormal,
    thatchAlbedo,
    thatchNormal,
    stoneAlbedo,
    stoneNormal,
    birchAlbedo,
    hairAlbedo,
    chainmailAlbedo,
    chainmailRoughness,
    chainmailNormal,
    waterNormal,
    fireFlameSprite,
    svarogStreamTex,
    rayAlpha,
    mistSprite,
    contactShadow,
    dispose() {
      mudAlbedo.dispose();
      mudRoughness.dispose();
      mudNormal.dispose();
      woodAlbedo.dispose();
      woodRoughness.dispose();
      woodNormal.dispose();
      thatchAlbedo.dispose();
      thatchNormal.dispose();
      stoneAlbedo.dispose();
      stoneNormal.dispose();
      birchAlbedo.dispose();
      hairAlbedo.dispose();
      chainmailAlbedo.dispose();
      chainmailRoughness.dispose();
      chainmailNormal.dispose();
      waterNormal.dispose();
      fireFlameSprite.dispose();
      svarogStreamTex.dispose();
      rayAlpha.dispose();
      mistSprite.dispose();
      contactShadow.dispose();
    },
  };
}
