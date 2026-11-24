import { describe, expect, it } from 'vitest';
import { createDefaultSave, migrateSave, SAVE_SCHEMA_VERSION } from '../src/core/save';
import { createRng } from '../src/core/rng';
import helloTuning from '../src/data/helloTuning.json';
import { createHeroLocomotionState, stepHeroLocomotion } from '../src/systems/movement';
import { CLEARING_OBSTACLES, groundHeightAt } from '../src/world/terrain';

describe('core & movement pure logic', () => {
  it('test_rng_same_seed_produces_identical_sequence', () => {
    const a = createRng(74129);
    const b = createRng(74129);
    const seqA = [a.next(), a.next(), a.range(1, 5), a.int(0, 10)];
    const seqB = [b.next(), b.next(), b.range(1, 5), b.int(0, 10)];
    expect(seqA).toEqual(seqB);
  });

  it('test_movement_step_advances_and_clamps_to_ground', () => {
    const state = createHeroLocomotionState(helloTuning.maxStamina, groundHeightAt, 0, 4.5);
    const startZ = state.z;
    for (let i = 0; i < 30; i++) {
      stepHeroLocomotion(
        state,
        { forward: 1, right: 0, dashPressed: false },
        1 / 60,
        helloTuning,
        groundHeightAt,
        CLEARING_OBSTACLES,
      );
    }
    expect(state.z).toBeLessThan(startZ - 2);
    expect(state.y).toBeCloseTo(groundHeightAt(state.x, state.z), 5);
    expect(state.totalDistance).toBeGreaterThan(2);
  });

  it('test_dash_spends_stamina_and_respects_obstacle_collision', () => {
    const state = createHeroLocomotionState(helloTuning.maxStamina, groundHeightAt, 0, -5.8);
    const res = stepHeroLocomotion(
      state,
      { forward: 1, right: 0, dashPressed: true },
      1 / 60,
      helloTuning,
      groundHeightAt,
      CLEARING_OBSTACLES,
    );
    expect(res.dashed).toBe(true);
    expect(state.stamina).toBe(helloTuning.maxStamina - helloTuning.dashCost);

    // Drive straight into the ancient Slavic idol at (0, -7.5)
    for (let i = 0; i < 60; i++) {
      stepHeroLocomotion(
        state,
        { forward: 1, right: 0, dashPressed: false },
        1 / 60,
        helloTuning,
        groundHeightAt,
        CLEARING_OBSTACLES,
      );
    }
    const idol = CLEARING_OBSTACLES[0];
    const distToIdol = Math.hypot(state.x - idol.x, state.z - idol.z);
    expect(distToIdol).toBeGreaterThanOrEqual(idol.radius + 0.55 - 1e-4);
  });

  it('test_save_migration_handles_corrupt_or_old_payload', () => {
    const fallback = migrateSave(null);
    expect(fallback.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(fallback.tod).toBe('dawn');

    const upgraded = migrateSave({ seed: 123, tod: 'night', trophies: 4 });
    expect(upgraded).toEqual({
      ...createDefaultSave(123),
      tod: 'night',
      trophies: 4,
    });
  });
});
