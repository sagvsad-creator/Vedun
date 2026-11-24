import type { DifficultyId } from '../core/events';
import type { SeededRng } from '../core/rng';
import enemiesTuning from '../data/enemiesTuning.json';
import signsTuning from '../data/signsTuning.json';
import { computeBladeDamage, type CombatState, type EnemyGenus } from './combat';
import { getSignPowerMultiplier, type SignsState } from './signs';

export type EnemyKind = 'drowner' | 'upyr' | 'bandit' | 'leshy';
export type EnemyAiPhase = 'idle' | 'chase' | 'flank' | 'windup' | 'active' | 'recovery' | 'staggered' | 'dying';

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  genus: EnemyGenus;
  isBoss: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  phase: EnemyAiPhase;
  phaseTimer: number;
  burnTimer: number;
  burnDps: number;
  slowTimer: number;
  vulnerableTimer: number;
  hitFlashTimer: number;
  telegraphX: number;
  telegraphZ: number;
  telegraphRadius: number;
  telegraphProgress: number;
  flankSign: number;
  hasBlockedFront: boolean;
  bossPhase2: boolean;
  koFade: number;
  respawnTimer: number;
  silverDrop: number;
  homeX: number;
  homeZ: number;
}

export interface EnemyStepEvents {
  telegraphed: { kind: EnemyKind; x: number; z: number }[];
  hitsOnHero: { damage: number; x: number; z: number; heavy: boolean }[];
  killed: { id: string; kind: EnemyKind; x: number; z: number; silver: number; isBoss: boolean }[];
  bossPhase2Triggered: { x: number; z: number } | null;
}

function makeEnemy(
  id: string,
  kind: EnemyKind,
  x: number,
  z: number,
  yaw: number,
  difficulty: DifficultyId,
  heightAt: (x: number, z: number) => number,
): EnemyEntity {
  const cfg = enemiesTuning.archetypes[kind];
  const d = enemiesTuning.difficulty[difficulty];
  const maxHp = Math.round(cfg.maxHp * d.hpMult);
  return {
    id,
    kind,
    genus: cfg.genus as EnemyGenus,
    isBoss: kind === 'leshy',
    x,
    y: heightAt(x, z),
    z,
    vx: 0,
    vz: 0,
    yaw,
    hp: maxHp,
    maxHp,
    phase: 'idle',
    phaseTimer: 0,
    burnTimer: 0,
    burnDps: 0,
    slowTimer: 0,
    vulnerableTimer: 0,
    hitFlashTimer: 0,
    telegraphX: x,
    telegraphZ: z,
    telegraphRadius: cfg.telegraphRadius,
    telegraphProgress: 0,
    flankSign: id.endsWith('1') ? -1 : 1,
    hasBlockedFront: kind === 'bandit',
    bossPhase2: false,
    koFade: 1,
    respawnTimer: 0,
    silverDrop: cfg.silverDrop,
    homeX: x,
    homeZ: z,
  };
}

export function createInitialEnemies(
  difficulty: DifficultyId,
  heightAt: (x: number, z: number) => number,
): EnemyEntity[] {
  return [
    makeEnemy('upyr_1', 'upyr', -2.4, -11.4, 0.45, difficulty, heightAt),
    makeEnemy('upyr_2', 'upyr', -0.9, -12.8, 0.18, difficulty, heightAt),
    makeEnemy('upyr_3', 'upyr', -3.9, -13.1, 0.65, difficulty, heightAt),
    makeEnemy('drowner_1', 'drowner', 6.8, 1.8, -1.9, difficulty, heightAt),
    makeEnemy('drowner_2', 'drowner', 7.9, -6.5, -2.1, difficulty, heightAt),
    makeEnemy('bandit_1', 'bandit', -8.6, 5.2, 1.1, difficulty, heightAt),
    makeEnemy('leshy_boss', 'leshy', 5.4, -13.5, -0.42, difficulty, heightAt),
  ];
}

