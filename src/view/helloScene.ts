import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import type { SoundEngine } from '../audio/soundEngine';
import type {
  BladeKind,
  DifficultyId,
  GameStateMode,
  GraphicsPresetId,
  SignId,
  TodPhase,
  TypedEventBus,
} from '../core/events';
import type { InputHub } from '../core/input';
import { createRng } from '../core/rng';
import type { GameSettings } from '../core/settings';
import timeOfDayData from '../data/timeOfDay.json';
import helloTuning from '../data/helloTuning.json';
import {
  applyDamageToHero,
  createCombatState,
  getActiveAttackSpec,
  stepCombatTimers,
  tryApplyOil,
  tryDrinkSwallow,
  tryForgeSilverBlade,
  tryStartAttack,
  type CombatState,
  type OilKind,
} from '../systems/combat';
import { ContractNarrativeEngine, type ActiveDialogue, type ContractProgress } from '../systems/contracts';
import { sampleCutscene, startCutscene, type ActiveCutscene, type CutsceneId } from '../systems/cutscenes';
import {
  createInitialEnemies,
  detectPerfectEvade,
  pickNextTargetEnemy,
  resolveHeroMeleeHits,
  resolveSignImpactOnEnemies,
  revealWeaknessesInRadius,
  spawnEndlessWave,
  spawnNightStalker,
  spawnPhase2Minions,
  stepEnemies,
  type EnemyEntity,
  type EnemyKind,
} from '../systems/enemies';
import {
  createHeroLocomotionState,
  stepHeroLocomotion,
  type HeroLocomotionState,
} from '../systems/movement';
import {
  createSenseState,
  findNearestInteractable,
  NPC_SPOTS,
  stepSenseState,
  triggerVedunSensePulse,
  type NearbyInteractable,
  type SenseState,
} from '../systems/senseAndAlchemy';
import { createSignsState, getSignPowerMultiplier, stepSigns, tryCastSign, type SignsState } from '../systems/signs';
import { CLEARING_OBSTACLES, groundHeightAt, isWaterAt } from '../world/terrain';
import { createAtmosphere } from './atmosphere';
import { createGhoulVisual, createLeshyVisual } from './creaturesMesh';
import { createClearingWorld } from './foliageAndWater';
import { createHeroVisual, type HeroStance } from './heroMesh';
import { createBanditVisual, createDrownerVisual, createSlavicNpcVisual, type SimpleVisualActor } from './npcAndProps';
import { afterDraw, detectSoftwareGl } from './softwareGl';
import { createAAATextureSuite } from './textures';
import { VfxPool } from './vfxPool';

export type CameraPreset = 'follow' | 'dawn_hub' | 'dusk_combat' | 'night_barrow';

interface TodPreset {
  id: TodPhase;
  label: string;
  skyColor: string;
  skyZenith: string;
  skyHorizon: string;
  cloudTint: string;
  sunGlow: string;
  fogColor: string;
  fogDensity: number;
  keyColor: string;
  keyIntensity: number;
  keyPosition: [number, number, number];
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  rimColor: string;
  rimIntensity: number;
  fireIntensity: number;
  fireColor: string;
  rayColor: string;
  rayOpacity: number;
  moonVisible: boolean;
  exposure: number;
}

const TOD_ORDER: TodPhase[] = ['dawn', 'dusk', 'night'];
const TOD_MAP = timeOfDayData as Record<TodPhase, TodPreset>;

const _camDesired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _tmpColorA = new THREE.Color();

export interface TargetHudInfo {
  id: string;
  kind: EnemyKind;
  genus: 'human' | 'monster' | 'relict';
  hp: number;
  maxHp: number;
  staggered: boolean;
  blocking: boolean;
  bossPhase2: boolean;
  locked: boolean;
}

export interface CombatCallout {
  id: number;
  text: string;
  tone: 'crit' | 'hit' | 'blocked' | 'riposte' | 'heal';
  x: number;
  y: number;
}

export interface SceneSnapshot {
  mode: GameStateMode;
  outcome: 'none' | 'victory' | 'defeat';
  tod: TodPhase;
  todLabel: string;
  preset: CameraPreset;
  stance: HeroStance;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  blade: BladeKind;
  bladeTier: number;
  selectedSign: SignId;
  signCooldowns: { svarog: number; veles: number; makosh: number; mara: number };
  shieldHp: number;
  navMark: number;
  silver: number;
  trophies: number;
  herbs: number;
  swallowCharges: number;
  activeOil: OilKind;
  oilCharges: number;
  slainCount: number;
  senseActive: boolean;
  shrineBuffActive: boolean;
  counterReady: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossPhase2: boolean;
  targetEnemy: TargetHudInfo | null;
  callout: CombatCallout | null;
  nearbyPrompt: 'npc_zoryana' | 'npc_miroslav' | 'herb' | 'shrine' | 'campfire' | null;
  activeDialogue: ActiveDialogue | null;
  activeCutscene: { id: CutsceneId; captionKey: 'cutscene1' | 'cutscene2' | 'cutscene3' } | null;
  contractStage: ContractProgress['stage'];
  heroX: number;
  heroZ: number;
  cameraYaw: number;
  movedDistance: number;
  isSoftwareGl: boolean;
}

export interface HelloSceneController {
  getState(): SceneSnapshot;
  setMode(mode: GameStateMode): void;
  setTod(tod: TodPhase): void;
  cycleTod(): TodPhase;
  setLookDevPreset(preset: CameraPreset): void;
  resetHero(): void;
  applySettings(settings: GameSettings): void;
  selectSign(sign: SignId): void;
  switchBlade(): void;
  drinkSwallow(): boolean;
  applyOil(oil: OilKind): boolean;
  forgeSilverBlade(): boolean;
  chooseDialogueOption(idx: number): void;
  closeDialogue(): void;
  skipCutscene(): void;
  triggerInteract(): void;
  awakenAtCampfire(): void;
  enterEndlessHunt(): void;
  dispose(): void;
}

