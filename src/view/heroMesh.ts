import * as THREE from 'three';
import type { BladeKind } from '../core/events';
import type { AAATextureSuite } from './textures';

export type HeroStance = 'idle' | 'svarog' | 'silver_ready' | 'steel_ready';

export interface HeroVisualRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  cloak: THREE.Mesh;
  medallion: THREE.Mesh;
  setStance(stance: HeroStance): void;
  setBlade(blade: BladeKind, tier: number, drawn: boolean): void;
  update(opts: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    gaitPhase: number;
    isMoving: boolean;
    isDashing: boolean;
    isGrounded?: boolean;
    squashY?: number;
    attackPhase?: 'idle' | 'startup' | 'active' | 'recovery';
    attackProgress?: number;
    comboIndex?: number;
    attackHeavy?: boolean;
    castingSign?: 'svarog' | 'veles' | 'makosh' | 'mara' | null;
    hurtFlash?: boolean;
    dt: number;
  }): void;
  dispose(): void;
}

export function createHeroVisual(contactShadowTex: THREE.Texture, textures?: AAATextureSuite): HeroVisualRig {
  const root = new THREE.Group();
  root.name = 'hero_vedun';

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

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

  const leatherMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x241e19, roughness: 0.68, metalness: 0.12 }));
  const trousersMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x191f24, roughness: 0.86, metalness: 0.04 }));
  const cloakMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x181e1d, roughness: 0.94, metalness: 0.02, side: THREE.DoubleSide }),
  );
  const furMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x2d302c, roughness: 0.95, metalness: 0.02 }));
  const chainmailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb2bec4,
      map: textures?.chainmailAlbedo ?? null,
      roughnessMap: textures?.chainmailRoughness ?? null,
      normalMap: textures?.chainmailNormal ?? null,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughness: textures ? 1.0 : 0.34,
      metalness: 0.86,
    }),
  );
  const brassMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xb38a46, roughness: 0.28, metalness: 0.88 }));
  const steelMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xb2c0c8, roughness: 0.18, metalness: 0.95 }));
  const silverMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8f0fa,
      roughness: 0.14,
      metalness: 0.96,
      emissive: 0x62a8c4,
      emissiveIntensity: 0.95,
    }),
  );
  const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x9f8572, roughness: 0.64, metalness: 0.02 }));
  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc8d0d2,
      map: textures?.hairAlbedo ?? null,
      roughness: 0.78,
      metalness: 0.06,
    }),
  );
  const medallionMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb8dce8,
      roughness: 0.18,
      metalness: 0.92,
      emissive: 0xb8dce8,
      emissiveIntensity: 1.45,
    }),
  );
  const emberSashMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c221d, roughness: 0.78, metalness: 0.06 }));
  const svarogFlameMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures?.svarogStreamTex ?? textures?.fireFlameSprite ?? null,
      color: 0xffd078,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const svarogCoreMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff9426, transparent: true, opacity: 0.72, depthWrite: false }),
  );

  // Contact shadow disc
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.78 }),
  );
  const shadowDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(1.02, 24)), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  // Legs
  const legGeo = trackGeo(new THREE.CylinderGeometry(0.115, 0.088, 0.88, 10));
  const bootGeo = trackGeo(new THREE.BoxGeometry(0.165, 0.25, 0.3));
  const cuffGeo = trackGeo(new THREE.CylinderGeometry(0.105, 0.095, 0.12, 10));
  const kneeGeo = trackGeo(new THREE.BoxGeometry(0.15, 0.13, 0.07));

  const makeLeg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.16, 0.88, 0);
    const thigh = new THREE.Mesh(legGeo, trousersMat);
    thigh.position.y = -0.44;
    thigh.castShadow = true;
    const knee = new THREE.Mesh(kneeGeo, leatherMat);
    knee.position.set(0, -0.42, 0.09);
    const cuff = new THREE.Mesh(cuffGeo, leatherMat);
    cuff.position.set(0, -0.56, 0);
    const boot = new THREE.Mesh(bootGeo, leatherMat);
    boot.position.set(0, -0.76, 0.04);
    boot.castShadow = true;
    g.add(thigh, knee, cuff, boot);
    return g;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyPivot.add(leftLeg, rightLeg);

  // Torso
  const chestMail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.285, 0.23, 0.42, 12)), chainmailMat);
  chestMail.position.y = 1.32;
  chestMail.castShadow = true;
  const leatherChest = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.27, 0.22, 0.34, 12)), leatherMat);
  leatherChest.position.y = 1.08;
  leatherChest.castShadow = true;
  const skirt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.23, 0.3, 0.28, 12)), leatherMat);
  skirt.position.y = 0.82;
  skirt.castShadow = true;
  const baldric = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.085, 0.68, 0.52)), leatherMat);
  baldric.position.set(0, 1.22, 0);
  baldric.rotation.z = 0.56;
  const buckle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.09, 0.06)), brassMat);
  buckle.position.set(0.02, 0.94, 0.24);
  const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.245, 0.25, 0.11, 12)), emberSashMat);
  belt.position.y = 0.93;
  belt.castShadow = true;
  bodyPivot.add(chestMail, leatherChest, skirt, baldric, buckle, belt);

  // Pauldrons
  const pauldronGeo = trackGeo(new THREE.SphereGeometry(0.165, 10, 8));
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(pauldronGeo, chainmailMat);
    p.scale.set(1.15, 0.72, 1.05);
    p.position.set(side * 0.31, 1.48, 0);
    p.castShadow = true;
    const strap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.06, 0.28)), leatherMat);
    strap.position.set(side * 0.29, 1.43, 0);
    bodyPivot.add(p, strap);
  }

  // Arms
  const upperArmGeo = trackGeo(new THREE.CylinderGeometry(0.082, 0.072, 0.34, 8));
  const vambraceGeo = trackGeo(new THREE.CylinderGeometry(0.074, 0.058, 0.3, 8));
  const handGeo = trackGeo(new THREE.SphereGeometry(0.062, 8, 8));

  const makeArm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.33, 1.44, 0);
    const upper = new THREE.Mesh(upperArmGeo, chainmailMat);
    upper.position.y = -0.15;
    upper.castShadow = true;
    const vambrace = new THREE.Mesh(vambraceGeo, leatherMat);
    vambrace.position.y = -0.42;
    vambrace.castShadow = true;
    const glove = new THREE.Mesh(handGeo, leatherMat);
    glove.position.y = -0.58;
    g.add(upper, vambrace, glove);
    return g;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bodyPivot.add(leftArm, rightArm);

  // Drawn Sword (Steel or Silver)
  const drawnSwordGroup = new THREE.Group();
  drawnSwordGroup.position.set(0, -0.58, 0.08);
  drawnSwordGroup.rotation.x = Math.PI / 2 - 0.15;
  const drawnGrip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.022, 0.24, 8)), leatherMat);
  const drawnGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.028, 0.035)), brassMat);
  drawnGuard.position.y = 0.12;
  const drawnBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.045, 1.12, 0.015)), silverMat);
  drawnBlade.position.y = 0.69;
  drawnBlade.castShadow = true;
  drawnSwordGroup.add(drawnGrip, drawnGuard, drawnBlade);
  drawnSwordGroup.visible = false;
  rightArm.add(drawnSwordGroup);

  // Svarog Flame Stream
  const svarogGroup = new THREE.Group();
  svarogGroup.position.set(0, -0.58, 0.04);
  svarogGroup.rotation.x = Math.PI;
  const palmBurstMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffe49e, transparent: true, opacity: 0.95 }),
  );
  const palmBurst = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 8, 8)), palmBurstMat);
  palmBurst.position.y = 0.04;

  const flamePlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.05, 3.1)), svarogFlameMat);
  flamePlane.position.y = 1.55;
  const flamePlane2 = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.05, 3.1)), svarogFlameMat);
  flamePlane2.position.y = 1.55;
  flamePlane2.rotation.y = Math.PI / 2;
  const flamePlane3 = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.85, 2.75)), svarogFlameMat);
  flamePlane3.position.y = 1.38;
  flamePlane3.rotation.y = Math.PI / 4;
  const flameCore = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.34, 2.35, 8, 1, true)), svarogCoreMat);
  flameCore.position.y = 1.25;
  flameCore.rotation.x = Math.PI;

  const svarogSparkGeo = trackGeo(new THREE.SphereGeometry(0.042, 5, 5));
  const svarogSparkMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  for (let s = 0; s < 12; s++) {
    const sp = new THREE.Mesh(svarogSparkGeo, svarogSparkMat);
    const t = 0.25 + (s / 11) * 2.55;
    sp.position.set(Math.sin(s * 2.1) * (0.1 + t * 0.14), t, Math.cos(s * 1.7) * (0.1 + t * 0.14));
    svarogGroup.add(sp);
  }
  const svarogLight = new THREE.PointLight(0xf28c28, 0, 18, 1.3);
  svarogLight.position.set(0, 1.35, 0);
  svarogGroup.add(palmBurst, flameCore, flamePlane, flamePlane2, flamePlane3, svarogLight);
  svarogGroup.visible = false;
  leftArm.add(svarogGroup);

  // Head & Hair
  const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.148, 12, 10)), skinMat);
  head.position.y = 1.69;
  head.scale.set(0.92, 1.08, 1.0);
  head.castShadow = true;
  const brow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.038, 0.08)), skinMat);
  brow.position.set(0, 1.72, 0.11);
  const hairCrown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.125, 0.155, 0.18, 9)), hairMat);
  hairCrown.position.set(0, 1.77, -0.02);
  hairCrown.rotation.x = -0.28;
  const sideLockL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.055, 0.22, 0.11)), hairMat);
  sideLockL.position.set(-0.125, 1.66, -0.02);
  sideLockL.rotation.z = 0.16;
  const sideLockR = sideLockL.clone();
  sideLockR.position.x = 0.125;
  sideLockR.rotation.z = -0.16;
  const ponytail = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.068, 0.34, 7)), hairMat);
  ponytail.position.set(0, 1.56, -0.18);
  ponytail.rotation.x = -0.4;
  const furCollar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.21, 0.068, 8, 16)), furMat);
  furCollar.rotation.x = Math.PI / 2 - 0.16;
  furCollar.position.y = 1.53;
  bodyPivot.add(head, brow, hairCrown, sideLockL, sideLockR, ponytail, furCollar);

  // Medallion
  const medallion = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.056, 0)), medallionMat);
  medallion.position.set(0, 1.37, 0.27);
  bodyPivot.add(medallion);

  // Draped Cape
  const cloakGeo = trackGeo(new THREE.PlaneGeometry(0.56, 1.06, 4, 6));
  const pos = cloakGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i);
    const px = pos.getX(i);
    const t = 0.53 - py;
    pos.setX(i, px * (0.65 + t * 0.52) - 0.08);
    pos.setZ(i, -0.16 - t * 0.28 + Math.abs(px) * 0.15);
    if (py < -0.42) pos.setY(i, py - Math.sin(px * 9) * 0.08);
  }
  cloakGeo.computeVertexNormals();
  const cloak = new THREE.Mesh(cloakGeo, cloakMat);
  cloak.position.set(-0.08, 1.02, -0.14);
  cloak.castShadow = true;
  bodyPivot.add(cloak);

  // Back Scabbards
  const scabbardGeo = trackGeo(new THREE.BoxGeometry(0.058, 1.08, 0.034));
  const hiltGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.024, 0.28, 8));
  const guardGeo = trackGeo(new THREE.BoxGeometry(0.25, 0.034, 0.044));
  const pommelGeo = trackGeo(new THREE.OctahedronGeometry(0.036, 0));

  const buildBladeOnBack = (angleZ: number, offsetX: number, bladeMat: THREE.Material) => {
    const grp = new THREE.Group();
    grp.position.set(offsetX, 1.24, -0.3);
    grp.rotation.z = angleZ;
    grp.rotation.y = 0.1;
    const scabbard = new THREE.Mesh(scabbardGeo, leatherMat);
    const chape = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.036, 0.1, 4)), brassMat);
    chape.position.y = -0.55;
    chape.rotation.x = Math.PI;
    const hilt = new THREE.Mesh(hiltGeo, leatherMat);
    hilt.position.y = 0.65;
    const guard = new THREE.Mesh(guardGeo, bladeMat);
    guard.position.y = 0.52;
    const pommel = new THREE.Mesh(pommelGeo, bladeMat);
    pommel.position.y = 0.8;
    scabbard.castShadow = true;
    grp.add(scabbard, chape, hilt, guard, pommel);
    return grp;
  };
  bodyPivot.add(buildBladeOnBack(0.42, -0.04, steelMat));
  bodyPivot.add(buildBladeOnBack(-0.34, 0.08, silverMat));

  let smoothLean = 0;
  let currentStance: HeroStance = 'idle';
  let bladeDrawn = false;

  return {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    cloak,
    medallion,
    setStance(stance) {
      currentStance = stance;
      drawnSwordGroup.visible = bladeDrawn || stance === 'silver_ready' || stance === 'svarog' || stance === 'steel_ready';
      svarogGroup.visible = stance === 'svarog';
      svarogLight.intensity = stance === 'svarog' ? 4.8 : 0;
    },
    setBlade(blade, tier, drawn) {
      bladeDrawn = drawn;
      drawnSwordGroup.visible = drawn || currentStance !== 'idle';
      drawnBlade.material = blade === 'silver' ? silverMat : steelMat;
      silverMat.emissiveIntensity = 0.85 + (tier - 1) * 0.45;
    },
    update({
      x,
      y,
      z,
      yaw,
      gaitPhase,
      isMoving,
      isDashing,
      isGrounded = true,
      squashY = 1,
      attackPhase = 'idle',
      comboIndex = 0,
      attackHeavy = false,
      castingSign = null,
      hurtFlash = false,
      dt,
    }) {
      root.position.set(x, y, z);
      root.rotation.y = yaw;

      // Ground contact shadow shrinks gently when jumping high
      const invSquash = 1 / Math.sqrt(Math.max(0.65, squashY));
      bodyPivot.scale.set(invSquash, squashY, invSquash);
      shadowDisc.scale.setScalar(isGrounded ? 1.0 : 0.72);

      const t = performance.now() * 0.002;
      const stride = !isGrounded ? 0.55 : isMoving ? Math.sin(gaitPhase) : 0;
      const bounce = !isGrounded ? 0 : isMoving ? Math.abs(Math.cos(gaitPhase)) * 0.05 : Math.sin(t) * 0.012;
      bodyPivot.position.y = bounce;

      const targetLean = isDashing ? 0.38 : !isGrounded ? 0.16 : isMoving ? 0.13 : currentStance !== 'idle' ? 0.16 : 0.02;
      smoothLean += (targetLean - smoothLean) * (1 - Math.exp(-12 * dt));
      bodyPivot.rotation.x = smoothLean;

      leftLeg.rotation.x = stride * 0.58;
      rightLeg.rotation.x = -stride * 0.58;

      svarogGroup.visible = currentStance === 'svarog' || castingSign === 'svarog';
      svarogLight.intensity = svarogGroup.visible ? 4.8 : 0;

      if (attackPhase !== 'idle') {
        const signDir = comboIndex % 2 === 0 ? 1 : -1;
        if (attackPhase === 'startup') {
          rightArm.rotation.x = -1.65;
          rightArm.rotation.z = attackHeavy ? 0.95 : 0.75 * signDir;
          bodyPivot.rotation.y = -0.35 * signDir;
        } else if (attackPhase === 'active') {
          rightArm.rotation.x = -0.55;
          rightArm.rotation.z = -0.85 * signDir;
          bodyPivot.rotation.y = 0.42 * signDir;
        } else {
          rightArm.rotation.x = -0.35;
          rightArm.rotation.z = -0.4 * signDir;
          bodyPivot.rotation.y *= 0.85;
        }
        leftArm.rotation.x = -0.45;
        leftArm.rotation.z = -0.35;
      } else if (castingSign === 'svarog' || currentStance === 'svarog') {
        bodyPivot.rotation.y = 0;
        leftArm.rotation.x = -1.52 + Math.sin(t * 4) * 0.03;
        leftArm.rotation.z = -0.12;
        rightArm.rotation.x = 0.42;
        rightArm.rotation.z = 0.36;
        flamePlane.scale.set(1 + Math.sin(t * 9) * 0.16, 1 + Math.cos(t * 11) * 0.14, 1);
        flamePlane2.scale.copy(flamePlane.scale);
        flamePlane3.scale.copy(flamePlane.scale);
      } else if (castingSign) {
        bodyPivot.rotation.y = 0;
        leftArm.rotation.x = -1.35;
        leftArm.rotation.z = -0.45;
        rightArm.rotation.x = -0.45;
        rightArm.rotation.z = 0.65;
      } else if (currentStance === 'silver_ready' && !isMoving) {
        bodyPivot.rotation.y = 0;
        rightArm.rotation.x = -0.36;
        rightArm.rotation.z = 0.78;
        leftArm.rotation.x = -0.48;
        leftArm.rotation.z = -0.25;
      } else {
        bodyPivot.rotation.y = 0;
        leftArm.rotation.x = -stride * 0.42;
        leftArm.rotation.z = -0.06;
        rightArm.rotation.x = bladeDrawn ? -0.42 + stride * 0.2 : stride * 0.42;
        rightArm.rotation.z = bladeDrawn ? 0.42 : 0.06;
      }

      cloak.rotation.x = smoothLean * 0.8 + (isMoving ? 0.16 + Math.abs(stride) * 0.08 : 0.05 + Math.sin(t * 1.4) * 0.03);
      medallionMat.emissive.setHex(hurtFlash ? 0xff3b3b : 0xb8dce8);
      medallionMat.emissiveIntensity = hurtFlash ? 3.2 : 1.45;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
