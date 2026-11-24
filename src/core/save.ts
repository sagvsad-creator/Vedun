import type { TodPhase } from './events';

export const SAVE_SCHEMA_VERSION = 1;
const STORAGE_KEY = 'vedun_likholesye_save_v1';

export interface SaveDataV1 {
  schemaVersion: number;
  seed: number;
  tod: TodPhase;
  trophies: number;
  distanceTraveled: number;
}

export function createDefaultSave(seed = 74129): SaveDataV1 {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed,
    tod: 'dawn',
    trophies: 0,
    distanceTraveled: 0,
  };
}

export function migrateSave(raw: unknown): SaveDataV1 {
  if (!raw || typeof raw !== 'object') {
    return createDefaultSave();
  }
  const obj = raw as Record<string, unknown>;
  const seed = typeof obj.seed === 'number' && Number.isFinite(obj.seed) ? obj.seed >>> 0 : 74129;
  const tod = obj.tod === 'dusk' || obj.tod === 'night' ? obj.tod : 'dawn';
  const trophies = typeof obj.trophies === 'number' && obj.trophies >= 0 ? Math.floor(obj.trophies) : 0;
  const distanceTraveled =
    typeof obj.distanceTraveled === 'number' && obj.distanceTraveled >= 0 ? obj.distanceTraveled : 0;

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed,
    tod,
    trophies,
    distanceTraveled,
  };
}

export function loadSave(): SaveDataV1 {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSave();
    return migrateSave(JSON.parse(raw));
  } catch {
    return createDefaultSave();
  }
}

export function writeSave(save: SaveDataV1): boolean {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...save, schemaVersion: SAVE_SCHEMA_VERSION }),
    );
    return true;
  } catch {
    return false;
  }
}
