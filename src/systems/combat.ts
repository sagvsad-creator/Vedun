import type { BladeKind } from '../core/events';
import combatTuning from '../data/combatTuning.json';

export type EnemyGenus = 'human' | 'monster' | 'relict';
export type OilKind = 'none' | 'necrophage' | 'relict';

export interface CombatState {
  hp: number;
  maxHp: number;
  blade: BladeKind;
  bladeTier: number;
  silver: number;
  trophies: number;
  herbs: number;
  swallowCharges: number;
  activeOil: OilKind;
  oilCharges: number;
  navMark: number; // 0..100 Blood Mark of Nav
  slainCount: number;
  attackPhase: 'idle' | 'startup' | 'active' | 'recovery';
  attackTimer: number;
  attackHeavy: boolean;
  comboIndex: number;
  comboWindowTimer: number;
  swingHitIds: Set<string>;
  hitstopTimer: number;
  trauma: number;
  invulnTimer: number;
  shieldHp: number;
  shieldTimer: number;
  lungeSpeed: number;
  counterBuffTimer: number;
}

export function createCombatState(): CombatState {
  return {
    hp: combatTuning.heroMaxHp,
    maxHp: combatTuning.heroMaxHp,
    blade: 'silver',
    bladeTier: 1,
    silver: 60,
    trophies: 0,
    herbs: 2,
    swallowCharges: 3,
    activeOil: 'none',
    oilCharges: 0,
    navMark: 15,
    slainCount: 0,
    attackPhase: 'idle',
    attackTimer: 0,
    attackHeavy: false,
    comboIndex: 0,
    comboWindowTimer: 0,
    swingHitIds: new Set<string>(),
    hitstopTimer: 0,
    trauma: 0,
    invulnTimer: 0,
    shieldHp: 0,
    shieldTimer: 0,
    lungeSpeed: 0,
    counterBuffTimer: 0,
  };
}

export function computeBladeDamage(
  baseDamage: number,
  blade: BladeKind,
  bladeTier: number,
  genus: EnemyGenus,
  activeOil: OilKind,
  isVulnerable: boolean,
  counterReady = false,
): { damage: number; matchedBlade: boolean; crit: boolean } {
  const matchedBlade =
    (blade === 'steel' && genus === 'human') ||
    (blade === 'silver' && (genus === 'monster' || genus === 'relict'));

  let mult = 1.0;
  if (blade === 'steel') {
    mult = genus === 'human' ? combatTuning.steelVsHumanMult : combatTuning.steelVsMonsterMult;
  } else {
    mult = genus === 'human' ? combatTuning.silverVsHumanMult : combatTuning.silverVsMonsterMult;
  }

  const tierBonus = 1 + (bladeTier - 1) * 0.22;
  const oilBonus =
    (activeOil === 'necrophage' && genus === 'monster') ||
    (activeOil === 'relict' && genus === 'relict')
      ? 1 + combatTuning.oilBonusMult
      : 1.0;

  const vulnBonus = isVulnerable ? combatTuning.vulnerableBonusMult : 1.0;
  const counterBonus = counterReady ? 1.6 : 1.0;
  const damage = Math.max(1, Math.round(baseDamage * mult * tierBonus * oilBonus * vulnBonus * counterBonus));
  return { damage, matchedBlade, crit: counterReady || isVulnerable || (matchedBlade && oilBonus > 1) };
}

export function tryStartAttack(
  combat: CombatState,
  heavy: boolean,
  stamina: number,
): { started: boolean; staminaSpent: number } {
  if (combat.attackPhase === 'startup' || combat.attackPhase === 'active') {
    return { started: false, staminaSpent: 0 };
  }
  if (combat.attackPhase === 'recovery' && combat.attackTimer > 0.08) {
    return { started: false, staminaSpent: 0 };
  }
  if (heavy && stamina < combatTuning.heavyCleave.staminaCost) {
    return { started: false, staminaSpent: 0 };
  }

  if (heavy) {
    combat.attackHeavy = true;
    combat.attackPhase = 'startup';
    combat.attackTimer = combatTuning.heavyCleave.startup;
    combat.lungeSpeed = combatTuning.heavyCleave.lunge;
    combat.swingHitIds.clear();
    return { started: true, staminaSpent: combatTuning.heavyCleave.staminaCost };
  }

  const nextCombo = combat.comboWindowTimer > 0 ? (combat.comboIndex + 1) % combatTuning.lightCombo.length : 0;
  const spec = combatTuning.lightCombo[nextCombo];
  combat.comboIndex = nextCombo;
  combat.attackHeavy = false;
  combat.attackPhase = 'startup';
  combat.attackTimer = spec.startup;
  combat.lungeSpeed = spec.lunge;
  combat.swingHitIds.clear();
  return { started: true, staminaSpent: 0 };
}

