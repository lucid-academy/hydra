# Surowe obrazki

Oryginały od Piotra (z GPT, później z PixelLab). Nikt ich nie edytuje ani nie nadpisuje: skrypt importu tylko z nich czyta.

- Nazwa pliku to klucz z `src/assets/manifest.json`, np. `battle_body.png`. Prompty z nazwami: `docs/ART_PROMPTS.md`.
- Plik pod inną nazwą (np. `decor_reeds.png` zamiast `map_deco_reeds.png`) zostaje, jak jest; jego nazwę i klucz wpisuje się do `art/aliases.json`.
- Klatki animacji: `<klucz>_frame1.png`, `<klucz>_frame2.png`...
- Okładka gry (do palety): `key_art.png`.
- Potem `npm run art`: obrazki trafiają do gry (`public/images/`), a manifest dostaje ich ścieżki.
