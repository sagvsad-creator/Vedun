import type { SignId } from '../core/events';
import combatTuning from '../data/combatTuning.json';
import signsTuning from '../data/signsTuning.json';
import type { CombatState } from './combat';

export interface ActiveMaraTrap {
  x: number;
  z: number;
  radius: number;
  remaining: number;
  tickAcc: number;
}

export interface SignCooldowns {
  svarog: number;
  veles: number;
  makosh: number;
  mara: number;
}

export interface SignsState {
  selected: SignId;
  cooldowns: SignCooldowns;
  traps: ActiveMaraTrap[];
  activeCastSign: SignId | null;
  activeCastTimer: number;
}

export function createSignsState(): SignsState {
  return {
    selected: 'svarog',
    cooldowns: { svarog: 0, veles: 0, makosh: 0, mara: 0 },
    traps: [],
    activeCastSign: null,
    activeCastTimer: 0,
  };
}

export function stepSigns(state: SignsState, dt: number): void {
  state.cooldowns.svarog = Math.max(0, state.cooldowns.svarog - dt);
  state.cooldowns.veles = Math.max(0, state.cooldowns.veles - dt);
  state.cooldowns.makosh = Math.max(0, state.cooldowns.makosh - dt);
  state.cooldowns.mara = Math.max(0, state.cooldowns.mara - dt);

  if (state.activeCastTimer > 0) {
    state.activeCastTimer = Math.max(0, state.activeCastTimer - dt);
    if (state.activeCastTimer <= 0) state.activeCastSign = null;
  }

  for (let i = state.traps.length - 1; i >= 0; i--) {
    state.traps[i].remaining -= dt;
    if (state.traps[i].remaining <= 0) {
      state.traps.splice(i, 1);
    }
  }
}

export function getSignPowerMultiplier(navMark: number, shrineBuffTimer: number): number {
  const navBonus = 1 + navMark * combatTuning.navSignPowerPerPoint;
  const shrineBonus = shrineBuffTimer > 0 ? 1.25 : 1.0;
  return navBonus * shrineBonus;
}

export function tryCastSign(
  signs: SignsState,
  combat: CombatState,
  stamina: number,
  heroX: number,
  heroZ: number,
): { cast: boolean; sign: SignId; staminaCost: number } {
  const sign = signs.selected;
  const cfg = signsTuning[sign];
  if (signs.cooldowns[sign] > 0 || stamina < cfg.cost) {
    return { cast: false, sign, staminaCost: 0 };
  }

  signs.cooldowns[sign] = cfg.cooldown;
  signs.activeCastSign = sign;
  signs.activeCastTimer = sign === 'svarog' ? 0.55 : 0.42;

  combat.navMark = Math.min(100, combat.navMark + combatTuning.navMarkPerSign);
  combat.trauma = Math.min(1, combat.trauma + 0.22);

  if (sign === 'makosh') {
    combat.shieldHp = signsTuning.makosh.shieldHp;
    combat.shieldTimer = signsTuning.makosh.duration;
  } else if (sign === 'mara') {
    signs.traps.push({
      x: heroX,
      z: heroZ,
      radius: signsTuning.mara.radius,
      remaining: signsTuning.mara.duration,
      tickAcc: 0,
    });
  }

  return { cast: true, sign, staminaCost: cfg.cost };
}
