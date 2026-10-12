# Gród — dokument projektowy gry dla Artura

Stan na 2026-10-11. Od momentu założenia repozytorium **ten plik jest źródłem prawdy**. Każda zmiana decyzji projektowej trafia tutaj.

## Wizja i filary

Gród to spokojna gra budowlana na iPada dla 6-letniego Artura: łańcuchy produkcji jak w Anno, przejrzystość jak w Warcraft 2, bez walki. Artur gra przy tacie, ale ma sobie radzić choć trochę samodzielnie.

1. **Przejrzystość Warcraft 2.** Mało surowców, jeden budynek ma jedną funkcję, wszystko widać na ekranie. Żadnych ukrytych systemów.
2. **Łańcuchy produkcji Anno**, ułożone w piramidę potrzeb.
3. **Żywe miasto.** Widać, jak ludziki pracują, noszą towary i chodzą po drogach.
4. **Bez walki.** Zagrożenia są pogodowe i rozwiązuje się je budowaniem.
5. **Lekka kara za błąd.** Nic nie znika na zawsze, nikt się nie wyprowadza.
6. **Liczenie z sensem.** Liczby są częścią decyzji, a nie zadaniem do rozwiązania. Artur dobrze radzi sobie z dużymi liczbami.

Gród to nazwa robocza. Ostateczną może wymyślić Artur.

## Świat

Akcja dzieje się na ziemiach Słowian w VIII wieku. Ówczesna technologia (drewno, glina, len, żelazo z bagien) sama pilnuje, żeby łańcuchy były krótkie.

- **Ukłon w stronę Polan** (MDF, 1996), gdzie jedynym surowcem było mleko od krów. U nas krowy, mleko i ser są osobnym piętrem piramidy.
- **Legendy jako wydarzenia** (po pierwszej wersji): Smok Wawelski, któremu trzeba przygotować barana z siarką, czyli łańcuch produkcji zamiast walki; Popiel i myszy w spichlerzu; Perun i pioruny.
- **Cel gry:** kopiec usypywany przez całe plemię, na wzór Kopca Krakusa. Jego nazwę i wygląd wymyśla Artur.
- **Wiosną** święto topienia Marzanny jako mała nagroda za przetrwanie zimy.

## Piramida potrzeb i łańcuchy produkcji

Dom rośnie o piętro, gdy mieszkańcy dostają swój towar i mają w pobliżu potrzebną usługę. Każde piętro wydłuża łańcuch najwyżej o jeden krok.

| Piętro | Dom | Potrzeba (towar) | Usługa w zasięgu | Łańcuch produkcji | W pierwszej wersji |
| --- | --- | --- | --- | --- | --- |
| 1 · przetrwanie | Ziemianka | ryby; zimą opał | — | rybak → magazyn; drwal → magazyn (opał = drewno) | tak |
| 2 · bezpieczeństwo | Chata | kasza | studnia | pole prosa → magazyn → żarna → magazyn | tak |
| 3 · wspólnota | Zagroda | ser | plac wiecowy | obora (krowy, mleko) → serowarnia | nie |
| 4 · uznanie | Dwór | ubrania | kontyna Peruna | owczarnia (wełna) → tkalnia | nie |
| 5 · cel gry | Kopiec (nie jest domem) | wspólna budowa: drewno, kamień, łopaty | — | ruda darniowa (bagno) → dymarka → kuźnia (łopaty) | nie |

Łańcuch rośnie od jednego kroku przy ziemiance do trzech przy kopcu. Żelazne łopaty z kuźni są potrzebne dopiero do usypania kopca.

- **Potrzeby widać nad domem** jako ikonę z liczbą, na przykład ryby 3/5.
- **Usługa działa w zasięgu.** Studnia, plac wiecowy i kontyna muszą stać blisko domu.
- **Wszystkie towary przechodzą przez magazyn.**
- **Kopiec nie jest domem**, tylko wspólnym celem całej gry.
- **W całej grze jest 13 surowców i towarów**, z czego tylko 4 trafiają do mieszkańców: ryby, kasza, ser i ubrania.

## Mieszkańcy i praca

Pracownicy pochodzą z domów i tworzą jedną wspólną pulę, a nowi osadnicy przychodzą sami, jak w Zeusie.

- **Osadnicy** wchodzą na mapę z jej krawędzi, z tobołkami na plecach, i idą do wolnej chaty. Widać ich.
- Przychodzą, gdy w chacie jest wolne miejsce, a w grodzie nie ma głodu.
- **Chata daje ludzików od razu**, nawet bez spełnionych potrzeb. Potrzeby decydują tylko o tym, czy dom rośnie. Inaczej gra mogłaby zablokować się na starcie.
- **Wyższe piętro domu** to więcej mieszkańców.
- **Każdy budynek potrzebuje jednego pracownika.** Na górnym pasku widać licznik „Wolni: 3”.
- **Wolni ludziki budują.** Idą na plac budowy, stukają młotkami i budynek rośnie na oczach.
- **Nikt się nie wyprowadza.** Niespełniona potrzeba zatrzymuje wzrost domu, ale dom nie spada piętro niżej.
- **Jedna pula pracowników**, bez podziału na typy. To świadomie inaczej niż w Anno, gdzie ten podział psuje czytelność.

