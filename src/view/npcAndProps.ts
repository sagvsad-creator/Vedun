import * as THREE from 'three';
import type { AAATextureSuite } from './textures';

export interface SimpleVisualActor {
  root: THREE.Group;
  update(elapsed: number, extra?: { hitFlash?: boolean; windup?: boolean; burning?: boolean }): void;
  dispose(): void;
}

export function createSlavicNpcVisual(
  contactShadowTex: THREE.Texture,
  role: 'zoryana' | 'miroslav',
): SimpleVisualActor {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const tg = <T extends THREE.BufferGeometry>(g: T) => {
    geos.push(g);
    return g;
  };
  const tm = <T extends THREE.Material>(m: T) => {
    mats.push(m);
    return m;
  };

  const shadow = new THREE.Mesh(
    tg(new THREE.CircleGeometry(0.85, 20)),
    tm(new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.72 })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const tunicMat = tm(
    new THREE.MeshStandardMaterial({
      color: role === 'zoryana' ? 0x3b2c2a : 0x262930,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );
  const shawlMat = tm(
    new THREE.MeshStandardMaterial({
      color: role === 'zoryana' ? 0x6b322b : 0x3a2f22,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );
  const skinMat = tm(new THREE.MeshStandardMaterial({ color: 0xa48a76, roughness: 0.65 }));
  const hairMat = tm(
    new THREE.MeshStandardMaterial({ color: role === 'zoryana' ? 0x3e261a : 0x9aa09e, roughness: 0.82 }),
  );
  const brassMat = tm(new THREE.MeshStandardMaterial({ color: 0xc29848, roughness: 0.3, metalness: 0.85 }));

  const pivot = new THREE.Group();
  root.add(pivot);

  const skirt = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.22, 0.36, 0.9, 10)), tunicMat);
  skirt.position.y = 0.45;
  skirt.castShadow = true;

  const torso = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.26, 0.21, 0.56, 10)), shawlMat);
  torso.position.y = 1.15;
  torso.castShadow = true;

  const shoulderDrape = new THREE.Mesh(tg(new THREE.TorusGeometry(0.23, 0.08, 6, 12)), shawlMat);
  shoulderDrape.rotation.x = Math.PI / 2;
  shoulderDrape.position.y = 1.4;

  const armGeo = tg(new THREE.CylinderGeometry(0.065, 0.052, 0.48, 7));
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, tunicMat);
    arm.position.set(s * 0.28, 1.12, 0.06);
    arm.rotation.z = s * 0.22;
    arm.rotation.x = -0.35;
    pivot.add(arm);
  }

  const head = new THREE.Mesh(tg(new THREE.SphereGeometry(0.135, 10, 8)), skinMat);
  head.position.y = 1.62;
  head.castShadow = true;

  const headwear = new THREE.Mesh(
    tg(role === 'zoryana' ? new THREE.DodecahedronGeometry(0.155, 0) : new THREE.CylinderGeometry(0.145, 0.16, 0.16, 8)),
    role === 'zoryana' ? shawlMat : hairMat,
  );
  headwear.position.set(0, role === 'zoryana' ? 1.64 : 1.7, -0.02);

  pivot.add(skirt, torso, shoulderDrape, head, headwear);

  if (role === 'zoryana') {
    const lanternMat = tm(
      new THREE.MeshStandardMaterial({
        color: 0xf2b44c,
        emissive: 0xf28c28,
        emissiveIntensity: 2.3,
        roughness: 0.2,
      }),
    );
    const lantern = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.09, 0)), lanternMat);
    lantern.position.set(0.36, 1.05, 0.18);
    pivot.add(lantern);
  } else {
    const staff = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.025, 0.022, 1.75, 6)), shawlMat);
    staff.position.set(-0.34, 0.88, 0.14);
    const knob = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.055, 0)), brassMat);
    knob.position.set(-0.34, 1.76, 0.14);
    pivot.add(staff, knob);
  }

  return {
    root,
    update(elapsed) {
      pivot.position.y = Math.sin(elapsed * 1.7 + (role === 'zoryana' ? 0 : 1.5)) * 0.015;
      head.rotation.y = Math.sin(elapsed * 0.7) * 0.14;
    },
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

export function createDrownerVisual(contactShadowTex: THREE.Texture, seedPhase = 0): SimpleVisualActor {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const tg = <T extends THREE.BufferGeometry>(g: T) => {
    geos.push(g);
    return g;
  };
  const tm = <T extends THREE.Material>(m: T) => {
    mats.push(m);
    return m;
  };

  const shadow = new THREE.Mesh(
    tg(new THREE.CircleGeometry(0.75, 18)),
    tm(new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.72 })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const skinMat = tm(
    new THREE.MeshStandardMaterial({ color: 0x264446, roughness: 0.34, metalness: 0.08, flatShading: true }),
  );
  const finMat = tm(new THREE.MeshStandardMaterial({ color: 0x3b6a64, roughness: 0.5, flatShading: true }));
  const eyeMat = tm(
    new THREE.MeshStandardMaterial({ color: 0x99f2c8, emissive: 0x4de6a8, emissiveIntensity: 2.5 }),
  );

  const pivot = new THREE.Group();
  root.add(pivot);

  const torso = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.17, 0.12, 0.62, 7)), skinMat);
  torso.position.set(0, 0.78, 0.08);
  torso.rotation.x = 0.42;
  torso.castShadow = true;

  const dorsalFin = new THREE.Mesh(tg(new THREE.ConeGeometry(0.06, 0.38, 4)), finMat);
  dorsalFin.position.set(0, 0.92, -0.08);
  dorsalFin.rotation.x = -0.6;

  const head = new THREE.Mesh(tg(new THREE.DodecahedronGeometry(0.13, 0)), skinMat);
  head.position.set(0, 1.12, 0.25);
  head.scale.set(0.85, 0.95, 1.15);

  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.06, 0.04, 0.56, 6)), skinMat);
    leg.position.set(s * 0.13, 0.28, -0.02);
    const arm = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.048, 0.032, 0.58, 6)), skinMat);
    arm.position.set(s * 0.22, 0.7, 0.24);
    arm.rotation.x = -0.75;
    const eye = new THREE.Mesh(tg(new THREE.SphereGeometry(0.02, 5, 5)), eyeMat);
    eye.position.set(s * 0.055, 1.14, 0.35);
    pivot.add(leg, arm, eye);
  }
  pivot.add(torso, dorsalFin, head);

  return {
    root,
    update(elapsed, extra) {
      pivot.position.y = Math.sin(elapsed * 3.0 + seedPhase) * 0.03;
      if (extra?.hitFlash) {
        skinMat.emissive.setHex(0xffffff);
        skinMat.emissiveIntensity = 0.85;
      } else if (extra?.burning) {
        skinMat.emissive.setHex(0xf28c28);
        skinMat.emissiveIntensity = 0.7;
      } else {
        skinMat.emissive.setHex(extra?.windup ? 0xc9343a : 0x000000);
        skinMat.emissiveIntensity = extra?.windup ? 0.5 : 0;
      }
    },
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

export function createBanditVisual(contactShadowTex: THREE.Texture, textures: AAATextureSuite): SimpleVisualActor {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const tg = <T extends THREE.BufferGeometry>(g: T) => {
    geos.push(g);
    return g;
  };
  const tm = <T extends THREE.Material>(m: T) => {
    mats.push(m);
    return m;
  };

  const shadow = new THREE.Mesh(
    tg(new THREE.CircleGeometry(0.85, 18)),
    tm(new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.74 })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const armorMat = tm(new THREE.MeshStandardMaterial({ color: 0x3b2c26, roughness: 0.82, metalness: 0.14 }));
  const steelMat = tm(new THREE.MeshStandardMaterial({ color: 0x94a0a8, roughness: 0.35, metalness: 0.85 }));
  const woodMat = tm(
    new THREE.MeshStandardMaterial({ map: textures.woodAlbedo, color: 0x7c6244, roughness: 0.88 }),
  );
  const skinMat = tm(new THREE.MeshStandardMaterial({ color: 0x997c66, roughness: 0.7 }));

  const pivot = new THREE.Group();
  root.add(pivot);

  const torso = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.24, 0.2, 0.78, 8)), armorMat);
  torso.position.y = 1.08;
  torso.castShadow = true;

  const head = new THREE.Mesh(tg(new THREE.SphereGeometry(0.13, 8, 8)), skinMat);
  head.position.y = 1.62;
  const helm = new THREE.Mesh(tg(new THREE.ConeGeometry(0.145, 0.18, 8)), steelMat);
  helm.position.y = 1.72;

  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.08, 0.065, 0.72, 7)), armorMat);
    leg.position.set(s * 0.13, 0.36, 0);
    leg.castShadow = true;
    pivot.add(leg);
  }

  // Shield on left arm, axe on right
  const shield = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 12)), woodMat);
  shield.rotation.x = Math.PI / 2;
  shield.position.set(-0.32, 1.12, 0.22);
  shield.castShadow = true;

  const axeShaft = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6)), woodMat);
  axeShaft.position.set(0.32, 1.08, 0.22);
  axeShaft.rotation.x = 0.8;
  const axeHead = new THREE.Mesh(tg(new THREE.BoxGeometry(0.04, 0.22, 0.18)), steelMat);
  axeHead.position.set(0.32, 1.24, 0.5);

  pivot.add(torso, head, helm, shield, axeShaft, axeHead);

  return {
    root,
    update(elapsed, extra) {
      pivot.position.y = Math.sin(elapsed * 2.2) * 0.02;
      if (extra?.hitFlash) {
        armorMat.emissive.setHex(0xffffff);
        armorMat.emissiveIntensity = 0.8;
      } else if (extra?.burning) {
        armorMat.emissive.setHex(0xf28c28);
        armorMat.emissiveIntensity = 0.65;
      } else {
        armorMat.emissive.setHex(extra?.windup ? 0xc9343a : 0x000000);
        armorMat.emissiveIntensity = extra?.windup ? 0.5 : 0;
      }
    },
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
