import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Settings, Volume2, VolumeX, Flame } from 'lucide-react';
import { SoundEngine } from '../audio/soundEngine';
import { TypedEventBus, type GameStateMode, type SignId, type TodPhase } from '../core/events';
import { formatTodLabel, getT, isRtlLanguage, LANGUAGE_OPTIONS, type LanguageCode } from '../core/i18n';
import { InputHub } from '../core/input';
import { parseSeedFromSearch } from '../core/rng';
import { formatBindingCode, loadSettings, saveSettings, type GameSettings } from '../core/settings';
import { attachDebugBridge } from '../debug/bridge';
import { mountHelloScene, type CameraPreset, type HelloSceneController, type SceneSnapshot } from '../view/helloScene';
import { DialogueOverlay } from './DialogueOverlay';
import { SettingsModal } from './SettingsModal';
import { TouchControls } from './TouchControls';

function parseQuery(): { autostart: boolean; seed: number; tod: TodPhase; preset: CameraPreset } {
  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1' || params.get('capture') === '1';
  const todParam = params.get('tod');
  const tod: TodPhase = todParam === 'dusk' || todParam === 'night' ? todParam : 'dawn';
  const presetParam = params.get('preset');
  const preset: CameraPreset =
    presetParam === 'dawn_hub' || presetParam === 'dusk_combat' || presetParam === 'night_barrow'
      ? presetParam
      : 'follow';
  const seed = parseSeedFromSearch(window.location.search, 74129);
  return { autostart, seed, tod, preset };
}

