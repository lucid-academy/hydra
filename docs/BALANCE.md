# Balance report

Made by `npm run balance` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

200 automatic battles per row, each with a fresh hydra (Biter, Acid Spitter, Mist Breather) and 200 body HP.

- **no orders:** the hydra is left alone, heads pick their own targets.
- **focus fire:** every head that can reach attacks the same enemy (Torchbearers and Tithe Collectors first, then Headhunters). A stand-in for a careful player.
- **focus + skills:** focus fire, and every head uses its Q and W skills as soon as they are ready. A stand-in for a player who uses skills (a real player aims them better).
- **castle groups** (castleGate, castleCloister, castleCathedral): the three parts of the castle's assault (M7), fought on the surface. The cathedral has the Eternal Flame, and with orders the body lies down by it to smother it from the start. A fresh hydra is far weaker than one who gets that far, so these rows show which part is the hardest, not the real odds.

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
| fieldPatrol | Man-at-Arms, Man-at-Arms, Headhunter | no orders | 100% | 1% | 54 s | 3.5 | 0.0 | 18.9 | 58.7 |
| fieldPatrol | Man-at-Arms, Man-at-Arms, Headhunter | focus fire | 100% | 0% | 43 s | 1.6 | 0.0 | 15.4 | 52.9 |
| fieldPatrol | Man-at-Arms, Man-at-Arms, Headhunter | focus + skills | 100% | 0% | 25 s | 1.1 | 0.0 | 9.9 | 28.0 |
| censerWalk | Censer Priest, Man-at-Arms, Man-at-Arms, Torchbearer | no orders | 89% | 11% | 54 s | 2.0 | 0.2 | 12.2 | 121.0 |
| censerWalk | Censer Priest, Man-at-Arms, Man-at-Arms, Torchbearer | focus fire | 100% | 0% | 34 s | 1.2 | 0.0 | 10.6 | 50.4 |
| censerWalk | Censer Priest, Man-at-Arms, Man-at-Arms, Torchbearer | focus + skills | 100% | 0% | 22 s | 0.5 | 0.0 | 7.6 | 24.5 |
| brazierCrew | Brazier Bearer, Man-at-Arms, Man-at-Arms, Torchbearer | no orders | 83% | 17% | 59 s | 2.3 | 0.2 | 14.3 | 130.3 |
| brazierCrew | Brazier Bearer, Man-at-Arms, Man-at-Arms, Torchbearer | focus fire | 100% | 0% | 49 s | 1.6 | 0.0 | 15.6 | 67.0 |
| brazierCrew | Brazier Bearer, Man-at-Arms, Man-at-Arms, Torchbearer | focus + skills | 100% | 0% | 32 s | 1.0 | 0.0 | 10.8 | 31.8 |
| knightsRide | Knight of the Eternal Flame, Man-at-Arms, Censer Priest, Crossbowman | no orders | 65% | 35% | 57 s | 4.2 | 0.0 | 18.2 | 151.2 |
| knightsRide | Knight of the Eternal Flame, Man-at-Arms, Censer Priest, Crossbowman | focus fire | 87% | 13% | 53 s | 3.4 | 0.0 | 19.3 | 119.8 |
| knightsRide | Knight of the Eternal Flame, Man-at-Arms, Censer Priest, Crossbowman | focus + skills | 99% | 1% | 39 s | 2.1 | 0.0 | 17.3 | 78.8 |
| shrineWatch | Man-at-Arms, Man-at-Arms, Torchbearer, Censer Priest | no orders | 89% | 12% | 56 s | 2.1 | 0.2 | 11.7 | 117.3 |
| shrineWatch | Man-at-Arms, Man-at-Arms, Torchbearer, Censer Priest | focus fire | 100% | 0% | 36 s | 1.2 | 0.0 | 11.2 | 48.8 |
| shrineWatch | Man-at-Arms, Man-at-Arms, Torchbearer, Censer Priest | focus + skills | 100% | 0% | 22 s | 0.5 | 0.0 | 7.7 | 22.8 |
| shrineVigil | Man-at-Arms, Headhunter, Torchbearer, Censer Priest, Brazier Bearer | no orders | 69% | 31% | 58 s | 4.1 | 1.0 | 13.3 | 132.5 |
| shrineVigil | Man-at-Arms, Headhunter, Torchbearer, Censer Priest, Brazier Bearer | focus fire | 100% | 0% | 55 s | 2.4 | 0.0 | 20.9 | 82.5 |
| shrineVigil | Man-at-Arms, Headhunter, Torchbearer, Censer Priest, Brazier Bearer | focus + skills | 100% | 0% | 38 s | 1.4 | 0.0 | 16.6 | 43.1 |
| shrineBastion | Knight of the Eternal Flame, Man-at-Arms, Crossbowman, Censer Priest, Brazier Bearer | no orders | 52% | 49% | 52 s | 4.6 | 0.0 | 16.9 | 170.3 |
| shrineBastion | Knight of the Eternal Flame, Man-at-Arms, Crossbowman, Censer Priest, Brazier Bearer | focus fire | 72% | 28% | 55 s | 4.0 | 0.0 | 20.4 | 144.6 |
| shrineBastion | Knight of the Eternal Flame, Man-at-Arms, Crossbowman, Censer Priest, Brazier Bearer | focus + skills | 98% | 2% | 44 s | 2.2 | 0.0 | 20.5 | 90.0 |
| relightDetail | Torchbearer, Torchbearer, Man-at-Arms, Censer Priest | no orders | 98% | 3% | 47 s | 1.4 | 0.4 | 8.4 | 81.1 |
| relightDetail | Torchbearer, Torchbearer, Man-at-Arms, Censer Priest | focus fire | 100% | 0% | 25 s | 0.7 | 0.0 | 9.2 | 23.4 |
| relightDetail | Torchbearer, Torchbearer, Man-at-Arms, Censer Priest | focus + skills | 100% | 0% | 17 s | 0.0 | 0.0 | 8.4 | 11.2 |
| censerProcession | Censer Priest, Man-at-Arms, Man-at-Arms, Torchbearer | no orders | 89% | 11% | 54 s | 2.0 | 0.2 | 12.2 | 121.0 |
| censerProcession | Censer Priest, Man-at-Arms, Man-at-Arms, Torchbearer | focus fire | 100% | 0% | 34 s | 1.2 | 0.0 | 10.6 | 50.4 |
| censerProcession | Censer Priest, Man-at-Arms, Man-at-Arms, Torchbearer | focus + skills | 100% | 0% | 22 s | 0.5 | 0.0 | 7.6 | 24.5 |
| castleGate | Knight of the Eternal Flame, Man-at-Arms, Man-at-Arms, Crossbowman, Crossbowman, Brazier Bearer | no orders | 19% | 81% | 41 s | 5.6 | 0.0 | 14.3 | 192.2 |
| castleGate | Knight of the Eternal Flame, Man-at-Arms, Man-at-Arms, Crossbowman, Crossbowman, Brazier Bearer | focus fire | 54% | 47% | 52 s | 4.6 | 0.0 | 23.1 | 171.8 |
| castleGate | Knight of the Eternal Flame, Man-at-Arms, Man-at-Arms, Crossbowman, Crossbowman, Brazier Bearer | focus + skills | 89% | 11% | 48 s | 2.8 | 0.0 | 27.8 | 119.2 |
| castleCloister | Censer Priest, Censer Priest, Headhunter, Torchbearer, Torchbearer, Tithe Collector | no orders | 97% | 4% | 50 s | 3.9 | 0.9 | 14.1 | 69.6 |
| castleCloister | Censer Priest, Censer Priest, Headhunter, Torchbearer, Torchbearer, Tithe Collector | focus fire | 100% | 0% | 40 s | 2.5 | 0.0 | 19.1 | 44.1 |
| castleCloister | Censer Priest, Censer Priest, Headhunter, Torchbearer, Torchbearer, Tithe Collector | focus + skills | 100% | 0% | 30 s | 1.4 | 0.0 | 15.5 | 27.9 |
| castleCathedral | Grand Master Vell, Knight of the Eternal Flame, Censer Priest, Torchbearer, Man-at-Arms | no orders | 0% | 100% | 28 s | 3.3 | 1.2 | 7.2 | 200.0 |
| castleCathedral | Grand Master Vell, Knight of the Eternal Flame, Censer Priest, Torchbearer, Man-at-Arms | focus fire | 3% | 98% | 29 s | 3.8 | 0.1 | 12.0 | 198.9 |
| castleCathedral | Grand Master Vell, Knight of the Eternal Flame, Censer Priest, Torchbearer, Man-at-Arms | focus + skills | 32% | 69% | 38 s | 4.1 | 0.0 | 24.2 | 182.2 |

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
