# Stack — research (2026-11-22)
Game: Full 3D Dark Slavic Action/RPG («Ведун: Лихолесье»), браузерное превью (AI Studio Vite 8 + React 19).

## Findings
- **Environment constraints:** Платформа запуска — браузер (Vite 8.3.0, React 19.0.1, TypeScript 7.0.2, порт 3000, без GPU в headless-превью SwiftShader). Внешний нативный движок (Godot/Unreal/Unity) не может открывать окно в данном контейнере и не подходит под выбранную пользователем браузерную платформу.
- **Three.js (`0.187.0` + `@types/three` `0.187.0`):** Актуальный релиз (опубликован 2026-10-30). Важные изменения в r186–r187: удалён `PCFSoftShadowMap` (использовать `PCFShadowMap`), обновлена сборка `PMREMGenerator`. Даёт максимальный контроль над PBR, `RoomEnvironment`, `onBeforeCompile`, `InstancedMesh`, туманом `FogExp2` и адаптацией под `isSoftwareGl`.
- **pmndrs `postprocessing` (`6.39.6`):** Совместим с `three >= 0.168.0 < 0.188.0`. Даёт селективный HDR Bloom, Vignette, ToneMapping и эффекты с минимальным числом проходов (отключаются при `isSoftwareGl` с сохранением сцены).
- **Rapier3D (`@dimforge/rapier3d-compat` `0.21.0`):** Рабочая WASM-физика, но для быстрого ведьмачьего фехтования (пируэты, i-frames, ручные окна ударов) кинематика в чистом TypeScript даёт лучший отклик и проще тестируется через `node:test`.
- **Babylon.js (`9.37.1`):** Мощный движок, но тяжелее бандл и выше нагрузка на CPU-рендер при старте.
- **Dialogue runtime (`inkjs` `2.4.0`):** Проверенный JS-рантайм ветвящихся диалогов и флагов (или структурированный JSON-движок для сцен с портретами и условиями).

## What this changes
- При использовании `three@0.187.0` задаём `renderer.shadowMap.type = THREE.PCFShadowMap` (не `PCFSoftShadowMap`).
- Движок в `TECH.md` будет `web` (библиотека Three.js + Postprocessing + React 19 HUD + Web Audio процедурный звук).

## Sources
- npm registry (`npm view three`, `postprocessing`, `@dimforge/rapier3d-compat`, `@babylonjs/core`, `inkjs`, 2026-11-22)
- Three.js r186/r187 release notes (utsubo.com, 2026)
