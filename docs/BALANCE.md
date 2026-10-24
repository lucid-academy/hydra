# Balance report

Made by `npm run balance` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

200 automatic battles per row, each with a fresh hydra (Biter, Acid Spitter, Mist Breather) and 200 body HP.

- **no orders:** the hydra is left alone, heads pick their own targets.
- **focus fire:** every head that can reach attacks the same enemy (Torchbearers and Tithe Collectors first, then Headhunters). A stand-in for a careful player.
- **focus + skills:** focus fire, and every head uses its Q and W skills as soon as they are ready. A stand-in for a player who uses skills (a real player aims them better).

"Heads severed", "Stumps burnt", "Combos" and "Body HP lost" are averages per battle.

| Enemy group | Members | Player | Won | Lost | Avg. length | Heads severed | Stumps burnt | Combos | Body HP lost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lostNovices | Torchbearer, Torchbearer | no orders | 100% | 0% | 11 s | 0.0 | 0.0 | 3.9 | 2.5 |
| lostNovices | Torchbearer, Torchbearer | focus fire | 100% | 0% | 9 s | 0.0 | 0.0 | 5.7 | 1.5 |
| lostNovices | Torchbearer, Torchbearer | focus + skills | 100% | 0% | 6 s | 0.0 | 0.0 | 3.7 | 0.2 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | no orders | 98% | 2% | 60 s | 2.3 | 0.0 | 18.2 | 99.2 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | focus fire | 100% | 0% | 42 s | 1.5 | 0.0 | 12.9 | 65.0 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | focus + skills | 100% | 0% | 22 s | 0.9 | 0.0 | 6.5 | 25.6 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | no orders | 100% | 0% | 47 s | 4.4 | 0.0 | 17.9 | 30.8 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | focus fire | 100% | 0% | 51 s | 2.5 | 0.0 | 19.4 | 29.7 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | focus + skills | 100% | 0% | 28 s | 1.4 | 0.0 | 12.1 | 19.0 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | no orders | 83% | 18% | 62 s | 4.7 | 0.8 | 19.7 | 117.9 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | focus fire | 100% | 0% | 53 s | 2.0 | 0.0 | 23.2 | 73.9 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | focus + skills | 100% | 0% | 34 s | 1.3 | 0.0 | 16.9 | 40.6 |
| pyreProcession | Man-at-Arms, Man-at-Arms, Man-at-Arms, Torchbearer, Torchbearer, Headhunter | no orders | 32% | 69% | 50 s | 5.3 | 1.4 | 14.8 | 182.8 |
| pyreProcession | Man-at-Arms, Man-at-Arms, Man-at-Arms, Torchbearer, Torchbearer, Headhunter | focus fire | 86% | 14% | 67 s | 4.5 | 0.0 | 36.3 | 144.4 |
| pyreProcession | Man-at-Arms, Man-at-Arms, Man-at-Arms, Torchbearer, Torchbearer, Headhunter | focus + skills | 100% | 1% | 54 s | 2.2 | 0.0 | 32.9 | 79.2 |
| crossbowLine | Man-at-Arms, Man-at-Arms, Crossbowman, Crossbowman | no orders | 94% | 6% | 51 s | 3.3 | 0.0 | 17.0 | 104.8 |
| crossbowLine | Man-at-Arms, Man-at-Arms, Crossbowman, Crossbowman | focus fire | 100% | 1% | 51 s | 2.4 | 0.0 | 16.3 | 89.2 |
| crossbowLine | Man-at-Arms, Man-at-Arms, Crossbowman, Crossbowman | focus + skills | 100% | 0% | 36 s | 1.7 | 0.0 | 11.5 | 57.1 |
| titheVisit | Tithe Collector, Man-at-Arms, Man-at-Arms, Crossbowman | no orders | 99% | 2% | 46 s | 2.3 | 0.0 | 12.9 | 79.7 |
| titheVisit | Tithe Collector, Man-at-Arms, Man-at-Arms, Crossbowman | focus fire | 100% | 0% | 52 s | 2.2 | 0.0 | 16.7 | 81.0 |
| titheVisit | Tithe Collector, Man-at-Arms, Man-at-Arms, Crossbowman | focus + skills | 100% | 0% | 30 s | 1.2 | 0.0 | 9.9 | 46.6 |
| knightsVigil | Knight of the Eternal Flame, Man-at-Arms, Torchbearer, Crossbowman | no orders | 57% | 43% | 56 s | 4.0 | 0.2 | 16.8 | 157.2 |
| knightsVigil | Knight of the Eternal Flame, Man-at-Arms, Torchbearer, Crossbowman | focus fire | 87% | 14% | 53 s | 3.3 | 0.0 | 19.6 | 126.3 |
| knightsVigil | Knight of the Eternal Flame, Man-at-Arms, Torchbearer, Crossbowman | focus + skills | 99% | 2% | 39 s | 2.0 | 0.0 | 17.3 | 79.7 |
| greatBurning | Master of the Order, Knight of the Eternal Flame, Man-at-Arms, Man-at-Arms, Torchbearer, Crossbowman | no orders | 0% | 100% | 23 s | 3.1 | 1.5 | 2.7 | 200.0 |
| greatBurning | Master of the Order, Knight of the Eternal Flame, Man-at-Arms, Man-at-Arms, Torchbearer, Crossbowman | focus fire | 3% | 98% | 27 s | 4.8 | 0.2 | 11.1 | 199.4 |
| greatBurning | Master of the Order, Knight of the Eternal Flame, Man-at-Arms, Man-at-Arms, Torchbearer, Crossbowman | focus + skills | 43% | 57% | 42 s | 4.9 | 0.0 | 30.4 | 178.1 |

## The head classes

The same fresh hydra, but with Biter, Acid Spitter and one head of each class in turn, against the hardest groups.

| Third head | burningDetail: won (focus) | burningDetail: won (+ skills) | burningDetail: HP lost (+ skills) | pyreProcession: won (focus) | pyreProcession: won (+ skills) | pyreProcession: HP lost (+ skills) |
| --- | --- | --- | --- | --- | --- | --- |
| Biter | 100% | 100% | 17 | 99% | 100% | 50 |
| Acid Spitter | 100% | 100% | 45 | 93% | 100% | 83 |
| Mist Breather | 100% | 100% | 41 | 86% | 100% | 79 |
| Screamer | 99% | 100% | 42 | 81% | 98% | 96 |
| Glutton | 100% | 100% | 3 | 90% | 100% | 34 |
| The Spare | 100% | 100% | 34 | 85% | 100% | 73 |
| Strangler | 100% | 100% | 32 | 86% | 100% | 78 |
| Tender | 99% | 100% | 40 | 72% | 98% | 96 |
| Lantern | 98% | 100% | 33 | 78% | 99% | 82 |
