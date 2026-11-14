# Run balance report

Made by `npm run balance:runs` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

50 runs (seeds 1–50), each played by a bot for at most 120 turns or until the hydra dies. The bot walks to the nearest edge of what it knows (or to a draught it has felt), fights what it meets (focus fire and skills), takes every blessing, picks the first event choice it can afford, goes home to rest when its body is below 50% or it has fewer than 2 heads or when there is nothing left to find, lays eggs and hatches defenders. It opens no threshold but Draught Cracks, so it explores less than a player would, and it never hunts messengers down.

Turn and hexes: the middle run, and in brackets the range of the middle 80% of runs.

| Moment | Runs that got there | Turn | Hexes known |
| --- | --- | --- | --- |
| Alert 25 (morePatrols) | 100% | 21 (14–33) | 492 (342–568) |
| Alert 50 (expeditions) | 100% | 41 (28–62) | 631 (452–877) |
| Alert 75 (newEnemies) | 94% | 55 (38–81) | 695 (478–1182) |
| Alert 100 (greatBurning) | 88% | 68 (54–104) | 792 (581–1507) |
| First expedition marches | 96% | 43 (29–60) | 631 (450–919) |
| Great Burning marches | 86% | 67 (54–99) | 789 (581–1402) |

**§8 target:** 40–80 hexes known when the first expedition marches. 0 of the 48 runs that saw one were in that range.

## How the runs went

- Won (the Eternal Flame put out): 0%. Died: 12% (greatBurning 3, fieldPatrol 1, pyreProcession 1, burningDetail 1); alive after 120 turns: 88%.
- Turns played: 120 (117–120). Hexes known at the end: 1068 (631–1907). Alert at the end: 100 (39–100).
- Battles per run: 9.6, won 99% of them.
- Messengers per run: 7.5 sent, 5.3 got away, 1.6 eaten.
- Expeditions camped in the empty lair: 1.1 raids per run, 0.0 eggs broken in lost battles for the lair.
- The Great Burning beaten in 32% of runs. Head levels gained per run: 20.5.

## The surface

The bot goes up from turn 20 (or once nothing is left to find below) when healthy and with 24+ Moisture. Up there it makes for a burning Flame Shrine it can reach, or scouts towards one it knows of from afar (or away from the Passages), and goes back down when hurt or when its Moisture would only just breathe mist to the nearest safe hex (plus 4).

- Went up in 94% of runs, first on turn 30 (22–96), 2.1 times per run.
- Turns up there per run: 25 (6–59); of them Exposed: 15 (0–37).
- Flame Shrines put out per run: 1 (0–3) (all 5 in 0% of runs); lit again by the Order: 1.3 per run.
- Battles up there: 1.9 per run, won 99% of them. Died up there: 2% of runs.

## The castle

The gate opens when 5 Flame Shrines are out at once. The bot, healthy, then goes to the walls and storms the castle part by part (gate, cloister, cathedral), falling back when hurt. In the last part its body lies down by the Eternal Flame from the start.

- The gate opened in 0% of runs, on turn –.
- Battles at the castle: 0.0 per run; parts taken: 0 (0–0) (in the runs whose gate opened: –).
- The Eternal Flame put out (the run won) in 0% of runs, on turn –. Died at the castle: 0% of runs.

### The gate opened by hand on turn 60

The same 50 runs, but from turn 60 the gate stands open whatever the shrines, to see how a hydra the bot has grown that far does in the assault.

- Stormed the castle in 12% of runs; in the others the bot never got to its walls by turn 120 (or died before). Battles at the castle: 0.4 per run.
- Parts taken in the runs that stormed it: 3 (3–3). Gate taken: 12% of runs, cloister: 12%, cathedral (the Flame out): 12%.
- Won on turn 99 (63–110). Died at the castle: 0% of runs; died anywhere: 24%.
