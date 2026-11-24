import * as THREE from 'three';
import type { AAATextureSuite } from './textures';

export interface CreatureVisualRig {
  root: THREE.Group;
  update(elapsed: number): void;
  dispose(): void;
}

export function createLeshyVisual(contactShadowTex: THREE.Texture, textures: AAATextureSuite): CreatureVisualRig {
  const root = new THREE.Group();
  root.name = 'SK_Leshy_Boss';

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

  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb6aa96,
      map: textures.woodAlbedo,
      roughnessMap: textures.woodRoughness,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  const mossMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b2618,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: true,
    }),
  );
  const skullMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c5344,
      roughness: 0.82,
      metalness: 0.04,
      flatShading: true,
    }),
  );
  const amberEyeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffaa3c,
      emissive: 0xf28c28,
      emissiveIntensity: 3.1,
      roughness: 0.2,
    }),
  );
  const cavityMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b0c0a,
      roughness: 0.96,
    }),
  );

  const shadowDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(1.55, 24)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.8,
      }),
    ),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Gnarled Root Legs + Spreading Root Feet
  for (const side of [-1, 1]) {
    const legCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.46, 0.0, 0.14),
      new THREE.Vector3(side * 0.36, 0.65, -0.08),
      new THREE.Vector3(side * 0.24, 1.28, 0.05),
    ]);
    const leg = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(legCurve, 10, 0.13, 7, false)), barkMat);
    leg.castShadow = true;
    bodyPivot.add(leg);

    for (let r = -1; r <= 1; r++) {
      const rootClaw = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.075, 0.55, 5)), barkMat);
      rootClaw.position.set(side * 0.46 + r * 0.14, 0.08, 0.26);
      rootClaw.rotation.x = Math.PI / 2 - 0.28;
      rootClaw.rotation.z = -r * 0.35;
      bodyPivot.add(rootClaw);
    }
  }

  // Tapered Twisted Bark Torso + Vertical Bark Ridges
  const torso = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.24, 1.32, 9)), barkMat);
  torso.position.y = 1.76;
  torso.rotation.x = 0.16;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const ribBarkGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.05, 1.25, 5));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const rb = new THREE.Mesh(ribBarkGeo, barkMat);
    rb.position.set(Math.cos(a) * 0.26, 1.78, Math.sin(a) * 0.24 + 0.04);
    rb.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.12;
    bodyPivot.add(rb);
  }

  const sapCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.095, 7, 7)), amberEyeMat);
  sapCore.position.set(0, 1.82, 0.28);
  bodyPivot.add(sapCore);

  // Jagged Dead-Wood Shoulder Branches + Subtle Lichen Crevice Tufts
  for (const side of [-1, 1]) {
    const shoulderSpur = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.095, 1.05, 6)), barkMat);
    shoulderSpur.position.set(side * 0.56, 2.58, -0.14);
    shoulderSpur.rotation.z = side * -0.52;
    shoulderSpur.rotation.x = -0.22;
    shoulderSpur.castShadow = true;

    const subSpur = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.055, 0.65, 5)), barkMat);
    subSpur.position.set(side * 0.78, 2.86, -0.24);
    subSpur.rotation.z = side * -0.88;
    subSpur.rotation.x = -0.1;

    const mossPatch = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.18, 0)), mossMat);
    mossPatch.position.set(side * 0.34, 2.26, -0.05);
    mossPatch.scale.set(0.95, 0.65, 0.9);
    bodyPivot.add(shoulderSpur, subSpur, mossPatch);
  }

  // Long Twisted Bark Arms + Gnarled Claws
  const armGroupL = new THREE.Group();
  const armGroupR = new THREE.Group();
  for (const [side, grp] of [
    [-1, armGroupL],
    [1, armGroupR],
  ] as const) {
    grp.position.set(side * 0.54, 2.24, 0.05);
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.34, -0.52, 0.24),
      new THREE.Vector3(side * 0.42, -1.16, 0.54),
    ]);
    const armMesh = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(armCurve, 12, 0.095, 6, false)), barkMat);
    armMesh.castShadow = true;
    grp.add(armMesh);
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.028, 0.42, 5)), barkMat);
      claw.position.set(side * 0.42 + c * 0.07, -1.32, 0.6);
      claw.rotation.x = 0.62;
      grp.add(claw);
    }
    bodyPivot.add(grp);
  }

  // Sculpted Forward-Facing Deer Skull + Recessed Eye Hollows + Sweeping Antlers
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.58, 0.2);
  const cranium = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.19, 0)), skullMat);
  cranium.scale.set(0.86, 0.95, 1.12);
  cranium.castShadow = true;
  const snout = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.13, 0.42, 6)), skullMat);
  snout.rotation.x = Math.PI / 2 + 0.28;
  snout.position.set(0, -0.1, 0.22);
  snout.scale.set(0.85, 1.0, 0.72);
  const mouthVoid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.14, 0.12)), cavityMat);
  mouthVoid.position.set(0, -0.15, 0.16);
  headGroup.add(cranium, snout, mouthVoid);

  for (const side of [-1, 1]) {
    const eyeSocket = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 6, 6)), cavityMat);
    eyeSocket.position.set(side * 0.095, 0.03, 0.14);
    const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.018, 6, 6)), amberEyeMat);
    eye.position.set(side * 0.095, 0.03, 0.17);
    headGroup.add(eyeSocket, eye);

    const beamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.09, 0.14, -0.02),
      new THREE.Vector3(side * 0.56, 0.68, -0.12),
      new THREE.Vector3(side * 0.94, 1.24, 0.08),
      new THREE.Vector3(side * 0.82, 1.66, 0.24),
    ]);
    const antlerBeam = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(beamCurve, 12, 0.036, 6, false)), skullMat);
    antlerBeam.castShadow = true;
    headGroup.add(antlerBeam);

    const tine1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.025, 0.5, 5)), skullMat);
    tine1.position.set(side * 0.52, 0.88, 0.02);
    tine1.rotation.z = side * 0.28;
    const tine2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.022, 0.44, 5)), skullMat);
    tine2.position.set(side * 0.86, 1.3, 0.22);
    tine2.rotation.x = 0.45;
    headGroup.add(tine1, tine2);
  }
  bodyPivot.add(headGroup);

  return {
    root,
    update(elapsed) {
      bodyPivot.rotation.z = Math.sin(elapsed * 0.9) * 0.035;
      bodyPivot.position.y = Math.sin(elapsed * 1.4) * 0.025;
      armGroupL.rotation.x = Math.sin(elapsed * 1.1) * 0.08;
      armGroupR.rotation.x = -Math.sin(elapsed * 1.1) * 0.08;
      headGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.14;
      amberEyeMat.emissiveIntensity = 2.6 + Math.sin(elapsed * 3.2) * 0.5;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

export function createGhoulVisual(contactShadowTex: THREE.Texture, seedPhase = 0): CreatureVisualRig {
  const root = new THREE.Group();
  root.name = 'SK_Ghoul_Upyr';

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

  // Dark gaunt wet corpse flesh (moonlight grazes rims cleanly without glowing flat pastel)
  const fleshMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c3431,
      roughness: 0.52,
      metalness: 0.06,
      flatShading: true,
    }),
  );
  const ribMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4c4d44,
      roughness: 0.72,
      metalness: 0.04,
      flatShading: true,
    }),
  );
  const socketMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090b0b,
      roughness: 0.95,
    }),
  );
  const feralEyeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff3b3b,
      emissive: 0xc9343a,
      emissiveIntensity: 3.0,
      roughness: 0.2,
    }),
  );

  const shadowDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.82, 20)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.76,
      }),
    ),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const pivot = new THREE.Group();
  root.add(pivot);

  // Crouched Humanoid Thigh + Shin Legs
  const thighGeo = trackGeo(new THREE.CylinderGeometry(0.078, 0.055, 0.44, 7));
  const shinGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.036, 0.44, 7));
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(thighGeo, fleshMat);
    thigh.position.set(side * 0.15, 0.42, 0.0);
    thigh.rotation.x = -0.68;
    thigh.castShadow = true;

    const shin = new THREE.Mesh(shinGeo, fleshMat);
    shin.position.set(side * 0.15, 0.2, -0.05);
    shin.rotation.x = 0.48;
    shin.castShadow = true;
    pivot.add(thigh, shin);
  }

  // Gaunt Pelvis + Hunched Sinewy Ribcage & Spine
  const pelvis = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.145, 0)), fleshMat);
  pelvis.position.set(0, 0.56, -0.04);
  pelvis.scale.set(1.05, 0.75, 0.88);

  const waist = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.11, 0.28, 7)), fleshMat);
  waist.position.set(0, 0.7, 0.06);
  waist.rotation.x = 0.55;

  const upperChest = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.21, 0)), fleshMat);
  upperChest.position.set(0, 0.9, 0.19);
  upperChest.scale.set(1.14, 0.86, 1.12);
  upperChest.castShadow = true;
  pivot.add(pelvis, waist, upperChest);

  // Subtle bone ridges flush against chest + dorsal spine spikes
  for (let r = 0; r < 3; r++) {
    const spine = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.025, 0.1, 4)), ribMat);
    spine.position.set(0, 0.82 + r * 0.08, 0.04 + r * 0.04);
    spine.rotation.x = -0.9;
    pivot.add(spine);
  }

  // Bent Clawed Forelimbs Reaching Forward Low Over Reeds
  const upperArmG = trackGeo(new THREE.CylinderGeometry(0.056, 0.042, 0.44, 7));
  const foreArmG = trackGeo(new THREE.CylinderGeometry(0.04, 0.026, 0.46, 7));
  const clawG = trackGeo(new THREE.ConeGeometry(0.015, 0.11, 4));
  for (const side of [-1, 1]) {
    const uArm = new THREE.Mesh(upperArmG, fleshMat);
    uArm.position.set(side * 0.25, 0.78, 0.3);
    uArm.rotation.x = -0.68;
    uArm.rotation.z = side * 0.2;
    uArm.castShadow = true;

    const fArm = new THREE.Mesh(foreArmG, fleshMat);
    fArm.position.set(side * 0.27, 0.45, 0.48);
    fArm.rotation.x = 0.28;
    fArm.castShadow = true;
    pivot.add(uArm, fArm);

    for (let c = -1; c <= 1; c++) {
      const cl = new THREE.Mesh(clawG, ribMat);
      cl.position.set(side * 0.27 + c * 0.025, 0.2, 0.54);
      cl.rotation.x = 2.6;
      pivot.add(cl);
    }
  }

  // Gaunt Angular Ghoul Skull + Snout + Recessed Dark Sockets with Fierce Pinpricks
  const head = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.125, 0)), fleshMat);
  head.position.set(0, 1.0, 0.41);
  head.scale.set(0.84, 0.96, 1.18);
  head.castShadow = true;
  const jaw = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.065, 0.14)), fleshMat);
  jaw.position.set(0, 0.92, 0.47);
  pivot.add(head, jaw);

  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.032, 6, 6)), socketMat);
    socket.position.set(side * 0.044, 1.01, 0.51);
    const eye = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.014, 6, 6)), feralEyeMat);
    eye.position.set(side * 0.044, 1.01, 0.532);
    pivot.add(socket, eye);
  }

  return {
    root,
    update(elapsed) {
      const t = elapsed * 2.1 + seedPhase;
      pivot.position.y = Math.sin(t) * 0.03;
      pivot.rotation.y = Math.sin(t * 0.55) * 0.16;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
