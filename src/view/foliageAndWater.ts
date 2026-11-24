import * as THREE from 'three';
import { createRng } from '../core/rng';
import { CLEARING_OBSTACLES, WATER_LEVEL, channelDepthAt, groundHeightAt } from '../world/terrain';
import {
  buildBarrowCrypt,
  buildSlavicHut,
  buildZbruchIdolShrine,
  type BarrowRig,
  type HutRig,
  type ShrineRig,
} from './slavicArchitecture';
import type { AAATextureSuite } from './textures';
import type { TodPhase } from '../core/events';

export interface ClearingWorldRig {
  group: THREE.Group;
  fireLight: THREE.PointLight;
  idolEmberLight: THREE.PointLight;
  update(elapsed: number, fireBaseIntensity: number, tod: TodPhase): void;
  dispose(): void;
}

export function createClearingWorld(
  textures: AAATextureSuite,
  seed: number,
  isSoftwareGl: boolean,
): ClearingWorldRig {
  const rng = createRng(seed ^ 0x517cc1b7);
  const group = new THREE.Group();

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // =========================================================================
  // 1. Deformed Velen Peat, Mud & Moss Terrain with Vertex Color Blending
  // =========================================================================
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(118, 118, 96, 96));
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  const tCol = new Float32Array(tPos.count * 3);
  const cDryMoss = new THREE.Color(0x6e8068);
  const cMud = new THREE.Color(0x524538);
  const cWetBank = new THREE.Color(0x161c19);
  const cTmp = new THREE.Color();

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);
    const y = groundHeightAt(x, z);
    tPos.setY(i, y);

    const ch = channelDepthAt(x, z);
    const radial = Math.min(1, Math.hypot(x, z) / 28);
    if (ch > 0.06) {
      cTmp.copy(cWetBank);
    } else {
      cTmp.copy(cMud).lerp(cDryMoss, 0.32 + radial * 0.56);
    }
    tCol[i * 3] = cTmp.r;
    tCol[i * 3 + 1] = cTmp.g;
    tCol[i * 3 + 2] = cTmp.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: textures.mudAlbedo,
      roughnessMap: textures.mudRoughness,
      normalMap: textures.mudNormal,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughness: 1.0,
      metalness: 0.08,
    }),
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = !isSoftwareGl;
  group.add(terrainMesh);

  // =========================================================================
  // 2. Dark Mirror-Reflective Meandering Swamp Creek Water
  // =========================================================================
  const waterUniforms = { uTime: { value: 0 } };
  const waterGeo = trackGeo(new THREE.PlaneGeometry(64, 96, 16, 24));
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b1615,
      roughness: 0.14,
      metalness: 0.34,
      envMapIntensity: 0.72,
      normalMap: textures.waterNormal,
      normalScale: new THREE.Vector2(1.05, 1.05),
      transparent: true,
      opacity: 0.91,
    }),
  );
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      transformed.y += sin(position.x * 0.7 + uTime * 1.6) * 0.014 + cos(position.z * 0.55 - uTime * 1.2) * 0.012;
      `,
    );
  };
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(2.5, WATER_LEVEL, -6);
  waterMesh.receiveShadow = !isSoftwareGl;
  group.add(waterMesh);

  // =========================================================================
  // 3. Weathered Slavic Village Huts, Zbruch Idol Shrine & Sunken Barrow
  // =========================================================================
  const hutLeft: HutRig = buildSlavicHut({ textures, trackGeo, trackMat, seed: seed ^ 101, withLight: true });
  hutLeft.group.position.set(-10.8, groundHeightAt(-10.8, -2.5) - 0.12, -2.5);
  hutLeft.group.rotation.y = 0.62;
  group.add(hutLeft.group);

  const hutRight: HutRig = buildSlavicHut({ textures, trackGeo, trackMat, seed: seed ^ 202, withLight: true });
  hutRight.group.position.set(11.4, groundHeightAt(11.4, -4.2) - 0.12, -4.2);
  hutRight.group.rotation.y = -0.68;
  group.add(hutRight.group);

  const hutFar: HutRig = buildSlavicHut({ textures, trackGeo, trackMat, seed: seed ^ 303, withLight: false });
  hutFar.group.position.set(-14.5, groundHeightAt(-14.5, -18) - 0.15, -18);
  hutFar.group.rotation.y = 0.28;
  hutFar.group.scale.setScalar(0.92);
  group.add(hutFar.group);

  const shrine: ShrineRig = buildZbruchIdolShrine({ textures, trackGeo, trackMat });
  shrine.group.position.set(0, groundHeightAt(0, -7.5) - 0.04, -7.5);
  group.add(shrine.group);

  const barrow: BarrowRig = buildBarrowCrypt({ textures, trackGeo, trackMat });
  barrow.group.position.set(-7.2, groundHeightAt(-7.2, -16.8) - 0.1, -16.8);
  barrow.group.rotation.y = 0.42;
  group.add(barrow.group);

  // =========================================================================
  // 4. Campfire Hearth with Soft Layered Flame Tongues + Footbridge
  // =========================================================================
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.woodAlbedo,
      roughnessMap: textures.woodRoughness,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.9,
      metalness: 0.04,
    }),
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.stoneAlbedo,
      normalMap: textures.stoneNormal,
      roughness: 0.84,
      metalness: 0.06,
      flatShading: true,
    }),
  );
  const emberBedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd94814,
      emissive: 0xf26419,
      emissiveIntensity: 2.2,
      roughness: 0.65,
    }),
  );
  const flameSpriteMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.fireFlameSprite,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  const fireX = 3.6;
  const fireZ = -0.6;
  const fireY = groundHeightAt(fireX, fireZ);
  const campfireGroup = new THREE.Group();
  campfireGroup.position.set(fireX, fireY, fireZ);

  const ringStoneGeo = trackGeo(new THREE.DodecahedronGeometry(0.21, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = new THREE.Mesh(ringStoneGeo, stoneMat);
    s.position.set(Math.cos(a) * 0.68, 0.09, Math.sin(a) * 0.68);
    s.scale.set(1.25, 0.65, 1.05);
    s.rotation.y = a;
    campfireGroup.add(s);
  }
  const emberBed = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.38, 10, 6)), emberBedMat);
  emberBed.scale.set(1.1, 0.25, 1.1);
  emberBed.position.y = 0.06;
  campfireGroup.add(emberBed);

  const fireLogGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.095, 1.05, 7));
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(fireLogGeo, woodMat);
    l.rotation.z = Math.PI / 2 - 0.24;
    l.rotation.y = (i * Math.PI) / 4;
    l.position.y = 0.16;
    campfireGroup.add(l);
  }

  // Layered flickering flame cards (crossed soft sprite planes, never white triangle)
  const flamePlanes: THREE.Mesh[] = [];
  const flamePlaneGeo = trackGeo(new THREE.PlaneGeometry(0.88, 1.18));
  for (let i = 0; i < 3; i++) {
    const fp = new THREE.Mesh(flamePlaneGeo, flameSpriteMat);
    fp.position.set((i - 1) * 0.06, 0.56, (i % 2 === 0 ? 1 : -1) * 0.04);
    fp.rotation.y = (i * Math.PI) / 3;
    campfireGroup.add(fp);
    flamePlanes.push(fp);
  }
  group.add(campfireGroup);

  const fireLight = new THREE.PointLight(0xf28c28, 4.4, 24, 1.5);
  fireLight.position.set(fireX, fireY + 1.05, fireZ);
  group.add(fireLight);

  // Wooden plank footbridge across bog channel near hero start
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(2.3, WATER_LEVEL + 0.24, 3.8);
  bridgeGroup.rotation.y = -0.18;
  const plankGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.08, 1.85));
  for (let i = 0; i < 8; i++) {
    const plank = new THREE.Mesh(plankGeo, woodMat);
    plank.position.set(-1.5 + i * 0.44, Math.sin(i * 0.45) * 0.04, 0);
    plank.rotation.y = rng.range(-0.04, 0.04);
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridgeGroup.add(plank);
  }
  const beamGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 3.8, 7));
  beamGeo.rotateZ(Math.PI / 2);
  for (const bz of [-0.62, 0.62]) {
    const bm = new THREE.Mesh(beamGeo, woodMat);
    bm.position.set(0, -0.06, bz);
    bridgeGroup.add(bm);
  }
  group.add(bridgeGroup);

  // =========================================================================
  // 5. Fallen Mossy Log, Standing Menhirs & Stepping Stones
  // =========================================================================
  const fallenObs = CLEARING_OBSTACLES[4];
  const fallenLog = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.4, 2.75, 9)), woodMat);
  fallenLog.rotation.z = Math.PI / 2;
  fallenLog.rotation.y = 0.48;
  fallenLog.position.set(fallenObs.x, groundHeightAt(fallenObs.x, fallenObs.z) + 0.22, fallenObs.z);
  fallenLog.castShadow = true;
  fallenLog.receiveShadow = true;
  group.add(fallenLog);

  const totemPos: [number, number, number][] = [
    [7.8, -15.4, 0.92],
    [9.1, -12.8, 1.1],
    [2.6, -16.8, 0.85],
  ];
  const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.2, 0.44, 3.0, 5));
  for (const [tx, tz, sc] of totemPos) {
    const tot = new THREE.Mesh(pillarGeo, stoneMat);
    tot.position.set(tx, groundHeightAt(tx, tz) + 1.4 * sc, tz);
    tot.scale.setScalar(sc);
    tot.rotation.z = rng.range(-0.07, 0.07);
    tot.rotation.y = rng.range(0, Math.PI);
    tot.castShadow = true;
    tot.receiveShadow = true;
    group.add(tot);
  }

  const stepStoneGeo = trackGeo(new THREE.DodecahedronGeometry(0.38, 0));
  const stepPositions: [number, number][] = [
    [-0.9, 5.2],
    [0.8, 4.9],
    [-1.4, -3.2],
    [1.6, -4.4],
    [4.4, -2.5],
  ];
  for (const [sx, sz] of stepPositions) {
    const st = new THREE.Mesh(stepStoneGeo, stoneMat);
    st.position.set(sx, groundHeightAt(sx, sz) + 0.03, sz);
    st.scale.set(1.3, 0.28, 1.1);
    st.rotation.y = rng.range(0, Math.PI);
    st.receiveShadow = true;
    group.add(st);
  }

  // =========================================================================
  // 6. Ragged Multi-Tier Velen Spruces + Textured Gnarled Silver Birches + Oak Roots
  // =========================================================================
  const PINE_COUNT = 165;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.15, 0.36, 5.6, 7));
  trunkGeo.translate(0, 2.8, 0);

  const makeCanopyTier = (radius: number, height: number, yBase: number) => {
    const g = trackGeo(new THREE.ConeGeometry(radius, height, 11, 3));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const rad = Math.hypot(vx, vz);
      if (rad > 0.2) {
        const j = 0.72 + Math.sin(i * 3.1) * 0.34;
        const droop = Math.abs(Math.cos(i * 2.3)) * 0.42;
        p.setXYZ(i, vx * j, vy - droop, vz * j);
      }
    }
    g.translate(0, yBase, 0);
    g.computeVertexNormals();
    return g;
  };
  const tier1Geo = makeCanopyTier(2.35, 3.6, 4.2);
  const tier2Geo = makeCanopyTier(1.82, 3.3, 6.1);
  const tier3Geo = makeCanopyTier(1.22, 2.9, 8.0);

  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.woodAlbedo,
      normalMap: textures.woodNormal,
      roughness: 0.93,
      metalness: 0.02,
    }),
  );
  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x243429,
      roughness: 0.89,
      metalness: 0.02,
      flatShading: true,
    }),
  );

  const trunksInst = new THREE.InstancedMesh(trunkGeo, barkMat, PINE_COUNT);
  const tier1Inst = new THREE.InstancedMesh(tier1Geo, foliageMat, PINE_COUNT);
  const tier2Inst = new THREE.InstancedMesh(tier2Geo, foliageMat, PINE_COUNT);
  const tier3Inst = new THREE.InstancedMesh(tier3Geo, foliageMat, PINE_COUNT);
  trunksInst.castShadow = !isSoftwareGl;
  tier1Inst.castShadow = !isSoftwareGl;
  tier2Inst.castShadow = false;
  tier3Inst.castShadow = false;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < PINE_COUNT; i++) {
    const angle = (i / PINE_COUNT) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const radius = i < 46 ? rng.range(18, 26) : rng.range(26, 52);
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    // Open scenic sky corridor north-west along the creek so the crescent moon & dusk glow frame cleanly
    const inSkyGap = tz < -16 && tx > -15 && tx < -4;
    const ty = groundHeightAt(tx, tz) - 0.18;
    const scale = inSkyGap ? rng.range(0.45, 0.62) : rng.range(0.86, 1.46);

    dummy.position.set(tx, ty, tz);
    dummy.rotation.set(rng.range(-0.06, 0.06), rng.range(0, Math.PI * 2), rng.range(-0.06, 0.06));
    dummy.scale.set(scale, scale * rng.range(0.88, 1.3), scale);
    dummy.updateMatrix();
    trunksInst.setMatrixAt(i, dummy.matrix);
    tier1Inst.setMatrixAt(i, dummy.matrix);
    tier2Inst.setMatrixAt(i, dummy.matrix);
    tier3Inst.setMatrixAt(i, dummy.matrix);

    tint.setHSL(0.36 + rng.range(-0.04, 0.03), 0.18, 0.14 + rng.range(-0.03, 0.04));
    tier1Inst.setColorAt(i, tint);
    tier2Inst.setColorAt(i, tint);
    tier3Inst.setColorAt(i, tint);
  }
  for (const inst of [trunksInst, tier1Inst, tier2Inst, tier3Inst]) {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
  }
  if (tier1Inst.instanceColor) tier1Inst.instanceColor.needsUpdate = true;
  if (tier2Inst.instanceColor) tier2Inst.instanceColor.needsUpdate = true;
  if (tier3Inst.instanceColor) tier3Inst.instanceColor.needsUpdate = true;
  group.add(trunksInst, tier1Inst, tier2Inst, tier3Inst);

  // Textured Gnarled Silver Birches with Slender Upper Branches & Sparse Autumn/Bog Foliage
  const birchMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.birchAlbedo,
      normalMap: textures.woodNormal,
      roughness: 0.86,
      metalness: 0.02,
    }),
  );
  const birchTwigMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e211c,
      roughness: 0.92,
    }),
  );
  const birchPositions: [number, number][] = [
    [-7.5, -10.5],
    [-8.8, -11.4],
    [8.2, -9.8],
    [10.2, -11.8],
    [-12.5, -7.8],
    [13.4, 2.2],
  ];
  const birchTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.15, 8.6, 7));
  const birchForkGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.046, 2.7, 5));
  const birchTwigGeo = trackGeo(new THREE.CylinderGeometry(0.006, 0.016, 1.35, 4));
  const birchTrunksInst = new THREE.InstancedMesh(birchTrunkGeo, birchMat, birchPositions.length);
  const birchForksInst = new THREE.InstancedMesh(birchForkGeo, birchMat, birchPositions.length * 5);
  const birchTwigsInst = new THREE.InstancedMesh(birchTwigGeo, birchTwigMat, birchPositions.length * 5);
  birchTrunksInst.castShadow = !isSoftwareGl;

  let forkIdx = 0;
  for (let b = 0; b < birchPositions.length; b++) {
    const [bx, bz] = birchPositions[b];
    const by = groundHeightAt(bx, bz);
    dummy.position.set(bx, by + 4.3, bz);
    dummy.rotation.set(0, 0, rng.range(-0.06, 0.06));
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    birchTrunksInst.setMatrixAt(b, dummy.matrix);

    for (let k = 0; k < 5; k++) {
      const side = k % 2 === 0 ? -1 : 1;
      dummy.position.set(bx + side * 0.52, by + 5.1 + k * 0.65, bz + rng.range(-0.28, 0.28));
      dummy.rotation.set(rng.range(-0.22, 0.22), 0, -side * rng.range(0.36, 0.64));
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      birchForksInst.setMatrixAt(forkIdx, dummy.matrix);

      dummy.position.set(bx + side * 0.96, by + 6.25 + k * 0.62, bz + rng.range(-0.25, 0.25));
      dummy.rotation.set(rng.range(-0.3, 0.3), 0, -side * rng.range(0.6, 1.05));
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      birchTwigsInst.setMatrixAt(forkIdx, dummy.matrix);
      forkIdx++;
    }
  }
  for (const inst of [birchTrunksInst, birchForksInst, birchTwigsInst]) {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
  }
  group.add(birchTrunksInst, birchForksInst, birchTwigsInst);

  const rootCurves: [number, number, number][][] = [
    [
      [7.8, 0.0, -7.2],
      [6.4, 0.35, -6.5],
      [5.1, 0.05, -5.6],
    ],
    [
      [-7.2, 0.0, 2.5],
      [-5.9, 0.38, 1.9],
      [-4.6, 0.02, 1.4],
    ],
  ];
  for (const pts of rootCurves) {
    const curve = new THREE.CatmullRomCurve3(
      pts.map(([rx, ry, rz]) => new THREE.Vector3(rx, groundHeightAt(rx, rz) + ry, rz)),
    );
    const rootMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(curve, 12, 0.14, 6, false)), woodMat);
    rootMesh.castShadow = true;
    rootMesh.receiveShadow = true;
    group.add(rootMesh);
  }

  // =========================================================================
  // 7. Swaying Bog Reeds & Subtle Bioluminescent Swamp Fungi (Instanced)
  // =========================================================================
  const REED_COUNT = 340;
  const reedGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.032, 1.18, 4, 3));
  reedGeo.translate(0, 0.59, 0);

  const windUniforms = { uTime: { value: 0 } };
  const reedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b4834,
      roughness: 0.85,
      metalness: 0.02,
    }),
  );
  reedMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float sway = sin(uTime * 1.9 + position.y * 2.5 + float(gl_InstanceID) * 0.7) * 0.12 * position.y;
      transformed.x += sway;
      transformed.z += sway * 0.6;
      `,
    );
  };

  const reedsInst = new THREE.InstancedMesh(reedGeo, reedMat, REED_COUNT);
  for (let i = 0; i < REED_COUNT; i++) {
    const rz = rng.range(-20, 9);
    const curveX = 2.6 + Math.sin(rz * 0.14) * 3.2;
    const bankSide = i % 2 === 0 ? -1 : 1;
    const rx = curveX + bankSide * rng.range(1.1, 3.8);
    const ry = groundHeightAt(rx, rz) - 0.05;
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set(rng.range(-0.14, 0.14), rng.range(0, Math.PI * 2), rng.range(-0.14, 0.14));
    dummy.scale.set(rng.range(0.7, 1.3), rng.range(0.65, 1.35), rng.range(0.7, 1.3));
    dummy.updateMatrix();
    reedsInst.setMatrixAt(i, dummy.matrix);

    tint.setHSL(0.24 + rng.range(-0.04, 0.04), 0.24, 0.22 + rng.range(-0.05, 0.06));
    reedsInst.setColorAt(i, tint);
  }
  reedsInst.instanceMatrix.needsUpdate = true;
  if (reedsInst.instanceColor) reedsInst.instanceColor.needsUpdate = true;
  reedsInst.computeBoundingSphere();
  group.add(reedsInst);

  // Pale-blue/amber swamp moss fungi clusters near shrine & damp logs
  const FUNGI_COUNT = 28;
  const fungiGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.12, 5));
  fungiGeo.translate(0, 0.07, 0);
  const fungiMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c7c74,
      emissive: 0x4ca89c,
      emissiveIntensity: 0.45,
      roughness: 0.65,
    }),
  );
  const fungiInst = new THREE.InstancedMesh(fungiGeo, fungiMat, FUNGI_COUNT);
  for (let i = 0; i < FUNGI_COUNT; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(2.2, 14.5);
    const fx = Math.cos(a) * r;
    const fz = Math.sin(a) * r - 5;
    dummy.position.set(fx, groundHeightAt(fx, fz) - 0.01, fz);
    dummy.rotation.set(rng.range(-0.15, 0.15), rng.range(0, Math.PI * 2), rng.range(-0.15, 0.15));
    dummy.scale.setScalar(rng.range(0.7, 1.45));
    dummy.updateMatrix();
    fungiInst.setMatrixAt(i, dummy.matrix);
  }
  fungiInst.instanceMatrix.needsUpdate = true;
  fungiInst.computeBoundingSphere();
  group.add(fungiInst);

  // =========================================================================
  // 8. Zero-CPU GPU Shader Campfire Ember Sparks
  // =========================================================================
  const SPARK_COUNT = 26;
  const sparkBase = new Float32Array(SPARK_COUNT * 3);
  const sparkSeedAttr = new Float32Array(SPARK_COUNT * 3);
  for (let i = 0; i < SPARK_COUNT; i++) {
    sparkBase[i * 3] = fireX;
    sparkBase[i * 3 + 1] = fireY + 0.32;
    sparkBase[i * 3 + 2] = fireZ;
    sparkSeedAttr[i * 3] = rng.range(0, 1);
    sparkSeedAttr[i * 3 + 1] = rng.range(0.32, 0.68);
    sparkSeedAttr[i * 3 + 2] = rng.range(-0.5, 0.5);
  }
  const sparkGeo = trackGeo(new THREE.BufferGeometry());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkBase, 3));
  sparkGeo.setAttribute('aSeed', new THREE.BufferAttribute(sparkSeedAttr, 3));
  const sparkUniforms = { uTime: { value: 0 } };
  const sparkMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: sparkUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aSeed;
        uniform float uTime;
        varying float vLife;
        void main() {
          float t = fract(aSeed.x + uTime * aSeed.y);
          vLife = t;
          vec3 p = position;
          p.x += sin(t * 6.0 + aSeed.x * 18.0) * 0.22 + aSeed.z * t;
          p.y += t * 2.8;
          p.z += cos(t * 5.0 + aSeed.y * 12.0) * 0.22 - aSeed.z * t * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((1.0 - t) * 26.0 / max(1.0, -mv.z), 1.5, 6.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vLife;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float glow = smoothstep(0.5, 0.05, d);
          vec3 col = mix(vec3(1.0, 0.78, 0.3), vec3(0.95, 0.35, 0.08), vLife);
          gl_FragColor = vec4(col, glow * (1.0 - vLife) * 0.92);
        }
      `,
    }),
  );
  const sparksPoints = new THREE.Points(sparkGeo, sparkMat);
  sparksPoints.frustumCulled = false;
  group.add(sparksPoints);

  return {
    group,
    fireLight,
    idolEmberLight: shrine.emberLight,
    update(elapsed, fireBaseIntensity, tod) {
      const flicker = 0.88 + Math.sin(elapsed * 9.3) * 0.08 + Math.sin(elapsed * 16.7) * 0.05;
      fireLight.intensity = fireBaseIntensity * flicker;
      for (let i = 0; i < flamePlanes.length; i++) {
        const fp = flamePlanes[i];
        fp.scale.set(0.92 + Math.sin(elapsed * 11 + i) * 0.14, 0.88 + Math.cos(elapsed * 14 + i) * 0.22, 1);
      }

      textures.waterNormal.offset.set(elapsed * 0.015, elapsed * 0.022);
      waterUniforms.uTime.value = elapsed;
      windUniforms.uTime.value = elapsed;
      sparkUniforms.uTime.value = elapsed;
      fungiMat.emissiveIntensity = tod === 'night' ? 0.95 : tod === 'dusk' ? 0.62 : 0.28;

      shrine.update(elapsed, fireBaseIntensity);
      barrow.update(elapsed, tod);
      hutLeft.update(elapsed, tod);
      hutRight.update(elapsed, tod);
      hutFar.update(elapsed, tod);
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
