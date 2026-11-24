import { describe, expect, it } from 'vitest';
import { getT, LANGUAGE_OPTIONS } from '../src/core/i18n';
import { InputHub } from '../src/core/input';
import { createDefaultSettings, formatBindingCode, migrateSettings } from '../src/core/settings';
import helloTuning from '../src/data/helloTuning.json';
import {
  applyDamageToHero,
  computeBladeDamage,
  createCombatState,
  tryApplyOil,
  tryDrinkSwallow,
  tryForgeSilverBlade,
  tryStartAttack,
} from '../src/systems/combat';
import { ContractNarrativeEngine } from '../src/systems/contracts';
import {
  createInitialEnemies,
  detectPerfectEvade,
  resolveHeroMeleeHits,
  resolveSignImpactOnEnemies,
  revealWeaknessesInRadius,
  spawnNightStalker,
  stepEnemies,
} from '../src/systems/enemies';
import { createHeroLocomotionState, stepHeroLocomotion } from '../src/systems/movement';
import { createSenseState, triggerVedunSensePulse } from '../src/systems/senseAndAlchemy';
import { createSignsState, tryCastSign } from '../src/systems/signs';
import { CLEARING_OBSTACLES, groundHeightAt } from '../src/world/terrain';

describe('Phase 6 core gameplay systems', () => {
  it('test_jump_physics_lifts_and_lands_hero_with_coyote_time', () => {
    const state = createHeroLocomotionState(helloTuning.maxStamina, groundHeightAt, 0, 4.5);
    const startY = state.groundY;
    const jRes = stepHeroLocomotion(
      state,
      { forward: 0, right: 0, dashPressed: false, jumpPressed: true, jumpHeld: true },
      1 / 60,
      helloTuning,
      groundHeightAt,
      CLEARING_OBSTACLES,
    );
    expect(jRes.jumped).toBe(true);
    expect(state.isGrounded).toBe(false);
    expect(state.airY).toBeGreaterThan(0);

    let landed = false;
    for (let i = 0; i < 65; i++) {
      const step = stepHeroLocomotion(
        state,
        { forward: 0, right: 0, dashPressed: false, jumpPressed: false, jumpHeld: true },
        1 / 60,
        helloTuning,
        groundHeightAt,
        CLEARING_OBSTACLES,
      );
      if (step.landed) landed = true;
    }
    expect(landed).toBe(true);
    expect(state.isGrounded).toBe(true);
    expect(state.y).toBeCloseTo(startY, 4);
  });

  it('test_blade_duality_and_forging_rewards_matched_steel_silver_and_oils', () => {
    const silverVsMonster = computeBladeDamage(20, 'silver', 1, 'monster', 'necrophage', false);
    const steelVsMonster = computeBladeDamage(20, 'steel', 1, 'monster', 'none', false);
    expect(silverVsMonster.damage).toBeGreaterThan(steelVsMonster.damage * 2);

    const combat = createCombatState();
    combat.herbs = 1;
    expect(tryApplyOil(combat, 'relict')).toBe(true);
    expect(combat.activeOil).toBe('relict');

    combat.trophies = 1;
    combat.silver = 100;
    expect(tryForgeSilverBlade(combat)).toBe(true);
    expect(combat.bladeTier).toBe(2);
    expect(combat.silver).toBe(20);

    const atk = tryStartAttack(combat, false, 100);
    expect(atk.started).toBe(true);
  });

  it('test_signs_and_makosh_ward_absorb_incoming_damage', () => {
    const combat = createCombatState();
    const signs = createSignsState();
    signs.selected = 'makosh';
    const cast = tryCastSign(signs, combat, 100, 0, 0);
    expect(cast.cast).toBe(true);
    expect(combat.shieldHp).toBeGreaterThan(0);

    const dmg = applyDamageToHero(combat, 20);
    expect(dmg.shieldAbsorbed).toBe(true);
    expect(dmg.appliedDamage).toBe(0);

    combat.invulnTimer = 0;
    combat.shieldHp = 0;
    combat.hp = 60;
    expect(tryDrinkSwallow(combat)).toBe(true);
    expect(combat.hp).toBeGreaterThan(100);
  });

  it('test_enemies_difficulty_scaling_and_melee_svarog_combat', () => {
    const normalEnemies = createInitialEnemies('normal', groundHeightAt);
    const deathEnemies = createInitialEnemies('death_march', groundHeightAt);
    expect(deathEnemies[0].maxHp).toBeGreaterThan(normalEnemies[0].maxHp);

    const combat = createCombatState();
    const signs = createSignsState();
    const leshy = normalEnemies.find((e) => e.isBoss)!;
    const beforeHp = leshy.hp;

    const signRes = resolveSignImpactOnEnemies(
      normalEnemies,
      'svarog',
      leshy.x,
      leshy.z + 2.2,
      Math.PI,
      1.2,
    );
    expect(signRes.hits.length).toBeGreaterThan(0);
    expect(leshy.hp).toBeLessThan(beforeHp);

    const meleeRes = resolveHeroMeleeHits(
      normalEnemies,
      leshy.x,
      leshy.z + 1.5,
      Math.PI,
      combat,
      3.0,
      34,
      true,
    );
    expect(meleeRes.hits.some((h) => h.id === leshy.id)).toBe(true);

    const ev = stepEnemies(normalEnemies, 0, 0, 4.5, 'normal', 1 / 60, groundHeightAt, combat, signs, 0, 30, false);
    expect(Array.isArray(ev.hitsOnHero)).toBe(true);
  });

  it('test_inkjs_contracts_and_vedun_sense_discoveries', () => {
    const engine = new ContractNarrativeEngine();
    const dlg = engine.startNpcDialogue('zoryana', 'en');
    expect(dlg.line.length).toBeGreaterThan(10);
    expect(dlg.choices.length).toBe(3);

    const after = engine.chooseOption('zoryana', 0, 'en');
    expect(after.rewardHerbs).toBe(2);
    expect(engine.progress.zoryanaHelped).toBe(true);

    const sense = createSenseState();
    const pulse = triggerVedunSensePulse(sense, 0.5, -1.0);
    expect(pulse.discoveries).toBeGreaterThanOrEqual(1);
  });

  it('test_settings_default_english_16_languages_and_mouse_right_jump', () => {
    const def = createDefaultSettings();
    expect(def.language).toBe('en');
    expect(def.keybinds.jump.primary).toBe('Mouse2');
    expect(def.keybinds.attack_light.primary).toBe('Mouse0');
    expect(LANGUAGE_OPTIONS.length).toBe(16);

    for (const opt of LANGUAGE_OPTIONS) {
      const tr = getT(opt.code);
      expect(tr.enterWilds.length).toBeGreaterThan(0);
      expect(tr.fullscreen.length).toBeGreaterThan(0);
    }

    const migrated = migrateSettings({ language: 'elv', difficulty: 'death_march', graphics: 'ultra' });
    expect(migrated.language).toBe('elv');
    expect(migrated.difficulty).toBe('death_march');
    expect(migrated.graphics).toBe('ultra');
  });

  it('test_wow_camera_relative_strafing_backpedal_and_facing_steering', () => {
    const state = createHeroLocomotionState(helloTuning.maxStamina, groundHeightAt, 0, 4.5);
    const camYaw = Math.PI / 2; // camera facing +X

    // Strafe right (D -> right = +1) while holding RMB (steerWithCamera: true)
    // Facing camYaw = +PI/2 (+X), right vector is (-cos(PI/2), sin(PI/2)) = (0, +1) -> moves +Z
    const startX = state.x;
    const startZ = state.z;
    for (let i = 0; i < 15; i++) {
      stepHeroLocomotion(
        state,
        { forward: 0, right: 1, cameraYaw: camYaw, steerWithCamera: true, dashPressed: false },
        1 / 60,
        helloTuning,
        groundHeightAt,
        CLEARING_OBSTACLES,
      );
    }
    expect(state.z).toBeGreaterThan(startZ + 0.5);
    expect(Math.abs(state.x - startX)).toBeLessThan(0.05);
    expect(Math.abs(state.yaw - camYaw)).toBeLessThan(0.25);

    // Backpedal (S -> forward = -1) while holding RMB: moves -X at 0.84x speed while still facing +X
    const preBackX = state.x;
    for (let i = 0; i < 15; i++) {
      stepHeroLocomotion(
        state,
        { forward: -1, right: 0, cameraYaw: camYaw, steerWithCamera: true, dashPressed: false },
        1 / 60,
        helloTuning,
        groundHeightAt,
        CLEARING_OBSTACLES,
      );
    }
    expect(state.x).toBeLessThan(preBackX - 0.5);
    expect(Math.abs(state.yaw - camYaw)).toBeLessThan(0.15);
  });

  it('test_perfect_evade_triggers_counter_riposte_crit', () => {
    const enemies = createInitialEnemies('normal', groundHeightAt);
    const drowner = enemies.find((e) => e.kind === 'drowner')!;
    drowner.phase = 'windup';
    drowner.telegraphX = drowner.x;
    drowner.telegraphZ = drowner.z;

    expect(detectPerfectEvade(enemies, drowner.x + 1.5, drowner.z)).toBe(true);
    expect(detectPerfectEvade(enemies, drowner.x + 15, drowner.z)).toBe(false);

    const normalHit = computeBladeDamage(24, 'silver', 1, 'monster', 'none', false, false);
    const riposteHit = computeBladeDamage(24, 'silver', 1, 'monster', 'none', false, true);
    expect(riposteHit.crit).toBe(true);
    expect(riposteHit.damage).toBeGreaterThan(Math.round(normalHit.damage * 1.5));
  });

  it('test_numeric_and_numpad_keybindings_format_and_persist', () => {
    expect(formatBindingCode('Digit0')).toBe('0');
    expect(formatBindingCode('Digit7')).toBe('7');
    expect(formatBindingCode('Numpad3')).toBe('Num3');
    expect(formatBindingCode('Backquote')).toBe('`');

    const migrated = migrateSettings({
      keybinds: {
        dash: { primary: 'Digit5', secondary: 'Numpad2' },
        sign_1: { primary: 'Digit8', secondary: '' },
      },
    });
    expect(migrated.keybinds.dash.primary).toBe('Digit5');
    expect(migrated.keybinds.dash.secondary).toBe('Numpad2');
    expect(migrated.keybinds.sign_1.primary).toBe('Digit8');
    expect(migrated.keybinds.sign_1.secondary).toBeUndefined();
  });

  it('test_prey_habits_finisher_and_night_stalker_escalation', () => {
    const enemies = createInitialEnemies('normal', groundHeightAt);
    const bandit = enemies.find((e) => e.kind === 'bandit')!;
    expect(bandit.hasBlockedFront).toBe(true);

    const exposed = revealWeaknessesInRadius(enemies, bandit.x + 1.0, bandit.z, 7.5);
    expect(exposed).toBeGreaterThanOrEqual(1);
    expect(bandit.hasBlockedFront).toBe(false);
    expect(bandit.vulnerableTimer).toBeGreaterThan(3);

    const combat = createCombatState();
    combat.comboIndex = 2;
    const drowner = enemies.find((e) => e.kind === 'drowner')!;
    const hitRes = resolveHeroMeleeHits(enemies, drowner.x, drowner.z + 1.2, Math.PI, combat, 2.4, 24, false);
    expect(hitRes.hits[0].finisher).toBe(true);
    expect(hitRes.hits[0].damage).toBeGreaterThan(35);

    expect(spawnNightStalker(enemies, 0, 4.5, 'normal', groundHeightAt)).toBe(true);
    expect(enemies.some((e) => e.id.startsWith('stalker_'))).toBe(true);
    expect(spawnNightStalker(enemies, 0, 4.5, 'normal', groundHeightAt)).toBe(false);
  });

  it('test_input_hub_captures_digits_and_suspends_gameplay_under_modals', () => {
    const hub = new InputHub();
    const def = createDefaultSettings();
    hub.setKeybinds(def.keybinds);

    // While modal is suspended, gameplay actions are ignored, but rebind capture still captures digits/numpad
    hub.setModalSuspended(true);
    let captured = '';
    hub.startRebindCapture((code) => {
      captured = code;
    });

    const makeKeyEvent = (code: string, key = '') =>
      ({
        code,
        key,
        repeat: false,
        preventDefault() {},
        stopPropagation() {},
        stopImmediatePropagation() {},
      }) as unknown as KeyboardEvent;

    (hub as unknown as { handleKeyDown: (e: KeyboardEvent) => void }).handleKeyDown(makeKeyEvent('Digit5', '5'));
    expect(captured).toBe('Digit5');

    // Gameplay Escape/KeyW while modal is suspended should not buffer gameplay actions
    (hub as unknown as { handleKeyDown: (e: KeyboardEvent) => void }).handleKeyDown(makeKeyEvent('Escape', 'Escape'));
    expect(hub.consume('pause')).toBe(false);

    // Resuming from modal allows bound Digit5 for dash & Digit8 for sign_2
    hub.setModalSuspended(false);
    def.keybinds.dash = { primary: 'Digit5' };
    def.keybinds.sign_2 = { primary: 'Digit8', secondary: 'Numpad8' };
    hub.setKeybinds(def.keybinds);

    (hub as unknown as { handleKeyDown: (e: KeyboardEvent) => void }).handleKeyDown(makeKeyEvent('Unidentified', '5'));
    expect(hub.consume('dash')).toBe(true);

    (hub as unknown as { handleKeyDown: (e: KeyboardEvent) => void }).handleKeyDown(makeKeyEvent('Numpad8', '8'));
    expect(hub.consume('sign_2')).toBe(true);
  });
});