export function GameShell() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<HelloSceneController | null>(null);
  const inputRef = useRef<InputHub | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alchemyOpen, setAlchemyOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchViewport, setIsTouchViewport] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024),
  );

  const [hud, setHud] = useState<SceneSnapshot>(() => {
    const q = parseQuery();
    return {
      mode: q.autostart ? 'playing' : 'title',
      outcome: 'none',
      tod: q.tod,
      todLabel: formatTodLabel('en', q.tod),
      preset: q.preset,
      stance: 'idle',
      hp: 120,
      maxHp: 120,
      stamina: 100,
      maxStamina: 100,
      blade: 'silver',
      bladeTier: 1,
      selectedSign: 'svarog',
      signCooldowns: { svarog: 0, veles: 0, makosh: 0, mara: 0 },
      shieldHp: 0,
      navMark: 15,
      silver: 60,
      trophies: 0,
      herbs: 2,
      swallowCharges: 3,
      activeOil: 'none',
      oilCharges: 0,
      slainCount: 0,
      senseActive: false,
      shrineBuffActive: false,
      counterReady: false,
      bossHp: 340,
      bossMaxHp: 340,
      bossPhase2: false,
      targetEnemy: null,
      callout: null,
      nearbyPrompt: null,
      activeDialogue: null,
      activeCutscene: null,
      contractStage: 'intro',
      heroX: 0,
      heroZ: 4.5,
      cameraYaw: Math.PI,
      movedDistance: 0,
      isSoftwareGl: false,
    };
  });

  useEffect(() => {
    const onResize = () => {
      setIsTouchViewport(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024);
    };
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const query = parseQuery();
    const initialMode: GameStateMode = query.autostart ? 'playing' : 'title';
    document.body.dataset.state = initialMode;

    const initialSettings = loadSettings();
    const events = new TypedEventBus();
    const input = new InputHub();
    input.setKeybinds(initialSettings.keybinds);
    input.attach(window);
    inputRef.current = input;

    const sound = new SoundEngine();
    sound.updateSettings(initialSettings.audio);
    soundRef.current = sound;

    const unlockAudioOnce = () => {
      sound.unlock();
    };
    window.addEventListener('pointerdown', unlockAudioOnce, { once: true });
    window.addEventListener('keydown', unlockAudioOnce, { once: true });

    const controller = mountHelloScene({
      container,
      seed: query.seed,
      initialMode,
      initialTod: query.tod,
      initialPreset: query.preset,
      initialSettings,
      input,
      events,
      sound,
      onHudUpdate: (snap) => {
        setHud(snap);
      },
    });
    controllerRef.current = controller;

    const detachBridge = attachDebugBridge(controller, events, query.seed);

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Enter' || e.code === 'Space') && controller.getState().mode === 'title') {
        if (document.activeElement?.tagName === 'SELECT') return;
        e.preventDefault();
        sound.unlock();
        controller.setMode('playing');
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', unlockAudioOnce);
      window.removeEventListener('keydown', unlockAudioOnce);
      detachBridge();
      controller.dispose();
      sound.dispose();
      input.detach(window);
      controllerRef.current = null;
    };
  }, []);

  const updateSettings = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    controllerRef.current?.applySettings(next);
  };

  const toggleFullscreen = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    soundRef.current?.unlock();
    soundRef.current?.playUiClick();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Safe no-op when embedded in restricted sandboxes
    }
  };

  const toggleMute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    soundRef.current?.unlock();
    updateSettings({
      ...settings,
      audio: { ...settings.audio, muted: !settings.audio.muted },
    });
  };

  const handleStart = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    soundRef.current?.unlock();
    soundRef.current?.playUiClick();
    setSettingsOpen(false);
    setAlchemyOpen(false);
    controllerRef.current?.setMode('playing');
  };

  const handleBackToTitle = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.currentTarget.blur();
    soundRef.current?.playUiClick();
    setSettingsOpen(false);
    setAlchemyOpen(false);
    controllerRef.current?.resetHero();
    controllerRef.current?.setMode('title');
  };

  const t = getT(settings.language);
  const rtl = isRtlLanguage(settings.language);
  const showTouch = settings.touchMode === 'on' || (settings.touchMode === 'auto' && isTouchViewport);
  const hpPct = Math.max(0, Math.min(100, Math.round((hud.hp / Math.max(1, hud.maxHp)) * 100)));
  const staminaPct = Math.max(0, Math.min(100, Math.round((hud.stamina / Math.max(1, hud.maxStamina)) * 100)));
  const todText = formatTodLabel(settings.language, hud.tod);

  const contractText =
    hud.contractStage === 'intro'
      ? t.contractIntro
      : hud.contractStage === 'shrine'
        ? t.contractShrine
        : hud.contractStage === 'boss'
          ? t.contractBoss
          : t.contractEndless;

  const UtilityTopRight = (
    <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.muteAudio}
        title={t.muteAudio}
        onClick={toggleMute}
        className="flex h-8 w-8 items-center justify-center border border-[#ece8df]/20 bg-[#0e1012]/90 text-[#ece8df] hover:border-[#d97b29] hover:text-[#f28c28] sm:h-9 sm:w-9"
      >
        {settings.audio.muted ? <VolumeX className="h-3.5 w-3.5 text-[#c9343a] sm:h-4 sm:w-4" /> : <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
        title={isFullscreen ? t.exitFullscreen : t.fullscreen}
        onClick={toggleFullscreen}
        className="flex h-8 w-8 items-center justify-center border border-[#ece8df]/20 bg-[#0e1012]/90 text-[#ece8df] hover:border-[#d97b29] hover:text-[#f28c28] sm:h-9 sm:w-9"
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t.settings}
        title={t.settings}
        onClick={(e) => {
          e.currentTarget.blur();
          soundRef.current?.unlock();
          soundRef.current?.playUiClick();
          setSettingsOpen(true);
        }}
        className="flex h-8 w-8 items-center justify-center border border-[#ece8df]/20 bg-[#0e1012]/90 text-[#ece8df] hover:border-[#d97b29] hover:text-[#f28c28] sm:h-9 sm:w-9"
      >
        <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="relative h-screen w-screen overflow-hidden bg-[#0e1012] select-none">
      {/* Isolated WebGL viewport */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* TITLE SCREEN */}
      {hud.mode === 'title' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 md:p-12">
          <div className="flex items-start justify-between gap-4">
            <div className="pointer-events-auto max-w-lg pt-3">
              <svg viewBox="0 0 120 44" className="mb-3 h-10 w-24 text-[#d97b29]" aria-hidden="true" fill="none">
                <path
                  d="M20 36L46 10M46 10L51 15M46 10L41 5M100 36L74 10M74 10L69 15M74 10L79 5"
                  stroke="#9ab0bc"
                  strokeWidth="2.2"
                  strokeLinecap="square"
                />
                <polygon points="60,5 71,22 60,39 49,22" fill="#121818" stroke="#d97b29" strokeWidth="1.8" />
                <polygon points="60,12 65,22 60,32 55,22" fill="#d97b29" opacity="0.85" />
              </svg>

              <h1 className="font-display text-5xl font-bold tracking-[0.06em] text-[#ece8df] drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)] md:text-6xl">
                {t.titleMain}
                <span className="mt-1 block text-2xl font-semibold tracking-[0.22em] text-[#d97b29] md:text-3xl">
                  {t.titleSub}
                </span>
              </h1>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-start="true"
                  onClick={handleStart}
                  className="border border-[#d97b29] bg-[#d97b29] px-7 py-3 text-sm font-bold tracking-[0.16em] text-[#0e1012] uppercase transition-colors hover:bg-[#f28c28] focus:outline-none focus:ring-2 focus:ring-[#f28c28]"
                >
                  {t.enterWilds}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundRef.current?.unlock();
                    soundRef.current?.playUiClick();
                    setSettingsOpen(true);
                  }}
                  className="border border-[#ece8df]/35 bg-[#121818]/90 px-5 py-3 text-sm font-semibold tracking-[0.14em] text-[#ece8df] uppercase hover:border-[#d97b29]"
                >
                  {t.settings}
                </button>
              </div>
            </div>

            {/* Quick Language Dropdown + Utility Bar on Title */}
            <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label={t.languageLabel}
                value={settings.language}
                onChange={(e) => {
                  soundRef.current?.unlock();
                  updateSettings({ ...settings, language: e.target.value as LanguageCode });
                }}
                className="h-9 border border-[#ece8df]/25 bg-[#0e1012]/90 px-2.5 text-xs font-medium text-[#ece8df] focus:border-[#d97b29] focus:outline-none"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {UtilityTopRight}
            </div>
          </div>

          <p className="font-mono-code text-[11px] tracking-[0.08em] text-[#a4b8b0]/85 md:text-xs">
            {t.hintsLine}
          </p>
        </div>
      )}

      {/* CUTSCENE LETTERBOX OVERLAY */}
      {hud.mode === 'playing' && hud.activeCutscene && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between">
          <div className="flex h-14 items-center justify-end bg-[#07090b] px-5">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => controllerRef.current?.skipCutscene()}
                className="border border-[#d97b29]/60 px-3 py-1 text-xs font-semibold tracking-[0.1em] text-[#f28c28] uppercase hover:bg-[#d97b29] hover:text-[#0e1012]"
              >
                {t.skipCutscene}
              </button>
              {UtilityTopRight}
            </div>
          </div>
          <div className="flex min-h-20 items-center justify-center bg-[#07090b] px-6 py-4 text-center">
            <p className="font-display max-w-2xl text-lg font-semibold tracking-wide text-[#ece8df] md:text-xl">
              {t[hud.activeCutscene.captionKey]}
            </p>
          </div>
        </div>
      )}

      {/* PLAYING HUD */}
      {hud.mode === 'playing' && !hud.activeCutscene && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4 md:p-5">
          {/* Top Row: Left Stats + Center Boss/Contract + Right Utility */}
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            {/* Top-left Medallion + HP + Stamina + Signs */}
            <div className="pointer-events-auto flex items-start gap-2">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => controllerRef.current?.switchBlade()}
                title={t.act_switch_blade}
                className="flex h-11 w-11 shrink-0 flex-col items-center justify-center border border-[#d97b29]/55 bg-[#0e1012]/90 sm:h-12 sm:w-12 md:h-14 md:w-14"
              >
                <span className="font-mono-code text-[9px] font-bold tracking-wider text-[#f28c28]">
                  {hud.blade === 'silver' ? t.silverBlade : t.steelBlade}
                </span>
                <span className="font-mono-code text-[10px] text-[#9ab0bc]">T{hud.bladeTier}</span>
              </button>

              <div className="flex flex-col gap-1">
                {/* Crimson Health */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-2.5 w-24 border border-[#ece8df]/25 bg-[#121618]/90 p-[1px] sm:w-32 md:w-44">
                    <div
                      className="h-full bg-gradient-to-r from-[#7e1c20] via-[#b82c32] to-[#d44444] transition-[width] duration-100"
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                  <span className="font-mono-code text-[11px] font-semibold tabular-nums text-[#ece8df] sm:text-xs">
                    {hud.hp}
                  </span>
                </div>

                {/* Amber Stamina */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-1.5 w-20 border border-[#ece8df]/20 bg-[#121618]/90 sm:w-28 md:w-36">
                    <div
                      className="h-full bg-[#d97b29] transition-[width] duration-75"
                      style={{ width: `${staminaPct}%` }}
                    />
                  </div>
                  <span className="font-mono-code text-[10px] tabular-nums text-[#a4b8b0]">
                    {staminaPct}
                  </span>
                  {hud.shieldHp > 0 && (
                    <span className="font-mono-code text-[10px] font-bold text-[#f2d06b]">
                      +{hud.shieldHp}
                    </span>
                  )}
                </div>

                {/* 4 Clickable Sign Buttons */}
                <div className="mt-0.5 flex items-center gap-1">
                  {(
                    [
                      ['svarog', formatBindingCode(settings.keybinds.sign_1.primary), 'M8 14L12 5L16 14Z'],
                      ['veles', formatBindingCode(settings.keybinds.sign_2.primary), 'M6 12C9 7 15 7 18 12'],
                      ['makosh', formatBindingCode(settings.keybinds.sign_3.primary), 'M12 5L18 12L12 19L6 12Z'],
                      ['mara', formatBindingCode(settings.keybinds.sign_4.primary), 'M15 6A6 6 0 1 0 15 18'],
                    ] as [SignId, string, string][]
                  ).map(([signId, keyNum, path]) => {
                    const cd = hud.signCooldowns[signId];
                    const active = hud.selectedSign === signId;
                    return (
                      <button
                        key={signId}
                        type="button"
                        tabIndex={-1}
                        onClick={() => controllerRef.current?.selectSign(signId)}
                        className={`relative flex h-6 w-6 items-center justify-center border text-xs sm:h-7 sm:w-7 ${
                          active
                            ? 'border-[#f28c28] bg-[#2a1d12]/95 text-[#f28c28]'
                            : 'border-[#ece8df]/20 bg-[#0e1012]/85 text-[#8d948a]'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9">
                          <path d={path} />
                        </svg>
                        <span className="font-mono-code absolute -top-1 -right-1 text-[8px] text-[#ece8df]/70">
                          {cd > 0 ? cd.toFixed(0) : keyNum}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setAlchemyOpen((v) => !v)}
                    title={t.alchemyTitle}
                    className="ml-0.5 flex h-6 items-center gap-1 border border-[#62d98e]/45 bg-[#0e1012]/85 px-1.5 text-[10px] font-semibold text-[#62d98e] hover:border-[#62d98e] sm:ml-1 sm:h-7 sm:px-2"
                  >
                    <Flame className="h-3 w-3" />
                    <span>{hud.swallowCharges}</span>
                  </button>
                </div>

                {hud.counterReady && (
                  <div className="font-mono-code w-fit border border-[#f2d06b]/70 bg-[#2a1d0c]/95 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#f2d06b]">
                    {t.counterReadyLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Center Top: Target Frame, Boss Bar, or Active Contract */}
            <div className="hidden max-w-sm flex-col items-center gap-1 text-center md:flex">
              {hud.targetEnemy ? (
                <div className="w-72 border border-[#ece8df]/25 bg-[#0e1012]/90 px-3 py-1.5 text-left">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold tracking-wider uppercase">
                    <span className="truncate text-[#ece8df]">
                      {t[`enemy_${hud.targetEnemy.kind}`]}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hud.targetEnemy.staggered && (
                        <span className="border border-[#f2d06b]/60 bg-[#291e0b] px-1 text-[9px] text-[#f2d06b]">
                          {t.staggeredTag}
                        </span>
                      )}
                      {hud.targetEnemy.blocking && !hud.targetEnemy.staggered && (
                        <span className="border border-[#9ab0bc]/50 bg-[#141a1e] px-1 text-[9px] text-[#9ab0bc]">
                          {t.blockingTag}
                        </span>
                      )}
                      <span
                        className={`border px-1 text-[9px] ${
                          hud.targetEnemy.genus === 'human'
                            ? 'border-[#9ab0bc]/45 text-[#9ab0bc]'
                            : 'border-[#f28c28]/55 text-[#f28c28]'
                        }`}
                      >
                        {hud.targetEnemy.genus === 'human' ? t.weakSteel : t.weakSilver}
                      </span>
                      <span className="font-mono-code tabular-nums text-[#a4b8b0]">
                        {hud.targetEnemy.hp}/{hud.targetEnemy.maxHp}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-[#1a1012]">
                    <div
                      className="h-full bg-[#c9343a] transition-[width] duration-75"
                      style={{
                        width: `${Math.max(0, Math.min(100, Math.round((hud.targetEnemy.hp / Math.max(1, hud.targetEnemy.maxHp)) * 100)))}%`,
                      }}
                    />
                  </div>
                  {hud.targetEnemy.locked && (
                    <div className="font-mono-code mt-0.5 text-right text-[9px] text-[#f28c28]">
                      {t.targetLockedTag}
                    </div>
                  )}
                </div>
              ) : hud.bossHp > 0 && hud.bossHp < hud.bossMaxHp ? (
                <div className="w-72 border border-[#c9343a]/50 bg-[#0e1012]/90 px-3 py-1.5">
                  <div className="flex justify-between text-[10px] font-bold tracking-widest text-[#f28c28] uppercase">
                    <span>{t.bossName}</span>
                    <span className="tabular-nums">{hud.bossHp}</span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-[#1a1012]">
                    <div
                      className="h-full bg-[#c9343a] transition-[width] duration-100"
                      style={{ width: `${Math.round((hud.bossHp / hud.bossMaxHp) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-[#ece8df]/15 bg-[#0e1012]/80 px-3 py-1 text-[11px] text-[#a4b8b0]">
                  <span className="mr-1.5 font-bold text-[#d97b29]">{t.contractLabel}:</span>
                  {contractText}
                </div>
              )}
            </div>

            {/* Top-Right Time of Day + Fullscreen + Settings + Pause */}
            <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
              <div className="hidden items-center gap-1.5 border border-[#ece8df]/15 bg-[#0e1012]/85 px-2.5 py-1.5 sm:flex">
                <span className="text-[11px] text-[#ece8df]">{todText}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => controllerRef.current?.cycleTod()}
                  className="font-mono-code border border-[#ece8df]/25 px-1 text-[10px] text-[#d97b29]"
                >
                  [{formatBindingCode(settings.keybinds.cycle_tod.primary)}]
                </button>
              </div>
              {UtilityTopRight}
              <button
                type="button"
                tabIndex={-1}
                aria-label={t.act_pause}
                title={t.act_pause}
                onClick={() => controllerRef.current?.setMode('paused')}
                className="flex h-8 w-8 items-center justify-center border border-[#ece8df]/20 bg-[#0e1012]/90 text-[#ece8df] hover:border-[#d97b29] sm:h-9 sm:w-9"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Floating Combat Callout */}
          {hud.callout && (
            <div
              key={hud.callout.id}
              style={{ left: `${hud.callout.x}%`, top: `${hud.callout.y}%` }}
              className={`font-display pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-1/2 text-lg font-bold tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] md:text-xl ${
                hud.callout.tone === 'riposte'
                  ? 'text-[#f2d06b]'
                  : hud.callout.tone === 'crit'
                    ? 'text-[#f28c28]'
                    : hud.callout.tone === 'blocked'
                      ? 'text-[#9ab0bc]'
                      : hud.callout.tone === 'heal'
                        ? 'text-[#62d98e]'
                        : 'text-[#ece8df]'
              }`}
            >
              {hud.callout.text}
            </div>
          )}

          {/* Center Interact Prompt */}
          {hud.nearbyPrompt && !hud.activeDialogue && (
            <div className="pointer-events-auto self-center">
              <button
                type="button"
                onClick={() => controllerRef.current?.triggerInteract()}
                className="border border-[#f28c28] bg-[#0e1012]/90 px-4 py-2 text-xs font-bold tracking-[0.12em] text-[#f28c28] uppercase hover:bg-[#d97b29] hover:text-[#0e1012]"
              >
                {hud.nearbyPrompt === 'herb'
                  ? t.gatherPrompt
                  : hud.nearbyPrompt === 'shrine'
                    ? t.shrinePrompt
                    : t.talkPrompt}
              </button>
            </div>
          )}

          {/* Bottom Bar (hidden or lifted if mobile touch buttons active) */}
          {!showTouch && (
            <div className="flex items-end justify-between text-[11px]">
              <div className="font-mono-code flex items-center gap-3 border border-[#ece8df]/15 bg-[#0e1012]/80 px-3 py-1 text-[#a4b8b0]">
                <span>
                  {t.slain}: <strong className="text-[#ece8df] tabular-nums">{hud.slainCount}</strong>
                </span>
                <span>
                  {t.silver}: <strong className="text-[#f2d06b] tabular-nums">{hud.silver}</strong>
                </span>
                <span>
                  {t.trophies}: <strong className="text-[#f28c28] tabular-nums">{hud.trophies}</strong>
                </span>
                <span>
                  {t.navMark}: <strong className="text-[#c9343a] tabular-nums">{hud.navMark}%</strong>
                </span>
              </div>
              <div className="font-mono-code hidden border border-[#ece8df]/10 bg-[#0e1012]/75 px-3 py-1 text-[#a4b8b0] md:block">
                {t.hintsLine}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MOBILE / TABLET VIRTUAL CONTROLS */}
      {hud.mode === 'playing' && showTouch && !hud.activeDialogue && !hud.activeCutscene && inputRef.current && (
        <TouchControls
          input={inputRef.current}
          t={t}
          hasPrompt={Boolean(hud.nearbyPrompt)}
        />
      )}

      {/* ALCHEMY & FORGE MODAL */}
      {alchemyOpen && hud.mode === 'playing' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#090c10]/80 p-4">
          <div className="w-full max-w-md border border-[#d97b29]/55 bg-[#0e1012] p-5 text-[#ece8df]">
            <div className="flex items-center justify-between border-b border-[#ece8df]/15 pb-3">
              <h3 className="font-display text-xl font-bold tracking-wider uppercase">{t.alchemyTitle}</h3>
              <button
                type="button"
                onClick={() => setAlchemyOpen(false)}
                className="text-xs text-[#8d948a] uppercase hover:text-[#ece8df]"
              >
                {t.close}
              </button>
            </div>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#a4b8b0]">
                <span>{t.silver}: {hud.silver}</span>
                <span>{t.trophies}: {hud.trophies}</span>
                <span>Herbs: {hud.herbs}</span>
              </div>
              <button
                type="button"
                disabled={hud.swallowCharges <= 0 || hud.hp >= hud.maxHp}
                onClick={() => controllerRef.current?.drinkSwallow()}
                className="w-full border border-[#62d98e]/60 bg-[#122019] px-4 py-2.5 text-left font-semibold text-[#62d98e] disabled:opacity-40"
              >
                {t.healSwallow} ({hud.swallowCharges})
              </button>
              <button
                type="button"
                disabled={hud.herbs <= 0}
                onClick={() => controllerRef.current?.applyOil('necrophage')}
                className="w-full border border-[#d97b29]/50 bg-[#1a1510] px-4 py-2.5 text-left font-semibold text-[#f28c28] disabled:opacity-40"
              >
                {t.brewOil} — Necrophage ({hud.herbs})
              </button>
              <button
                type="button"
                disabled={hud.herbs <= 0}
                onClick={() => controllerRef.current?.applyOil('relict')}
                className="w-full border border-[#d97b29]/50 bg-[#1a1510] px-4 py-2.5 text-left font-semibold text-[#f28c28] disabled:opacity-40"
              >
                {t.brewOil} — Relict / Leshy ({hud.herbs})
              </button>
              <button
                type="button"
                disabled={hud.trophies < 1 || hud.silver < 80 || hud.bladeTier >= 4}
                onClick={() => controllerRef.current?.forgeSilverBlade()}
                className="w-full border border-[#9ce2ff]/55 bg-[#101920] px-4 py-2.5 text-left font-semibold text-[#9ce2ff] disabled:opacity-40"
              >
                {t.forgeSilver} (Tier {hud.bladeTier}/4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOGUE OVERLAY */}
      {hud.mode === 'playing' && hud.activeDialogue && (
        <DialogueOverlay
          dialogue={hud.activeDialogue}
          t={t}
          onChoose={(idx) => controllerRef.current?.chooseDialogueOption(idx)}
          onClose={() => controllerRef.current?.closeDialogue()}
        />
      )}

      {/* PAUSE MODAL */}
      {hud.mode === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b1118]/80 p-4">
          <div className="w-full max-w-sm border border-[#d97b29]/45 bg-[#0e1012]/95 p-7">
            <div className="flex items-start justify-between">
              <h2 className="font-display text-3xl font-bold tracking-[0.08em] text-[#ece8df]">
                {t.paused}
              </h2>
              {UtilityTopRight}
            </div>
            <p className="mt-1 text-xs tracking-[0.1em] text-[#8d948a] uppercase">
              {todText} · {t.slain}: {hud.slainCount}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleStart}
                className="border border-[#d97b29] bg-[#d97b29] px-5 py-2.5 text-sm font-bold tracking-[0.14em] text-[#0e1012] uppercase hover:bg-[#f28c28]"
              >
                {t.resume}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundRef.current?.playUiClick();
                  setSettingsOpen(true);
                }}
                className="border border-[#ece8df]/25 bg-[#121618] px-5 py-2.5 text-sm font-medium tracking-[0.12em] text-[#ece8df] uppercase hover:border-[#d97b29]"
              >
                {t.settings}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundRef.current?.playUiClick();
                  controllerRef.current?.resetHero();
                  controllerRef.current?.setMode('playing');
                }}
                className="border border-[#ece8df]/20 bg-[#121818] px-5 py-2.5 text-sm font-medium tracking-[0.12em] text-[#ece8df] uppercase hover:border-[#d97b29]"
              >
                {t.campfire}
              </button>
              <button
                type="button"
                onClick={handleBackToTitle}
                className="border border-[#ece8df]/15 bg-transparent px-5 py-2.5 text-sm font-medium tracking-[0.12em] text-[#8d948a] uppercase hover:text-[#ece8df]"
              >
                {t.mainMenu}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT MODAL */}
      {hud.mode === 'gameover' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#090c10]/85 p-4">
          <div className="w-full max-w-md border border-[#d97b29]/55 bg-[#0e1012] p-7 text-center">
            <div className="mb-3 flex justify-end">{UtilityTopRight}</div>
            <h2 className="font-display text-3xl font-bold tracking-[0.06em] text-[#f28c28]">
              {hud.outcome === 'victory' ? t.victoryTitle : t.defeatTitle}
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2 border border-[#ece8df]/15 bg-[#121618] p-3 text-xs">
              <div>
                <div className="text-[#8d948a] uppercase">{t.slain}</div>
                <div className="font-mono-code mt-1 text-lg font-bold tabular-nums text-[#ece8df]">{hud.slainCount}</div>
              </div>
              <div>
                <div className="text-[#8d948a] uppercase">{t.silver}</div>
                <div className="font-mono-code mt-1 text-lg font-bold tabular-nums text-[#f2d06b]">{hud.silver}</div>
              </div>
              <div>
                <div className="text-[#8d948a] uppercase">{t.trophies}</div>
                <div className="font-mono-code mt-1 text-lg font-bold tabular-nums text-[#f28c28]">{hud.trophies}</div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              {hud.outcome === 'victory' ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => controllerRef.current?.enterEndlessHunt()}
                  className="border border-[#d97b29] bg-[#d97b29] px-5 py-3 text-sm font-bold tracking-[0.14em] text-[#0e1012] uppercase hover:bg-[#f28c28]"
                >
                  {t.endlessHunt}
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => controllerRef.current?.awakenAtCampfire()}
                  className="border border-[#d97b29] bg-[#d97b29] px-5 py-3 text-sm font-bold tracking-[0.14em] text-[#0e1012] uppercase hover:bg-[#f28c28]"
                >
                  {t.campfire}
                </button>
              )}
              <button
                type="button"
                onClick={handleBackToTitle}
                className="border border-[#ece8df]/20 bg-transparent px-5 py-2.5 text-sm font-medium tracking-[0.12em] text-[#a4b8b0] uppercase hover:text-[#ece8df]"
              >
                {t.mainMenu}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS DRAWER */}
      {settingsOpen && inputRef.current && (
        <SettingsModal
          settings={settings}
          input={inputRef.current}
          onUpdate={updateSettings}
          onClose={() => setSettingsOpen(false)}
          onPlayClick={() => {
            soundRef.current?.unlock();
            soundRef.current?.playUiClick();
          }}
        />
      )}
    </div>
  );
}
