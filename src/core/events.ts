export type GameStateMode = 'title' | 'playing' | 'paused' | 'gameover';
export type TodPhase = 'dawn' | 'dusk' | 'night';
export type SignId = 'svarog' | 'veles' | 'makosh' | 'mara';
export type BladeKind = 'steel' | 'silver';
export type DifficultyId = 'story' | 'normal' | 'hard' | 'death_march';
export type GraphicsPresetId = 'low' | 'medium' | 'high' | 'ultra';

export interface GameEventMap {
  state_changed: { mode: GameStateMode };
  tod_changed: { tod: TodPhase };
  hero_dashed: { x: number; z: number };
  hero_jumped: { x: number; z: number };
  hero_landed: { x: number; z: number; impactSpeed: number };
  hero_moved: { distance: number };
  hero_hurt: { amount: number; blocked: boolean };
  combat_swing: { blade: BladeKind; combo: number; heavy: boolean };
  combat_hit: { x: number; z: number; damage: number; blade: BladeKind; crit: boolean; genus: string };
  enemy_died: { id: string; kind: string; x: number; z: number; silver: number; isBoss: boolean };
  enemy_telegraph: { kind: string; x: number; z: number };
  sign_cast: { sign: SignId; x: number; z: number };
  sense_pulsed: { x: number; z: number; discoveries: number };
  herb_gathered: { kind: string; x: number; z: number };
  npc_talked: { npcId: string };
  contract_updated: { stage: number; completed: boolean };
  cutscene_started: { id: string };
  cutscene_ended: { id: string };
}

type Listener<T> = (payload: T) => void;

export class TypedEventBus {
  private readonly listeners = new Map<keyof GameEventMap, Set<Listener<never>>>();

  on<K extends keyof GameEventMap>(event: K, fn: Listener<GameEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<never>);
    return () => {
      set?.delete(fn as Listener<never>);
    };
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      (fn as Listener<GameEventMap[K]>)(payload);
    }
  }
}