export function spawnEndlessWave(
  difficulty: DifficultyId,
  waveIndex: number,
  rng: SeededRng,
  heightAt: (x: number, z: number) => number,
): EnemyEntity[] {
  const list: EnemyEntity[] = [];
  const count = Math.min(6, 3 + waveIndex);
  for (let i = 0; i < count; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const rad = rng.range(11, 18);
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad - 4;
    const roll = rng.next();
    const kind: EnemyKind = roll < 0.35 ? 'drowner' : roll < 0.72 ? 'upyr' : 'bandit';
    list.push(makeEnemy(`wave_${waveIndex}_${i}`, kind, x, z, angle + Math.PI, difficulty, heightAt));
  }
  if (waveIndex % 2 === 0) {
    list.push(makeEnemy(`leshy_w${waveIndex}`, 'leshy', 5.4, -14.2, -0.4, difficulty, heightAt));
  }
  return list;
}

export function stepEnemies(
  enemies: EnemyEntity[],
  heroX: number,
  heroY: number,
  heroZ: number,
  difficulty: DifficultyId,
  dt: number,
  heightAt: (x: number, z: number) => number,
  combat: CombatState,
  signs: SignsState,
  shrineBuffTimer: number,
  arenaRadius: number,
  endlessMode: boolean,
): EnemyStepEvents {
  const events: EnemyStepEvents = { telegraphed: [], hitsOnHero: [], killed: [], bossPhase2Triggered: null };
  const diff = enemiesTuning.difficulty[difficulty];

  // Count currently committed attackers against token budget
  let activeTokens = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.hp > 0 && (e.phase === 'windup' || e.phase === 'active')) {
      activeTokens++;
    }
  }

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
    e.vulnerableTimer = Math.max(0, e.vulnerableTimer - dt);

    if (e.hp <= 0) {
      e.phase = 'dying';
      e.koFade = Math.max(0, e.koFade - dt * 2.4);
      if (endlessMode && !e.isBoss && e.koFade <= 0) {
        e.respawnTimer += dt;
        if (e.respawnTimer >= 16) {
          const maxHp = Math.round(enemiesTuning.archetypes[e.kind].maxHp * diff.hpMult);
          e.hp = maxHp;
          e.maxHp = maxHp;
          e.x = e.homeX;
          e.z = e.homeZ;
          e.y = heightAt(e.x, e.z);
          e.koFade = 1;
          e.respawnTimer = 0;
          e.phase = 'idle';
        }
      }
      continue;
    }

    // Burn DoT from Svarog
    if (e.burnTimer > 0) {
      e.burnTimer -= dt;
      e.hp -= e.burnDps * dt;
      if (e.hp <= 0) {
        e.hp = 0;
        events.killed.push({
          id: e.id,
          kind: e.kind,
          x: e.x,
          z: e.z,
          silver: e.silverDrop,
          isBoss: e.isBoss,
        });
        continue;
      }
    }

    // Mara frost traps
    let trapped = false;
    for (let tIdx = 0; tIdx < signs.traps.length; tIdx++) {
      const trap = signs.traps[tIdx];
      const td = Math.hypot(e.x - trap.x, e.z - trap.z);
      if (td <= trap.radius) {
        trapped = true;
        e.slowTimer = Math.max(e.slowTimer, 0.35);
        e.vulnerableTimer = Math.max(e.vulnerableTimer, 0.35);
        e.hp -= signsTuning.mara.tickDamage * dt;
        if (e.hp <= 0) {
          e.hp = 0;
          events.killed.push({
            id: e.id,
            kind: e.kind,
            x: e.x,
            z: e.z,
            silver: e.silverDrop,
            isBoss: e.isBoss,
          });
          break;
        }
      }
    }
    if (e.hp <= 0) continue;

    e.slowTimer = Math.max(0, e.slowTimer - dt);
    const slowMult = e.slowTimer > 0 || trapped ? signsTuning.mara.slowFactor : 1.0;

    if (e.isBoss && !e.bossPhase2 && e.hp <= e.maxHp * 0.52) {
      e.bossPhase2 = true;
      e.vulnerableTimer = 1.4;
      events.bossPhase2Triggered = { x: e.x, z: e.z };
    }

    const cfg = enemiesTuning.archetypes[e.kind];
    const dx = heroX - e.x;
    const dz = heroZ - e.z;
    const dist = Math.hypot(dx, dz);
    const targetYaw = Math.atan2(dx, dz);

    if (e.phase === 'staggered') {
      e.phaseTimer -= dt;
      e.x += e.vx * dt;
      e.z += e.vz * dt;
      e.vx *= Math.exp(-7 * dt);
      e.vz *= Math.exp(-7 * dt);
      e.y = heightAt(e.x, e.z);
      if (e.phaseTimer <= 0) {
        e.phase = 'chase';
      }
      continue;
    }

    if (e.phase === 'windup') {
      e.phaseTimer -= dt;
      const totalWindup = cfg.windup * diff.telegraphScale * (e.bossPhase2 ? 0.85 : 1);
      e.telegraphProgress = Math.min(1, 1 - e.phaseTimer / Math.max(0.1, totalWindup));
      e.yaw = targetYaw;
      if (e.phaseTimer <= 0) {
        e.phase = 'active';
        e.phaseTimer = cfg.active;
        // Lunging enemies commit forward toward the telegraph point
        const lungeDist = e.kind === 'upyr' ? 1.85 : e.kind === 'leshy' ? 1.25 : 0.95;
        if (dist > 0.25) {
          e.vx = (dx / dist) * (lungeDist / Math.max(0.08, cfg.active));
          e.vz = (dz / dist) * (lungeDist / Math.max(0.08, cfg.active));
        }
        // Check hit on hero against telegraph circle (and vertical jump height!)
        const hitDist = Math.hypot(heroX - e.telegraphX, heroZ - e.telegraphZ);
        const heroAirClears = heroY - heightAt(heroX, heroZ) > (e.isBoss ? 1.15 : 0.72);
        if (hitDist <= e.telegraphRadius + 0.45 && !heroAirClears) {
          const dmg = Math.round(cfg.damage * diff.dmgMult * (e.bossPhase2 ? 1.2 : 1));
          events.hitsOnHero.push({ damage: dmg, x: e.x, z: e.z, heavy: e.isBoss });
        }
      }
      continue;
    }

    if (e.phase === 'active') {
      e.phaseTimer -= dt;
      e.x += e.vx * dt;
      e.z += e.vz * dt;
      e.vx *= Math.exp(-9 * dt);
      e.vz *= Math.exp(-9 * dt);
      e.y = heightAt(e.x, e.z);
      if (e.phaseTimer <= 0) {
        e.phase = 'recovery';
        e.phaseTimer = cfg.recovery;
        e.vulnerableTimer = Math.max(e.vulnerableTimer, e.isBoss ? 1.1 : 0.65);
        e.telegraphProgress = 0;
      }
      continue;
    }

    if (e.phase === 'recovery') {
      e.phaseTimer -= dt;
      if (e.phaseTimer <= 0) {
        e.phase = 'chase';
      }
      continue;
    }

    // Idle vs Aggro / Archetype movement policies
    const aggroR = cfg.aggroRange + (combat.navMark > 60 ? 2.5 : 0);
    if (dist > aggroR) {
      e.phase = 'idle';
      // Gently patrol near home anchor
      const hx = e.homeX - e.x;
      const hz = e.homeZ - e.z;
      const hd = Math.hypot(hx, hz);
      if (hd > 1.8) {
        e.x += (hx / hd) * 1.1 * dt;
        e.z += (hz / hd) * 1.1 * dt;
        e.yaw = Math.atan2(hx, hz);
        e.y = heightAt(e.x, e.z);
      }
      continue;
    }

    // Distinct policies per archetype:
    // 1. Drowner: circles/flanks swiftly at mid-range before lunging
    // 2. Upyr: rushes directly for blood frenzy
    // 3. Marauder (bandit): closes deliberately with frontal guard
    // 4. Leshy Boss: stalks slowly with wide telegraphed root/claw slams
    const moveSpeed = cfg.speed * diff.speedMult * slowMult;
    e.yaw = targetYaw;

    if (dist > cfg.attackRange * 0.92) {
      let dirX = dx / Math.max(0.01, dist);
      let dirZ = dz / Math.max(0.01, dist);
      if (e.kind === 'drowner' && dist < 5.6) {
        e.phase = 'flank';
        const perpX = -dirZ * e.flankSign;
        const perpZ = dirX * e.flankSign;
        dirX = dirX * 0.55 + perpX * 0.82;
        dirZ = dirZ * 0.55 + perpZ * 0.82;
      } else {
        e.phase = 'chase';
      }
      e.x += dirX * moveSpeed * dt;
      e.z += dirZ * moveSpeed * dt;
    } else if (activeTokens < enemiesTuning.maxAttackTokens || e.isBoss) {
      // Commit to telegraphed attack
      activeTokens++;
      e.phase = 'windup';
      e.phaseTimer = cfg.windup * diff.telegraphScale * (e.bossPhase2 ? 0.85 : 1);
      e.telegraphX = e.x + Math.sin(targetYaw) * Math.min(1.8, dist * 0.75);
      e.telegraphZ = e.z + Math.cos(targetYaw) * Math.min(1.8, dist * 0.75);
      e.telegraphProgress = 0;
      events.telegraphed.push({ kind: e.kind, x: e.telegraphX, z: e.telegraphZ });
    } else {
      // Orbit calmly while waiting for attack token
      e.phase = 'flank';
      const perpX = -(dz / Math.max(0.01, dist)) * e.flankSign;
      const perpZ = (dx / Math.max(0.01, dist)) * e.flankSign;
      e.x += perpX * moveSpeed * 0.65 * dt;
      e.z += perpZ * moveSpeed * 0.65 * dt;
    }

    const r = Math.hypot(e.x, e.z);
    if (r > arenaRadius - 1.2) {
      const s = (arenaRadius - 1.2) / r;
      e.x *= s;
      e.z *= s;
    }
    e.y = heightAt(e.x, e.z);
  }

  // Apply Hero Sword active hitbox hits
  if (combat.attackPhase === 'active') {
    const forwardX = Math.sin(Math.PI); // placeholder overridden by caller yaw; instead pass reach check via helper below
    void forwardX;
  }

  void getSignPowerMultiplier(combat.navMark, shrineBuffTimer);
  return events;
}

