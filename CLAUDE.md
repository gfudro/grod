# Gród — instrukcje dla Claude Code

Gród to spokojna gra budowlana w przeglądarce na iPada dla 6-letniego Artura. Słowiańszczyzna VIII wieku, łańcuchy produkcji jak w Anno, przejrzystość jak w Warcraft 2, bez walki. Projektuje ją Greg (tata Artura).

- Pełny projekt gry: `docs/GDD.md`. To jest źródło prawdy. Przeczytaj go przed pierwszą zmianą w sesji.
- Kolejność prac: `docs/ROADMAP.md`.
- Grafiki: `docs/ASSETS.md`. Nagrania: `docs/AUDIO.md`.
- Notatki z testów z Arturem: `docs/playtests/`.

## Zasady nadrzędne

Tych zasad nie łam bez wyraźnej zgody Grega. Jeśli zadanie wymaga ich złamania, zatrzymaj się i zapytaj.

1. **Bez walki.** Zagrożenia są pogodowe i rozwiązuje się je budowaniem.
2. **Wszystko widać.** Każdy skutek ma widoczną przyczynę na ekranie: ludzik idzie, niesie towar, licznik się zmienia. Żadnych ukrytych modyfikatorów, korków ani niewidocznych kolejek.
3. **Lekka kara.** Nic nie znika na zawsze. Nikt się nie wyprowadza. Dom nie spada piętro niżej. Zniszczony budynek zostawia zgliszcza do odbudowy.
4. **Tekst w interfejsie to pojedyncze polskie słowa z ikoną.** Nigdy całe zdania. Artur czyta powoli, pojedyncze wyrazy tak.
5. **iPad przede wszystkim.** Dotyk, orientacja pozioma, brak hover. Cele dotykowe co najmniej 64×64 px CSS. Wszystko, co w grach na PC pokazuje się po najechaniu, tu pokazuje się po stuknięciu.
6. **Zapisy nie przepadają.** Zapis z każdej wcześniejszej wersji musi się wczytać albo zamienić w historię (kronika, kurhan). Nigdy nie kasuj zapisu gracza po cichu.
7. **Liczby tak, zadania matematyczne nie.** Liczby na pasku i nad domami są dobre. Zagadki typu „rozwiąż 7+5” są zakazane.

## Stos technologiczny

- **TypeScript** w trybie `strict`, **Vite**, **PixiJS** do renderowania mapy i ludzików, **Vitest** do testów. Instaluj aktualne stabilne wersje.
- **Interfejs (górny pasek, przyciski, panele)** jako warstwa HTML/CSS nad płótnem PixiJS. Łatwiej o duże przyciski, czytelne fonty i polskie znaki.
- **PWA:** manifest i service worker, żeby gra działała z ikony na ekranie początkowym i offline.
- **Hosting:** GitHub Pages, publikacja przez GitHub Actions przy każdym pushu na `main`.
- **Bez frameworka UI** (React itp.), dopóki nie będzie wyraźnej potrzeby. Mniej zależności to mniej rzeczy, które się zepsują przy aktualizacjach.

## Architektura

- **Symulacja jest oddzielona od renderowania.** Kod w `src/sim/` nie importuje niczego z PixiJS ani DOM. Stan gry to zwykłe dane, a symulacja to funkcja `tick(state)`.
- **Stały krok symulacji** (np. 10 ticków na sekundę). Renderowanie interpoluje pozycje ludzików między tickami. Prędkość x2 i x3 to więcej ticków na sekundę, nie większy krok.
- **Determinizm.** Losowość tylko przez RNG z ziarnem trzymanym w stanie gry. Bez `Math.random()` w `src/sim/`. Dzięki temu da się testować i odtwarzać sytuacje z testów.
- **Dane gry jako tabele** w `src/data/`: budynki, towary, koszty, czasy produkcji, piętra domów, potrzeby, zasięgi. Balansowanie ma polegać na zmianie liczb w jednym miejscu, nie na szukaniu po kodzie.
- **Wszystkie polskie słowa interfejsu** w jednym pliku `src/ui/strings.ts`.
- **Mapa to siatka kafelków.** Ludziki szukają drogi algorytmem A* po kafelkach drogi. Ludziki przechodzą przez siebie, bez kolizji.
- **Każdy ludzik należy do jednego budynku** i ma prosty automat stanów (idzie, pracuje, niesie, czeka). Stan „czeka” zawsze pokazuje nad głową ikonę tego, czego brakuje.

Proponowana struktura katalogów:

