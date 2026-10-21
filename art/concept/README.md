# Grafiki koncepcyjne

Malowane portrety do dialogów (`GAME_DESIGN.md` §13). `npm run art` ich nie czyta. Od M5 gra używa ich kopii z `public/portraits/` (klucze `dialogue_<id>` w manifeście, opis w `docs/ASSETS.md`); nowy portret kopiuje się tam bez zmian.

## portraits/

- `heads_and_toad_sheet.png`: arkusz od Piotra z 2026-10-04 (GPT) z 9 głowami i Old Mother Toad. Oryginał, nikt go nie edytuje.
- `<klasa>.png` (np. `biter.png`, `oldMotherToad.png`): portrety wycięte z arkusza, na przezroczystym tle, w rozdzielczości arkusza (ok. 330–450 px). Nazwy to identyfikatory klas głów, jak w `src/data/heads.json`.
- Na prośbę Piotra Claude skrócił języki o ok. 40% w `biter`, `spare`, `lantern`, `mistBreather` i `strangler`. `acidSpitter` ma język bez zmian, bo z jego czubka kapie kwas.
