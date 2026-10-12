# Gród

Gra budowlana dla Artura. Słowianie, VIII wiek, iPad.

Ten plik jest dla Grega. Claude Code czyta `CLAUDE.md`.

## Co gdzie leży

| Plik / folder | Do czego |
| --- | --- |
| `CLAUDE.md` | Instrukcje dla Claude Code: zasady, technologia, architektura |
| `docs/GDD.md` | Dokument projektowy gry, źródło prawdy |
| `docs/ROADMAP.md` | Etapy prac i lista zadań |
| `docs/ASSETS.md` | Lista grafik z nazwami plików i opisami do Nano Banana |
| `docs/AUDIO.md` | Lista nagrań z nazwami plików |
| `docs/playtests/` | Notatki z testów z Arturem (szablon w środku) |
| `assets/raw/sprites/` | Tu wrzucasz grafiki z Nano Banana |
| `assets/raw/audio/` | Tu wrzucasz nagrania z telefonu |

## Start

1. Wypakuj ten folder tam, gdzie trzymasz projekty.
2. Załóż repozytorium na GitHubie. Uwaga: na darmowym koncie GitHub Pages działa tylko z repozytorium publicznym. Prywatne wymaga płatnego planu.
3. Uruchom Claude Code w tym folderze.
4. Wklej pierwszy prompt:

```
Przeczytaj CLAUDE.md, docs/GDD.md i docs/ROADMAP.md.
Zainicjuj repozytorium git i pomóż mi podłączyć je do GitHuba.
Potem zrób etap M0 z ROADMAP. Zanim napiszesz kod, pokaż mi krótki plan
i zadaj pytania, jeśli coś jest niejasne. Na koniec powiedz mi,
jak otworzyć grę na iPadzie.
```

5. Kolejne etapy: „Zrób etap M1” i tak dalej. Jeden etap na raz, test na iPadzie, dopiero potem następny.

## Grafiki

1. Generujesz w Nano Banana według `docs/ASSETS.md`.
2. Zapisujesz w `assets/raw/sprites/<kategoria>/` dokładnie pod nazwą z listy.
3. Mówisz Claude Code: „Wrzuciłem nowe grafiki, przetwórz je i podmień zastępniki”.

## Nagrania

1. Nagrywasz telefonem według `docs/AUDIO.md`.
2. Zapisujesz w `assets/raw/audio/` pod nazwą z listy (rozszerzenie dowolne).
3. Mówisz Claude Code: „Wrzuciłem nagrania, przetwórz je”.

## Po teście z Arturem

1. Kopiujesz `docs/playtests/SZABLON.md` jako `docs/playtests/RRRR-MM-DD.md` i wypełniasz.
2. Mówisz Claude Code: „Przeczytaj najnowszą notatkę z testu i zaproponuj zadania”.
