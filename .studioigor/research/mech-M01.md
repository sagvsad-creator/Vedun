# M01 Blade Dance & 3D Locomotion — Research
- References: The Witcher 3 (fast/strong blade rhythm, dodge pirouette, steel vs silver duality), Elden Ring (coyote time, jump gravity, hitstop).
- Numbers: 3-hit combo windows (startup 90ms / active 140ms / recovery 190ms / chain window 480ms); jump apex 1.45m in 0.34s; coyote 0.11s; hitstop 45ms light / 75ms heavy kill.
- Mouse & Touch UX: Mouse0 canvas = Strike (UI clicks stay clean); Mouse2 canvas = Jump; Touch virtual stick + right-hand action arc.
- Risk: Stiff root motion or accidental UI clicks triggering swings -> keep input target check (`e.target === canvas`) and forward step lunge in `systems/combat.ts`.
