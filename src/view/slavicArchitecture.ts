import * as THREE from 'three';
import { createRng } from '../core/rng';
import type { AAATextureSuite } from './textures';

export interface ShrineRig {
  group: THREE.Group;
  emberLight: THREE.PointLight;
  update(elapsed: number, fireBaseIntensity: number): void;
}

export interface BarrowRig {
  group: THREE.Group;
  runeLight: THREE.PointLight;
  update(elapsed: number, tod: 'dawn' | 'dusk' | 'night'): void;
}

export interface HutRig {
  group: THREE.Group;
  windowLight: THREE.PointLight;
  update(elapsed: number, tod: 'dawn' | 'dusk' | 'night'): void;
}

function buildCarvedSkull(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  boneMat: THREE.Material,
  socketMat: THREE.Material,
  scale = 1,
): THREE.Group {
  const g = new THREE.Group();
  const cranium = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.11, 0)), boneMat);
  cranium.scale.set(0.88, 1.05, 1.02);
  const jaw = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.095, 0.06, 0.09)), boneMat);
  jaw.position.set(0, -0.075, 0.025);
  const eyeL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.026, 0.03)), socketMat);
  eyeL.position.set(-0.034, -0.005, 0.085);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.034;
  const nose = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.016, 0.034, 3)), socketMat);
  nose.position.set(0, -0.035, 0.095);
  g.add(cranium, jaw, eyeL, eyeR, nose);
  g.scale.setScalar(scale);
  return g;
}

