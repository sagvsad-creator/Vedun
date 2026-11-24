import { useEffect, useRef, useState } from 'react';
import { Monitor, Sliders, Volume2, Keyboard } from 'lucide-react';
import type { DifficultyId, GraphicsPresetId } from '../core/events';
import {
  formatDifficultyLabel,
  formatGraphicsLabel,
  getT,
  isRtlLanguage,
  LANGUAGE_OPTIONS,
  type LanguageCode,
} from '../core/i18n';
import type { InputHub } from '../core/input';
import {
  cloneDefaultKeybinds,
  formatBindingCode,
  type BindableAction,
  type GameSettings,
  type TouchMode,
} from '../core/settings';

type SettingsTab = 'general' | 'graphics' | 'audio' | 'controls';

const REBINDABLE_ACTIONS: BindableAction[] = [
  'move_forward',
  'move_back',
  'move_left',
  'move_right',
  'jump',
  'dash',
  'attack_light',
  'attack_heavy',
  'cast_sign',
  'sign_1',
  'sign_2',
  'sign_3',
  'sign_4',
  'sense',
  'switch_blade',
  'alchemy',
  'cycle_tod',
  'pause',
];

export function SettingsModal(props: {
  settings: GameSettings;
  input: InputHub;
  onUpdate: (next: GameSettings) => void;
  onClose: () => void;
  onPlayClick: () => void;
}) {
  const { settings, input, onUpdate, onClose, onPlayClick } = props;
  const [tab, setTab] = useState<SettingsTab>('general');
  const [capturing, setCapturing] = useState<{ action: BindableAction; slot: 'primary' | 'secondary' } | null>(null);
  const capturingRef = useRef(capturing);
  capturingRef.current = capturing;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const suppressClickUntilRef = useRef(0);

  const t = getT(settings.language);
  const rtl = isRtlLanguage(settings.language);

  useEffect(() => {
    input.setModalSuspended(true);
    return () => {
      input.cancelRebindCapture();
      input.setModalSuspended(false);
    };
  }, [input]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (capturingRef.current !== null) {
          input.cancelRebindCapture();
          setCapturing(null);
        } else {
          onCloseRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
    };
  }, [input]);

  const startCapture = (action: BindableAction, slot: 'primary' | 'secondary') => {
    if (performance.now() < suppressClickUntilRef.current) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    onPlayClick();
    setCapturing({ action, slot });
    input.startRebindCapture((code) => {
      if (code.startsWith('Mouse')) {
        suppressClickUntilRef.current = performance.now() + 220;
      }
      setCapturing(null);
      const curSettings = settingsRef.current;
      const nextKeybinds = { ...curSettings.keybinds };
      for (const k of REBINDABLE_ACTIONS) {
        nextKeybinds[k] = { ...nextKeybinds[k] };
      }
      const prevCode = nextKeybinds[action][slot];
      // Cleanly deduplicate or swap if the captured digit/key is already used elsewhere
      for (const other of REBINDABLE_ACTIONS) {
        if (other === action) continue;
        if (nextKeybinds[other].primary === code) {
          if (slot === 'primary' && prevCode) {
            nextKeybinds[other].primary = prevCode;
          } else {
            nextKeybinds[other].primary = nextKeybinds[other].secondary ?? '';
            delete nextKeybinds[other].secondary;
          }
        }
        if (nextKeybinds[other].secondary === code) {
          delete nextKeybinds[other].secondary;
        }
      }
      if (slot === 'primary') {
        if (nextKeybinds[action].secondary === code) {
          delete nextKeybinds[action].secondary;
        }
        nextKeybinds[action].primary = code;
      } else {
        if (nextKeybinds[action].primary === code) {
          return;
        }
        nextKeybinds[action].secondary = code;
      }
      onUpdate({ ...curSettings, keybinds: nextKeybinds });
    });
  };

  const clearSecondary = (action: BindableAction) => {
    onPlayClick();
    const nextKeybinds = {
      ...settings.keybinds,
      [action]: { primary: settings.keybinds[action].primary },
    };
    onUpdate({ ...settings, keybinds: nextKeybinds });
  };

  const resetBinds = () => {
    onPlayClick();
    setCapturing(null);
    input.cancelRebindCapture();
    onUpdate({ ...settings, keybinds: cloneDefaultKeybinds() });
  };

  const getActionLabel = (act: BindableAction): string => {
    const key = `act_${act}` as keyof typeof t;
    return (t[key] as string) ?? act;
  };

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090c10]/88 p-3 md:p-6"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-[#d97b29]/45 bg-[#0e1012] text-[#ece8df] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ece8df]/15 px-5 py-4">
          <h2 className="font-display text-2xl font-bold tracking-[0.08em] uppercase">
            {t.settings}
          </h2>
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              onClose();
            }}
            className="border border-[#ece8df]/25 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#a4b8b0] uppercase hover:border-[#d97b29] hover:text-[#ece8df]"
          >
            {t.close}
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 border-b border-[#ece8df]/15 bg-[#121618] text-xs font-semibold">
          {(
            [
              ['general', t.tab_general, Sliders],
              ['graphics', t.tab_graphics, Monitor],
              ['audio', t.tab_audio, Volume2],
              ['controls', t.tab_controls, Keyboard],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onPlayClick();
                setTab(id);
              }}
              className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-3 transition-colors ${
                tab === id
                  ? 'border-[#d97b29] bg-[#1b1712] text-[#f28c28]'
                  : 'border-transparent text-[#8d948a] hover:text-[#ece8df]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {tab === 'general' && (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold tracking-[0.14em] text-[#a4b8b0] uppercase">
                  {t.languageLabel} (16)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onUpdate({ ...settings, language: opt.code as LanguageCode });
                      }}
                      className={`border px-2.5 py-2 text-left text-xs transition-colors ${
                        settings.language === opt.code
                          ? 'border-[#f28c28] bg-[#2a1d12] font-semibold text-[#f28c28]'
                          : 'border-[#ece8df]/15 bg-[#121618] text-[#ece8df]/85 hover:border-[#d97b29]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold tracking-[0.14em] text-[#a4b8b0] uppercase">
                  {t.difficultyLabel}
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['story', 'normal', 'hard', 'death_march'] as DifficultyId[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onUpdate({ ...settings, difficulty: diff });
                      }}
                      className={`border px-3 py-2.5 text-xs font-medium transition-colors ${
                        settings.difficulty === diff
                          ? 'border-[#f28c28] bg-[#2a1d12] text-[#f28c28]'
                          : 'border-[#ece8df]/15 bg-[#121618] text-[#ece8df]/85 hover:border-[#d97b29]/50'
                      }`}
                    >
                      {formatDifficultyLabel(settings.language, diff)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold tracking-[0.14em] text-[#a4b8b0] uppercase">
                  {t.touchModeLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['auto', 'on', 'off'] as TouchMode[]).map((tm) => (
                    <button
                      key={tm}
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onUpdate({ ...settings, touchMode: tm });
                      }}
                      className={`border px-3 py-2 text-xs font-medium transition-colors ${
                        settings.touchMode === tm
                          ? 'border-[#f28c28] bg-[#2a1d12] text-[#f28c28]'
                          : 'border-[#ece8df]/15 bg-[#121618] text-[#ece8df]/85 hover:border-[#d97b29]/50'
                      }`}
                    >
                      {tm === 'auto' ? t.touch_auto : tm === 'on' ? t.touch_on : t.touch_off}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'graphics' && (
            <div>
              <label className="mb-2 block text-xs font-semibold tracking-[0.14em] text-[#a4b8b0] uppercase">
                {t.graphicsLabel}
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(['low', 'medium', 'high', 'ultra'] as GraphicsPresetId[]).map((gfx) => (
                  <button
                    key={gfx}
                    type="button"
                    onClick={() => {
                      onPlayClick();
                      onUpdate({ ...settings, graphics: gfx });
                    }}
                    className={`border px-4 py-3 text-left text-sm transition-colors ${
                      settings.graphics === gfx
                        ? 'border-[#f28c28] bg-[#2a1d12] font-semibold text-[#f28c28]'
                        : 'border-[#ece8df]/15 bg-[#121618] text-[#ece8df] hover:border-[#d97b29]/50'
                    }`}
                  >
                    {formatGraphicsLabel(settings.language, gfx)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between border border-[#ece8df]/15 bg-[#121618] px-4 py-3">
                <span className="text-sm font-medium">{t.muteAudio}</span>
                <input
                  type="checkbox"
                  checked={settings.audio.muted}
                  onChange={(e) =>
                    onUpdate({
                      ...settings,
                      audio: { ...settings.audio, muted: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-[#d97b29]"
                />
              </label>

              {(
                [
                  ['master', t.masterVol],
                  ['music', t.musicVol],
                  ['sfx', t.sfxVol],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="border border-[#ece8df]/15 bg-[#121618] px-4 py-3">
                  <div className="mb-2 flex justify-between text-xs font-semibold uppercase">
                    <span className="text-[#a4b8b0]">{label}</span>
                    <span className="font-mono-code tabular-nums text-[#f28c28]">
                      {Math.round(settings.audio[field] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.audio[field] * 100)}
                    onChange={(e) =>
                      onUpdate({
                        ...settings,
                        audio: { ...settings.audio, [field]: Number(e.target.value) / 100 },
                      })
                    }
                    className="w-full accent-[#d97b29]"
                  />
                </div>
              ))}
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetBinds}
                  className="border border-[#d97b29]/50 px-3 py-1.5 text-xs font-semibold tracking-[0.1em] text-[#d97b29] uppercase hover:bg-[#d97b29] hover:text-[#0e1012]"
                >
                  {t.resetBinds}
                </button>
              </div>
              <div className="divide-y divide-[#ece8df]/10 border border-[#ece8df]/15 bg-[#121618]">
                {REBINDABLE_ACTIONS.map((act) => {
                  const pair = settings.keybinds[act];
                  const capPrimary = capturing?.action === act && capturing.slot === 'primary';
                  const capSecondary = capturing?.action === act && capturing.slot === 'secondary';
                  return (
                    <div key={act} className="flex items-center justify-between gap-2 px-4 py-2 text-xs">
                      <span className="font-medium text-[#ece8df]">{getActionLabel(act)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-bind-action={act}
                          data-bind-slot="primary"
                          onClick={() => startCapture(act, 'primary')}
                          className={`font-mono-code min-w-[78px] border px-2 py-1 text-center text-[11px] font-semibold transition-colors ${
                            capPrimary
                              ? 'border-[#f28c28] bg-[#d97b29] text-[#0e1012]'
                              : 'border-[#d97b29]/45 bg-[#0e1012] text-[#f28c28] hover:border-[#f28c28]'
                          }`}
                        >
                          {capPrimary ? t.pressKeyPrompt : formatBindingCode(pair.primary)}
                        </button>
                        <button
                          type="button"
                          data-bind-action={act}
                          data-bind-slot="secondary"
                          onClick={() => startCapture(act, 'secondary')}
                          className={`font-mono-code min-w-[64px] border px-2 py-1 text-center text-[11px] transition-colors ${
                            capSecondary
                              ? 'border-[#f28c28] bg-[#d97b29] text-[#0e1012]'
                              : 'border-[#ece8df]/20 bg-[#0e1012] text-[#9ab0bc] hover:border-[#d97b29]/60'
                          }`}
                        >
                          {capSecondary ? t.pressKeyPrompt : pair.secondary ? formatBindingCode(pair.secondary) : '—'}
                        </button>
                        {pair.secondary && (
                          <button
                            type="button"
                            aria-label="Clear secondary bind"
                            onClick={() => clearSecondary(act)}
                            className="border border-[#ece8df]/15 px-1.5 py-1 text-[10px] text-[#8d948a] hover:border-[#c9343a] hover:text-[#c9343a]"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