export function resolveHeroMeleeHits(
  enemies: EnemyEntity[],
  heroX: number,
  heroZ: number,
  heroYaw: number,
  combat: CombatState,
  reach: number,
  baseDamage: number,
  heavy: boolean,
): {
  hits: { id: string; x: number; z: number; damage: number; crit: boolean; genus: EnemyGenus; blocked: boolean; finisher: boolean }[];
  kills: { id: string; kind: EnemyKind; x: number; z: number; silver: number; isBoss: boolean }[];
} {
  const hits: { id: string; x: number; z: number; damage: number; crit: boolean; genus: EnemyGenus; blocked: boolean; finisher: boolean }[] = [];
  const kills: { id: string; kind: EnemyKind; x: number; z: number; silver: number; isBoss: boolean }[] = [];

  const hx = Math.sin(heroYaw);
  const hz = Math.cos(heroYaw);
  const isFinisher = !heavy && combat.comboIndex === 2;
  const effectiveReach = isFinisher ? reach + 0.45 : reach;
  const effectiveBase = isFinisher ? Math.round(baseDamage * 1.35) : baseDamage;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.hp <= 0 || combat.swingHitIds.has(e.id)) continue;

    const dx = e.x - heroX;
    const dz = e.z - heroZ;
    const dist = Math.hypot(dx, dz);
    const maxReach = effectiveReach + (e.isBoss ? 0.95 : 0.45);
    if (dist > maxReach) continue;

    const dot = dist > 1e-4 ? (dx / dist) * hx + (dz / dist) * hz : 1;
    if (dot < (heavy || isFinisher ? -0.15 : 0.12) && dist > 1.25) continue;

    combat.swingHitIds.add(e.id);

    // Marauder blocks frontal light hits unless staggered, finisher, or exposed
    if (e.kind === 'bandit' && e.hasBlockedFront && !heavy && !isFinisher && e.vulnerableTimer <= 0 && e.phase !== 'staggered') {
      e.hitFlashTimer = 0.08;
      e.vx = (dx / Math.max(0.1, dist)) * 2.2;
      e.vz = (dz / Math.max(0.1, dist)) * 2.2;
      hits.push({ id: e.id, x: e.x, z: e.z, damage: 0, crit: false, genus: e.genus, blocked: true, finisher: false });
      continue;
    }

    const isVuln = e.vulnerableTimer > 0 || e.phase === 'windup' || e.phase === 'recovery';
    const counterReady = combat.counterBuffTimer > 0;
    const res = computeBladeDamage(effectiveBase, combat.blade, combat.bladeTier, e.genus, combat.activeOil, isVuln, counterReady);
    if (counterReady) {
      combat.counterBuffTimer = 0;
    }
    if (combat.oilCharges > 0) {
      combat.oilCharges--;
      if (combat.oilCharges <= 0) combat.activeOil = 'none';
    }

    e.hp = Math.max(0, e.hp - res.damage);
    e.hitFlashTimer = 0.11;
    const push = heavy || counterReady || isFinisher ? 6.4 : 3.2;
    e.vx = (dx / Math.max(0.1, dist)) * push;
    e.vz = (dz / Math.max(0.1, dist)) * push;
    if (heavy || counterReady || isFinisher || !e.isBoss) {
      if (heavy || counterReady || isFinisher) e.hasBlockedFront = false;
      e.phase = 'staggered';
      e.phaseTimer = heavy || counterReady ? 0.45 : isFinisher ? 0.34 : 0.22;
      e.telegraphProgress = 0;
    }

    hits.push({
      id: e.id,
      x: e.x,
      z: e.z,
      damage: res.damage,
      crit: res.crit || isFinisher,
      genus: e.genus,
      blocked: false,
      finisher: isFinisher,
    });
    if (e.hp <= 0) {
      kills.push({ id: e.id, kind: e.kind, x: e.x, z: e.z, silver: e.silverDrop, isBoss: e.isBoss });
    }
  }

  return { hits, kills };
}

