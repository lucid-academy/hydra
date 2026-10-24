# Run balance report

Made by `npm run balance:runs` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

50 runs (seeds 1–50), each played by a bot for at most 120 turns or until the hydra dies. The bot walks to the nearest edge of what it knows (or to a draught it has felt), fights what it meets (focus fire and skills), takes every blessing, picks the first event choice it can afford, goes home to rest when its body is below 50% or it has fewer than 2 heads or when there is nothing left to find, lays eggs and hatches defenders. It opens no threshold but Draught Cracks, so it explores less than a player would, and it never hunts messengers down.

Turn and hexes: the middle run, and in brackets the range of the middle 80% of runs.

| Moment | Runs that got there | Turn | Hexes known |
| --- | --- | --- | --- |
| Alert 25 (morePatrols) | 98% | 9 (6–14) | 143 (113–184) |
| Alert 50 (expeditions) | 94% | 18 (13–30) | 215 (183–300) |
| Alert 75 (newEnemies) | 90% | 34 (19–52) | 286 (198–396) |
| Alert 100 (greatBurning) | 90% | 47 (33–75) | 323 (206–486) |
| First expedition marches | 88% | 20 (15–33) | 241 (184–319) |
| Great Burning marches | 88% | 47 (33–79) | 323 (206–442) |

**§8 target:** 40–80 hexes known when the first expedition marches. 0 of the 44 runs that saw one were in that range.

## How the runs went

- Died: 4% (censerWalk 1, greatBurning 1); alive after 120 turns: 96%.
- Turns played: 120 (120–120). Hexes known at the end: 496 (208–768). Alert at the end: 61 (8–100).
- Battles per run: 12.0, won 100% of them.
- Messengers per run: 9.3 sent, 7.7 got away, 1.3 eaten.
- Expeditions camped in the empty lair: 1.0 raids per run, 0.0 eggs broken in lost battles for the lair.
- The Great Burning beaten in 72% of runs. Head levels gained per run: 25.5.

## The surface

The bot goes up from turn 20 (or once nothing is left to find below) when healthy and with 24+ Moisture. Up there it makes for a burning Flame Shrine it can reach, or scouts towards one it knows of from afar (or away from the Passages), and goes back down when hurt or when its Moisture would only just breathe mist to the nearest safe hex (plus 4).

- Went up in 82% of runs, first on turn 28 (21–61), 1.5 times per run.
- Turns up there per run: 13 (0–43); of them Exposed: 4 (0–25).
- Flame Shrines put out per run: 2 (0–4) (all 5 in 6% of runs); lit again by the Order: 1.7 per run.
- Battles up there: 2.9 per run, won 99% of them. Died up there: 2% of runs.
