# Plan prac

Każdy etap kończy się wersją, którą Artur może otworzyć na iPadzie. Kolejny etap zaczynamy dopiero, gdy poprzedni działa. Zadania z testów z Arturem dopisujemy do sekcji „Z testów” na dole.

## M0 · Szkielet na iPadzie

- [x] Projekt: Vite, TypeScript (strict), PixiJS, Vitest, skrypty `typecheck`, `test`, `build`
- [x] Publikacja na GitHub Pages przez GitHub Actions
- [x] PWA: manifest, ikona, service worker, uruchamianie z ekranu początkowego w poziomie
- [x] Mapa na siatce z zastępnikami: rzeka, las, łąka (jedna ręcznie zrobiona mapa)
- [x] Przesuwanie mapy palcem, przybliżanie szczypaniem
- [x] Numer wersji w rogu ekranu

**Gotowe, gdy:** Greg otwiera grę z ikony na iPadzie i przesuwa mapę palcem bez zacięć.

## M1 · Drogi i pierwszy ludzik

- [x] Przycisk trybu dróg, rysowanie ścieżki palcem po kafelkach
- [x] Duży przycisk „cofnij”
- [x] Magazyn postawiony na starcie
- [x] Jeden ludzik chodzi po drogach (A*) między dwoma punktami, z animacją chodu
- [x] Pauza i prędkość x1, x2, x3
- [x] Rdzeń symulacji ze stałym krokiem i ziarnem losowości, pierwsze testy

**Gotowe, gdy:** narysowana droga zmienia trasę ludzika i widać to na ekranie.

## M2 · Budowanie i pierwsze łańcuchy

- [x] Pasek budynków z kosztem na przycisku, szary przycisk przy braku materiałów
- [x] Górny pasek: drewno, glina, ryby, „Wolni”
- [x] Plac budowy: wolni ludziki noszą materiały i budują, budynek rośnie
- [x] Drwal, rybak i glinianka: producent idzie po surowiec i odnosi go do magazynu
- [x] Ikona „brak drogi” nad niepodłączonym budynkiem (i magazynem)
- [x] Bezczynny ludzik pokazuje nad głową ikonę tego, czego brakuje
- [x] Stuknięcie w budynek lub ludzika otwiera panel z ikonami i liczbami (na razie tekstowy placeholder)
- [x] Widmo (podgląd) budynku pod kursorem/palcem w trybie stawiania — biała ramka gdy można postawić, czerwona gdy nie

**Gotowe, gdy:** Artur sam stawia drwala, łączy go drogą i patrzy, jak drewno trafia do magazynu.

## M3 · Domy i osadnicy

- [x] Ziemianka jako dom: miejsca dla mieszkańców, mieszkańcy dołączają do puli „Wolni”
- [x] Osadnicy przychodzą z krawędzi mapy z tobołkami, gdy jest wolne miejsce i nie ma głodu
- [x] Każdy budynek zajmuje jednego pracownika z puli
- [x] Tragarze z magazynu roznoszą ryby do domów
- [x] Licznik potrzeby nad domem, np. ryby 3/5

**Gotowe, gdy:** gród rośnie sam, jeśli Artur dba o ryby, a widać skąd biorą się nowi ludzie.

## M4 · Chata i drugi łańcuch

- [x] Pole prosa (kilka kafelków), rolnik, żarna, kasza
- [x] Przetwórca sam chodzi do magazynu po surowiec
- [x] Studnia z zasięgiem widocznym po stuknięciu
- [x] Awans ziemianka → chata, gdy są ryby, kasza i studnia w zasięgu; chata ma więcej mieszkańców
- [x] Brak cofania awansu: niespełniona potrzeba tylko zatrzymuje wzrost

**Gotowe, gdy:** Artur doprowadza pierwszą ziemiankę do chaty bez podpowiedzi.

Obserwacje po M4 (Greg, 2026-10-14: „jest ok”, zostają bez zmian):

- Przebudowa w chatę trwa długo: jeden budowniczy nosi 5 materiałów po jednym (ok. minuty przy x1).
- Kasza i proso gromadzą się w magazynie, bo nic ich nie zjada aż do M5.
- Podświetlenie zasięgu studni jest dość blade.
- Zasięg i panel z poprzedniego stuknięcia zostają widoczne, gdy wybierze się budynek do postawienia.

## M5 · Pory roku

- [x] Cykl czterech pór roku, 3–4 minuty każda przy x1, ikona pory roku na pasku
- [x] Wiosna: siew; jesień: żniwa; pole widocznie rośnie w czterech stadiach
- [x] Zima: pole nie rodzi, domy zużywają drewno na opał, rybak łowi wolniej
- [x] Ostrzeżenie przed zimą (ikona i licznik dni), gdy zapasów jest za mało
- [x] Wygląd zimy nakładany kodem (kolory, śnieg)

**Gotowe, gdy:** Artur rozumie, że latem trzeba odłożyć drewno i ryby na zimę.

## M6 · Zapisy i kronika

- [x] Zapis w IndexedDB, autozapis co porę roku i przy wyjściu, `navigator.storage.persist()`
- [x] Eksport i import zapisu jako plik
- [x] `SAVE_VERSION = 1`, pierwszy przykładowy zapis w `tests/fixtures/saves/`, test wczytywania
- [x] Testowa migracja v1 → v2, żeby mechanizm był sprawdzony, zanim będzie potrzebny
- [x] Kronika: wpisy o ważnych chwilach (pierwsza chata, przetrwana zima, nowi osadnicy)
- [x] Ekran kroniki do czytania przez tatę
- [x] Nadawanie nazwy grodowi

**Gotowe, gdy:** zapis z poprzedniej wersji gry wczytuje się w nowej, a kronika pokazuje historię grodu.

## Przed M7

- [x] Licznik „LUDZIE” na górnym pasku: wszyscy mieszkańcy grodu (bez osadników jeszcze w drodze)

## M7 · Samouczek pierwszej wiosny — porzucony

Zrobiony w 0.8.0 (podpowiedzi, stopniowe odblokowanie budynków), usunięty w 0.8.2: Greg woli sam tłumaczyć grę Arturowi (2026-10-14). Zapisy z samouczkiem wczytują się dalej (migracja v3 → v4).

Przy okazji poprawione w 0.8.2: w trybie DROGA palec przesuwał mapę zamiast rysować drogę.

## M8 · Grafiki i dźwięki

- [ ] Skrypt przetwarzania grafik: usunięcie tła magenta, przycięcie, skalowanie
- [ ] Podmiana zastępników na grafiki z `assets/raw/sprites/`
- [ ] Skrypt przetwarzania nagrań: przycięcie ciszy, wyrównanie głośności
- [ ] Odtwarzanie nagrań przy stuknięciach i wydarzeniach

**Gotowe, gdy:** gra wygląda i brzmi jak gra, a brakujące pliki nadal działają jako zastępniki.

## Po pierwszej wersji

- [ ] Burza i pożar (pierwsze zagrożenie), kontyna Peruna, zgliszcza do odbudowy
- [ ] Piętro 3: obora, serowarnia, plac wiecowy, zagroda
- [ ] Piętro 4: owczarnia, tkalnia, kontyna, dwór
- [ ] Kopiec: bagno z rudą, dymarka, kuźnia, łopaty, kamień
- [ ] Drugi magazyn, droga z dyli, mosty
- [ ] Legendy, powodzie, śnieżyce, myszy, wilki, święto Marzanny
- [ ] Dawne grody jako kurhany na nowych mapach

## Z testów

Zadania z notatek w `docs/playtests/` trafiają tutaj, z datą testu.