export function revealWeaknessesInRadius(
  enemies: EnemyEntity[],
  heroX: number,
  heroZ: number,
  radius = 7.5,
): number {
  let exposed = 0;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.hp <= 0) continue;
    if (Math.hypot(e.x - heroX, e.z - heroZ) <= radius) {
      e.vulnerableTimer = Math.max(e.vulnerableTimer, 4.5);
      e.hasBlockedFront = false;
      exposed++;
    }
  }
  return exposed;
}

export function spawnNightStalker(
  enemies: EnemyEntity[],
  heroX: number,
  heroZ: number,
  difficulty: DifficultyId,
  heightAt: (x: number, z: number) => number,
): boolean {
  if (enemies.some((e) => e.id.startsWith('stalker_') && e.hp > 0)) return false;
  const sx = Math.max(-18, Math.min(18, heroX - 6.5));
  const sz = Math.max(-20, Math.min(10, heroZ - 7.5));
  const stalker = makeEnemy(`stalker_${Date.now() % 10000}`, 'upyr', sx, sz, Math.atan2(heroX - sx, heroZ - sz), difficulty, heightAt);
  stalker.maxHp = Math.round(stalker.maxHp * 1.25);
  stalker.hp = stalker.maxHp;
  stalker.silverDrop = 35;
  stalker.phase = 'chase';
  enemies.push(stalker);
  return true;
}

