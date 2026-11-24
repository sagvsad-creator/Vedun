# Environment — research (2026-11-22)

Game: «ВЕДУН: ЛИХОЛЕСЬЕ» — Dark Slavic 3D Action RPG (Three.js 0.187.0, browser).

## Findings
- **Runtime (AI Studio Linux Container):** Node.js `v22.23.2`, Vite `^8.3.0`, React `^19.0.1`, TypeScript `^7.0.2`, Python `3.11.2`, Git `2.34.1`, FFmpeg `4.4.2`, Chromium Headless Shell `r1247` (`/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell`) + `playwright-cli` (`computer-use` skill).
- **Rendering & Gameplay Stack:**
  - `three@0.187.0` + `@types/three@0.187.0` (r186+ breaking change: `PCFSoftShadowMap` removed -> использовать `THREE.PCFShadowMap`; `PMREMGenerator` на cube render targets; `SRGBColorSpace` + `ACESFilmicToneMapping`).
  - `postprocessing@6.39.6` (selective bloom / tone-mapping pipeline на реальных GPU; при `isSoftwareGl` / SwiftShader отключается для стабильного FPS в headless-проверке без изменения сцены).
  - `inkjs@2.4.0` (нарративное ветвление диалогов и контрактов).
- **Quality & Verification:**
  - `vitest` + встроенный `node:test` через `npx tsx --test` (быстрые unit-тесты чистой боевой/экономической/сейвовой логики).
  - `eslint` + `@eslint/js` + `typescript-eslint` + `prettier` (статическая проверка TypeScript через flat config `eslint.config.js`).
  - `playwright` + `tools/capture.mjs` (адаптирован с передачей `PW_CHROMIUM` на системный `chrome-headless-shell` при отсутствии локального скачивания или через `playwright-cli`).
- **3D Authoring (Blender note):** Контейнер не содержит Homebrew/macOS-приложений и Blender. Все 3D-модели (ведун с двумя клинками, твари, идолы капища, избы, сосны) создаются модульно в TypeScript как композитные 3–12-частные `THREE.Group` + `InstancedMesh` + процедурные PBR `CanvasTexture`/`DataTexture` (подтверждается у пользователя в Phase 4).

## What this changes
- Пакеты устанавливаются одной пачкой через `install_applet_package`: `three`, `@types/three`, `postprocessing`, `inkjs`, `vitest`, `playwright`, `eslint`, `@eslint/js`, `typescript-eslint`, `prettier`.
- `tools/capture.mjs` запускает локально собранный `dist/` (или dev-сервер `:3000`) и сохраняет кадры + `sheet.png` + `metrics.json` в `.studioigor/captures/`.
- Для headless-верификации в контейнере используется `PW_CHROMIUM=/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell`.

## Sources
- `envcheck.py` и `references/environment.md` (проверено локально 2026-11-22).
- `npm view` (three 0.187.0, postprocessing 6.39.6, inkjs 2.4.0).
