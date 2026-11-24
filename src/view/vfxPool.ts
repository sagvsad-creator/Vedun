import * as THREE from 'three';
import type { BladeKind, SignId } from '../core/events';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

const MAX_PARTICLES = 180;
const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

export class VfxPool {
  public readonly group = new THREE.Group();
  private readonly particles: ParticleSlot[] = [];
  private readonly instMesh: THREE.InstancedMesh;
  private readonly slashArc: THREE.Mesh;
  private readonly slashMat: THREE.MeshBasicMaterial;
  private readonly makoshShell: THREE.Mesh;
  private readonly velesRing: THREE.Mesh;
  private readonly velesRingMat: THREE.MeshBasicMaterial;
  private readonly senseDome: THREE.Mesh;
  private readonly senseDomeMat: THREE.MeshBasicMaterial;
  private readonly telegraphRings: THREE.Mesh[] = [];
  private readonly maraRings: THREE.Mesh[] = [];
  private readonly targetRing: THREE.Mesh;
  private readonly targetRingMat: THREE.MeshBasicMaterial;
  private readonly counterAura: THREE.Mesh;
  private readonly counterAuraMat: THREE.MeshBasicMaterial;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  private velesTimer = 0;
  private senseTimer = 0;
  private nextSlot = 0;
  private particlesDirty = false;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        life: 1,
        size: 0.1,
        r: 1,
        g: 1,
        b: 1,
      });
    }

    const pGeo = new THREE.OctahedronGeometry(0.045, 0);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.geometries.push(pGeo);
    this.materials.push(pMat);
    this.instMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.instMesh.frustumCulled = false;
    this.instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.instMesh.setMatrixAt(i, _dummy.matrix);
      this.instMesh.setColorAt(i, _tmpColor.setRGB(1, 0.7, 0.3));
    }
    this.group.add(this.instMesh);

    // Sleek angled sword slash crescent
    const arcGeo = new THREE.RingGeometry(1.52, 1.84, 24, 1, -0.85, 1.7);
    arcGeo.rotateX(-Math.PI / 2);
    this.slashMat = new THREE.MeshBasicMaterial({
      color: 0xaee6ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.geometries.push(arcGeo);
    this.materials.push(this.slashMat);
    this.slashArc = new THREE.Mesh(arcGeo, this.slashMat);
    this.slashArc.rotation.z = 0.22;
    this.group.add(this.slashArc);

    // Makosh Ward Shell
    const wardGeo = new THREE.OctahedronGeometry(1.15, 1);
    const wardMat = new THREE.MeshBasicMaterial({
      color: 0xf2b44c,
      wireframe: true,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.geometries.push(wardGeo);
    this.materials.push(wardMat);
    this.makoshShell = new THREE.Mesh(wardGeo, wardMat);
    this.makoshShell.visible = false;
    this.group.add(this.makoshShell);

    // Veles Radial Shockwave Ring
    const velesGeo = new THREE.RingGeometry(0.7, 1.0, 28);
    velesGeo.rotateX(-Math.PI / 2);
    this.velesRingMat = new THREE.MeshBasicMaterial({
      color: 0x72e2f8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.geometries.push(velesGeo);
    this.materials.push(this.velesRingMat);
    this.velesRing = new THREE.Mesh(velesGeo, this.velesRingMat);
    this.velesRing.visible = false;
    this.group.add(this.velesRing);

    // Vedun Sense Pulse Dome
    const senseGeo = new THREE.RingGeometry(0.82, 1.0, 36);
    senseGeo.rotateX(-Math.PI / 2);
    this.senseDomeMat = new THREE.MeshBasicMaterial({
      color: 0xf28c28,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.geometries.push(senseGeo);
    this.materials.push(this.senseDomeMat);
    this.senseDome = new THREE.Mesh(senseGeo, this.senseDomeMat);
    this.senseDome.visible = false;
    this.group.add(this.senseDome);

    // Enemy ground danger telegraph pool (up to 8)
    const teleGeo = new THREE.RingGeometry(0.8, 1.0, 24);
    teleGeo.rotateX(-Math.PI / 2);
    this.geometries.push(teleGeo);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.MeshBasicMaterial({
        color: 0xd93036,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.materials.push(m);
      const ring = new THREE.Mesh(teleGeo, m);
      ring.visible = false;
      this.group.add(ring);
      this.telegraphRings.push(ring);
    }

    // Mara frost traps pool (up to 4)
    const maraGeo = new THREE.RingGeometry(0.85, 1.0, 20);
    maraGeo.rotateX(-Math.PI / 2);
    this.geometries.push(maraGeo);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.MeshBasicMaterial({
        color: 0x9834c8,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.materials.push(m);
      const ring = new THREE.Mesh(maraGeo, m);
      ring.visible = false;
      this.group.add(ring);
      this.maraRings.push(ring);
    }

    // Active Target Lock Reticle Ring on ground
    const tgtGeo = new THREE.RingGeometry(0.66, 0.82, 24);
    tgtGeo.rotateX(-Math.PI / 2);
    this.targetRingMat = new THREE.MeshBasicMaterial({
      color: 0xd97b29,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.geometries.push(tgtGeo);
    this.materials.push(this.targetRingMat);
    this.targetRing = new THREE.Mesh(tgtGeo, this.targetRingMat);
    this.targetRing.visible = false;
    this.group.add(this.targetRing);

    // Perfect Dodge Counter-Riposte Golden Ring
    const ctrGeo = new THREE.RingGeometry(0.75, 0.92, 24);
    ctrGeo.rotateX(-Math.PI / 2);
    this.counterAuraMat = new THREE.MeshBasicMaterial({
      color: 0xf2d06b,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.geometries.push(ctrGeo);
    this.materials.push(this.counterAuraMat);
    this.counterAura = new THREE.Mesh(ctrGeo, this.counterAuraMat);
    this.counterAura.visible = false;
    this.group.add(this.counterAura);
  }

  spawnBurst(x: number, y: number, z: number, count: number, hexColor: number, speed = 4.2, size = 1.0): void {
    this.particlesDirty = true;
    _tmpColor.setHex(hexColor);
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.nextSlot];
      this.nextSlot = (this.nextSlot + 1) % MAX_PARTICLES;
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.6;
      const sp = speed * (0.45 + Math.random() * 0.75);
      slot.active = true;
      slot.x = x;
      slot.y = y + 0.15;
      slot.z = z;
      slot.vx = Math.cos(angle) * sp;
      slot.vy = 1.6 + Math.random() * 3.2;
      slot.vz = Math.sin(angle) * sp;
      slot.age = 0;
      slot.life = 0.28 + Math.random() * 0.26;
      slot.size = size * (0.7 + Math.random() * 0.7);
      slot.r = _tmpColor.r;
      slot.g = _tmpColor.g;
      slot.b = _tmpColor.b;
    }
  }

  triggerVeles(x: number, y: number, z: number): void {
    this.velesTimer = 0.42;
    this.velesRing.position.set(x, y + 0.2, z);
    this.velesRing.visible = true;
    this.spawnBurst(x, y + 0.7, z, 18, 0x72e2f8, 6.2, 1.15);
  }

  triggerSense(x: number, y: number, z: number): void {
    this.senseTimer = 0.75;
    this.senseDome.position.set(x, y + 0.25, z);
    this.senseDome.visible = true;
  }

  triggerSignBurst(sign: SignId, x: number, y: number, z: number, yaw = 0): void {
    if (sign === 'veles') {
      this.triggerVeles(x, y, z);
    } else if (sign === 'svarog') {
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      this.spawnBurst(x + fx * 1.1, y + 1.05, z + fz * 1.1, 20, 0xf28c28, 5.2, 0.95);
    } else if (sign === 'makosh') {
      this.spawnBurst(x, y + 1.05, z, 14, 0xf2d06b, 3.6, 0.85);
    } else {
      this.spawnBurst(x, y + 0.3, z, 16, 0xb852e8, 4.0, 0.9);
    }
  }

  update(opts: {
    dt: number;
    elapsed: number;
    heroX: number;
    heroY: number;
    heroZ: number;
    heroYaw: number;
    blade: BladeKind;
    attackActive: boolean;
    attackHeavy: boolean;
    shieldActive: boolean;
    counterReady: boolean;
    targetPos: { x: number; y: number; z: number; scale: number; locked: boolean } | null;
    telegraphs: { x: number; y: number; z: number; radius: number; progress: number }[];
    traps: { x: number; y: number; z: number; radius: number }[];
  }): void {
    const { dt, elapsed, heroX, heroY, heroZ, heroYaw, blade, attackActive, attackHeavy, shieldActive, counterReady, targetPos, telegraphs, traps } = opts;

    // Update sword slash arc
    if (attackActive) {
      this.slashArc.visible = true;
      this.slashArc.position.set(heroX, heroY + 1.05, heroZ);
      this.slashArc.rotation.y = heroYaw + Math.PI / 2;
      this.slashArc.scale.setScalar(attackHeavy ? 1.35 : 1.0);
      this.slashMat.color.setHex(blade === 'silver' ? 0x9ce2ff : 0xf2b46b);
      this.slashMat.opacity = 0.85;
    } else {
      this.slashMat.opacity = Math.max(0, this.slashMat.opacity - dt * 8);
      if (this.slashMat.opacity <= 0.02) this.slashArc.visible = false;
    }

    // Update Makosh shell
    this.makoshShell.visible = shieldActive;
    if (shieldActive) {
      this.makoshShell.position.set(heroX, heroY + 1.05, heroZ);
      this.makoshShell.rotation.y = elapsed * 1.4;
      this.makoshShell.rotation.x = Math.sin(elapsed * 2) * 0.25;
    }

    // Update Veles ring
    if (this.velesTimer > 0) {
      this.velesTimer = Math.max(0, this.velesTimer - dt);
      const t = 1 - this.velesTimer / 0.42;
      this.velesRing.scale.setScalar(0.8 + t * 5.4);
      this.velesRingMat.opacity = (1 - t) * 0.85;
      if (this.velesTimer <= 0) this.velesRing.visible = false;
    }

    // Update Sense pulse
    if (this.senseTimer > 0) {
      this.senseTimer = Math.max(0, this.senseTimer - dt);
      const t = 1 - this.senseTimer / 0.75;
      this.senseDome.scale.setScalar(1.0 + t * 18.0);
      this.senseDomeMat.opacity = (1 - t) * 0.65;
      if (this.senseTimer <= 0) this.senseDome.visible = false;
    }

    // Telegraph rings
    for (let i = 0; i < this.telegraphRings.length; i++) {
      const ring = this.telegraphRings[i];
      if (i < telegraphs.length) {
        const tg = telegraphs[i];
        ring.visible = true;
        ring.position.set(tg.x, tg.y + 0.06, tg.z);
        ring.scale.setScalar(tg.radius * (0.45 + 0.55 * tg.progress));
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + tg.progress * 0.5;
      } else {
        ring.visible = false;
      }
    }

    // Mara frost traps
    for (let i = 0; i < this.maraRings.length; i++) {
      const ring = this.maraRings[i];
      if (i < traps.length) {
        const tr = traps[i];
        ring.visible = true;
        ring.position.set(tr.x, tr.y + 0.08, tr.z);
        ring.scale.setScalar(tr.radius);
        ring.rotation.z = elapsed * 0.9;
      } else {
        ring.visible = false;
      }
    }

    // Target reticle ring
    if (targetPos) {
      this.targetRing.visible = true;
      this.targetRing.position.set(targetPos.x, targetPos.y + 0.05, targetPos.z);
      this.targetRing.scale.setScalar(targetPos.scale * (1 + Math.sin(elapsed * 5) * 0.06));
      this.targetRingMat.color.setHex(targetPos.locked ? 0xf28c28 : 0xb8523e);
      this.targetRingMat.opacity = targetPos.locked ? 0.85 : 0.48;
    } else {
      this.targetRing.visible = false;
    }

    // Counter-Riposte golden underfoot halo
    this.counterAura.visible = counterReady;
    if (counterReady) {
      this.counterAura.position.set(heroX, heroY + 0.06, heroZ);
      this.counterAura.scale.setScalar(1.0 + Math.sin(elapsed * 12) * 0.12);
    }

    // Pooled burst particles — skip GPU upload when completely dormant
    if (this.particlesDirty) {
      let anyActive = false;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = this.particles[i];
        if (!p.active) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0.001);
          _dummy.updateMatrix();
          this.instMesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        p.age += dt;
        if (p.age >= p.life) {
          p.active = false;
          _dummy.position.set(0, -100, 0);
          _dummy.scale.setScalar(0.001);
          _dummy.updateMatrix();
          this.instMesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        anyActive = true;
        p.vy -= 9.5 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        const s = p.size * (1 - p.age / p.life);
        _dummy.position.set(p.x, p.y, p.z);
        _dummy.scale.setScalar(Math.max(0.01, s));
        _dummy.updateMatrix();
        this.instMesh.setMatrixAt(i, _dummy.matrix);
        _tmpColor.setRGB(p.r, p.g, p.b);
        this.instMesh.setColorAt(i, _tmpColor);
      }
      this.instMesh.instanceMatrix.needsUpdate = true;
      if (this.instMesh.instanceColor) this.instMesh.instanceColor.needsUpdate = true;
      this.particlesDirty = anyActive;
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
