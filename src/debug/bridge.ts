import type { GameStateMode, TodPhase, TypedEventBus } from '../core/events';
import type { CameraPreset, HelloSceneController } from '../view/helloScene';

export interface GameMetrics {
  completed: boolean;
  seed: number;
  mode: GameStateMode;
  tod: TodPhase;
  preset: CameraPreset;
  movedDistance: number;
  hp: number;
  slainCount: number;
  navMark: number;
  cameraYaw: number;
  events: string[];
}

declare global {
  interface Window {
    __GAME__?: {
      ready: boolean;
      getState: () => ReturnType<HelloSceneController['getState']>;
      setMode: (mode: GameStateMode) => void;
      setTod: (tod: TodPhase) => void;
      setPreset: (preset: CameraPreset) => void;
      resetHero: () => void;
    };
    __metrics?: GameMetrics;
  }
}

export function attachDebugBridge(
  controller: HelloSceneController,
  events: TypedEventBus,
  seed: number,
): () => void {
  const eventLog: string[] = [];
  const pushEvent = (name: string) => {
    eventLog.push(name);
    if (eventLog.length > 50) eventLog.shift();
  };

  const syncMetrics = () => {
    const snap = controller.getState();
    window.__metrics = {
      completed: snap.movedDistance >= 1.5 || snap.slainCount > 0,
      seed,
      mode: snap.mode,
      tod: snap.tod,
      preset: snap.preset,
      movedDistance: snap.movedDistance,
      hp: snap.hp,
      slainCount: snap.slainCount,
      navMark: snap.navMark,
      cameraYaw: snap.cameraYaw,
      events: eventLog,
    };
  };

  window.__GAME__ = {
    ready: true,
    getState: () => controller.getState(),
    setMode: (mode) => {
      controller.setMode(mode);
      syncMetrics();
    },
    setTod: (tod) => {
      controller.setTod(tod);
      syncMetrics();
    },
    setPreset: (preset) => {
      controller.setLookDevPreset(preset);
      syncMetrics();
    },
    resetHero: () => {
      controller.resetHero();
      syncMetrics();
    },
  };

  const unsubs = [
    events.on('state_changed', ({ mode }) => {
      pushEvent(`state:${mode}`);
      syncMetrics();
    }),
    events.on('tod_changed', ({ tod }) => {
      pushEvent(`tod:${tod}`);
      syncMetrics();
    }),
    events.on('hero_dashed', () => {
      pushEvent('dash');
      syncMetrics();
    }),
    events.on('hero_jumped', () => {
      pushEvent('jump');
      syncMetrics();
    }),
    events.on('combat_swing', ({ blade }) => {
      pushEvent(`swing:${blade}`);
      syncMetrics();
    }),
    events.on('sign_cast', ({ sign }) => {
      pushEvent(`sign:${sign}`);
      syncMetrics();
    }),
    events.on('enemy_died', ({ kind }) => {
      pushEvent(`kill:${kind}`);
      syncMetrics();
    }),
    events.on('hero_moved', () => syncMetrics()),
  ];

  syncMetrics();

  return () => {
    for (const u of unsubs) u();
    delete window.__GAME__;
    delete window.__metrics;
  };
}