export function buildSlavicHut(opts: {
  textures: AAATextureSuite;
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMat: <T extends THREE.Material>(m: T) => T;
  seed: number;
  withLight?: boolean;
}): HutRig {
  const { textures, trackGeo, trackMat, seed, withLight = true } = opts;
  const rng = createRng(seed);
  const group = new THREE.Group();

  const logMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.woodAlbedo,
      roughnessMap: textures.woodRoughness,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.92,
      metalness: 0.04,
    }),
  );

  const darkTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x382d24,
      map: textures.woodAlbedo,
      normalMap: textures.woodNormal,
      roughness: 0.88,
      metalness: 0.06,
    }),
  );

  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.stoneAlbedo,
      normalMap: textures.stoneNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.88,
      metalness: 0.05,
    }),
  );

  const thatchMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.thatchAlbedo,
      normalMap: textures.thatchNormal,
      normalScale: new THREE.Vector2(1.35, 1.35),
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );

  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffb35c,
      emissive: 0xf28c28,
      emissiveIntensity: 2.0,
      roughness: 0.3,
    }),
  );

  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2225,
      roughness: 0.42,
      metalness: 0.86,
    }),
  );

  const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.2, 0.45, 4.4)), stoneMat);
  plinth.position.y = 0.22;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const logXGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.15, 5.4, 8));
  logXGeo.rotateZ(Math.PI / 2);
  const logZGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.15, 4.6, 8));
  logZGeo.rotateX(Math.PI / 2);

  for (let row = 0; row < 9; row++) {
    const y = 0.54 + row * 0.23;
    const j1 = rng.range(-0.02, 0.02);
    const frontLog = new THREE.Mesh(logXGeo, logMat);
    frontLog.position.set(j1, y, 1.95);
    frontLog.castShadow = true;
    frontLog.receiveShadow = true;

    const backLog = new THREE.Mesh(logXGeo, logMat);
    backLog.position.set(-j1, y, -1.95);
    backLog.castShadow = true;
    backLog.receiveShadow = true;

    const leftLog = new THREE.Mesh(logZGeo, logMat);
    leftLog.position.set(-2.35, y + 0.11, j1);
    leftLog.castShadow = true;
    leftLog.receiveShadow = true;

    const rightLog = new THREE.Mesh(logZGeo, logMat);
    rightLog.position.set(2.35, y + 0.11, -j1);
    rightLog.castShadow = true;
    rightLog.receiveShadow = true;

    group.add(frontLog, backLog, leftLog, rightLog);
  }

  const innerCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.5, 2.25, 3.7)), darkTrimMat);
  innerCore.position.y = 1.52;
  group.add(innerCore);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-2.45, 0);
  gableShape.lineTo(2.45, 0);
  gableShape.lineTo(0, 2.25);
  gableShape.closePath();
  const gableGeo = trackGeo(
    new THREE.ExtrudeGeometry(gableShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 }),
  );
  const frontGable = new THREE.Mesh(gableGeo, logMat);
  frontGable.position.set(0, 2.55, 1.88);
  frontGable.castShadow = true;
  const backGable = new THREE.Mesh(gableGeo, logMat);
  backGable.position.set(0, 2.55, -2.06);
  backGable.castShadow = true;
  group.add(frontGable, backGable);

  const slopeGeo = trackGeo(new THREE.BoxGeometry(3.55, 0.24, 5.25));
  const leftRoof = new THREE.Mesh(slopeGeo, thatchMat);
  leftRoof.position.set(-1.32, 3.62, 0);
  leftRoof.rotation.z = 0.74;
  leftRoof.castShadow = true;
  leftRoof.receiveShadow = true;

  const rightRoof = new THREE.Mesh(slopeGeo, thatchMat);
  rightRoof.position.set(1.32, 3.62, 0);
  rightRoof.rotation.z = -0.74;
  rightRoof.castShadow = true;
  rightRoof.receiveShadow = true;

  const ridgeBeam = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 5.55, 8)), darkTrimMat);
  ridgeBeam.rotation.x = Math.PI / 2;
  ridgeBeam.position.set(0, 4.86, 0);
  ridgeBeam.castShadow = true;

  const bargeGeo = trackGeo(new THREE.BoxGeometry(0.14, 3.95, 0.09));
  for (const zPos of [2.42, -2.42]) {
    const bL = new THREE.Mesh(bargeGeo, darkTrimMat);
    bL.position.set(-1.12, 3.85, zPos);
    bL.rotation.z = -0.76;
    const bR = new THREE.Mesh(bargeGeo, darkTrimMat);
    bR.position.set(1.12, 3.85, zPos);
    bR.rotation.z = 0.76;
    group.add(bL, bR);
  }
  group.add(leftRoof, rightRoof, ridgeBeam);

  const chimney = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 1.45, 0.68)), stoneMat);
  chimney.position.set(-1.15, 4.75, -0.75);
  chimney.castShadow = true;
  const chimneyCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.84, 0.14, 0.84)), stoneMat);
  chimneyCap.position.set(-1.15, 5.5, -0.75);
  group.add(chimney, chimneyCap);

  const doorFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.18, 1.98, 0.22)), darkTrimMat);
  doorFrame.position.set(-0.55, 1.38, 2.02);
  const doorPlank = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 1.82, 0.14)), logMat);
  doorPlank.position.set(-0.55, 1.35, 2.06);
  const strap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.06, 0.04)), ironMat);
  strap.position.set(-0.66, 1.75, 2.15);
  const strap2 = strap.clone();
  strap2.position.y = 0.95;

  const porchRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.65, 0.1, 1.1)), thatchMat);
  porchRoof.position.set(-0.55, 2.48, 2.42);
  porchRoof.rotation.x = 0.35;
  porchRoof.castShadow = true;
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.08, 2.05, 7));
  const postL = new THREE.Mesh(postGeo, darkTrimMat);
  postL.position.set(-1.24, 1.32, 2.75);
  const postR = new THREE.Mesh(postGeo, darkTrimMat);
  postR.position.set(0.14, 1.32, 2.75);

  const winFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.72, 0.2)), darkTrimMat);
  winFrame.position.set(1.08, 1.56, 2.04);
  const winPane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.52, 0.48)), lanternGlowMat);
  winPane.position.set(1.08, 1.56, 2.15);
  const shutter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.56, 0.06)), darkTrimMat);
  shutter.position.set(1.5, 1.56, 2.12);
  shutter.rotation.y = -0.35;

  const loftHole = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.58, 0.16)), ironMat);
  loftHole.position.set(0, 3.35, 2.04);

  group.add(doorFrame, doorPlank, strap, strap2, porchRoof, postL, postR, winFrame, winPane, shutter, loftHole);

  const stakeGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.048, 1.05, 5));
  const railGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.032, 3.4, 5));
  railGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(stakeGeo, darkTrimMat);
    st.position.set(2.3 + i * 0.62, 0.48, 1.85 + Math.sin(i * 0.9) * 0.12);
    st.rotation.z = rng.range(-0.08, 0.08);
    st.castShadow = true;
    group.add(st);
  }
  for (let r = 0; r < 2; r++) {
    const rail = new THREE.Mesh(railGeo, darkTrimMat);
    rail.position.set(3.85, 0.42 + r * 0.32, 1.86);
    rail.rotation.y = 0.04;
    group.add(rail);
  }

  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.25, 0.72, 10)), logMat);
  barrel.position.set(1.75, 0.58, 2.48);
  barrel.castShadow = true;
  group.add(barrel);

  const windowLight = new THREE.PointLight(0xf28c28, withLight ? 1.8 : 0, 8, 1.8);
  windowLight.position.set(1.08, 1.6, 2.75);
  if (withLight) group.add(windowLight);

  return {
    group,
    windowLight,
    update(elapsed, tod) {
      const base = tod === 'dawn' ? 1.15 : tod === 'dusk' ? 1.9 : 2.4;
      const flicker = 0.9 + Math.sin(elapsed * 7.2 + seed) * 0.1;
      lanternGlowMat.emissiveIntensity = base * flicker;
      if (withLight) {
        windowLight.intensity = base * 1.15 * flicker;
      }
    },
  };
}

