# Assets — Dark Slavic RPG

## Inventory
| asset | category | style | budget | source | status |
|---|---|---|---|---|---|
| A001 · SM_Terrain_Velen | environment | мокрый торф, грязная колея, мягкие лужи (`roughness` 0.14–0.82), heightfield `groundHeightAt` | ≤18k tris, 512px maps | procedural TS + CanvasTexture | ready |
| A002 · SK_Hero_Voymir | character | ведун-отступник: плащ, кольчуга наплечников, кожа, медальон Волка `#b8dce8`, стальной + серебряный клинок | ≤2.5k tris, 10–12 parts | procedural TS (`THREE.Group`) | ready |
| A003 · SM_Idol_Zbruch | prop/shrine | четырёхликий резной славянский идол из тёмного дуба, каменный цоколь, алая руна Нави `#c9343a`, жаровня `#f28c28` | ≤800 tris, 7–9 parts | procedural TS (`THREE.Group`) | ready |
| A004 · SM_Campfire_Hearth | prop/hub | каменный круг, обугленные поленья, языки пламени и пул искр (`InstancedMesh`) | ≤400 tris + 32 sparks | procedural TS + PointLight | ready |
| A005 · SM_Pine_Velen | foliage | двух- и трёхъярусная хвойная стена + стволы с варьированием оттенка (`setColorAt`) + серебристые берёзы | ≤350 tris/tree, InstancedMesh | procedural TS | ready |
| A006 · SM_Hut_Slavic | architecture | ветхая срубная изба из потемневших брёвен, соломенная крыша, тёплый проём окна/лампады (для R01) | ≤1.8k tris, 10 parts | procedural TS | ready |
| A007 · SM_Menhir_Cairn | prop/ruins | граненые замшелые межевые камни с высеченной руной и курган Нави (для R01–R03) | ≤300 tris | procedural TS | ready |
| A008 · SM_Reeds_Bog | foliage | колышущийся болотный камыш и кочки у воды (для R01/R03) | ≤60 tris/clump, InstancedMesh | procedural TS | ready |
| A009 · SK_Ghoul_Upyr | enemy | сгорбленный упырь с когтями, бледной кожей и светящимися глазами `#c9343a` | ≤1.4k tris, 8 parts | procedural TS | ready |
| A010 · SK_Drowner | enemy | склизкий утопленник с водорослями и выпадами | ≤1.4k tris, 8 parts | procedural TS | plan |
| A011 · SK_Bandit_Cutthroat | enemy | разбойник со щитом/топором и телеграфом удара | ≤1.6k tris, 8 parts | procedural TS | plan |
| A012 · SK_Leshy_Boss | boss | высокий древний Леший с оленьим черепом/рогами, корой, цепями и рунами (цель look-dev) | ≤3.2k tris, 10–12 parts | procedural TS (`THREE.Group`) | ready |
| A013 · SK_NPC_Zoryana_Volkhv | npc | знахарка Зоряна / староста Мирослав / волхв Добрыня с узнаваемыми атрибутами | ≤1.6k tris each | procedural TS | plan |
| A014 · VFX_Signs_Pool | vfx | вспышка Сварога, волна Велеса, рунный щит Макоши, круг Мары, брызги ударов и следы чутья | InstancedMesh + shaders | procedural TS | wip |
| A015 · UI_Slavic_Icons | ui/2d | векторные иконки 4 знаков, двух мечей, ячеек здоровья, компаса и медальона | inline SVG | code-authored SVG | ready |
| A016 · AUD_Procedural_Suite | audio | удары стали/серебра, уклонение, треск костра, ветер, вспышки знаков, тёмный гул Нави | 0 KB static (Web Audio) | Web Audio API synth | plan |

## Strategy by category
| category | source (pack / Blender / procedural / generation / user) | why | status |
|---|---|---|---|
| Characters & creatures | procedural (`THREE.Group` + `TubeGeometry`/`LatheGeometry`, 6–12 parts) | Контейнер без Blender; полный контроль силуэта, сменного оружия и анимации | active |
| Props, huts & shrines | procedural (`THREE.Group` + `ExtrudeGeometry`) | Точное попадание в славянскую резьбу, нуль 404, единая палитра Велена | active |
| Foliage & terrain | procedural (`InstancedMesh` + heightfield + `CanvasTexture`) | ≤150 draw calls, мокрая грязь/лужи отражают костёр и знаки | active |
| 2D UI & icons | procedural (inline `<svg>` + Tailwind/CSS в стиле `ART_BIBLE.md`) | Мрачный славянский минимализм, чёткость на любом DPI | active |
| VFX & lighting | procedural (`InstancedMesh`, selective Bloom, `RoomEnvironment` PMREM) | Быстрая реакция на 3 фазы суток и знаки | active |
| SFX & Music | procedural (Web Audio API: осцилляторы, фильтрованный шум, слэп-эхо, славянский гул) | Ноль внешних зависимостей и лицензионных рисков, мгновенный старт | plan |

## Conventions
- Единицы измерения: метрика `1 unit = 1 m`; персонаж ~`1.80 m`, Леший ~`2.95 m`, идол ~`4.2 m`.
- Оси: `+Y` вверх, лицо модели по `-Z` (стандарт Three.js).
- Опорная точка (pivot): строго в центре основания (`y = 0`), каждый объект ставится через `groundHeightAt(x, z)`.
- Именование в коде и ассетах: ASCII без пробелов (`SM_`, `SK_`, `VFX_`, `AUD_`), все материалы соблюдают разницу `roughness >= 0.25` между соседними частями.
- Бюджет кадра (web): `<= 150` draw calls, `<= 150k` треугольников, без внешних `.glb`/`.png`/`.mp3` 404-ссылок.

## Requests to the user
- none

## License registry
| asset / pack | source (URL) | license | author | path | attribution |
|---|---|---|---|---|---|
| Concept Look-Dev Dawn Frame | generated (`generate_image`) | generated project asset | AI Studio Image Tool | `src/assets/images/velen_concept_dawn_fog_1795394817797.jpg` | not required |
| Concept Look-Dev Dusk Combat | generated (`generate_image`) | generated project asset | AI Studio Image Tool | `src/assets/images/velen_concept_dusk_combat_1795394819225.jpg` | not required |
| Concept Look-Dev Night Nav | generated (`generate_image`) | generated project asset | AI Studio Image Tool | `src/assets/images/velen_concept_night_nav_1795394819345.jpg` | not required |