export function detectPerfectEvade(
  enemies: EnemyEntity[],
  heroX: number,
  heroZ: number,
): boolean {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.hp <= 0 || e.phase !== 'windup') continue;
    const d = Math.hypot(e.x - heroX, e.z - heroZ);
    const dt = Math.hypot(e.telegraphX - heroX, e.telegraphZ - heroZ);
    if (d <= 4.2 || dt <= e.telegraphRadius + 1.1) {
      return true;
    }
  }
  return false;
}

export function spawnPhase2Minions(
  enemies: EnemyEntity[],
  bossX: number,
  bossZ: number,
  difficulty: DifficultyId,
  heightAt: (x: number, z: number) => number,
): void {
  const m1 = makeEnemy('phase2_drowner_a', 'drowner', bossX - 2.8, bossZ + 1.8, 0, difficulty, heightAt);
  const m2 = makeEnemy('phase2_drowner_b', 'drowner', bossX + 2.8, bossZ + 1.8, 0, difficulty, heightAt);
  m1.phase = 'chase';
  m2.phase = 'chase';
  enemies.push(m1, m2);
}

export function pickNextTargetEnemy(
  enemies: EnemyEntity[],
  heroX: number,
  heroZ: number,
  currentId: string | null,
  cycle = false,
): EnemyEntity | null {
  const alive: { e: EnemyEntity; d: number }[] = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - heroX, e.z - heroZ);
    if (d <= 18) alive.push({ e, d });
  }
  if (alive.length === 0) return null;
  alive.sort((a, b) => a.d - b.d);
  if (!cycle || !currentId) return alive[0].e;
  const idx = alive.findIndex((item) => item.e.id === currentId);
  if (idx === -1) return alive[0].e;
  return alive[(idx + 1) % alive.length].e;
}