export function buildZbruchIdolShrine(opts: {
  textures: AAATextureSuite;
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMat: <T extends THREE.Material>(m: T) => T;
}): ShrineRig {
  const { textures, trackGeo, trackMat } = opts;
  const group = new THREE.Group();

  const oakMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd0c6b8,
      map: textures.woodAlbedo,
      roughnessMap: textures.woodRoughness,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.35, 1.35),
      roughness: 0.92,
      metalness: 0.04,
    }),
  );

  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.stoneAlbedo,
      normalMap: textures.stoneNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.85,
      metalness: 0.06,
    }),
  );

  // Weathered dark ivory bone (flatShading + carved eye/nose sockets -> zero white ping-pong spheres!)
  const boneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x867d68,
      roughness: 0.82,
      metalness: 0.03,
      flatShading: true,
    }),
  );

  const socketMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161412,
      roughness: 0.95,
    }),
  );

  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x24282b,
      roughness: 0.45,
      metalness: 0.88,
    }),
  );

  const runeCrimsonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8a1e24,
      emissive: 0xc9343a,
      emissiveIntensity: 1.9,
      roughness: 0.3,
      metalness: 0.15,
    }),
  );

  const amberEmberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf28c28,
      emissive: 0xf28c28,
      emissiveIntensity: 2.5,
      roughness: 0.3,
    }),
  );

  const step1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.65, 1.88, 0.28, 8)), stoneMat);
  step1.position.y = 0.14;
  step1.castShadow = true;
  step1.receiveShadow = true;
  const step2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.15, 1.32, 0.34, 8)), stoneMat);
  step2.position.y = 0.44;
  step2.castShadow = true;
  step2.receiveShadow = true;
  group.add(step1, step2);

  const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.56, 3.65, 9)), oakMat);
  trunk.position.y = 2.38;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  for (const dir of [1, -1]) {
    const faceBaseZ = dir * 0.43;
    const brow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.12, 0.14)), oakMat);
    brow.position.set(0, 3.72, faceBaseZ);
    const nose = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.28, 0.14)), oakMat);
    nose.position.set(0, 3.52, faceBaseZ + dir * 0.03);
    const beard = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.28, 0.42, 5)), oakMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, 3.16, faceBaseZ);

    const eyeL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.045, 0.04)), runeCrimsonMat);
    eyeL.position.set(-0.14, 3.62, faceBaseZ + dir * 0.02);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.14;
    group.add(brow, nose, beard, eyeL, eyeR);
  }

  // Subtle inset crimson Nav carvings instead of huge flat neon ring
  const runeRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.495, 0.495, 0.08, 10)), runeCrimsonMat);
  runeRing.position.y = 2.45;
  group.add(runeRing);

  const runeSlabGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.38, 0.05));
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const runeMark = new THREE.Mesh(runeSlabGeo, runeCrimsonMat);
    runeMark.position.set(Math.sin(angle) * 0.49, 1.75, Math.cos(angle) * 0.49);
    runeMark.rotation.y = angle;
    group.add(runeMark);
  }

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.13, 1.32, 7)), oakMat);
    arm.position.set(side * 0.86, 3.05, 0);
    arm.rotation.z = side * -1.15;
    arm.castShadow = true;

    const hand = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.13, 0.32, 5)), oakMat);
    hand.position.set(side * 1.44, 3.38, 0);
    hand.rotation.z = side * -0.45;

    const chain = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.68, 6)), ironMat);
    chain.position.set(side * 1.24, 2.75, 0);

    const charmSkull = buildCarvedSkull(trackGeo, boneMat, socketMat, 0.95);
    charmSkull.position.set(side * 1.24, 2.35, 0);
    charmSkull.rotation.y = side * 0.4;
    group.add(arm, hand, chain, charmSkull);
  }

  const crown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.6, 0.48, 0.44, 8)), oakMat);
  crown.position.y = 4.22;
  crown.castShadow = true;
  const crownCap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.66, 0.45, 4)), oakMat);
  crownCap.position.y = 4.62;
  crownCap.rotation.y = Math.PI / 4;
  group.add(crown, crownCap);

  const brazierBowl = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.22, 0.32, 8)), stoneMat);
  brazierBowl.position.set(0, 0.74, 1.05);
  const brazierEmbers = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 8, 6)), amberEmberMat);
  brazierEmbers.scale.y = 0.45;
  brazierEmbers.position.set(0, 0.9, 1.05);
  group.add(brazierBowl, brazierEmbers);

  const skullPositions: [number, number, number][] = [
    [-0.58, 0.68, 0.86],
    [0.54, 0.68, 0.9],
    [0, 1.12, 0.56],
  ];
  for (const [sx, sy, sz] of skullPositions) {
    const sk = buildCarvedSkull(trackGeo, boneMat, socketMat, 1.15);
    sk.position.set(sx, sy, sz);
    group.add(sk);
  }

  const stakeGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.055, 2.1, 6));
  const stakePos: [number, number, number][] = [
    [-1.65, 0.85, 0.2],
    [1.65, 0.85, 0.15],
    [-1.25, -0.5, -1.3],
    [1.35, -0.45, -1.25],
  ];
  for (const [px, rotZ, pz] of stakePos) {
    const st = new THREE.Mesh(stakeGeo, oakMat);
    st.position.set(px, 1.0, pz);
    st.rotation.z = rotZ * 0.12;
    st.castShadow = true;
    const tipSkull = buildCarvedSkull(trackGeo, boneMat, socketMat, 1.0);
    tipSkull.position.set(px - rotZ * 0.11, 2.04, pz);
    tipSkull.rotation.y = Math.atan2(-px, 4);
    group.add(st, tipSkull);
  }

  const emberLight = new THREE.PointLight(0xf28c28, 2.2, 13, 1.7);
  emberLight.position.set(0, 1.55, 1.25);
  group.add(emberLight);

  const wispGeo = trackGeo(new THREE.OctahedronGeometry(0.06, 0));
  const wisps: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(wispGeo, amberEmberMat);
    group.add(w);
    wisps.push(w);
  }

  return {
    group,
    emberLight,
    update(elapsed, fireBaseIntensity) {
      const flicker = 0.88 + Math.sin(elapsed * 7.8) * 0.1 + Math.sin(elapsed * 14.3) * 0.05;
      emberLight.intensity = fireBaseIntensity * 0.55 * flicker;
      runeCrimsonMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 2.4) * 0.4;
      for (let i = 0; i < wisps.length; i++) {
        const a = elapsed * 1.15 + (i * Math.PI * 2) / 3;
        wisps[i].position.set(Math.cos(a) * 0.88, 3.6 + Math.sin(elapsed * 2.2 + i) * 0.24, Math.sin(a) * 0.88);
        wisps[i].rotation.y = elapsed * 2.0;
      }
    },
  };
}

