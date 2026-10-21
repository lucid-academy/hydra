# Balance report

Made by `npm run balance` from the numbers in `src/data/`. Run it again after changing them; don't edit this file by hand.

100 automatic battles per row, each with a fresh hydra (Biter, Acid Spitter, Mist Breather) and 200 body HP.

- **no orders:** the hydra is left alone, heads pick their own targets.
- **focus fire:** every head that can reach attacks the same enemy (Torchbearers first, then Headhunters). A stand-in for a careful player.
- **focus + skills:** focus fire, and every head uses its Q and W skills as soon as they are ready. A stand-in for a player who uses skills (a real player aims them better).

"Heads severed", "Stumps burnt", "Combos" and "Body HP lost" are averages per battle.

| Enemy group | Members | Player | Won | Lost | Avg. length | Heads severed | Stumps burnt | Combos | Body HP lost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lostNovices | Torchbearer, Torchbearer | no orders | 100% | 0% | 11 s | 0.0 | 0.0 | 4.0 | 2.4 |
| lostNovices | Torchbearer, Torchbearer | focus fire | 100% | 0% | 9 s | 0.0 | 0.0 | 5.7 | 1.6 |
| lostNovices | Torchbearer, Torchbearer | focus + skills | 100% | 0% | 6 s | 0.0 | 0.0 | 3.8 | 0.2 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | no orders | 99% | 1% | 40 s | 1.9 | 0.0 | 12.0 | 96.7 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | focus fire | 100% | 0% | 36 s | 1.3 | 0.0 | 10.6 | 67.0 |
| patrol | Man-at-Arms, Man-at-Arms, Man-at-Arms | focus + skills | 100% | 0% | 22 s | 0.9 | 0.0 | 6.5 | 26.6 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | no orders | 100% | 0% | 29 s | 3.8 | 0.0 | 11.7 | 32.6 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | focus fire | 100% | 0% | 29 s | 2.1 | 0.0 | 11.6 | 32.5 |
| huntingParty | Man-at-Arms, Headhunter, Headhunter | focus + skills | 100% | 0% | 22 s | 1.4 | 0.0 | 8.8 | 24.2 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | no orders | 86% | 14% | 45 s | 4.0 | 0.8 | 14.8 | 111.4 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | focus fire | 99% | 1% | 38 s | 1.7 | 0.0 | 15.4 | 79.3 |
| burningDetail | Man-at-Arms, Man-at-Arms, Torchbearer, Headhunter | focus + skills | 100% | 0% | 28 s | 1.4 | 0.0 | 12.0 | 49.3 |
| pyreProcession | Man-at-Arms, Man-at-Arms, Man-at-Arms, Torchbearer, Torchbearer, Headhunter | no orders | 42% | 58% | 44 s | 4.8 | 1.3 | 14.6 | 179.0 |
| pyreProcession | Man-at-Arms, Man-at-Arms, Man-at-Arms, Torchbearer, Torchbearer, Headhunter | focus fire | 97% | 3% | 44 s | 3.4 | 0.0 | 24.8 | 130.0 |
| pyreProcession | Man-at-Arms, Man-at-Arms, Man-at-Arms, Torchbearer, Torchbearer, Headhunter | focus + skills | 100% | 0% | 33 s | 2.1 | 0.0 | 19.4 | 91.8 |

## The head classes

The same fresh hydra, but with Biter, Acid Spitter and one head of each class in turn, against the hardest groups.

| Third head | burningDetail: won (focus) | burningDetail: won (+ skills) | burningDetail: HP lost (+ skills) | pyreProcession: won (focus) | pyreProcession: won (+ skills) | pyreProcession: HP lost (+ skills) |
| --- | --- | --- | --- | --- | --- | --- |
| Biter | 100% | 100% | 18 | 100% | 100% | 53 |
| Acid Spitter | 100% | 100% | 52 | 98% | 99% | 94 |
| Mist Breather | 99% | 100% | 49 | 97% | 100% | 92 |
| Screamer | 99% | 100% | 47 | 98% | 98% | 104 |
| Glutton | 100% | 100% | 5 | 98% | 100% | 47 |
| The Spare | 100% | 100% | 42 | 90% | 100% | 90 |
| Strangler | 100% | 100% | 35 | 96% | 100% | 86 |
| Tender | 99% | 100% | 44 | 89% | 100% | 104 |
| Lantern | 99% | 100% | 39 | 94% | 100% | 91 |