export function mountHelloScene(opts: {
  container: HTMLElement;
  seed: number;
  initialMode: GameStateMode;
  initialTod: TodPhase;
  initialPreset?: CameraPreset;
  initialSettings: GameSettings;
  input: InputHub;
  events: TypedEventBus;
  sound: SoundEngine;
  onHudUpdate: (snap: SceneSnapshot) => void;
}): HelloSceneController {
  const { container, seed, input, events, sound, onHudUpdate } = opts;
  const isSoftwareGl = detectSoftwareGl();
  const rng = createRng(seed);
  let activeSettings: GameSettings = opts.initialSettings;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = isSoftwareGl ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const width = Math.max(1, container.clientWidth || window.innerWidth);
  const height = Math.max(1, container.clientHeight || window.innerHeight);
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('data-testid', 'game-canvas');
  container.appendChild(renderer.domElement);
  input.setCanvasTarget(renderer.domElement);

  const scene = new THREE.Scene();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.28;
  roomEnv.dispose();
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.25, 160);

  let currentTod: TodPhase = opts.initialTod;
  let currentMode: GameStateMode = opts.initialMode;
  let outcome: SceneSnapshot['outcome'] = 'none';
  let currentPreset: CameraPreset = opts.initialPreset ?? 'follow';
  let currentStance: HeroStance = 'idle';

  const startPreset = TOD_MAP[currentTod];
  const bgColor = new THREE.Color(startPreset.skyColor);
  const fog = new THREE.FogExp2(startPreset.fogColor, startPreset.fogDensity);
  scene.background = bgColor;
  scene.fog = fog;
  renderer.toneMappingExposure = startPreset.exposure;

  const hemiLight = new THREE.HemisphereLight(
    startPreset.hemiSkyColor,
    startPreset.hemiGroundColor,
    startPreset.hemiIntensity,
  );
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(startPreset.keyColor, startPreset.keyIntensity);
  keyLight.position.set(...startPreset.keyPosition);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 65;
  keyLight.shadow.camera.left = -16;
  keyLight.shadow.camera.right = 16;
  keyLight.shadow.camera.top = 16;
  keyLight.shadow.camera.bottom = -16;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);
  scene.add(keyLight.target);

  const rimLight = new THREE.DirectionalLight(startPreset.rimColor, startPreset.rimIntensity);
  rimLight.position.set(-16, 12, 18);
  scene.add(rimLight);

  const clearingSpot = new THREE.SpotLight(0xd8e8ec, 2.2, 42, Math.PI / 4, 0.6, 1.3);
  clearingSpot.position.set(1.5, 15.5, 2.5);
  clearingSpot.target.position.set(0, 1.2, -9.5);
  scene.add(clearingSpot);
  scene.add(clearingSpot.target);

  // Dynamic zero-shadow sign/combat bounce light for wet mud & armor highlights
  const magicLight = new THREE.PointLight(0xf28c28, 0, 11, 1.6);
  magicLight.position.set(0, 1.8, 4.5);
  scene.add(magicLight);
  let magicLightTimer = 0;

  const textures = createAAATextureSuite(renderer.capabilities.getMaxAnisotropy(), seed);
  const atmosphere = createAtmosphere(textures.mistSprite, seed, textures.rayAlpha);
  scene.add(atmosphere.group);

  const clearing = createClearingWorld(textures, seed, isSoftwareGl);
  scene.add(clearing.group);

  const heroRig = createHeroVisual(textures.contactShadow, textures);
  scene.add(heroRig.root);

  // NPCs in Village Hub
  const zoryanaVisual = createSlavicNpcVisual(textures.contactShadow, 'zoryana');
  zoryanaVisual.root.position.set(NPC_SPOTS.zoryana.x, groundHeightAt(NPC_SPOTS.zoryana.x, NPC_SPOTS.zoryana.z), NPC_SPOTS.zoryana.z);
  zoryanaVisual.root.rotation.y = NPC_SPOTS.zoryana.yaw;
  scene.add(zoryanaVisual.root);

  const miroslavVisual = createSlavicNpcVisual(textures.contactShadow, 'miroslav');
  miroslavVisual.root.position.set(NPC_SPOTS.miroslav.x, groundHeightAt(NPC_SPOTS.miroslav.x, NPC_SPOTS.miroslav.z), NPC_SPOTS.miroslav.z);
  miroslavVisual.root.rotation.y = NPC_SPOTS.miroslav.yaw;
  scene.add(miroslavVisual.root);

  const vfx = new VfxPool();
  scene.add(vfx.group);

  // Gameplay state modules
  const heroState: HeroLocomotionState = createHeroLocomotionState(helloTuning.maxStamina, groundHeightAt, 0, 4.5);
  const combat: CombatState = createCombatState();
  const signs: SignsState = createSignsState();
  const sense: SenseState = createSenseState();
  const narrative = new ContractNarrativeEngine();
  let activeDialogue: ActiveDialogue | null = null;
  let activeCutscene: ActiveCutscene | null = null;
  let cs02Played = false;
  let endlessWave = 0;
  let lockedEnemyId: string | null = null;
  let calloutSeq = 0;
  let latestCallout: CombatCallout | null = null;
  let calloutTimer = 0;

  // WoW-style spherical camera rig around hero
  let camOrbitYaw = Math.PI;
  let camOrbitPitch = 0.34;
  let camOrbitDist = helloTuning.cameraDistance;

  let enemies: EnemyEntity[] = createInitialEnemies(activeSettings.difficulty, groundHeightAt);
  const enemyVisuals = new Map<string, SimpleVisualActor | { root: THREE.Group; update: (t: number) => void; dispose: () => void }>();

  const syncEnemyVisualPool = () => {
    // Dispose obsolete
    const activeIds = new Set(enemies.map((e) => e.id));
    for (const [id, rig] of enemyVisuals.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(rig.root);
        rig.dispose();
        enemyVisuals.delete(id);
      }
    }
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!enemyVisuals.has(e.id)) {
        const rig =
          e.kind === 'leshy'
            ? createLeshyVisual(textures.contactShadow, textures)
            : e.kind === 'drowner'
              ? createDrownerVisual(textures.contactShadow, i * 1.4)
              : e.kind === 'bandit'
                ? createBanditVisual(textures.contactShadow, textures)
                : createGhoulVisual(textures.contactShadow, i * 1.7);
        rig.root.position.set(e.x, e.y, e.z);
        rig.root.rotation.y = e.yaw;
        scene.add(rig.root);
        enemyVisuals.set(e.id, rig);
      }
    }
  };
  syncEnemyVisualPool();

  // Grounded organic marsh herb clusters (replaces bright arcade octahedra)
  const herbGeo = new THREE.ConeGeometry(0.11, 0.34, 5);
  herbGeo.translate(0, 0.14, 0);
  const herbMat = new THREE.MeshStandardMaterial({
    color: 0x3b6642,
    emissive: 0xc29838,
    emissiveIntensity: 0.35,
    roughness: 0.85,
  });
  const herbMeshes = sense.herbs.map((h) => {
    const grp = new THREE.Group();
    const gy = groundHeightAt(h.x, h.z);
    grp.position.set(h.x, gy, h.z);
    for (let b = 0; b < 3; b++) {
      const leaf = new THREE.Mesh(herbGeo, herbMat);
      const a = (b / 3) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08);
      leaf.rotation.z = Math.cos(a) * 0.38;
      leaf.rotation.x = Math.sin(a) * 0.38;
      grp.add(leaf);
    }
    scene.add(grp);
    return grp;
  });

  const trackGeo = new THREE.RingGeometry(0.28, 0.45, 12);
  trackGeo.rotateX(-Math.PI / 2);
  const trackMat = new THREE.MeshBasicMaterial({
    color: 0xf25c28,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const trackMeshes = sense.tracks.map((tr) => {
    const m = new THREE.Mesh(trackGeo, trackMat);
    m.position.set(tr.x, groundHeightAt(tr.x, tr.z) + 0.05, tr.z);
    scene.add(m);
    return m;
  });

  // Post-processing composer (dynamic per graphics tier)
  let composer: EffectComposer | null = null;
  let activeGraphics: GraphicsPresetId = activeSettings.graphics;

  const rebuildComposer = (gfx: GraphicsPresetId) => {
    activeGraphics = gfx;
    composer?.dispose();
    composer = null;

    if (isSoftwareGl || gfx === 'low') {
      renderer.setPixelRatio(isSoftwareGl ? 1 : gfx === 'low' ? 0.85 : 1);
      renderer.shadowMap.enabled = false;
      keyLight.castShadow = false;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      return;
    }

    const dpr = gfx === 'ultra' ? Math.min(window.devicePixelRatio, 1.85) : gfx === 'high' ? Math.min(window.devicePixelRatio, 1.35) : 1;
    renderer.setPixelRatio(dpr);
    renderer.shadowMap.enabled = true;
    keyLight.castShadow = true;
    const shadowRes = gfx === 'ultra' ? 2048 : 1024;
    if (keyLight.shadow.mapSize.x !== shadowRes) {
      keyLight.shadow.mapSize.set(shadowRes, shadowRes);
      keyLight.shadow.map?.dispose();
      keyLight.shadow.map = null;
    }

    try {
      renderer.toneMapping = THREE.NoToneMapping;
      composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new BloomEffect({
        mipmapBlur: true,
        luminanceThreshold: 0.84,
        intensity: gfx === 'ultra' ? 0.7 : 0.56,
      });
      const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
      const vignette = new VignetteEffect({ darkness: 0.44, offset: 0.28 });

      if (gfx === 'ultra' || gfx === 'high') {
        const ca = new ChromaticAberrationEffect({
          offset: new THREE.Vector2(0.00042, 0.00042),
          radialModulation: true,
          modulationOffset: 0.25,
        });
        const smaa = new SMAAEffect({ preset: gfx === 'ultra' ? SMAAPreset.HIGH : SMAAPreset.MEDIUM });
        composer.addPass(new EffectPass(camera, bloom, toneMapping, vignette, ca));
        composer.addPass(new EffectPass(camera, smaa));
      } else {
        composer.addPass(new EffectPass(camera, bloom, toneMapping, vignette));
      }
      composer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    } catch (err) {
      console.warn('[Vedun] PostFX fallback:', err);
      composer?.dispose();
      composer = null;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
  };
  rebuildComposer(activeSettings.graphics);
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  const camPos = new THREE.Vector3(0, 3.3, 9.8);
  const camLook = new THREE.Vector3(0, 1.6, -4);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  const applyTodImmediate = (tod: TodPhase) => {
    const p = TOD_MAP[tod];
    _tmpColorA.set(p.skyColor);
    bgColor.copy(_tmpColorA);
    fog.color.set(p.fogColor);
    fog.density = p.fogDensity;
    keyLight.color.set(p.keyColor);
    keyLight.intensity = p.keyIntensity;
    keyLight.position.set(...p.keyPosition);
    hemiLight.color.set(p.hemiSkyColor);
    hemiLight.groundColor.set(p.hemiGroundColor);
    hemiLight.intensity = p.hemiIntensity;
    rimLight.color.set(p.rimColor);
    rimLight.intensity = p.rimIntensity;
    clearingSpot.color.set(tod === 'dusk' ? 0xf2b47c : tod === 'night' ? 0x9ec0d8 : 0xd4e2dc);
    clearingSpot.intensity = tod === 'night' ? 2.6 : 1.9;
    clearing.fireLight.color.set(p.fireColor);
    renderer.toneMappingExposure = p.exposure;
  };
  applyTodImmediate(currentTod);

  const applyCameraPreset = (preset: CameraPreset, snapCamera = false) => {
    currentPreset = preset;
    if (preset === 'dawn_hub') {
      currentTod = 'dawn';
      currentStance = 'idle';
      heroState.x = 0.0;
      heroState.z = 3.2;
      heroState.y = groundHeightAt(0.0, 3.2);
      heroState.yaw = Math.PI;
    } else if (preset === 'dusk_combat') {
      currentTod = 'dusk';
      currentStance = 'svarog';
      heroState.x = 2.0;
      heroState.z = -11.3;
      heroState.y = groundHeightAt(2.0, -11.3);
      heroState.yaw = Math.atan2(5.4 - 2.0, -13.5 - -11.3);
    } else if (preset === 'night_barrow') {
      currentTod = 'night';
      currentStance = 'silver_ready';
      heroState.x = -1.6;
      heroState.z = -11.4;
      heroState.y = groundHeightAt(-1.6, -11.4);
      heroState.yaw = Math.atan2(-3.4 - -1.6, -13.8 - -11.4);
    } else {
      currentStance = 'idle';
    }
    heroRig.setStance(currentStance);
    heroRig.setBlade(combat.blade, combat.bladeTier, combat.attackPhase !== 'idle' || currentPreset !== 'follow');
    applyTodImmediate(currentTod);
    if (snapCamera) {
      if (preset === 'dawn_hub') {
        camPos.set(0.4, groundHeightAt(0.4, 7.6) + 2.45, 7.6);
        camLook.set(0.2, 1.85, -5.8);
      } else if (preset === 'dusk_combat') {
        camPos.set(2.55, groundHeightAt(2.55, -8.8) + 1.85, -8.8);
        camLook.set(4.15, 1.75, -12.6);
      } else if (preset === 'night_barrow') {
        camPos.set(0.55, groundHeightAt(0.55, -9.35) + 1.65, -9.35);
        camLook.set(-3.4, 1.45, -13.8);
      } else {
        camPos.set(0, groundHeightAt(0, 4.5 + helloTuning.cameraDistance) + helloTuning.cameraHeight, 4.5 + helloTuning.cameraDistance);
        camLook.set(0, groundHeightAt(0, 4.5) + helloTuning.cameraTargetY, 3.7);
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
    }
  };

  if (opts.initialPreset && opts.initialPreset !== 'follow') {
    applyCameraPreset(opts.initialPreset, true);
  } else {
    heroRig.setStance('idle');
    heroRig.setBlade(combat.blade, combat.bladeTier, false);
  }

  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const w = Math.max(1, Math.floor(entry.contentRect.width));
      const h = Math.max(1, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      if (composer) {
        composer.render(0);
      } else {
        renderer.render(scene, camera);
      }
    }
  });
  ro.observe(container);

  let nearby: NearbyInteractable = null;
  let footstepAcc = 0;

  const pushCallout = (text: string, tone: CombatCallout['tone'], worldX: number, worldY: number, worldZ: number) => {
    _lookTarget.set(worldX, worldY, worldZ).project(camera);
    const sx = Math.max(12, Math.min(88, (_lookTarget.x * 0.5 + 0.5) * 100));
    const sy = Math.max(16, Math.min(78, (-_lookTarget.y * 0.5 + 0.5) * 100));
    latestCallout = { id: ++calloutSeq, text, tone, x: sx, y: sy };
    calloutTimer = 0.95;
    hudDirty = true;
  };

  const buildSnapshot = (): SceneSnapshot => {
    const boss = enemies.find((e) => e.isBoss);
    const focused =
      (lockedEnemyId ? enemies.find((e) => e.id === lockedEnemyId && e.hp > 0) : null) ??
      pickNextTargetEnemy(enemies, heroState.x, heroState.z, null, false);
    const nearbyPrompt: SceneSnapshot['nearbyPrompt'] =
      nearby?.kind === 'npc'
        ? nearby.npcId === 'zoryana'
          ? 'npc_zoryana'
          : 'npc_miroslav'
        : nearby?.kind === 'herb'
          ? 'herb'
          : nearby?.kind === 'shrine'
            ? 'shrine'
            : nearby?.kind === 'campfire'
              ? 'campfire'
              : null;

    return {
      mode: currentMode,
      outcome,
      tod: currentTod,
      todLabel: TOD_MAP[currentTod].label,
      preset: currentPreset,
      stance: currentStance,
      hp: Math.round(combat.hp),
      maxHp: Math.round(combat.maxHp),
      stamina: Math.round(heroState.stamina),
      maxStamina: helloTuning.maxStamina,
      blade: combat.blade,
      bladeTier: combat.bladeTier,
      selectedSign: signs.selected,
      signCooldowns: {
        svarog: Number(signs.cooldowns.svarog.toFixed(1)),
        veles: Number(signs.cooldowns.veles.toFixed(1)),
        makosh: Number(signs.cooldowns.makosh.toFixed(1)),
        mara: Number(signs.cooldowns.mara.toFixed(1)),
      },
      shieldHp: Math.round(combat.shieldHp),
      navMark: Math.round(combat.navMark),
      silver: combat.silver,
      trophies: combat.trophies,
      herbs: combat.herbs,
      swallowCharges: combat.swallowCharges,
      activeOil: combat.activeOil,
      oilCharges: combat.oilCharges,
      slainCount: combat.slainCount,
      senseActive: sense.auraTimer > 0,
      shrineBuffActive: sense.shrineBuffTimer > 0,
      counterReady: combat.counterBuffTimer > 0,
      bossHp: boss ? Math.max(0, Math.round(boss.hp)) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      bossPhase2: boss?.bossPhase2 ?? false,
      targetEnemy: focused
        ? {
            id: focused.id,
            kind: focused.kind,
            genus: focused.genus,
            hp: Math.max(0, Math.round(focused.hp)),
            maxHp: focused.maxHp,
            staggered: focused.phase === 'staggered' || focused.vulnerableTimer > 0,
            blocking: focused.kind === 'bandit' && focused.hasBlockedFront,
            bossPhase2: focused.bossPhase2,
            locked: focused.id === lockedEnemyId,
          }
        : null,
      callout: calloutTimer > 0 ? latestCallout : null,
      nearbyPrompt,
      activeDialogue,
      activeCutscene: activeCutscene
        ? { id: activeCutscene.id, captionKey: activeCutscene.frames[0].captionKey }
        : null,
      contractStage: narrative.progress.stage,
      heroX: Number(heroState.x.toFixed(2)),
      heroZ: Number(heroState.z.toFixed(2)),
      cameraYaw: Number(camOrbitYaw.toFixed(3)),
      movedDistance: Number(heroState.totalDistance.toFixed(2)),
      isSoftwareGl: isSoftwareGl,
    };
  };

  const emitHud = () => onHudUpdate(buildSnapshot());
  emitHud();

  const handleEnemyKills = (kills: { id: string; kind: string; x: number; z: number; silver: number; isBoss: boolean }[]) => {
    for (const k of kills) {
      combat.slainCount++;
      combat.silver += k.silver;
      vfx.spawnBurst(k.x, groundHeightAt(k.x, k.z) + 0.8, k.z, k.isBoss ? 34 : 18, k.isBoss ? 0xf28c28 : 0xc9343a, 5.5, 1.3);
      events.emit('enemy_died', k);
      if (k.isBoss) {
        combat.trophies++;
        combat.hitstopTimer = 0.09;
        combat.trauma = 0.9;
        narrative.progress.leshySlain = true;
        narrative.progress.stage = 'endless';
        activeCutscene = startCutscene('CS03');
        events.emit('cutscene_started', { id: 'CS03' });
        events.emit('contract_updated', { stage: 3, completed: true });
      }
    }
  };

  const performInteract = (): boolean => {
    nearby = findNearestInteractable(sense, heroState.x, heroState.z);
    if (!nearby) return false;
    if (nearby.kind === 'npc') {
      activeDialogue = narrative.startNpcDialogue(nearby.npcId, activeSettings.language);
      sound.playUiClick();
      events.emit('npc_talked', { npcId: nearby.npcId });
      emitHud();
      return true;
    }
    if (nearby.kind === 'herb') {
      nearby.herb.gathered = true;
      combat.herbs++;
      vfx.spawnBurst(nearby.herb.x, groundHeightAt(nearby.herb.x, nearby.herb.z) + 0.3, nearby.herb.z, 12, 0x62d98e, 3.0, 0.9);
      sound.playSense();
      events.emit('herb_gathered', { kind: nearby.herb.kind, x: nearby.herb.x, z: nearby.herb.z });
      emitHud();
      return true;
    }
    if (nearby.kind === 'shrine') {
      sense.shrineCommuned = true;
      sense.shrineBuffTimer = 25;
      narrative.progress.shrineExamined = true;
      if (narrative.progress.stage === 'intro' || narrative.progress.stage === 'shrine') {
        narrative.progress.stage = 'boss';
      }
      vfx.spawnBurst(0, groundHeightAt(0, -7.5) + 1.8, -7.5, 22, 0xf2b44c, 4.5, 1.2);
      sound.playSign('makosh');
      if (!cs02Played) {
        cs02Played = true;
        activeCutscene = startCutscene('CS02');
        events.emit('cutscene_started', { id: 'CS02' });
      }
      emitHud();
      return true;
    }
    if (nearby.kind === 'campfire') {
      combat.hp = combat.maxHp;
      combat.swallowCharges = Math.max(combat.swallowCharges, 3);
      heroState.stamina = helloTuning.maxStamina;
      sound.playSign('svarog');
      vfx.spawnBurst(NPC_SPOTS.campfire.x, groundHeightAt(NPC_SPOTS.campfire.x, NPC_SPOTS.campfire.z) + 0.6, NPC_SPOTS.campfire.z, 16, 0xf28c28, 3.2, 1.0);
      emitHud();
      return true;
    }
    return false;
  };

  let disposed = false;
  let rafId = 0;
  let timeoutId = 0;
  let lastNow = performance.now();
  let acc = 0;
  let elapsed = 0;
  let hudTimer = 0;
  let hudDirty = false;
  const FIXED_STEP = 1 / 60;
  const useAfterDraw = isSoftwareGl || new URLSearchParams(window.location.search).get('pace') === '1';

  const scheduleNext = () => {
    if (disposed) return;
    if (useAfterDraw) {
      afterDraw(renderer, tick, (id) => {
        timeoutId = id;
      });
    } else {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const telegraphsScratch: { x: number; y: number; z: number; radius: number; progress: number }[] = [];
  const trapsScratch: { x: number; y: number; z: number; radius: number }[] = [];

  const tick = () => {
    if (disposed) return;
    const now = performance.now();
    const rawDt = Math.min((now - lastNow) / 1000, 0.05);
    lastNow = now;
    elapsed += rawDt;

    input.tick(rawDt);
    sound.setPaused(currentMode !== 'playing');
    sound.tick(rawDt);

    if (input.consume('pause')) {
      if (activeCutscene) {
        const id = activeCutscene.id;
        activeCutscene = null;
        events.emit('cutscene_ended', { id });
        emitHud();
      } else if (activeDialogue) {
        activeDialogue = null;
        emitHud();
      } else if (currentMode === 'playing') {
        currentMode = 'paused';
        document.body.dataset.state = 'paused';
        input.clear();
        events.emit('state_changed', { mode: 'paused' });
        emitHud();
      } else if (currentMode === 'paused') {
        currentMode = 'playing';
        document.body.dataset.state = 'playing';
        events.emit('state_changed', { mode: 'playing' });
        emitHud();
      }
    }

    if (currentMode === 'playing' && activeCutscene) {
      if (input.consume('jump') || input.consume('dash') || input.consume('attack_light')) {
        const id = activeCutscene.id;
        activeCutscene = null;
        events.emit('cutscene_ended', { id });
        if (id === 'CS03') {
          currentMode = 'gameover';
          outcome = 'victory';
          document.body.dataset.state = 'gameover';
          events.emit('state_changed', { mode: 'gameover' });
        }
        emitHud();
      }
    }

    // WoW-style Camera Orbit, Wheel Zoom & Tab Target Lock
    if (calloutTimer > 0) {
      calloutTimer = Math.max(0, calloutTimer - rawDt);
    }
    if (magicLightTimer > 0) {
      magicLightTimer = Math.max(0, magicLightTimer - rawDt);
      magicLight.intensity = magicLightTimer * 9.0;
    } else {
      magicLight.intensity = 0;
    }

    if (currentMode === 'playing' && !activeDialogue && !activeCutscene) {
      const orb = input.consumeOrbitDelta();
      if (orb.dx !== 0 || orb.dy !== 0) {
        camOrbitYaw -= orb.dx * 0.0055;
        camOrbitPitch = Math.max(0.14, Math.min(1.06, camOrbitPitch + orb.dy * 0.0042));
      }
      const wh = input.consumeWheelDelta();
      if (wh !== 0) {
        camOrbitDist = Math.max(3.8, Math.min(12.5, camOrbitDist + wh * 0.004));
      }
      if (input.consumeTargetLock()) {
        const nextTgt = pickNextTargetEnemy(enemies, heroState.x, heroState.z, lockedEnemyId, true);
        lockedEnemyId = nextTgt ? nextTgt.id : null;
        sound.playUiClick();
        hudDirty = true;
      }

      if (input.consume('sign_1')) {
        signs.selected = 'svarog';
        hudDirty = true;
      } else if (input.consume('sign_2')) {
        signs.selected = 'veles';
        hudDirty = true;
      } else if (input.consume('sign_3')) {
        signs.selected = 'makosh';
        hudDirty = true;
      } else if (input.consume('sign_4')) {
        signs.selected = 'mara';
        hudDirty = true;
      }

      if (input.consume('cycle_tod')) {
        const idx = TOD_ORDER.indexOf(currentTod);
        currentTod = TOD_ORDER[(idx + 1) % TOD_ORDER.length];
        applyTodImmediate(currentTod);
        events.emit('tod_changed', { tod: currentTod });
        emitHud();
      }

      if (input.consume('switch_blade')) {
        combat.blade = combat.blade === 'silver' ? 'steel' : 'silver';
        sound.playSwing(combat.blade, false);
        heroRig.setBlade(combat.blade, combat.bladeTier, true);
        hudDirty = true;
      }

      if (input.consume('alchemy')) {
        if (tryDrinkSwallow(combat)) {
          sound.playSign('makosh');
          vfx.spawnBurst(heroState.x, heroState.y + 1.0, heroState.z, 12, 0x62d98e, 3.0, 0.9);
          pushCallout('+45', 'heal', heroState.x, heroState.y + 1.8, heroState.z);
          hudDirty = true;
        }
      }

      acc += rawDt;
      while (acc >= FIXED_STEP) {
        // Hitstop pauses gameplay simulation briefly for crunchy impact weight
        if (combat.hitstopTimer > 0) {
          combat.hitstopTimer = Math.max(0, combat.hitstopTimer - FIXED_STEP);
          combat.trauma = Math.max(0, combat.trauma - FIXED_STEP * 1.1);
          acc -= FIXED_STEP;
          continue;
        }

        stepCombatTimers(combat, FIXED_STEP);
        stepSigns(signs, FIXED_STEP);
        stepSenseState(sense, FIXED_STEP);

        if (input.consume('sense')) {
          if (!performInteract()) {
            const pulse = triggerVedunSensePulse(sense, heroState.x, heroState.z);
            const exposed = revealWeaknessesInRadius(enemies, heroState.x, heroState.z, 7.5);
            vfx.triggerSense(heroState.x, heroState.y, heroState.z);
            sound.playSense();
            if (exposed > 0) {
              pushCallout('WEAKNESS EXPOSED', 'riposte', heroState.x, heroState.y + 2.0, heroState.z);
              vfx.spawnBurst(heroState.x, heroState.y + 1.1, heroState.z, 14, 0xf2d06b, 4.5, 0.9);
            }
            events.emit('sense_pulsed', { x: heroState.x, z: heroState.z, discoveries: pulse.discoveries + exposed });
          }
          hudDirty = true;
        }

        if (input.consume('cast_sign')) {
          const castRes = tryCastSign(signs, combat, heroState.stamina, heroState.x, heroState.z);
          if (castRes.cast) {
            heroState.stamina -= castRes.staminaCost;
            sound.playSign(castRes.sign);
            vfx.triggerSignBurst(castRes.sign, heroState.x, heroState.y, heroState.z, heroState.yaw);
            magicLight.color.setHex(
              castRes.sign === 'svarog' ? 0xf28c28 : castRes.sign === 'veles' ? 0x72e2f8 : castRes.sign === 'makosh' ? 0xf2d06b : 0xb852e8,
            );
            magicLight.position.set(heroState.x, heroState.y + 1.6, heroState.z);
            magicLightTimer = 0.55;
            events.emit('sign_cast', { sign: castRes.sign, x: heroState.x, z: heroState.z });
            const mult = getSignPowerMultiplier(combat.navMark, sense.shrineBuffTimer);
            const signImpacts = resolveSignImpactOnEnemies(
              enemies,
              castRes.sign,
              heroState.x,
              heroState.z,
              heroState.yaw,
              mult,
            );
            for (const h of signImpacts.hits) {
              vfx.spawnBurst(h.x, groundHeightAt(h.x, h.z) + 0.9, h.z, 12, castRes.sign === 'svarog' ? 0xf28c28 : 0x72e2f8, 4.4, 1.0);
              pushCallout(`${h.damage}`, h.crit ? 'crit' : 'hit', h.x, groundHeightAt(h.x, h.z) + 1.9, h.z);
              events.emit('combat_hit', { x: h.x, z: h.z, damage: h.damage, blade: combat.blade, crit: h.crit, genus: h.genus });
            }
            // Active Zbruch Shrine combat resonance & micro-ward if casting near the idol
            if (Math.hypot(heroState.x, heroState.z + 7.5) < 5.6) {
              sense.shrineBuffTimer = Math.max(sense.shrineBuffTimer, 18);
              combat.shieldHp = Math.max(combat.shieldHp, 15);
              combat.shieldTimer = Math.max(combat.shieldTimer, 8);
              heroState.stamina = Math.min(helloTuning.maxStamina, heroState.stamina + 20);
              vfx.spawnBurst(0, groundHeightAt(0, -7.5) + 1.4, -7.5, 16, 0xf2b44c, 4.8, 1.1);
            }
            // Blood Mark of Nav escalation: Night Stalker ambush at >= 75% Nav Mark
            if (currentTod === 'night' && combat.navMark >= 75) {
              if (spawnNightStalker(enemies, heroState.x, heroState.z, activeSettings.difficulty, groundHeightAt)) {
                syncEnemyVisualPool();
                pushCallout('NAV STALKER!', 'riposte', heroState.x, heroState.y + 2.2, heroState.z);
              }
            }
            handleEnemyKills(signImpacts.kills);
            hudDirty = true;
          }
        }

        const wantHeavy = input.consume('attack_heavy');
        const wantLight = input.consume('attack_light');
        if (wantHeavy || wantLight) {
          // Align swing cleanly to camera facing when steering with RMB or toward locked enemy
          if (input.isCameraSteering()) {
            heroState.yaw = camOrbitYaw;
          } else if (lockedEnemyId) {
            const tgt = enemies.find((e) => e.id === lockedEnemyId && e.hp > 0);
            if (tgt && Math.hypot(tgt.x - heroState.x, tgt.z - heroState.z) < 4.5) {
              heroState.yaw = Math.atan2(tgt.x - heroState.x, tgt.z - heroState.z);
            }
          }
          const resAtk = tryStartAttack(combat, wantHeavy, heroState.stamina);
          if (resAtk.started) {
            heroState.stamina -= resAtk.staminaSpent;
            heroRig.setBlade(combat.blade, combat.bladeTier, true);
            sound.playSwing(combat.blade, wantHeavy);
            events.emit('combat_swing', { blade: combat.blade, combo: combat.comboIndex, heavy: wantHeavy });
            hudDirty = true;
          }
        }

        // Virtual thumbstick + Keyboard WASD movement (camera-relative + WoW RMB steering)
        const stick = input.getVirtualStick();
        const kForward = (input.isHeld('move_forward') ? 1 : 0) - (input.isHeld('move_back') ? 1 : 0);
        const kRight = (input.isHeld('move_right') ? 1 : 0) - (input.isHeld('move_left') ? 1 : 0);
        const forward = Math.max(-1, Math.min(1, kForward - stick.y));
        const right = Math.max(-1, Math.min(1, kRight + stick.x));
        const dashPressed = input.consume('dash');
        const jumpPressed = input.consume('jump');
        const jumpHeld = input.isHeld('jump');
        const steerWithCamera = input.isCameraSteering();

        if ((forward !== 0 || right !== 0 || dashPressed || jumpPressed || steerWithCamera) && currentPreset !== 'follow') {
          currentPreset = 'follow';
          currentStance = 'idle';
          heroRig.setStance('idle');
        }

        const res = stepHeroLocomotion(
          heroState,
          {
            forward,
            right,
            cameraYaw: camOrbitYaw,
            steerWithCamera,
            dashPressed,
            jumpPressed,
            jumpHeld,
            lungeSpeed: combat.lungeSpeed,
            lungeDirX: Math.sin(heroState.yaw),
            lungeDirZ: Math.cos(heroState.yaw),
          },
          FIXED_STEP,
          helloTuning,
          groundHeightAt,
          CLEARING_OBSTACLES,
        );

        if (res.jumped) {
          sound.playJump();
          vfx.spawnBurst(heroState.x, heroState.groundY, heroState.z, 6, 0x9aa69e, 2.4, 0.7);
          events.emit('hero_jumped', { x: heroState.x, z: heroState.z });
          if (detectPerfectEvade(enemies, heroState.x, heroState.z)) {
            combat.counterBuffTimer = 2.0;
            combat.invulnTimer = Math.max(combat.invulnTimer, 0.35);
            heroState.stamina = Math.min(helloTuning.maxStamina, heroState.stamina + 20);
            vfx.spawnBurst(heroState.x, heroState.y + 1.0, heroState.z, 14, 0xf2d06b, 4.2, 1.0);
            pushCallout('RIPOSTE READY', 'riposte', heroState.x, heroState.y + 2.0, heroState.z);
          }
        }
        if (res.landed) {
          sound.playLand(res.impactSpeed);
          vfx.spawnBurst(heroState.x, heroState.groundY, heroState.z, 8, isWaterAt(heroState.x, heroState.z) ? 0x8bb0bd : 0x5c5344, 3.0, 0.8);
          events.emit('hero_landed', { x: heroState.x, z: heroState.z, impactSpeed: res.impactSpeed });
        }
        if (res.dashed) {
          combat.invulnTimer = Math.max(combat.invulnTimer, 0.3);
          sound.playDash();
          vfx.spawnBurst(heroState.x, heroState.y + 0.4, heroState.z, 9, 0xa8c8d8, 3.6, 0.8);
          events.emit('hero_dashed', { x: heroState.x, z: heroState.z });
          if (detectPerfectEvade(enemies, heroState.x, heroState.z)) {
            combat.counterBuffTimer = 2.0;
            combat.invulnTimer = Math.max(combat.invulnTimer, 0.4);
            heroState.stamina = Math.min(helloTuning.maxStamina, heroState.stamina + 22);
            sound.playSense();
            vfx.spawnBurst(heroState.x, heroState.y + 1.0, heroState.z, 16, 0xf2d06b, 4.6, 1.1);
            pushCallout('RIPOSTE READY', 'riposte', heroState.x, heroState.y + 2.0, heroState.z);
          }
        }
        if (res.moved > 0.001) {
          footstepAcc += res.moved;
          if (heroState.isGrounded && footstepAcc >= 1.55) {
            footstepAcc = 0;
            sound.playFootstep(isWaterAt(heroState.x, heroState.z));
          }
          events.emit('hero_moved', { distance: heroState.totalDistance });
        }

        // Melee active hit window
        if (combat.attackPhase === 'active') {
          const spec = getActiveAttackSpec(combat);
          const hadCounter = combat.counterBuffTimer > 0;
          const melee = resolveHeroMeleeHits(
            enemies,
            heroState.x,
            heroState.z,
            heroState.yaw,
            combat,
            spec.reach,
            spec.damage,
            combat.attackHeavy,
          );
          for (const h of melee.hits) {
            if (h.blocked) {
              sound.playHurt(true);
              vfx.spawnBurst(h.x, groundHeightAt(h.x, h.z) + 1.0, h.z, 10, 0xffe49e, 4.5, 0.8);
              pushCallout('BLOCKED [F]', 'blocked', h.x, groundHeightAt(h.x, h.z) + 1.9, h.z);
            } else {
              sound.playHit(combat.blade, h.crit);
              combat.hitstopTimer = Math.max(combat.hitstopTimer, hadCounter ? 0.085 : h.finisher ? 0.075 : spec.hitstop);
              combat.trauma = Math.min(1, combat.trauma + spec.trauma + (hadCounter ? 0.2 : h.finisher ? 0.14 : 0));
              vfx.spawnBurst(
                h.x,
                groundHeightAt(h.x, h.z) + 1.0,
                h.z,
                h.crit || h.finisher ? 18 : 11,
                hadCounter ? 0xf2d06b : h.finisher ? 0xf28c28 : combat.blade === 'silver' ? 0x9ce2ff : 0xc9343a,
                5.2,
                1.0,
              );
              magicLight.color.setHex(hadCounter ? 0xf2d06b : combat.blade === 'silver' ? 0x82d6ff : 0xf28c28);
              magicLight.position.set(h.x, groundHeightAt(h.x, h.z) + 1.3, h.z);
              magicLightTimer = 0.24;
              pushCallout(
                hadCounter
                  ? `RIPOSTE ${h.damage}!`
                  : h.finisher
                    ? `FINISHER ${h.damage}!`
                    : h.crit
                      ? `CRIT ${h.damage}!`
                      : `${h.damage}`,
                hadCounter ? 'riposte' : h.crit || h.finisher ? 'crit' : 'hit',
                h.x,
                groundHeightAt(h.x, h.z) + 1.9,
                h.z,
              );
              events.emit('combat_hit', { x: h.x, z: h.z, damage: h.damage, blade: combat.blade, crit: h.crit, genus: h.genus });
            }
            hudDirty = true;
          }
          handleEnemyKills(melee.kills);
        }

        // Step enemy AI & resolve enemy attacks on hero
        const enemyEvents = stepEnemies(
          enemies,
          heroState.x,
          heroState.y,
          heroState.z,
          activeSettings.difficulty,
          FIXED_STEP,
          groundHeightAt,
          combat,
          signs,
          sense.shrineBuffTimer,
          helloTuning.arenaRadius,
          narrative.progress.stage === 'endless',
        );
        if (enemyEvents.bossPhase2Triggered) {
          const bp = enemyEvents.bossPhase2Triggered;
          spawnPhase2Minions(enemies, bp.x, bp.z, activeSettings.difficulty, groundHeightAt);
          syncEnemyVisualPool();
          combat.trauma = Math.min(1, combat.trauma + 0.55);
          sound.playTelegraph();
          vfx.spawnBurst(bp.x, groundHeightAt(bp.x, bp.z) + 1.2, bp.z, 26, 0x9834c8, 6.2, 1.3);
          hudDirty = true;
        }
        for (const tg of enemyEvents.telegraphed) {
          sound.playTelegraph();
          events.emit('enemy_telegraph', tg);
        }
        for (const hit of enemyEvents.hitsOnHero) {
          const dmgRes = applyDamageToHero(combat, hit.damage);
          if (dmgRes.shieldAbsorbed || dmgRes.appliedDamage > 0) {
            sound.playHurt(dmgRes.shieldAbsorbed);
            vfx.spawnBurst(heroState.x, heroState.y + 1.0, heroState.z, dmgRes.shieldAbsorbed ? 14 : 16, dmgRes.shieldAbsorbed ? 0xf2b44c : 0xc9343a, 4.8, 1.1);
            events.emit('hero_hurt', { amount: dmgRes.appliedDamage, blocked: dmgRes.shieldAbsorbed });
            hudDirty = true;
            if (dmgRes.dead) {
              currentMode = 'gameover';
              outcome = 'defeat';
              document.body.dataset.state = 'gameover';
              input.clear();
              events.emit('state_changed', { mode: 'gameover' });
              emitHud();
              break;
            }
          }
        }
        handleEnemyKills(enemyEvents.killed);

        nearby = findNearestInteractable(sense, heroState.x, heroState.z);
        acc -= FIXED_STEP;
      }
    }

    // Update adaptive music context
    let inCombat = false;
    let nearBoss = false;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - heroState.x, e.z - heroState.z);
      if (d < 13 && (e.phase === 'chase' || e.phase === 'flank' || e.phase === 'windup' || e.phase === 'active')) {
        inCombat = true;
      }
      if (e.isBoss && d < 17) nearBoss = true;
    }
    sound.setMoodContext({
      tod: currentTod,
      inCombat: currentMode === 'playing' && inCombat,
      nearBoss,
      inBarrow: heroState.z < -10.5,
    });

    // Update visuals
    heroRig.update({
      x: heroState.x,
      y: heroState.y,
      z: heroState.z,
      yaw: heroState.yaw,
      gaitPhase: heroState.gaitPhase,
      isMoving: heroState.isMoving && currentMode === 'playing',
      isDashing: heroState.isDashing && currentMode === 'playing',
      isGrounded: heroState.isGrounded,
      squashY: heroState.squashY,
      attackPhase: combat.attackPhase,
      comboIndex: combat.comboIndex,
      attackHeavy: combat.attackHeavy,
      castingSign: signs.activeCastSign,
      hurtFlash: combat.invulnTimer > 0.28,
      dt: rawDt,
    });

    zoryanaVisual.update(elapsed);
    miroslavVisual.update(elapsed);

    telegraphsScratch.length = 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const rig = enemyVisuals.get(e.id);
      if (!rig) continue;
      rig.root.position.set(e.x, e.y, e.z);
      rig.root.rotation.y = e.yaw;
      rig.root.visible = e.koFade > 0.03;
      rig.root.scale.setScalar(e.hp <= 0 ? Math.max(0.05, e.koFade) : 1);
      rig.root.rotation.x = e.hp <= 0 ? (1 - e.koFade) * 1.15 : 0;
      if ('update' in rig) {
        (rig as SimpleVisualActor).update(elapsed, {
          hitFlash: e.hitFlashTimer > 0,
          windup: e.phase === 'windup',
          burning: e.burnTimer > 0,
        });
      }
      if (e.hp > 0 && e.phase === 'windup') {
        telegraphsScratch.push({
          x: e.telegraphX,
          y: groundHeightAt(e.telegraphX, e.telegraphZ),
          z: e.telegraphZ,
          radius: e.telegraphRadius,
          progress: e.telegraphProgress,
        });
      }
    }

    trapsScratch.length = 0;
    for (let i = 0; i < signs.traps.length; i++) {
      const tr = signs.traps[i];
      trapsScratch.push({ x: tr.x, y: groundHeightAt(tr.x, tr.z), z: tr.z, radius: tr.radius });
    }

    const focusedEnemy =
      (lockedEnemyId ? enemies.find((e) => e.id === lockedEnemyId && e.hp > 0) : null) ??
      pickNextTargetEnemy(enemies, heroState.x, heroState.z, null, false);
    if (lockedEnemyId && (!focusedEnemy || focusedEnemy.id !== lockedEnemyId)) {
      lockedEnemyId = null;
    }

    vfx.update({
      dt: rawDt,
      elapsed,
      heroX: heroState.x,
      heroY: heroState.y,
      heroZ: heroState.z,
      heroYaw: heroState.yaw,
      blade: combat.blade,
      attackActive: combat.attackPhase === 'active',
      attackHeavy: combat.attackHeavy,
      shieldActive: combat.shieldHp > 0,
      counterReady: combat.counterBuffTimer > 0,
      targetPos: focusedEnemy
        ? {
            x: focusedEnemy.x,
            y: focusedEnemy.y,
            z: focusedEnemy.z,
            scale: focusedEnemy.isBoss ? 1.85 : 1.0,
            locked: focusedEnemy.id === lockedEnemyId,
          }
        : null,
      telegraphs: telegraphsScratch,
      traps: trapsScratch,
    });

    // Update herbs & sense tracks visibility
    for (let i = 0; i < sense.herbs.length; i++) {
      const h = sense.herbs[i];
      const m = herbMeshes[i];
      if (!m) continue;
      m.visible = !h.gathered;
      m.rotation.y = elapsed * 1.6 + i;
      m.scale.setScalar(sense.auraTimer > 0 ? 1.45 : 1.0);
    }
    trackMat.opacity = sense.auraTimer > 0 ? 0.85 : 0.22;

    const p = TOD_MAP[currentTod];
    // Keep directional shadow frustum tightly centered on hero for sharper shadows at lower mapSize
    if (keyLight.castShadow) {
      keyLight.target.position.set(heroState.x, 0, heroState.z);
      keyLight.position.set(
        heroState.x + p.keyPosition[0] * 0.72,
        p.keyPosition[1] * 0.85,
        heroState.z + p.keyPosition[2] * 0.72,
      );
    }
    clearing.update(elapsed, p.fireIntensity, currentTod);
    atmosphere.update(elapsed, {
      skyZenith: p.skyZenith,
      skyHorizon: p.skyHorizon,
      cloudTint: p.cloudTint,
      sunGlow: p.sunGlow,
      keyDirection: p.keyPosition,
      rayColor: p.rayColor,
      rayOpacity: p.rayOpacity,
      moonVisible: p.moonVisible,
    });

    // Camera rigging (Cutscene / Title Flyover / Look-Dev Presets / WoW Spherical Follow + Trauma Shake)
    if (activeCutscene && currentMode === 'playing') {
      const csSample = sampleCutscene(activeCutscene, rawDt);
      _camDesired.set(...csSample.camPos);
      _lookTarget.set(...csSample.lookAt);
      if (csSample.done) {
        const finishedId = activeCutscene.id;
        activeCutscene = null;
        events.emit('cutscene_ended', { id: finishedId });
        if (finishedId === 'CS03') {
          currentMode = 'gameover';
          outcome = 'victory';
          document.body.dataset.state = 'gameover';
          events.emit('state_changed', { mode: 'gameover' });
        }
        hudDirty = true;
      }
    } else if (currentMode === 'title') {
      const tourAngle = elapsed * 0.14;
      _camDesired.set(Math.sin(tourAngle) * 7.6, 3.1, 7.0 + Math.cos(tourAngle) * 2.1);
      _lookTarget.set(0.3, 1.75, -5.2);
    } else if (currentPreset === 'dawn_hub') {
      _camDesired.set(0.4, groundHeightAt(0.4, 7.6) + 2.45, 7.6);
      _lookTarget.set(0.2, 1.85, -5.8);
    } else if (currentPreset === 'dusk_combat') {
      _camDesired.set(2.55, groundHeightAt(2.55, -8.8) + 1.85, -8.8);
      _lookTarget.set(4.15, 1.75, -12.6);
    } else if (currentPreset === 'night_barrow') {
      _camDesired.set(0.55, groundHeightAt(0.55, -9.35) + 1.65, -9.35);
      _lookTarget.set(-3.4, 1.45, -13.8);
    } else {
      // Spherical WoW orbit camera behind camOrbitYaw with ground collision safety
      const horizDist = Math.cos(camOrbitPitch) * camOrbitDist;
      const vertOffset = Math.sin(camOrbitPitch) * camOrbitDist + 1.35;
      const desiredX = heroState.x - Math.sin(camOrbitYaw) * horizDist;
      const desiredZ = heroState.z - Math.cos(camOrbitYaw) * horizDist;
      const groundAtCam = groundHeightAt(desiredX, desiredZ);
      const desiredY = Math.max(groundAtCam + 0.95, heroState.y + vertOffset);
      _camDesired.set(desiredX, desiredY, desiredZ);
      _lookTarget.set(
        heroState.x + Math.sin(camOrbitYaw) * 0.85,
        heroState.y + helloTuning.cameraTargetY,
        heroState.z + Math.cos(camOrbitYaw) * 0.85,
      );
    }

    const damp = currentPreset === 'follow'
      ? 1 - Math.exp(-(input.isCameraSteering() ? 24 : helloTuning.cameraDamping) * rawDt)
      : 0.25;
    camPos.lerp(_camDesired, damp);
    camLook.lerp(_lookTarget, damp);
    camera.position.copy(camPos);
    if (combat.trauma > 0.01 && currentMode === 'playing') {
      const shake = combat.trauma * combat.trauma * 0.22;
      camera.position.x += Math.sin(elapsed * 47) * shake;
      camera.position.y += Math.cos(elapsed * 53) * shake;
    }
    camera.lookAt(camLook);

    if (composer) {
      composer.render(rawDt);
    } else {
      renderer.render(scene, camera);
    }

    hudTimer += rawDt;
    if (hudDirty || hudTimer >= 0.12) {
      hudTimer = 0;
      hudDirty = false;
      emitHud();
    }

    scheduleNext();
  };

  tick();

  return {
    getState: buildSnapshot,
    setMode(mode: GameStateMode) {
      const prev = currentMode;
      currentMode = mode;
      document.body.dataset.state = mode;
      input.setGameplayMouseEnabled(mode === 'playing' && !activeDialogue);
      if (mode !== 'playing') {
        input.clear();
      } else if (prev === 'title' && heroState.totalDistance < 0.1 && opts.initialMode !== 'playing' && currentPreset === 'follow') {
        activeCutscene = startCutscene('CS01');
        events.emit('cutscene_started', { id: 'CS01' });
      }
      events.emit('state_changed', { mode });
      emitHud();
    },
    setTod(tod: TodPhase) {
      currentTod = tod;
      applyTodImmediate(tod);
      events.emit('tod_changed', { tod });
      emitHud();
    },
    cycleTod(): TodPhase {
      const idx = TOD_ORDER.indexOf(currentTod);
      const next = TOD_ORDER[(idx + 1) % TOD_ORDER.length];
      this.setTod(next);
      return next;
    },
    setLookDevPreset(preset: CameraPreset) {
      applyCameraPreset(preset, true);
      events.emit('tod_changed', { tod: currentTod });
      emitHud();
    },
    resetHero() {
      outcome = 'none';
      activeDialogue = null;
      activeCutscene = null;
      lockedEnemyId = null;
      camOrbitYaw = Math.PI;
      camOrbitPitch = 0.34;
      camOrbitDist = helloTuning.cameraDistance;
      currentPreset = 'follow';
      currentStance = 'idle';
      combat.hp = combat.maxHp;
      combat.swallowCharges = 3;
      combat.shieldHp = 0;
      combat.shieldTimer = 0;
      combat.counterBuffTimer = 0;
      heroRig.setStance('idle');
      heroRig.setBlade(combat.blade, combat.bladeTier, false);
      const reset = createHeroLocomotionState(helloTuning.maxStamina, groundHeightAt, 0, 4.5);
      Object.assign(heroState, reset);
      enemies = createInitialEnemies(activeSettings.difficulty, groundHeightAt);
      syncEnemyVisualPool();
      emitHud();
    },
    applySettings(settings: GameSettings) {
      activeSettings = settings;
      input.setKeybinds(settings.keybinds);
      sound.updateSettings(settings.audio);
      if (settings.graphics !== activeGraphics) {
        rebuildComposer(settings.graphics);
      }
      emitHud();
    },
    selectSign(sign: SignId) {
      signs.selected = sign;
      sound.playUiClick();
      emitHud();
    },
    switchBlade() {
      combat.blade = combat.blade === 'silver' ? 'steel' : 'silver';
      heroRig.setBlade(combat.blade, combat.bladeTier, true);
      sound.playSwing(combat.blade, false);
      emitHud();
    },
    drinkSwallow() {
      const ok = tryDrinkSwallow(combat);
      if (ok) {
        sound.playSign('makosh');
        vfx.spawnBurst(heroState.x, heroState.y + 1.0, heroState.z, 12, 0x62d98e, 3.0, 0.9);
        emitHud();
      }
      return ok;
    },
    applyOil(oil: OilKind) {
      const ok = tryApplyOil(combat, oil);
      if (ok) {
        sound.playSense();
        emitHud();
      }
      return ok;
    },
    forgeSilverBlade() {
      const ok = tryForgeSilverBlade(combat);
      if (ok) {
        sound.playHit('silver', true);
        heroRig.setBlade(combat.blade, combat.bladeTier, true);
        vfx.spawnBurst(heroState.x, heroState.y + 1.2, heroState.z, 20, 0xf2b44c, 4.5, 1.1);
        emitHud();
      }
      return ok;
    },
    chooseDialogueOption(idx: number) {
      if (!activeDialogue) return;
      const res = narrative.chooseOption(activeDialogue.npcId, idx, activeSettings.language);
      combat.silver += res.rewardSilver;
      combat.herbs += res.rewardHerbs;
      if (narrative.progress.zoryanaHelped && combat.silver >= 20 && res.rewardHerbs === 2) {
        combat.silver = Math.max(0, combat.silver - 20);
      }
      activeDialogue = res.next;
      input.setGameplayMouseEnabled(!activeDialogue && currentMode === 'playing');
      sound.playUiClick();
      emitHud();
    },
    closeDialogue() {
      activeDialogue = null;
      input.setGameplayMouseEnabled(currentMode === 'playing');
      emitHud();
    },
    skipCutscene() {
      if (!activeCutscene) return;
      const id = activeCutscene.id;
      activeCutscene = null;
      events.emit('cutscene_ended', { id });
      if (id === 'CS03') {
        currentMode = 'gameover';
        outcome = 'victory';
        document.body.dataset.state = 'gameover';
        events.emit('state_changed', { mode: 'gameover' });
      }
      emitHud();
    },
    triggerInteract() {
      if (!performInteract()) {
        const pulse = triggerVedunSensePulse(sense, heroState.x, heroState.z);
        vfx.triggerSense(heroState.x, heroState.y, heroState.z);
        sound.playSense();
        events.emit('sense_pulsed', { x: heroState.x, z: heroState.z, discoveries: pulse.discoveries });
        emitHud();
      }
    },
    awakenAtCampfire() {
      // Failure consequence from CONCEPT.md: awaken at campfire with time-of-day shift & Nav trophy toll
      outcome = 'none';
      const idx = TOD_ORDER.indexOf(currentTod);
      currentTod = TOD_ORDER[(idx + 1) % TOD_ORDER.length];
      applyTodImmediate(currentTod);
      combat.trophies = Math.max(0, combat.trophies - 1);
      combat.hp = combat.maxHp;
      combat.swallowCharges = 3;
      const reset = createHeroLocomotionState(helloTuning.maxStamina, groundHeightAt, 3.2, 1.4);
      Object.assign(heroState, reset);
      currentMode = 'playing';
      document.body.dataset.state = 'playing';
      input.setGameplayMouseEnabled(true);
      events.emit('state_changed', { mode: 'playing' });
      emitHud();
    },
    enterEndlessHunt() {
      outcome = 'none';
      endlessWave++;
      narrative.progress.stage = 'endless';
      currentTod = endlessWave % 2 === 1 ? 'night' : 'dusk';
      applyTodImmediate(currentTod);
      combat.hp = combat.maxHp;
      combat.swallowCharges = 3;
      enemies = spawnEndlessWave(activeSettings.difficulty, endlessWave, rng, groundHeightAt);
      syncEnemyVisualPool();
      currentMode = 'playing';
      document.body.dataset.state = 'playing';
      input.setGameplayMouseEnabled(true);
      events.emit('state_changed', { mode: 'playing' });
      emitHud();
    },
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      ro.disconnect();
      composer?.dispose();
      zoryanaVisual.dispose();
      miroslavVisual.dispose();
      for (const rig of enemyVisuals.values()) rig.dispose();
      vfx.dispose();
      herbGeo.dispose();
      herbMat.dispose();
      trackGeo.dispose();
      trackMat.dispose();
      heroRig.dispose();
      clearing.dispose();
      atmosphere.dispose();
      textures.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