export function buildBarrowCrypt(opts: {
  textures: AAATextureSuite;
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T;
  trackMat: <T extends THREE.Material>(m: T) => T;
}): BarrowRig {
  const { textures, trackGeo, trackMat } = opts;
  const group = new THREE.Group();

  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.stoneAlbedo,
      normalMap: textures.stoneNormal,
      normalScale: new THREE.Vector2(1.3, 1.3),
      roughness: 0.88,
      metalness: 0.06,
      flatShading: true,
    }),
  );

  const earthMossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x364431,
      map: textures.mudAlbedo,
      normalMap: textures.mudNormal,
      roughness: 0.94,
      metalness: 0.03,
      flatShading: true,
    }),
  );

  const voidMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x050708,
      roughness: 0.98,
    }),
  );

  const runeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x99262c,
      emissive: 0xc9343a,
      emissiveIntensity: 2.3,
      roughness: 0.25,
    }),
  );

  // Broad, low mossy earthen burial hillock enveloping the crypt stone frame
  const cairnGeo = trackGeo(new THREE.ConeGeometry(4.9, 2.8, 11, 3));
  const cp = cairnGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i);
    const y = cp.getY(i);
    const z = cp.getZ(i);
    const j = 0.86 + Math.sin(x * 1.9 + z * 1.3) * 0.16;
    cp.setXYZ(i, x * j, y + Math.cos(x * 2.2) * 0.16, z * j);
  }
  cairnGeo.computeVertexNormals();
  const cairnMound = new THREE.Mesh(cairnGeo, earthMossMat);
  cairnMound.position.set(0, 1.35, -1.65);
  cairnMound.scale.set(1.22, 0.96, 1.05);
  cairnMound.castShadow = true;
  cairnMound.receiveShadow = true;
  group.add(cairnMound);

  // Flanking rough megalithic boulders & mossy roof crags burying the lintel
  const rockGeo = trackGeo(new THREE.DodecahedronGeometry(0.95, 0));
  const boulderCoords: [number, number, number, number][] = [
    [-2.2, 0.55, 0.05, 1.25],
    [2.1, 0.6, 0.1, 1.2],
    [-1.4, 2.35, 0.25, 0.95],
    [1.3, 2.3, 0.22, 0.92],
    [0.0, 2.95, 0.15, 1.05],
  ];
  for (const [rx, ry, rz, rs] of boulderCoords) {
    const b = new THREE.Mesh(rockGeo, stoneMat);
    b.position.set(rx, ry, rz);
    b.scale.set(rs * 1.25, rs * 0.68, rs);
    b.rotation.set(rx, ry, rz);
    b.castShadow = true;
    b.receiveShadow = true;
    group.add(b);
  }

  // Tapered megalithic stone portal pillars & slanted pitched lintel tucked into mound
  const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.52, 2.35, 6));
  const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
  leftPillar.position.set(-1.02, 1.15, 0.78);
  leftPillar.rotation.z = -0.08;
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;

  const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
  rightPillar.position.set(1.02, 1.15, 0.78);
  rightPillar.rotation.z = 0.08;
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;

  const lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.95, 0.52, 1.05)), stoneMat);
  lintel.position.set(0, 2.48, 0.76);
  lintel.rotation.z = -0.02;
  lintel.castShadow = true;
  lintel.receiveShadow = true;

  const gableStone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.55, 0.95, 4)), earthMossMat);
  gableStone.position.set(0, 3.05, 0.55);
  gableStone.rotation.y = Math.PI / 4;
  gableStone.scale.set(1.35, 0.8, 0.85);
  gableStone.castShadow = true;

  const recessVoid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.35, 2.1, 0.75)), voidMat);
  recessVoid.position.set(0, 1.05, 0.56);

  group.add(leftPillar, rightPillar, lintel, gableStone, recessVoid);

  const runeStripGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.34, 0.05));
  for (let i = 0; i < 3; i++) {
    const rL = new THREE.Mesh(runeStripGeo, runeMat);
    rL.position.set(-0.98, 0.75 + i * 0.55, 1.12);
    rL.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.18;
    const rR = new THREE.Mesh(runeStripGeo, runeMat);
    rR.position.set(0.98, 0.75 + i * 0.55, 1.12);
    rR.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.18;
    group.add(rL, rR);
  }

  const rootCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.3, 3.25, 0.8),
    new THREE.Vector3(-1.45, 2.2, 1.05),
    new THREE.Vector3(-1.55, 1.0, 1.08),
    new THREE.Vector3(-1.75, 0.1, 1.25),
  ]);
  const rootVine = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(rootCurve, 10, 0.06, 5, false)), earthMossMat);
  group.add(rootVine);

  const runeLight = new THREE.PointLight(0xc9343a, 1.8, 10, 1.7);
  runeLight.position.set(0, 1.45, 1.35);
  group.add(runeLight);

  return {
    group,
    runeLight,
    update(elapsed, tod) {
      const base = tod === 'night' ? 2.6 : tod === 'dusk' ? 1.8 : 1.0;
      const pulse = 0.85 + Math.sin(elapsed * 2.1) * 0.18;
      runeMat.emissiveIntensity = base * pulse;
      runeLight.intensity = base * 0.85 * pulse;
    },
  };
}
