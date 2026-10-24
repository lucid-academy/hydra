# Run balance report

Made by `npm run balance:runs` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

50 runs (seeds 1–50), each played by a bot for at most 120 turns or until the hydra dies. The bot walks to the nearest edge of what it knows (or to a draught it has felt), fights what it meets (focus fire and skills), takes every blessing, picks the first event choice it can afford, goes home to rest when its body is below 50% or it has fewer than 2 heads or when there is nothing left to find, lays eggs and hatches defenders. It opens no threshold but Draught Cracks, so it explores less than a player would, and it never hunts messengers down.

Turn and hexes: the middle run, and in brackets the range of the middle 80% of runs.

| Moment | Runs that got there | Turn | Hexes known |
| --- | --- | --- | --- |
| Alert 25 (morePatrols) | 98% | 9 (6–14) | 143 (113–184) |
| Alert 50 (expeditions) | 92% | 18 (13–29) | 239 (183–300) |
| Alert 75 (newEnemies) | 90% | 27 (19–50) | 304 (212–396) |
| Alert 100 (greatBurning) | 90% | 40 (25–82) | 368 (254–493) |
| First expedition marches | 84% | 20 (15–29) | 252 (193–326) |
| Great Burning marches | 88% | 40 (25–83) | 372 (262–532) |

**§8 target:** 40–80 hexes known when the first expedition marches. 0 of the 42 runs that saw one were in that range.

## How the runs went

- Died: 0% (none); alive after 120 turns: 100%.
- Turns played: 120 (120–120). Hexes known at the end: 573 (208–986). Alert at the end: 43 (8–100).
- Battles per run: 9.7, won 100% of them.
- Messengers per run: 7.0 sent, 5.7 got away, 1.1 eaten.
- Expeditions camped in the empty lair: 0.8 raids per run, 0.0 eggs broken in lost battles for the lair.
- The Great Burning beaten in 58% of runs. Head levels gained per run: 20.6.
