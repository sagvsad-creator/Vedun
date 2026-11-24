import type { DifficultyId, GraphicsPresetId } from './events';
import type { LanguageCode } from './i18n';

export type BindableAction =
  | 'move_forward'
  | 'move_back'
  | 'move_left'
  | 'move_right'
  | 'jump'
  | 'dash'
  | 'attack_light'
  | 'attack_heavy'
  | 'cast_sign'
  | 'sense'
  | 'switch_blade'
  | 'sign_1'
  | 'sign_2'
  | 'sign_3'
  | 'sign_4'
  | 'alchemy'
  | 'cycle_tod'
  | 'pause';

export type TouchMode = 'auto' | 'on' | 'off';

export interface KeybindPair {
  primary: string;
  secondary?: string;
}

export type KeybindMap = Record<BindableAction, KeybindPair>;

export interface AudioSettings {
  muted: boolean;
  master: number;
  music: number;
  sfx: number;
}

export interface GameSettings {
  schemaVersion: number;
  language: LanguageCode;
  difficulty: DifficultyId;
  graphics: GraphicsPresetId;
  touchMode: TouchMode;
  audio: AudioSettings;
  keybinds: KeybindMap;
}

export const SETTINGS_SCHEMA_VERSION = 1;
const SETTINGS_KEY = 'vedun_likholesye_settings_v1';

export const DEFAULT_KEYBINDS: KeybindMap = {
  move_forward: { primary: 'KeyW', secondary: 'ArrowUp' },
  move_back: { primary: 'KeyS', secondary: 'ArrowDown' },
  move_left: { primary: 'KeyA', secondary: 'ArrowLeft' },
  move_right: { primary: 'KeyD', secondary: 'ArrowRight' },
  jump: { primary: 'Mouse2', secondary: 'Space' },
  dash: { primary: 'ShiftLeft', secondary: 'ShiftRight' },
  attack_light: { primary: 'Mouse0', secondary: 'KeyJ' },
  attack_heavy: { primary: 'KeyF', secondary: 'Mouse1' },
  cast_sign: { primary: 'KeyQ', secondary: 'KeyC' },
  sense: { primary: 'KeyE', secondary: 'KeyV' },
  switch_blade: { primary: 'KeyX', secondary: 'KeyR' },
  sign_1: { primary: 'Digit1' },
  sign_2: { primary: 'Digit2' },
  sign_3: { primary: 'Digit3' },
  sign_4: { primary: 'Digit4' },
  alchemy: { primary: 'KeyB' },
  cycle_tod: { primary: 'KeyT' },
  pause: { primary: 'Escape', secondary: 'KeyP' },
};

export function cloneDefaultKeybinds(): KeybindMap {
  const out = {} as KeybindMap;
  for (const key of Object.keys(DEFAULT_KEYBINDS) as BindableAction[]) {
    out[key] = { ...DEFAULT_KEYBINDS[key] };
  }
  return out;
}

export function createDefaultSettings(): GameSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    language: 'en',
    difficulty: 'normal',
    graphics: 'high',
    touchMode: 'auto',
    audio: {
      muted: false,
      master: 0.78,
      music: 0.56,
      sfx: 0.86,
    },
    keybinds: cloneDefaultKeybinds(),
  };
}

const VALID_LANGUAGES = new Set<string>([
  'en', 'fr', 'de', 'es', 'pt', 'zh', 'ar', 'uk', 'ru', 'ja', 'pl', 'it', 'vi', 'fa', 'elv', 'orc',
]);

export function migrateSettings(raw: unknown): GameSettings {
  const def = createDefaultSettings();
  if (!raw || typeof raw !== 'object') return def;
  const o = raw as Record<string, unknown>;

  const language = typeof o.language === 'string' && VALID_LANGUAGES.has(o.language)
    ? (o.language as LanguageCode)
    : def.language;

  const difficulty: DifficultyId =
    o.difficulty === 'story' ||
    o.difficulty === 'normal' ||
    o.difficulty === 'hard' ||
    o.difficulty === 'death_march'
      ? o.difficulty
      : def.difficulty;

  const graphics: GraphicsPresetId =
    o.graphics === 'low' ||
    o.graphics === 'medium' ||
    o.graphics === 'high' ||
    o.graphics === 'ultra'
      ? o.graphics
      : def.graphics;

  const touchMode: TouchMode =
    o.touchMode === 'auto' || o.touchMode === 'on' || o.touchMode === 'off'
      ? o.touchMode
      : def.touchMode;

  const audioObj = (o.audio && typeof o.audio === 'object' ? o.audio : {}) as Record<string, unknown>;
  const clamp01 = (v: unknown, fb: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;

  const audio: AudioSettings = {
    muted: typeof audioObj.muted === 'boolean' ? audioObj.muted : def.audio.muted,
    master: clamp01(audioObj.master, def.audio.master),
    music: clamp01(audioObj.music, def.audio.music),
    sfx: clamp01(audioObj.sfx, def.audio.sfx),
  };

  const keybinds = cloneDefaultKeybinds();
  if (o.keybinds && typeof o.keybinds === 'object') {
    const kb = o.keybinds as Record<string, unknown>;
    for (const act of Object.keys(keybinds) as BindableAction[]) {
      const pair = kb[act];
      if (pair && typeof pair === 'object') {
        const p = pair as Record<string, unknown>;
        if (typeof p.primary === 'string' && p.primary.length > 0) {
          keybinds[act].primary = p.primary;
        }
        if (typeof p.secondary === 'string') {
          if (p.secondary.length > 0) {
            keybinds[act].secondary = p.secondary;
          } else {
            delete keybinds[act].secondary;
          }
        }
      }
    }
  }

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    language,
    difficulty,
    graphics,
    touchMode,
    audio,
    keybinds,
  };
}

export function loadSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return createDefaultSettings();
    return migrateSettings(JSON.parse(raw));
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings: GameSettings): boolean {
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...settings, schemaVersion: SETTINGS_SCHEMA_VERSION }),
    );
    return true;
  } catch {
    return false;
  }
}

export function formatBindingCode(code: string): string {
  if (!code) return '—';
  if (code === 'Mouse0') return 'LMB';
  if (code === 'Mouse1') return 'MMB';
  if (code === 'Mouse2') return 'RMB';
  if (code === 'Mouse3') return 'MB4';
  if (code === 'Mouse4') return 'MB5';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) {
    const tail = code.slice(6);
    if (tail === 'Enter') return 'Num↵';
    if (tail === 'Add') return 'Num+';
    if (tail === 'Subtract') return 'Num-';
    if (tail === 'Multiply') return 'Num*';
    if (tail === 'Divide') return 'Num/';
    if (tail === 'Decimal') return 'Num.';
    return `Num${tail}`;
  }
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  if (code === 'Space') return 'Space';
  if (code === 'Escape') return 'Esc';
  if (code === 'Backquote') return '`';
  if (code === 'Minus') return '-';
  if (code === 'Equal') return '=';
  if (code === 'BracketLeft') return '[';
  if (code === 'BracketRight') return ']';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  return code;
}