export function resolveSignImpactOnEnemies(
  enemies: EnemyEntity[],
  sign: 'svarog' | 'veles' | 'makosh' | 'mara',
  heroX: number,
  heroZ: number,
  heroYaw: number,
  powerMult: number,
): {
  hits: { id: string; x: number; z: number; damage: number; crit: boolean; genus: EnemyGenus }[];
  kills: { id: string; kind: EnemyKind; x: number; z: number; silver: number; isBoss: boolean }[];
} {
  const hits: { id: string; x: number; z: number; damage: number; crit: boolean; genus: EnemyGenus }[] = [];
  const kills: { id: string; kind: EnemyKind; x: number; z: number; silver: number; isBoss: boolean }[] = [];
  const hx = Math.sin(heroYaw);
  const hz = Math.cos(heroYaw);

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.hp <= 0) continue;
    const dx = e.x - heroX;
    const dz = e.z - heroZ;
    const dist = Math.hypot(dx, dz);

    if (sign === 'svarog') {
      const dot = dist > 1e-4 ? (dx / dist) * hx + (dz / dist) * hz : 1;
      if (dist <= signsTuning.svarog.range && dot >= signsTuning.svarog.arcCos) {
        const dmg = Math.round(signsTuning.svarog.damage * powerMult * (e.isBoss ? 1.35 : 1));
        e.hp = Math.max(0, e.hp - dmg);
        e.burnTimer = signsTuning.svarog.burnDuration;
        e.burnDps = signsTuning.svarog.burnDps * powerMult;
        e.vulnerableTimer = Math.max(e.vulnerableTimer, 2.2);
        e.hitFlashTimer = 0.14;
        hits.push({ id: e.id, x: e.x, z: e.z, damage: dmg, crit: e.isBoss, genus: e.genus });
      }
    } else if (sign === 'veles') {
      if (dist <= signsTuning.veles.radius) {
        const dmg = Math.round(signsTuning.veles.damage * powerMult);
        e.hp = Math.max(0, e.hp - dmg);
        e.phase = 'staggered';
        e.phaseTimer = signsTuning.veles.staggerDuration;
        e.hasBlockedFront = false;
        e.telegraphProgress = 0;
        e.vx = (dx / Math.max(0.1, dist)) * signsTuning.veles.knockback;
        e.vz = (dz / Math.max(0.1, dist)) * signsTuning.veles.knockback;
        e.hitFlashTimer = 0.12;
        hits.push({ id: e.id, x: e.x, z: e.z, damage: dmg, crit: false, genus: e.genus });
      }
    }

    if (e.hp <= 0) {
      kills.push({ id: e.id, kind: e.kind, x: e.x, z: e.z, silver: e.silverDrop, isBoss: e.isBoss });
    }
  }

  return { hits, kills };
}
