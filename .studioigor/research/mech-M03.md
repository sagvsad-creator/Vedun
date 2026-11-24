# M03 Enemy Archetypes & Telegraphs — Research
- Confirmed 4 distinct enemy decision policies in `src/systems/enemies.ts` + `src/data/enemiesTuning.json`.
- Token pool prevents dogpiling; every heavy/leaping attack displays an expanding crimson ground ring and windup posture for 0.45–0.85s before hitbox activation.
- KO transitions give 0.38s topple/dissolve animation and spawn silver/trophy drops cleanly on `groundHeightAt`.
