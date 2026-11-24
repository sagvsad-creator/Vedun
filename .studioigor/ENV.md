# Environment — Dark Slavic RPG

VERIFIED: yes

## Installed
| tool | version | why |
|---|---|---|
| Node.js + npm | 22.23.2 | Vite, Vitest, ESLint, capture scripts |
| Vite + React + TS | 8.3.0 / 19.0.1 / 7.0.2 | сборка и dev-сервер на порту 3000 |
| Three.js + @types/three | 0.187.0 | 3D-рендер, PBR, PMREM, PCFShadowMap, InstancedMesh |
| postprocessing | 6.39.6 | селективный Bloom и Vignette на GPU (откл. на software WebGL) |
| inkjs | 2.4.0 | диалоги и ветвящиеся контракты |
| Vitest + Playwright | 5.1.1 / 1.65.1 | юнит-тесты чистой логики и CAPTURE-скрипты |
| ESLint + typescript-eslint | 10.15.0 / 8.73.0 | статическая проверка TypeScript |
| Chromium Headless Shell | r1247 | системный headless-браузер (`/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell`) |

## Agent integrations
- `playwright-cli` (`computer-use` skill) + локальный `tools/capture.mjs` (читает `window.__GAME__` и `window.__metrics`, пишет `sheet.png` и `metrics.json` в `.studioigor/captures/`).
- Blender и macOS-инструменты (`brew`, `git-lfs`) в Linux-контейнере отсутствуют — 3D-ассеты строятся модульно в TypeScript (3–12-частные `THREE.Group` + `InstancedMesh` + процедурные `CanvasTexture`).

## Commands
RUN: npm run dev
TEST: npx tsc --noEmit && npx vitest run
BUILD: npm run build
CAPTURE: npm run build && node tools/capture.mjs --dir dist --out .studioigor/captures/hello --duration 4.5 --every 0.9 --seed 74129 --wait-for "window.__GAME__?.ready" --inputs tools/inputs/hello.json --require-completed
EDITOR: none — the code is in the repository

## Pitfalls
- Контейнерный headless Chromium использует SwiftShader software WebGL: сцена автоматически адаптирует pixelRatio=1, отключает shadowMap/EffectComposer и включает `afterDraw()` 80 ms sync pacing, сохраняя все меши, материалы и освещение без искажений.
- В Three.js 0.187.0 используем `THREE.PCFShadowMap` (`PCFSoftShadowMap` устарел/удалён в r186+).
- `typescript-eslint@8.73` ещё не поддерживает TypeScript 7.0, поэтому статическая проверка выполняется через `npx tsc --noEmit` (`npm run lint`).
