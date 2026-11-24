# Technology — Dark Slavic RPG

ENGINE: web
ENGINE VERSION: Three.js 0.187.0 (postprocessing 6.39.6, inkjs 2.4.0, TypeScript 7.0, Vite 8.3, React 19)
DIMENSION: 3D
LANGUAGE: TypeScript
PLATFORMS: browser (AI Studio live preview)

## Decision
- context: Полная 3D dark-Slavic action RPG в стиле Witcher 3 с видом от 3-го лица, двумя клинками, 4 знаками, чутьевым подсветом, 3 фазами суток и живой нелинейной волостью после Главы 1, запускаемая напрямую в браузере без локальных плагинов и внешних бинарных ассетов.
- options:
  1. Three.js 0.187 + postprocessing 6.39.6 + собственная кинематика TS — малый бандл, полный контроль над PBR/HDR Bloom/PMREM/процедурными мешами и высотным полем, ноль WASM-блокировок при старте; минус: столкновения и движение по террейну пишем сами (но это прозрачно и без alloc в hot loop).
  2. Three.js 0.187 + Rapier3D WASM — точная 3D-физика твёрдых тел, но +~2 MB WASM, сложнее детерминизм с headless capture и лишний вес для мелее-экшена.
  3. Babylon.js 9.37 + Havok — встроенный монолит и физика, но значительно крупнее бандл (~5–7 MB), медленнее загрузка в iframe и меньше гибкости для лёгкого React-HUD.
- choice and why: Three.js 0.187.0 + postprocessing 6.39.6 + inkjs 2.4.0 + чистая TS-кинематика (утверждено пользователем). Даёт мгновенный старт в браузере, прямой доступ к `PCFShadowMap`, `RoomEnvironment` PMREM, выборочному Bloom и полную тестируемость боевой/экономической логики в `node:test`.
- consequences: Все 3D-модели и текстуры строятся модульно в коде (`THREE.Group`, `InstancedMesh`, процедурные `CanvasTexture`/`DataTexture` нормали и roughness) без внешних `.glb`/`.png` 404-зависимостей; коллизии с рельефом (`groundHeightAt(x, z)`) и аренами — детерминированные аналитические функции.

## Budgets
- fps: 60 fps на средних десктопных GPU (16.6 мс на кадр); на software WebGL (SwiftShader) адаптивное отключение мульти-пасс postprocessing и shadowMap при сохранении всей геометрии и света.
- draw calls: ≤ 120–160 в активном бою за счёт `InstancedMesh` для сосен, камыша, камней и частиц.
- memory / bundle: основной JS-бандл ≤ 2.5 MB сжатым (без тяжёлых WASM/внешних моделей), загрузка сцены < 2 с.
- test budget: быстрые unit-тесты чистой логики через `npx tsx --test` (< 5 с) + Playwright-верификация реального рендера и консольных ошибок.

## Project structure
```
src/
  main.tsx          — точка входа, парсинг ?seed=&gym=&autostart=&state=&tod=
  App.tsx           — корневая оболочка (Canvas + диегетический HUD / диалоги / gym-переключатель)
  core/             — фиксированный цикл (loop.ts), mulberry32 rng.ts, typed events.ts, input.ts (event.code), save.ts (SCHEMA_VERSION)
  data/             — JSON/TS-конфиги баланса, 3 фаз суток, клинков, знаков, врагов, контрактов
  systems/          — чистая симуляция без Three.js: combat, signs, senses, shrines, dialogue/volost, ai, progression
  world/            — террейн heightfield, регионы R01–R03, пропсы и 3–12 частные процедурные меши (герой, твари, идолы, избы)
  view/             — Three.js рендерер, 3-точечный риг света + PMREM, postprocessing bloom, VFX, камера, аудио (Web Audio)
  ui/               — Title Screen, минимальный HUD, диалоговое окно, журнал контрактов, экран настроек
  gyms/             — изолированные гимы (hello, lookdev, M01–M06...) и live tuning панель
  debug/            — window.__GAME__, window.__metrics и параметры захвата
tests/              — unit-тесты чистой логики на node:test
tools/              — capture.mjs / verification скрипты для headless Chromium
```
