import type { DifficultyId, GraphicsPresetId, TodPhase } from './events';

export type LanguageCode =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'pl'
  | 'it'
  | 'vi'
  | 'fa'
  | 'elv'
  | 'orc';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  rtl?: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'pl', label: 'Polski' },
  { code: 'it', label: 'Italiano' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'fa', label: 'فارسی', rtl: true },
  { code: 'elv', label: 'Eldarin (Elvish)' },
  { code: 'orc', label: 'Uruk-gûl (Orkish)' },
];

export type TranslationMap = {
  titleMain: string;
  titleSub: string;
  enterWilds: string;
  settings: string;
  fullscreen: string;
  exitFullscreen: string;
  resume: string;
  campfire: string;
  mainMenu: string;
  paused: string;
  victoryTitle: string;
  defeatTitle: string;
  playAgain: string;
  endlessHunt: string;
  close: string;
  steelBlade: string;
  silverBlade: string;
  navMark: string;
  slain: string;
  silver: string;
  trophies: string;
  oilLabel: string;
  draughtLabel: string;
  contractLabel: string;
  tod_dawn: string;
  tod_dusk: string;
  tod_night: string;
  sign_svarog: string;
  sign_veles: string;
  sign_makosh: string;
  sign_mara: string;
  preset_dawn_hub: string;
  preset_dusk_combat: string;
  preset_night_barrow: string;
  preset_follow: string;
  tab_general: string;
  tab_graphics: string;
  tab_audio: string;
  tab_controls: string;
  languageLabel: string;
  difficultyLabel: string;
  diff_story: string;
  diff_normal: string;
  diff_hard: string;
  diff_death_march: string;
  graphicsLabel: string;
  gfx_low: string;
  gfx_medium: string;
  gfx_high: string;
  gfx_ultra: string;
  touchModeLabel: string;
  touch_auto: string;
  touch_on: string;
  touch_off: string;
  muteAudio: string;
  masterVol: string;
  musicVol: string;
  sfxVol: string;
  resetBinds: string;
  pressKeyPrompt: string;
  act_move_forward: string;
  act_move_back: string;
  act_move_left: string;
  act_move_right: string;
  act_jump: string;
  act_dash: string;
  act_attack_light: string;
  act_attack_heavy: string;
  act_cast_sign: string;
  act_sign_1: string;
  act_sign_2: string;
  act_sign_3: string;
  act_sign_4: string;
  act_sense: string;
  act_switch_blade: string;
  act_alchemy: string;
  act_cycle_tod: string;
  act_pause: string;
  hintsLine: string;
  alchemyTitle: string;
  brewOil: string;
  forgeSilver: string;
  healSwallow: string;
  talkPrompt: string;
  gatherPrompt: string;
  shrinePrompt: string;
  skipCutscene: string;
  bossName: string;
  contractIntro: string;
  contractShrine: string;
  contractBoss: string;
  contractEndless: string;
  cutscene1: string;
  cutscene2: string;
  cutscene3: string;
  btnJump: string;
  btnDodge: string;
  btnAttack: string;
  btnSign: string;
  btnSense: string;
  btnBlade: string;
  counterReadyLabel: string;
  targetLockedTag: string;
  weakSteel: string;
  weakSilver: string;
  staggeredTag: string;
  blockingTag: string;
  enemy_drowner: string;
  enemy_upyr: string;
  enemy_bandit: string;
  enemy_leshy: string;
};

