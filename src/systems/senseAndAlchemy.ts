export interface HerbNode {
  id: string;
  kind: 'crows_eye' | 'hellebore';
  x: number;
  z: number;
  gathered: boolean;
  respawnTimer: number;
}

export interface TrackClue {
  id: string;
  x: number;
  z: number;
  yaw: number;
  inspected: boolean;
}

export interface SenseState {
  pulseTimer: number;
  auraTimer: number;
  shrineCommuned: boolean;
  shrineBuffTimer: number;
  tracksInspected: number;
  herbs: HerbNode[];
  tracks: TrackClue[];
}

export const NPC_SPOTS = {
  zoryana: { id: 'zoryana', x: -6.8, z: 0.4, yaw: 1.1 },
  miroslav: { id: 'miroslav', x: 5.8, z: -1.4, yaw: -1.2 },
  zbruchShrine: { id: 'shrine', x: 0, z: -7.5 },
  campfire: { id: 'campfire', x: 3.6, z: -0.6 },
} as const;

export function createSenseState(): SenseState {
  return {
    pulseTimer: 0,
    auraTimer: 0,
    shrineCommuned: false,
    shrineBuffTimer: 0,
    tracksInspected: 0,
    herbs: [
      { id: 'herb_1', kind: 'crows_eye', x: -5.4, z: 2.2, gathered: false, respawnTimer: 0 },
      { id: 'herb_2', kind: 'hellebore', x: 4.9, z: 3.1, gathered: false, respawnTimer: 0 },
      { id: 'herb_3', kind: 'crows_eye', x: -3.2, z: -4.8, gathered: false, respawnTimer: 0 },
      { id: 'herb_4', kind: 'hellebore', x: 6.4, z: -8.5, gathered: false, respawnTimer: 0 },
    ],
    tracks: [
      { id: 'trk_1', x: 0.6, z: 0.5, yaw: -0.1, inspected: false },
      { id: 'trk_2', x: 0.2, z: -3.4, yaw: 0.12, inspected: false },
      { id: 'trk_3', x: 2.1, z: -9.8, yaw: 0.35, inspected: false },
    ],
  };
}

export function stepSenseState(state: SenseState, dt: number): void {
  state.pulseTimer = Math.max(0, state.pulseTimer - dt);
  state.auraTimer = Math.max(0, state.auraTimer - dt);
  state.shrineBuffTimer = Math.max(0, state.shrineBuffTimer - dt);

  for (let i = 0; i < state.herbs.length; i++) {
    const h = state.herbs[i];
    if (h.gathered) {
      h.respawnTimer += dt;
      if (h.respawnTimer >= 35) {
        h.gathered = false;
        h.respawnTimer = 0;
      }
    }
  }
}

export type NearbyInteractable =
  | { kind: 'npc'; npcId: 'zoryana' | 'miroslav'; dist: number }
  | { kind: 'herb'; herb: HerbNode; dist: number }
  | { kind: 'shrine'; dist: number }
  | { kind: 'campfire'; dist: number }
  | null;

export function findNearestInteractable(state: SenseState, heroX: number, heroZ: number): NearbyInteractable {
  const dz = Math.hypot(heroX - NPC_SPOTS.zoryana.x, heroZ - NPC_SPOTS.zoryana.z);
  if (dz < 2.6) return { kind: 'npc', npcId: 'zoryana', dist: dz };

  const dm = Math.hypot(heroX - NPC_SPOTS.miroslav.x, heroZ - NPC_SPOTS.miroslav.z);
  if (dm < 2.6) return { kind: 'npc', npcId: 'miroslav', dist: dm };

  const ds = Math.hypot(heroX - NPC_SPOTS.zbruchShrine.x, heroZ - NPC_SPOTS.zbruchShrine.z);
  if (ds < 3.1) return { kind: 'shrine', dist: ds };

  for (let i = 0; i < state.herbs.length; i++) {
    const h = state.herbs[i];
    if (h.gathered) continue;
    const dh = Math.hypot(heroX - h.x, heroZ - h.z);
    if (dh < 2.1) return { kind: 'herb', herb: h, dist: dh };
  }

  const dc = Math.hypot(heroX - NPC_SPOTS.campfire.x, heroZ - NPC_SPOTS.campfire.z);
  if (dc < 2.4) return { kind: 'campfire', dist: dc };

  return null;
}

export function triggerVedunSensePulse(
  state: SenseState,
  heroX: number,
  heroZ: number,
): { discoveries: number } {
  state.pulseTimer = 0.75;
  state.auraTimer = 5.5;
  let discoveries = 0;
  for (let i = 0; i < state.tracks.length; i++) {
    const t = state.tracks[i];
    if (!t.inspected && Math.hypot(heroX - t.x, heroZ - t.z) < 12) {
      t.inspected = true;
      state.tracksInspected++;
      discoveries++;
    }
  }
  return { discoveries };
}