```
src/
  sim/        symulacja (czyste dane i logika)
  data/       tabele budynków, towarów, pięter, pór roku
  render/     PixiJS: mapa, budynki, ludziki, animacje
  ui/         HTML/CSS: pasek, przyciski, panele, strings.ts
  input/      dotyk: przesuwanie, szczypanie, stuknięcie, tryb dróg
  save/       zapis, odczyt, migracje, kronika
  audio/      odtwarzanie nagrań
assets/
  raw/        surowe pliki od Grega (nie są ładowane przez grę)
  sprites/    przetworzone grafiki ładowane przez grę
  audio/      przetworzone nagrania ładowane przez grę
scripts/      przetwarzanie grafik i dźwięków
tests/
  fixtures/saves/   przykładowe zapisy z każdej wersji formatu
```

## Zapisy i kronika

- Plik zapisu: `{ saveVersion, gameVersion, savedAt, state, chronicle }`.
- `SAVE_VERSION` to liczba całkowita. Każda zmiana kształtu `state` oznacza: podbicie `SAVE_VERSION`, migrację `vN → vN+1` w `src/save/migrations.ts` oraz nowy przykładowy zapis w `tests/fixtures/saves/`.
- Test obowiązkowy: każdy zapis z `tests/fixtures/saves/` wczytuje się w bieżącej wersji gry. Nigdy nie usuwaj starych migracji ani starych zapisów testowych.
- Gdy migracja jest niemożliwa (np. po przebudowie łańcuchów), zachowaj kronikę i podstawowe dane grodu (nazwa, rok, osiągnięcia) jako „dawny gród”. W nowej grze pojawia się on jako kurhan lub ruiny.
- **Kronika** to lista wpisów `{ year, season, kind, params }`. Zdania kroniki powstają z szablonów w `strings.ts`, dzięki czemu format danych zostaje stabilny, a teksty można poprawiać.
- **Przechowywanie:** IndexedDB, autozapis co porę roku i przy wyjściu z gry, przy starcie wywołaj `navigator.storage.persist()`. Do tego eksport i import zapisu jako plik JSON (kopia bezpieczeństwa, bo Safari potrafi wyczyścić dane strony).

## Grafiki i dźwięki

- **Do czasu grafik gra używa zastępników** rysowanych kodem: kolorowe kształty z pierwszą literą nazwy. Gra musi działać z dowolną mieszanką prawdziwych grafik i zastępników. Brak pliku to zastępnik, nie błąd.
- **Greg wrzuca surowe grafiki** do `assets/raw/sprites/` z nazwami z `docs/ASSETS.md`. Mają jednolite tło magenta `#FF00FF`. Skrypt w `scripts/` usuwa tło, przycina, skaluje i zapisuje gotowe pliki do `assets/sprites/`.
- **Ludziki to jeden nieruchomy obrazek na typ.** Chód i pracę animujesz w kodzie: podskok przy chodzie, odbicie w poziomie przy zmianie kierunku, kołysanie narzędziem, niesiony towar nad głową lub w rękach.
- **Śnieg i pora roku** jako nakładka kodem (zmiana kolorów, płatki), nie osobne grafiki.
- **Drogi rysujesz kodem** (zakręty i skrzyżowania z kafelków).
- **Nagrania** Greg wrzuca do `assets/raw/audio/` z nazwami z `docs/AUDIO.md`, w dowolnym formacie z telefonu. Skrypt przycina ciszę, wyrównuje głośność i zapisuje do `assets/audio/`. Brak nagrania to brak dźwięku, nie błąd.

## Sposób pracy

- **Małe kroki.** Każdy etap z `docs/ROADMAP.md` kończy się wersją, którą da się otworzyć na iPadzie. Nie zaczynaj kolejnego etapu, zanim poprzedni nie działa.
- **Numer wersji** gry widoczny małym drukiem w rogu ekranu. Greg podaje go w notatkach z testów.
- **Przed commitem:** `npm run typecheck`, `npm test`, `npm run build`. Wszystko musi przejść.
- **Testy** piszesz głównie dla `src/sim/` i `src/save/`: łańcuchy produkcji, wzrost domów, pory roku, migracje zapisów.
- **Po zmianie decyzji projektowej** zaktualizuj `docs/GDD.md`. Po skończeniu zadania odhacz je w `docs/ROADMAP.md`.
- **Notatki z testów** (`docs/playtests/`) zamieniaj na konkretne zadania w `docs/ROADMAP.md` i pokaż Gregowi, co z nich wynika, zanim zaczniesz je wdrażać.
- **Niejasne lub sprzeczne miejsce w GDD:** zapytaj, nie zgaduj.
- **Język:** kod, nazwy i komentarze po angielsku. Rozmowa z Gregiem, dokumenty i interfejs gry po polsku.
- **Testowanie na iPadzie w trakcie pracy:** `npm run dev -- --host` i adres IP komputera w Safari na iPadzie (ta sama sieć Wi-Fi). Instalacja PWA z ekranu początkowego działa dopiero z wersji opublikowanej na GitHub Pages (HTTPS).