const EN: TranslationMap = {
  titleMain: 'VEDUN',
  titleSub: 'LIKHOLESYE',
  enterWilds: 'Enter the Mire',
  settings: 'Settings',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  resume: 'Resume Hunt',
  campfire: 'Awaken at Campfire',
  mainMenu: 'Exit to Main Menu',
  paused: 'PAUSED',
  victoryTitle: 'LESHY SLAIN — ENDLESS HUNT UNLOCKED',
  defeatTitle: 'AWAKENED AT THE CAMPFIRE',
  playAgain: 'Hunt Again',
  endlessHunt: 'Continue Endless Hunt',
  close: 'Close',
  steelBlade: 'STEEL',
  silverBlade: 'SILVER',
  navMark: 'NAV MARK',
  slain: 'SLAIN',
  silver: 'SILVER',
  trophies: 'TROPHIES',
  oilLabel: 'BLADE OIL',
  draughtLabel: 'SWALLOW',
  contractLabel: 'CONTRACT',
  tod_dawn: 'Misty Dawn',
  tod_dusk: 'Blood Dusk',
  tod_night: 'Dead of Nav',
  sign_svarog: 'Svarog (Fire)',
  sign_veles: 'Veles (Push)',
  sign_makosh: 'Makosh (Ward)',
  sign_mara: 'Mara (Snare)',
  preset_dawn_hub: '1 Village',
  preset_dusk_combat: '2 Leshy',
  preset_night_barrow: '3 Barrow',
  preset_follow: '4 Free',
  tab_general: 'Language & Mode',
  tab_graphics: 'Graphics',
  tab_audio: 'Music & SFX',
  tab_controls: 'Keybinds',
  languageLabel: 'Interface Language',
  difficultyLabel: 'Combat Difficulty',
  diff_story: 'Just the Story',
  diff_normal: 'Sword & Story',
  diff_hard: 'Blood & Broken Bones',
  diff_death_march: 'Death March',
  graphicsLabel: 'Graphics Quality',
  gfx_low: 'Low (Fast)',
  gfx_medium: 'Medium',
  gfx_high: 'High (Cinematic)',
  gfx_ultra: 'Ultra (Full PostFX)',
  touchModeLabel: 'Touch Controls (Phone/Tablet)',
  touch_auto: 'Auto',
  touch_on: 'Always On',
  touch_off: 'Off',
  muteAudio: 'Mute All Audio',
  masterVol: 'Master Volume',
  musicVol: 'Adaptive Music',
  sfxVol: 'Combat & World SFX',
  resetBinds: 'Reset Defaults',
  pressKeyPrompt: 'Press key, digit (0–9) or mouse...',
  act_move_forward: 'Move Forward',
  act_move_back: 'Move Back',
  act_move_left: 'Strafe Left',
  act_move_right: 'Strafe Right',
  act_jump: 'Jump (Space / RMB Tap)',
  act_dash: 'Pirouette Dodge',
  act_attack_light: 'Fast Strike (LMB)',
  act_attack_heavy: 'Heavy Cleave',
  act_cast_sign: 'Cast Sign',
  act_sign_1: 'Select Svarog (Fire)',
  act_sign_2: 'Select Veles (Push)',
  act_sign_3: 'Select Makosh (Ward)',
  act_sign_4: 'Select Mara (Snare)',
  act_sense: 'Vedun Sense / Talk',
  act_switch_blade: 'Switch Steel / Silver',
  act_alchemy: 'Forge & Alchemy',
  act_cycle_tod: 'Shift Time of Day',
  act_pause: 'Pause Menu',
  hintsLine: 'WASD Strafe/Move · Hold RMB Orbit/Steer · Wheel Zoom · Tab Target · Space Jump · LMB/F Strike · Shift Dodge · Q Sign · E Sense',
  alchemyTitle: 'Campfire Alchemy & Blade Forge',
  brewOil: 'Apply Monster Oil (1 Herb)',
  forgeSilver: 'Reforge Silver Edge (1 Trophy + 80 Silver)',
  healSwallow: 'Drink Swallow Draught',
  talkPrompt: '[E] Speak',
  gatherPrompt: '[E] Gather Herb',
  shrinePrompt: '[E] Commune with Zbruch Idol',
  skipCutscene: 'Skip [Space]',
  bossName: 'Ancient Leshy of the Mire',
  contractIntro: 'Speak with Zoryana or Miroslav by the huts, or track Nav beasts north.',
  contractShrine: 'Use Vedun Sense [E] along the blood trail to the Zbruch Shrine.',
  contractBoss: 'Confront the Ancient Leshy and break his curse at the northern clearing.',
  contractEndless: 'Endless Nav Hunt: Slay cursed packs across Dusk and Night for trophies.',
  cutscene1: 'The Nav Brand burns beneath the ribs. Silver and fire will answer the mire.',
  cutscene2: 'Elder Miroslav sealed the dark pact beneath the Zbruch idol.',
  cutscene3: 'The Ancient Leshy falls—yet deeper currents of Nav stir beyond the barrow.',
  btnJump: 'JUMP',
  btnDodge: 'DODGE',
  btnAttack: 'STRIKE',
  btnSign: 'SIGN',
  btnSense: 'SENSE',
  btnBlade: 'BLADE',
  counterReadyLabel: 'RIPOSTE READY · 1.6x CRIT',
  targetLockedTag: 'LOCKED [Tab]',
  weakSteel: 'STEEL',
  weakSilver: 'SILVER',
  staggeredTag: 'STAGGERED',
  blockingTag: 'SHIELD [F]',
  enemy_drowner: 'Mire Drowner',
  enemy_upyr: 'Blood Upyr',
  enemy_bandit: 'Mire Marauder',
  enemy_leshy: 'Ancient Leshy',
};