## Drogi, magazyn i odległość

Wszystkie towary płyną po drogach przez magazyn, a odległość ma znaczenie. Nie jest to ukryty parametr, bo widać, jak długo idzie tragarz.

- **Budynek działa tylko wtedy, gdy dotyka drogi.** Niepodłączony ma nad sobą dużą ikonę „brak drogi”.
- **Każdy ludzik należy do jednego budynku** i niesie swój towar, który widać w jego rękach.
- **Producenci** (rybak, drwal) odnoszą towar do magazynu. **Przetwórcy** (żarna, serowarnia) sami chodzą do magazynu po surowiec.
- **Tragarze z magazynu** roznoszą towary do domów, a licznik nad domem skacze, na przykład z 3/5 na 4/5.
- **Dalej od magazynu oznacza dłuższe kursy.** W późniejszej fazie gry można postawić drugi magazyn.
- **Bez korków.** Ludziki przechodzą przez siebie.
- **Bezczynność widać.** Ludzik bez surowca stoi przed budynkiem z ikonką tego, czego mu brakuje.
- **Drogi rosną razem z grodem:** najpierw ścieżka, potem szybsza droga z dyli (drewnianych bali), później most.
- **Prędkość gry** x1, x2 i x3 oraz pauza.

## Pory roku i zagrożenia

Rok ma cztery pory roku, każda trwa 3–4 minuty przy prędkości x1. Wszystko, co robi się latem, robi się z myślą o zimie.

| Pora roku | Zmiana zasad | Zagrożenie (po pierwszej wersji) |
| --- | --- | --- |
| Wiosna | Siew prosa | Roztopy zalewają budynki stojące tuż przy rzece |
| Lato | Pola rosną | Burza: piorun podpala chatę (pierwsze zagrożenie do dodania) |
| Jesień | Żniwa, szczyt produkcji | — |
| Zima | Pola nie rodzą, domy zużywają opał (drewno), rybak łowi wolniej | Śnieżyca spowalnia ludzików na drogach |

Zasady dla każdego zagrożenia:

1. **Widać je, zanim nadejdzie.** Nic nie spada znienacka.
2. **Rozwiązaniem jest budynek, nie refleks.** Przykłady: studnia blisko chat, kontyna Peruna na wzgórzu jako „piorunochron”.
3. **Nic nie znika na zawsze.** Spalona chata zamienia się w zgliszcza do odbudowy.

Kolejne zagrożenia (myszy w spichlerzu, wilki przy owcach) dochodzą po jednym, dopiero gdy poprzednie działa dobrze.

## Surowce, koszty i waluta

Propozycja do potwierdzenia: gra bez waluty. Budynki kosztują materiały, a nagrodą za rozwój są nowi mieszkańcy i nowe budynki.

- **Dlaczego:** płacidła są dla 6-latka abstrakcyjne, a złoto nie pasuje do epoki. Za to „chata kosztuje 5 drewna i 3 gliny” Artur zrozumie od razu. Do tego jeden system mniej.
- **Materiały budowlane:** drewno i glina. Kamień dochodzi później.
- **Górny pasek jak w Warcrafcie:** liczby surowców w magazynie.
- **Koszt widać na przycisku budynku**, a przycisk jest szary, gdy brakuje materiałów.
- **Ryzyko:** bez waluty trzeba sprawdzić w testach, czy wyższe piętra dają wystarczającą motywację.

## Sterowanie na iPadzie i tekst

Gra działa w przeglądarce na iPadzie, w poziomie, uruchamiana ikoną z ekranu początkowego jak zwykła aplikacja. Na iPadzie nie ma „najechania myszką”, więc wszystko, co Warcraft pokazywał po najechaniu, tu pojawia się po stuknięciu.

- **Duże przyciski**, wyraźnie większe niż w aplikacjach dla dorosłych, bo palec 6-latka jest mniej precyzyjny.
- **Stuknięcie** wybiera budynek lub ludzika i otwiera panel informacji.
- **Przeciągnięcie palcem** przesuwa mapę, a w trybie dróg rysuje drogę.
- **Tryb dróg jako osobny przycisk**, żeby przesuwanie mapy nie rysowało dróg przez przypadek.
- **Szczypanie** przybliża i oddala.
- **Duży przycisk „cofnij”** dla ostatniej akcji.

