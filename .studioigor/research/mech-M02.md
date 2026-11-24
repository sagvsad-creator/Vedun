# M02 Slavic Signs & M03 Enemies AI — Research
- Signs (4): Svarog (cone fire + burn DoT), Veles (radial knockback + stagger interrupt), Makosh (runic shield ward absorbing hit + shatter), Mara (ground frost-blood snare 60% slow + bonus crit).
- Enemy AI (>=4 distinct behaviors): Drowner (water ambush swarmer), Upyr (blood-frenzy lunger), Marauder (front-shielded duelist broken by Veles/Heavy), Ancient Leshy (2-phase boss with root eruption ring telegraphs + exposed heart after Svarog).
- Crowd safety: Attack token pool (max 2–3 simultaneous attackers), 0.45–0.80s visible crimson ground ring windup before every strike >10% HP.
- Difficulty scaling: Story (0.65x), Normal (1.0x), Sword & Story (1.35x), Death March (1.75x) dynamically read by `enemies.ts`.
