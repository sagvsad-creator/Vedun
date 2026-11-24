# Decisions

One line = one decision. `by`: user — the user decided; agent — the agent decided on its own
(the user chose "you decide" or the question wasn't worth their time). A cancelled
decision is not deleted: a new line says "replaces #N".

| # | date | phase | decision | options | by | why |
|---|---|---|---|---|---|---|
| 1 | 2026-11-23 | 0 | project folder: /app/applet (web applet workspace) | — | agent | current AI Studio applet directory |
| 2 | 2026-11-23 | 1 | core focus: fencing/dodges/slavic signs, monster hunting/senses/prep, dark ruins & shrines exploration | — | user | round 1 |
| 3 | 2026-11-23 | 1 | scale: large chapter with multiple regions; platform (prelim.): browser preview | — | user | round 1 |
| 4 | 2026-11-23 | 1 | hero: renegade witcher (vedun) with two blades (steel/silver) and personal curse | — | user | round 2 |
| 5 | 2026-11-23 | 1 | combat & camera: fast dance (pirouettes, dodges, combos + slavic signs), free mid-far 3rd person camera | — | user | round 2 |
| 6 | 2026-11-23 | 1 | story structure: chapter 1 has 3-act arc with cutscenes & contracts, world continues open-ended with endless hunts and no hard ending | — | user | round 2 (Other) |
| 7 | 2026-11-23 | 1 | progression: boss trophies, new slavic signs and blade forging | — | user | round 3 |
| 8 | 2026-11-23 | 1 | failure: wake at campfire with time-of-day shift and trophy penalty | — | user | round 3 |
| 9 | 2026-11-23 | 1 | anti-pillars: no multiplayer/coop, no stat-only grind, no base building or farming | — | user | round 3 |
| 10 | 2026-11-23 | 1 | pitch card approved: Dark Slavic 3D Witcher-like RPG 'Vedun: Likholesye' with Chapter 1 arc + endless Nav world | — | user | summary card approved |
| 11 | 2026-11-23 | 1 | hooks approved: GD01 Blood Mark of Nav, GD02 Shrine Ritual in combat, GD03 Prey Habits from Witcher Senses, GD04 Living Volost endless contracts | — | user | multiSelect choice |
| 12 | 2026-11-23 | 2 | style R1: chose 'Сырой сумрак Велена' as base direction | — | user | direction pick from style-r1 board |
| 13 | 2026-11-23 | 2 | style locked: 'Сырой сумрак Велена' with 3 time-of-day phases (dawn fog, stormy dusk, night of Nav) | — | user | user confirmed style R2 |
| 14 | 2026-11-23 | 3 | platforms: browser (AI Studio live web preview) | — | user | chosen in phase 1 interview |
| 15 | 2026-11-23 | 3 | engine: Three.js 0.187.0 + postprocessing 6.39.6 + inkjs 2.4.0 + TS kinematics | Three.js 0.187 + Postprocessing + TS \| Three.js 0.187 + Rapier3D WASM \| Babylon.js 9.37 + Havok | user | Быстрый старт в браузере, прямой контроль над PBR/HDR/тенями, нулевые WASM-блокировки, чистая тестируемость логики в node:test |
| 16 | 2026-11-23 | 4 | Hello 3D verified in live preview; 3D without Blender (procedural Three.js) | — | user | Пользователь подтвердил запуск и движение в 3D-сцене превью; в контейнерной среде используем процедурные композитные меши и PBR-текстуры на TypeScript |
| 17 | 2026-11-23 | 5 | Asset strategy: procedural Three.js AAA upgrade (PBR maps, sculpted composite rigs, sky/fog/water shaders, EffectComposer, Web Audio) | — | user | Пользователь приложил ТЗ UNIVERSAL AAA VISUAL UPGRADE и подтвердил старт глубокого визуального апгрейда в Фазе 5 |
| 18 | 2026-11-23 | 6 | Phase 5 Look-Dev approved and advancing to Phase 6 with full itch.io multi-device, audio, localization (16 languages, English default), keybinds, difficulty & graphics settings | — | user | — |
| 19 | 2026-11-23 | 7 | Phase 6 M01-M06 locked after PT-01 user approval; WoW RMB camera orbit/strafing, GPU/CPU perf, visual & combat upgrades implemented for Phase 7 | — | user | — |
| 20 | 2026-11-23 | 8 | Phase 7 Vertical Slice closed after user confirmation; numeric keybinds (0-9/Num0-9), instanced birches/GPU sparks, Finisher/Prey Habits/Night Stalker shipped for Phase 8 | — | user | — |