Tekst dla Artura:

- W interfejsie są tylko pojedyncze słowa, wyraźną czcionką i zawsze z ikoną. Żadnych zdań.
- Zdania (kronika, samouczek) czyta tata albo nagrany głos.
- Do sprawdzenia z Arturem: podpisy wielkimi literami („DRWAL”) czy zwykłymi („Drwal”), oraz czcionka z dobrze czytelnymi polskimi znakami.

## Zapisy, wersje i Kronika grodu

Każda nowa wersja gry zachowuje coś z wcześniejszych zapisów. W najgorszym razie jest to historia starego grodu.

1. **Pełny zapis gry:** dane z numerem wersji i konwersją przy każdej aktualizacji. Kiedy konwersja przestaje mieć sens (na przykład po przebudowie łańcuchów), działa warstwa druga.
2. **Kronika grodu:** prosty zapis ważnych chwil z rokiem gry i nazwami, na przykład „Roku trzeciego, zimą, gród przetrwał wielki mróz”. Format jest na tyle prosty, że przetrwa każdą wersję.

- **Gdy pełnego zapisu nie da się przenieść,** stary gród staje się kurhanem albo ruinami na nowej mapie, a ludziki są potomkami jego mieszkańców. Kroniki kolejnych grodów składają się w dzieje świata.
- **Artur nadaje nazwy** grodowi i ludzikom, a te nazwy trafiają do kroniki.
- **Przechowywanie:** nie tylko w pamięci przeglądarki, bo Safari potrafi ją wyczyścić. Potrzebny jest trwały zapis i przycisk „zapisz do pliku” jako kopia bezpieczeństwa. Szczegóły techniczne: `CLAUDE.md`.

## Zakres pierwszej wersji

Pierwsza wersja ma być grywalna, a nie kompletna: dwa piętra piramidy, drogi, jeden magazyn, cztery pory roku i bez zagrożeń. Kolejność prac: `docs/ROADMAP.md`.

- Jedna ręcznie zrobiona mapa: rzeka, las, łąka
- Widok z góry na siatce, przesuwanie i przybliżanie palcami
- Ziemianka i chata, osadnicy przychodzący z krawędzi mapy
- Budynki: magazyn, rybak, drwal, glinianka, pole prosa, żarna, studnia
- Drogi (ścieżka), odległość od magazynu, widoczni ludziki z towarami
- Budowanie przez wolnych ludzików
- Cztery pory roku: siew wiosną, żniwa jesienią, zimą opał i wolniejszy rybak
- Podstawowa kronika, zapis z numerem wersji i zapis do pliku
- Prędkość x1, x2, x3 i pauza
- Pierwsza wiosna jako samouczek: ikona pokazuje, co postawić

Pierwszy prototyp powstaje na prostych kształtach rysowanych kodem, żeby nie czekać na grafiki.

## Grafiki i nagrania

- Lista grafik, nazwy plików i opisy do Nano Banana: `docs/ASSETS.md`.
- Lista nagrań głosowych i nazwy plików: `docs/AUDIO.md`.

## Proces pracy

Krótkie wersje co kilka dni. Artur gra i testuje, a jego uwagi trafiają na listę zadań.

1. Ustalamy decyzje i dopisujemy je do tego dokumentu.
2. Powstaje nowa wersja gry z linkiem do otwarcia na iPadzie.
3. Artur gra 15–30 minut. Tata patrzy i notuje, gdzie Artur się zacina, i przez pierwsze minuty nie podpowiada. Szablon notatek: `docs/playtests/SZABLON.md`.
4. Uwagi trafiają na listę zadań w `docs/ROADMAP.md`. Pomysły Artura wchodzą do gry jako jego.
5. Kolejna wersja zachowuje zapisy zgodnie z zasadami z sekcji o zapisach.

## Otwarte pytania i pomysły na potem

- [ ] Gra bez waluty: potwierdzić po pierwszych testach.
- [ ] Podpisy wielkimi czy zwykłymi literami: sprawdzić z Arturem.
- [ ] Nazwa gry i grodu: wymyśla Artur.
- [ ] Czy to, że osadnicy nie przychodzą przy głodzie, nie frustruje: sprawdzić w testach.
- [ ] Śnieg nakładany kodem czy osobne zimowe grafiki: zdecydować po pierwszym teście wyglądu.
- [ ] Koszty budynków, czasy produkcji i proporcje (ile chat wykarmi jeden rybak): pierwsze wartości ustala Claude Code w `src/data/`, potem balansujemy po testach.

Pomysły na potem: legendy (Smok Wawelski, Popiel i myszy), powodzie, śnieżyce, wilki, drugi magazyn, mosty, święto Marzanny, kurhany poprzednich grodów.