const TRANSLATIONS: Record<LanguageCode, TranslationMap> = {
  en: EN,
  ru: {
    ...EN,
    titleMain: 'ВЕДУН',
    titleSub: 'ЛИХОЛЕСЬЕ',
    enterWilds: 'Войти в чащу',
    settings: 'Настройки',
    fullscreen: 'На весь экран',
    exitFullscreen: 'Выйти из полного экрана',
    resume: 'Продолжить охоту',
    campfire: 'Пробудиться у костра',
    mainMenu: 'Выйти в главное меню',
    paused: 'ПАУЗА',
    victoryTitle: 'ЛЕШИЙ ПОВЕРЖЕН — БЕСКОНЕЧНАЯ ОХОТА',
    defeatTitle: 'ПРОБУЖДЕНИЕ У КОСТРА',
    playAgain: 'Охотиться снова',
    endlessHunt: 'Продолжить охоту Нави',
    close: 'Закрыть',
    steelBlade: 'СТАЛЬ',
    silverBlade: 'СЕРЕБРО',
    navMark: 'МЕТКА НАВИ',
    slain: 'ПОВЕРЖЕНО',
    silver: 'СЕРЕБРО',
    trophies: 'ТРОФЕИ',
    oilLabel: 'МАСЛО',
    draughtLabel: 'ЛАСТОЧКА',
    contractLabel: 'ЗАКАЗ',
    tod_dawn: 'Мглистый рассвет',
    tod_dusk: 'Кровавые сумерки',
    tod_night: 'Глухая ночь Нави',
    sign_svarog: 'Сварог (Огонь)',
    sign_veles: 'Велес (Толчок)',
    sign_makosh: 'Макошь (Щит)',
    sign_mara: 'Мара (Ловушка)',
    preset_dawn_hub: '1 Избы',
    preset_dusk_combat: '2 Леший',
    preset_night_barrow: '3 Курган',
    preset_follow: '4 Путь',
    tab_general: 'Язык и сложность',
    tab_graphics: 'Графика',
    tab_audio: 'Музыка и звук',
    tab_controls: 'Управление',
    languageLabel: 'Язык интерфейса',
    difficultyLabel: 'Уровень сложности',
    diff_story: 'Только сюжет',
    diff_normal: 'Меч и сказание',
    diff_hard: 'Кровь и сломанные кости',
    diff_death_march: 'На смерть!',
    graphicsLabel: 'Качество графики',
    gfx_low: 'Низкая',
    gfx_medium: 'Средняя',
    gfx_high: 'Высокая (Кино)',
    gfx_ultra: 'Ультра (Все эффекты)',
    touchModeLabel: 'Сенсорное управление',
    touch_auto: 'Авто',
    touch_on: 'Включено',
    touch_off: 'Выключено',
    muteAudio: 'Отключить звук',
    masterVol: 'Общая громкость',
    musicVol: 'Живая музыка',
    sfxVol: 'Звуки боя и мира',
    resetBinds: 'Сбросить клавиши',
    pressKeyPrompt: 'Нажмите клавишу, цифру (0–9) или мышь...',
    act_move_forward: 'Вперёд',
    act_move_back: 'Назад',
    act_move_left: 'Влево',
    act_move_right: 'Вправо',
    act_jump: 'Прыжок (Space / клик ПКМ)',
    act_dash: 'Пируэт / уклон',
    act_attack_light: 'Быстрый удар (ЛКМ)',
    act_attack_heavy: 'Сильный удар',
    act_cast_sign: 'Сотворить знак',
    act_sign_1: 'Знак 1: Сварог (Огонь)',
    act_sign_2: 'Знак 2: Велес (Толчок)',
    act_sign_3: 'Знак 3: Макошь (Щит)',
    act_sign_4: 'Знак 4: Мара (Ловушка)',
    act_sense: 'Чутьё / Разговор',
    act_switch_blade: 'Сталь / Серебро',
    act_alchemy: 'Ковка и алхимия',
    act_cycle_tod: 'Смена суток',
    act_pause: 'Пауза',
    hintsLine: 'WASD шаг/стрейф · Зажми ПКМ поворот камеры · Колесо зум · Tab цель · Space прыжок · ЛКМ/F удар · Shift уклон · Q знак · E чутьё',
    alchemyTitle: 'Костёр, алхимия и ковка',
    brewOil: 'Нанести масло на клинок (1 трава)',
    forgeSilver: 'Перековать серебро (1 трофей + 80 серебра)',
    healSwallow: 'Выпить отвар Ласточки',
    talkPrompt: '[E] Говорить',
    gatherPrompt: '[E] Собрать траву',
    shrinePrompt: '[E] Осмотреть идол Збруча',
    skipCutscene: 'Пропустить [Space]',
    bossName: 'Древний Леший Лихолесья',
    contractIntro: 'Поговорите с Зоряной или старостой у изб, либо идите по следу Нави на север.',
    contractShrine: 'Включите чутьё [E] у капища Збруча и раскройте тайну клятвы.',
    contractBoss: 'Одолейте Древнего Лешего на северной поляне.',
    contractEndless: 'Бесконечная охота Нави: истребляйте стаи и копите трофеи.',
    cutscene1: 'Кровная метка Нави жжёт под рёбрами. Топь ждёт стали, серебра и огня.',
    cutscene2: 'Староста Мирослав скрепил тёмный обет у древнего идола Збруча.',
    cutscene3: 'Древний Леший пал — но за затопленным курганом просыпается новая Навь.',
    btnJump: 'ПРЫЖОК',
    btnDodge: 'УВОРОТ',
    btnAttack: 'УДАР',
    btnSign: 'ЗНАК',
    btnSense: 'ЧУТЬЁ',
    btnBlade: 'МЕЧ',
    counterReadyLabel: 'КОНТРУДАР · КРИТ 1.6×',
    targetLockedTag: 'ЦЕЛЬ [Tab]',
    weakSteel: 'СТАЛЬ',
    weakSilver: 'СЕРЕБРО',
    staggeredTag: 'ОГЛУШЁН',
    blockingTag: 'БЛОК [F]',
    enemy_drowner: 'Утопленник',
    enemy_upyr: 'Кровавый упырь',
    enemy_bandit: 'Лиходей топи',
    enemy_leshy: 'Древний Леший',
  },
  uk: {
    ...EN,
    titleMain: 'ВІДУН',
    titleSub: 'ЛИХОЛІССЯ',
    enterWilds: 'Увійти в хащі',
    settings: 'Налаштування',
    fullscreen: 'На весь екран',
    exitFullscreen: 'Вийти з повного екрана',
    resume: 'Продовжити',
    campfire: 'Прокинутись біля вогнища',
    mainMenu: 'Головне меню',
    paused: 'ПАУЗА',
    victoryTitle: 'ЛІСОВИК ПОДОЛАНИЙ — НЕСКІНЧЕННЕ ПОЛЮВАННЯ',
    defeatTitle: 'ПРОБУДЖЕННЯ БІЛЯ ВОГНИЩА',
    playAgain: 'Полювати знову',
    endlessHunt: 'Нескінченне полювання',
    close: 'Закрити',
    steelBlade: 'СТАЛЬ',
    silverBlade: 'СРІБЛО',
    navMark: 'МІТКА НАВІ',
    slain: 'ЗДОЛАНО',
    silver: 'СРІБЛО',
    trophies: 'ТРОФЕЇ',
    tod_dawn: 'Імлистий світанок',
    tod_dusk: 'Криваві сутінки',
    tod_night: 'Глуха ніч Наві',
    diff_story: 'Лише історія',
    diff_normal: 'Меч і переказ',
    diff_hard: 'Кров і зламані кістки',
    diff_death_march: 'На смерть!',
    gfx_low: 'Низька',
    gfx_medium: 'Середня',
    gfx_high: 'Висока',
    gfx_ultra: 'Ультра',
    bossName: 'Прадавній Лісовик',
    hintsLine: 'WASD — крок/стрейф · Затисніть ПКМ камера · Колесо зум · Tab ціль · Space — стрибок · ЛКМ — удар · Shift — пірует · Q — знак · E — чуття',
    btnJump: 'СТРИБОК',
    btnDodge: 'УХИЛ',
    btnAttack: 'УДАР',
    btnSign: 'ЗНАК',
    btnSense: 'ЧУТТЯ',
    btnBlade: 'МЕЧ',
    counterReadyLabel: 'КОНТРУДАР · КРИТ 1.6×',
    targetLockedTag: 'ЦІЛЬ [Tab]',
    weakSteel: 'СТАЛЬ',
    weakSilver: 'СРІБЛО',
    staggeredTag: 'ОГЛУШЕНИЙ',
    blockingTag: 'БЛОК [F]',
    enemy_drowner: 'Потопельник',
    enemy_upyr: 'Кривавий упир',
    enemy_bandit: 'Розбійник мочарів',
    enemy_leshy: 'Прадавній Лісовик',
  },
  pl: {
    ...EN,
    titleMain: 'WIEDŹMIN',
    titleSub: 'LICHOLESIE',
    enterWilds: 'Wejdź w bór',
    settings: 'Ustawienia',
    fullscreen: 'Pełny ekran',
    exitFullscreen: 'Opuść pełny ekran',
    resume: 'Wznów łowy',
    campfire: 'Ognisko',
    mainMenu: 'Menu główne',
    paused: 'PAUZA',
    victoryTitle: 'LESZY POKONANY — WIECZNY ŁÓW',
    defeatTitle: 'PRZEBUDZENIE PRZY OGNISKU',
    steelBlade: 'STAL',
    silverBlade: 'SREBRO',
    tod_dawn: 'Mglisty Świt',
    tod_dusk: 'Krwawy Zmierzch',
    tod_night: 'Głucha Noc Nawi',
    diff_story: 'Tylko Opowieść',
    diff_normal: 'Miecz i Opowieść',
    diff_hard: 'Krew, Pot i Łzy',
    diff_death_march: 'Droga ku Zagładzie',
    bossName: 'Pradawny Leszy',
    btnJump: 'SKOK',
    btnDodge: 'UNIK',
    btnAttack: 'CIOS',
    btnSign: 'ZNAK',
    btnSense: 'ZMYSŁ',
    btnBlade: 'MIECZ',
  },
  fr: {
    ...EN,
    titleSub: 'BOIS MAUDIT',
    enterWilds: 'Entrer dans le marais',
    settings: 'Paramètres',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter plein écran',
    resume: 'Reprendre',
    campfire: 'Feu de camp',
    mainMenu: 'Menu principal',
    paused: 'PAUSE',
    victoryTitle: 'LECHY VAINCU — CHASSE INFINIE',
    defeatTitle: 'RÉVEIL AU FEU DE CAMP',
    steelBlade: 'ACIER',
    silverBlade: 'ARGENT',
    tod_dawn: 'Aube Brumeuse',
    tod_dusk: 'Crépuscule Sanglant',
    tod_night: 'Nuit de Nav',
    diff_story: 'Histoire seule',
    diff_normal: 'Épée et Histoire',
    diff_hard: 'Sang et Larmes',
    diff_death_march: 'Marche de la Mort',
    bossName: 'Ancien Lechy du Marais',
    btnJump: 'SAUT',
    btnDodge: 'ESQUIVE',
    btnAttack: 'FRAPPE',
    btnSign: 'SIGNE',
    btnSense: 'SENS',
    btnBlade: 'LAME',
  },
  de: {
    ...EN,
    titleSub: 'FINSTERWALD',
    enterWilds: 'In den Sumpf',
    settings: 'Einstellungen',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Vollbild verlassen',
    resume: 'Fortsetzen',
    campfire: 'Lagerfeuer',
    mainMenu: 'Hauptmenü',
    paused: 'PAUSE',
    victoryTitle: 'WALDSCHRAT BESIEGT — ENDLOSE JAGD',
    defeatTitle: 'AM LAGERFEUER ERWACHT',
    steelBlade: 'STAHL',
    silverBlade: 'SILBER',
    tod_dawn: 'Nebeldämmerung',
    tod_dusk: 'Blutabend',
    tod_night: 'Nacht der Naw',
    diff_story: 'Nur Geschichte',
    diff_normal: 'Schwert & Geschichte',
    diff_hard: 'Blut & Schweiß',
    diff_death_march: 'Todesmarsch',
    bossName: 'Uralter Leszy',
    btnJump: 'SPRUNG',
    btnDodge: 'AUSWEICHEN',
    btnAttack: 'SCHLAG',
    btnSign: 'ZEICHEN',
    btnSense: 'SINN',
    btnBlade: 'KLINGE',
  },
  es: {
    ...EN,
    titleSub: 'BOSQUE SOMBRÍO',
    enterWilds: 'Entrar al pantano',
    settings: 'Ajustes',
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    resume: 'Continuar',
    campfire: 'Hoguera',
    mainMenu: 'Menú principal',
    paused: 'PAUSA',
    victoryTitle: 'LESHY DERROTADO — CAZA ETERNA',
    defeatTitle: 'DESPERTAR EN LA HOGUERA',
    steelBlade: 'ACERO',
    silverBlade: 'PLATA',
    tod_dawn: 'Alba Brumosa',
    tod_dusk: 'Ocaso Sangriento',
    tod_night: 'Noche de Nav',
    diff_story: 'Solo Historia',
    diff_normal: 'Espada e Historia',
    diff_hard: 'Sangre y Sudor',
    diff_death_march: 'Marcha de la Muerte',
    bossName: 'Antiguo Leshy',
    btnJump: 'SALTO',
    btnDodge: 'ESQUIVA',
    btnAttack: 'GOLPE',
    btnSign: 'SIGNO',
    btnSense: 'SENTIDO',
    btnBlade: 'HOJA',
  },
  pt: {
    ...EN,
    titleSub: 'FLORESTA NEGRA',
    enterWilds: 'Entrar no pântano',
    settings: 'Configurações',
    fullscreen: 'Tela cheia',
    exitFullscreen: 'Sair da tela cheia',
    resume: 'Continuar',
    campfire: 'Fogueira',
    mainMenu: 'Menu Principal',
    paused: 'PAUSA',
    victoryTitle: 'LESHY DERROTADO — CAÇADA INFINITA',
    defeatTitle: 'DESPERTAR NA FOGUEIRA',
    steelBlade: 'AÇO',
    silverBlade: 'PRATA',
    tod_dawn: 'Alvorada Enevoada',
    tod_dusk: 'Crepúsculo Rubro',
    tod_night: 'Noite de Nav',
    diff_story: 'Apenas História',
    diff_normal: 'Espada e História',
    diff_hard: 'Sangue e Ossos',
    diff_death_march: 'Marcha da Morte',
    bossName: 'Leshy Ancião',
    btnJump: 'PULO',
    btnDodge: 'ESQUIVA',
    btnAttack: 'GOLPE',
    btnSign: 'SINAL',
    btnSense: 'SENTIDO',
    btnBlade: 'LÂMINA',
  },
  it: {
    ...EN,
    titleSub: 'SELVA OSCURA',
    enterWilds: 'Entra nella palude',
    settings: 'Impostazioni',
    fullscreen: 'Schermo intero',
    exitFullscreen: 'Esci da schermo intero',
    resume: 'Riprendi',
    campfire: 'Falò',
    mainMenu: 'Menu Principale',
    paused: 'PAUSA',
    victoryTitle: 'LESHY SCONFITTO — CACCIA INFINITA',
    defeatTitle: 'RISVEGLIO AL FALÒ',
    steelBlade: 'ACCIAIO',
    silverBlade: 'ARGENTO',
    tod_dawn: 'Alba Nebbiosa',
    tod_dusk: 'Crepuscolo di Sangue',
    tod_night: 'Notte di Nav',
    bossName: 'Antico Leshy',
    btnJump: 'SALTO',
    btnDodge: 'SCHIVA',
    btnAttack: 'COLPO',
    btnSign: 'SEGNO',
    btnSense: 'SENSO',
    btnBlade: 'LAMA',
  },
  zh: {
    ...EN,
    titleMain: '巫猎者',
    titleSub: '凶林密沼',
    enterWilds: '踏入密沼',
    settings: '设置',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
    resume: '继续狩猎',
    campfire: '营火苏醒',
    mainMenu: '返回主菜单',
    paused: '暂停',
    victoryTitle: '树精已斩 — 无尽狩猎开启',
    defeatTitle: '于营火旁苏醒',
    steelBlade: '钢剑',
    silverBlade: '银剑',
    tod_dawn: '迷雾黎明',
    tod_dusk: '血色黄昏',
    tod_night: '幽冥死夜',
    diff_story: '剧情模式',
    diff_normal: '想流血的剑',
    diff_hard: '流血与断骨',
    diff_death_march: '死而无憾',
    gfx_low: '低画质',
    gfx_medium: '中画质',
    gfx_high: '高画质',
    gfx_ultra: '极致电影画质',
    bossName: '太古林精鹿首魔',
    btnJump: '跳跃',
    btnDodge: '闪避',
    btnAttack: '斩击',
    btnSign: '法印',
    btnSense: '猎魔感知',
    btnBlade: '切剑',
  },
  ja: {
    ...EN,
    titleMain: 'ヴェドゥン',
    titleSub: 'リホレシエの闇',
    enterWilds: '霧沼へ踏み入る',
    settings: '設定',
    fullscreen: '全画面',
    exitFullscreen: '全画面解除',
    resume: '狩りを再開',
    campfire: '焚き火で目覚める',
    mainMenu: 'メインメニューへ',
    paused: '一時停止',
    victoryTitle: 'レーシィ討伐 — 無限の狩猟解放',
    defeatTitle: '焚き火での目覚め',
    steelBlade: '鋼の剣',
    silverBlade: '銀の剣',
    tod_dawn: '霧の夜明け',
    tod_dusk: '血の黄昏',
    tod_night: 'ナヴィの深淵夜',
    diff_story: 'ストーリー',
    diff_normal: '剣と物語',
    diff_hard: '血と折れた骨',
    diff_death_march: 'デスマーチ',
    gfx_low: '低',
    gfx_medium: '中',
    gfx_high: '高',
    gfx_ultra: '最高 (シネマティック)',
    bossName: '古のレーシィ',
    btnJump: '跳躍',
    btnDodge: '回避',
    btnAttack: '斬撃',
    btnSign: '印',
    btnSense: '感知',
    btnBlade: '抜刀',
  },
  vi: {
    ...EN,
    titleSub: 'RỪNG HẮC ÁM',
    enterWilds: 'Tiến vào đầm lầy',
    settings: 'Cài đặt',
    fullscreen: 'Toàn màn hình',
    exitFullscreen: 'Thoát toàn màn hình',
    resume: 'Tiếp tục săn',
    campfire: 'Thức dậy bên lửa trại',
    mainMenu: 'Về Menu Chính',
    paused: 'TẠM DỪNG',
    victoryTitle: 'LESHY BẠI TRẬN — SĂN BẮN VÔ TẬN',
    defeatTitle: 'THỨC DẬY BÊN LỬA TRẠI',
    steelBlade: 'KIẾM THÉP',
    silverBlade: 'KIẾM BẠC',
    tod_dawn: 'Bình Minh Sương Mù',
    tod_dusk: 'Hoàng Hôn Máu',
    tod_night: 'Đêm Tử Thần',
    bossName: 'Cổ Thần Leshy',
    btnJump: 'NHẢY',
    btnDodge: 'NÉ',
    btnAttack: 'CHÉM',
    btnSign: 'ẤN CHÚ',
    btnSense: 'GIÁC QUAN',
    btnBlade: 'ĐỔI KIẾM',
  },
  ar: {
    ...EN,
    titleMain: 'فيدون',
    titleSub: 'غابة الظلال',
    enterWilds: 'ادخل المستنقع',
    settings: 'الإعدادات',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'إنهاء ملء الشاشة',
    resume: 'استئناف الصيد',
    campfire: 'الاستيقاظ عند النار',
    mainMenu: 'القائمة الرئيسية',
    paused: 'إيقاف مؤقت',
    victoryTitle: 'سقوط ليشي — فتح الصيد اللانهائي',
    defeatTitle: 'الاستيقاظ عند موقد النار',
    steelBlade: 'فولاذ',
    silverBlade: 'فضة',
    tod_dawn: 'فجر ضبابي',
    tod_dusk: 'غسق دموي',
    tod_night: 'ظلمة ناف',
    diff_story: 'القصة فقط',
    diff_normal: 'السيف والقصة',
    diff_hard: 'دم وعظام',
    diff_death_march: 'مسيرة الموت',
    bossName: 'ليشي القديم',
    btnJump: 'قفز',
    btnDodge: 'مراوغة',
    btnAttack: 'ضربة',
    btnSign: 'تعويذة',
    btnSense: 'حاسة',
    btnBlade: 'نصل',
  },
  fa: {
    ...EN,
    titleMain: 'ودون',
    titleSub: 'جنگل نفرین‌شده',
    enterWilds: 'ورود به باتلاق',
    settings: 'تنظیمات',
    fullscreen: 'تمام‌صفحه',
    exitFullscreen: 'خروج از تمام‌صفحه',
    resume: 'ادامه شکار',
    campfire: 'بیداری کنار آتش',
    mainMenu: 'منوی اصلی',
    paused: 'توقف',
    victoryTitle: 'لشی شکست خورد — شکار بی‌پایان',
    defeatTitle: 'بیداری در کنار آتش',
    steelBlade: 'فولاد',
    silverBlade: 'نقره',
    tod_dawn: 'سپیده‌دم مه‌آلود',
    tod_dusk: 'شفق خونین',
    tod_night: 'شب تاریک ناو',
    bossName: 'لشی باستانی',
    btnJump: 'پرش',
    btnDodge: 'جاخالی',
    btnAttack: 'ضربه',
    btnSign: 'نشان',
    btnSense: 'حس',
    btnBlade: 'تیغ',
  },
  elv: {
    ...EN,
    titleMain: 'ISTAR-MORGUL',
    titleSub: 'TAUR-NÚ-DUIN',
    enterWilds: 'Menna i-Dúath',
    settings: 'Tengwe',
    fullscreen: 'Halla-Tir',
    exitFullscreen: 'Nai Halla-Tir',
    resume: 'Lasto Fara',
    campfire: 'Naur-Cuivë',
    mainMenu: 'Men-Edwen',
    paused: 'DORTHA',
    victoryTitle: 'ORCHAL-TAUR DANNEN — FARA UILUI',
    defeatTitle: 'CUIVË MI NAUR',
    steelBlade: 'ANG',
    silverBlade: 'CELEB',
    navMark: 'TEITH-MORGUL',
    slain: 'DANNEN',
    silver: 'CELEB-MÎR',
    trophies: 'AGLAR',
    tod_dawn: 'Auru-Híth',
    tod_dusk: 'Uial-Sereg',
    tod_night: 'Dúath-Fuini',
    sign_svarog: 'Svarog (Naur)',
    sign_veles: 'Veles (Súl)',
    sign_makosh: 'Makosh (Thand)',
    sign_mara: 'Mara (Ring)',
    bossName: 'Taur-Hîr Orchal',
    hintsLine: 'WASD Menna · RMB/Space Laitë · LMB Maeth · Shift Rosta · Q Teith · E Hen-Súla · Esc Dortha',
    btnJump: 'LAITË',
    btnDodge: 'ROSTA',
    btnAttack: 'MAETH',
    btnSign: 'TEITH',
    btnSense: 'HÊN',
    btnBlade: 'MEGIl',
  },
  orc: {
    ...EN,
    titleMain: 'GHAASH-KRIM',
    titleSub: 'SHAAK-ASH-LUG',
    enterWilds: 'GAZAT MORGUL!',
    settings: 'GÛL-SHAK',
    fullscreen: 'SHARA-GHAASH',
    exitFullscreen: 'KRIM-SHARA',
    resume: 'ASH-KIL!',
    campfire: 'NAUR-SKAI',
    mainMenu: 'LUG-DAZ',
    paused: 'HALT SKAI',
    victoryTitle: 'BARK-SNAGA KRUMPED — MOR-KIL!',
    defeatTitle: 'DRAG BAK TO FIRE',
    steelBlade: 'IRON-CHOPPA',
    silverBlade: 'MOON-CHOPPA',
    navMark: 'BLOOD-BRAND',
    slain: 'KRUMPED',
    silver: 'SHINY-TEEF',
    trophies: 'SKULLZ',
    tod_dawn: 'GREY-ASH MORN',
    tod_dusk: 'BLOOD-SKY',
    tod_night: 'BLACK-MORGUL NIGHT',
    sign_svarog: 'Svarog (BURNA)',
    sign_veles: 'Veles (SMASH)',
    sign_makosh: 'Makosh (IRON-SKIN)',
    sign_mara: 'Mara (FROST-TRAP)',
    bossName: 'BIG TREE-DEMON BOSS',
    hintsLine: 'WASD STOMP · RMB/Space LEAP · LMB KRUMP · Shift ROLL · Q HEX · E SNIFF BLOOD · Esc HALT',
    btnJump: 'LEAP',
    btnDodge: 'ROLL',
    btnAttack: 'KRUMP',
    btnSign: 'HEX',
    btnSense: 'SNIFF',
    btnBlade: 'CHOPPA',
  },
};

export function isRtlLanguage(code: LanguageCode): boolean {
  return code === 'ar' || code === 'fa';
}

export function getT(code: LanguageCode): TranslationMap {
  return TRANSLATIONS[code] ?? EN;
}

export function formatTodLabel(code: LanguageCode, tod: TodPhase): string {
  const t = getT(code);
  return tod === 'dusk' ? t.tod_dusk : tod === 'night' ? t.tod_night : t.tod_dawn;
}

export function formatDifficultyLabel(code: LanguageCode, diff: DifficultyId): string {
  const t = getT(code);
  if (diff === 'story') return t.diff_story;
  if (diff === 'hard') return t.diff_hard;
  if (diff === 'death_march') return t.diff_death_march;
  return t.diff_normal;
}

export function formatGraphicsLabel(code: LanguageCode, gfx: GraphicsPresetId): string {
  const t = getT(code);
  if (gfx === 'low') return t.gfx_low;
  if (gfx === 'medium') return t.gfx_medium;
  if (gfx === 'ultra') return t.gfx_ultra;
  return t.gfx_high;
}
