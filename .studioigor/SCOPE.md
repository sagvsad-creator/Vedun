# Scope — the contract in numbers

What "the game is done" means for this project. The scale is agreed in phase 1,
the numbers are refined in phase 8. Lines are never deleted — they are ticked or marked
`BLOCKED: <why>`. Counted by `scope.py`.

Line syntax:

    - [ ] <name>: <N> <unit> — count: <command that prints a number>

## Reference inventory
The Witcher 3: Wild Hunt — 30+ часов основной сюжет, 5 крупных регионов, 2 меча + 5 знаков + алхимия, ~80 видов монстров, разветвлённые контракты и диалоги. Для нашего веб-3D проекта адаптируем до плотной, кинематографичной крупной главы из 3 регионов с бесконечным циклом контрактов.

## Contract
- [ ] Регионы мира (R01–R03): 3 pcs — count: echo 0
- [ ] Типы врагов и боссов: 6 pcs — count: echo 0
- [ ] Славянские знаки: 4 pcs — count: echo 0
- [ ] Охотничьи контракты Главы 1 + бесконечный генератор заказов: 4 pcs — count: echo 0
- [ ] Катсцены final (CS01–CS03): 3 pcs — count: grep -cE '^\| *CS[0-9]+ .*\| *final *\|' .studioigor/STORY.md || true