export function stepCombatTimers(combat: CombatState, dt: number): void {
  combat.trauma = Math.max(0, combat.trauma - dt * 1.9);
  combat.invulnTimer = Math.max(0, combat.invulnTimer - dt);
  combat.comboWindowTimer = Math.max(0, combat.comboWindowTimer - dt);
  combat.counterBuffTimer = Math.max(0, combat.counterBuffTimer - dt);
  combat.navMark = Math.max(10, combat.navMark - combatTuning.navMarkDecayPerSec * dt);

  if (combat.shieldTimer > 0) {
    combat.shieldTimer = Math.max(0, combat.shieldTimer - dt);
    if (combat.shieldTimer <= 0) combat.shieldHp = 0;
  }

  if (combat.attackPhase === 'idle') {
    combat.lungeSpeed = 0;
    return;
  }

  const spec = combat.attackHeavy
    ? combatTuning.heavyCleave
    : combatTuning.lightCombo[combat.comboIndex];

  combat.attackTimer -= dt;
  if (combat.attackPhase === 'startup') {
    combat.lungeSpeed = spec.lunge * 0.7;
    if (combat.attackTimer <= 0) {
      combat.attackPhase = 'active';
      combat.attackTimer = spec.active;
      combat.lungeSpeed = spec.lunge;
    }
  } else if (combat.attackPhase === 'active') {
    combat.lungeSpeed = spec.lunge * 0.35;
    if (combat.attackTimer <= 0) {
      combat.attackPhase = 'recovery';
      combat.attackTimer = spec.recovery;
      combat.comboWindowTimer = combatTuning.comboWindow;
      combat.lungeSpeed = 0;
    }
  } else if (combat.attackPhase === 'recovery') {
    combat.lungeSpeed = 0;
    if (combat.attackTimer <= 0) {
      combat.attackPhase = 'idle';
      combat.attackTimer = 0;
    }
  }
}

export function getActiveAttackSpec(combat: CombatState) {
  return combat.attackHeavy
    ? combatTuning.heavyCleave
    : combatTuning.lightCombo[combat.comboIndex];
}

export function applyDamageToHero(
  combat: CombatState,
  rawDamage: number,
): { appliedDamage: number; shieldAbsorbed: boolean; shieldBroken: boolean; dead: boolean } {
  if (combat.invulnTimer > 0 || combat.hp <= 0) {
    return { appliedDamage: 0, shieldAbsorbed: false, shieldBroken: false, dead: false };
  }

  if (combat.shieldHp > 0) {
    const absorbed = Math.min(combat.shieldHp, rawDamage);
    combat.shieldHp -= absorbed;
    const leftover = Math.max(0, rawDamage - absorbed);
    const shieldBroken = combat.shieldHp <= 0;
    if (shieldBroken) combat.shieldTimer = 0;
    if (leftover > 0) {
      combat.hp = Math.max(0, combat.hp - leftover);
    }
    combat.invulnTimer = 0.42;
    combat.trauma = Math.min(1, combat.trauma + 0.32);
    return {
      appliedDamage: leftover,
      shieldAbsorbed: true,
      shieldBroken,
      dead: combat.hp <= 0,
    };
  }

  combat.hp = Math.max(0, combat.hp - rawDamage);
  combat.invulnTimer = 0.48;
  combat.trauma = Math.min(1, combat.trauma + 0.48);
  return {
    appliedDamage: rawDamage,
    shieldAbsorbed: false,
    shieldBroken: false,
    dead: combat.hp <= 0,
  };
}

export function tryDrinkSwallow(combat: CombatState): boolean {
  if (combat.swallowCharges <= 0 || combat.hp >= combat.maxHp) return false;
  combat.swallowCharges--;
  combat.hp = Math.min(combat.maxHp, combat.hp + combatTuning.swallowHeal);
  return true;
}

export function tryApplyOil(combat: CombatState, oil: OilKind): boolean {
  if (oil === 'none' || combat.herbs <= 0) return false;
  combat.herbs--;
  combat.activeOil = oil;
  combat.oilCharges = 12;
  return true;
}

export function tryForgeSilverBlade(combat: CombatState): boolean {
  if (combat.trophies < 1 || combat.silver < 80 || combat.bladeTier >= 4) return false;
  combat.trophies--;
  combat.silver -= 80;
  combat.bladeTier++;
  combat.maxHp += 15;
  combat.hp = combat.maxHp;
  return true;
}
