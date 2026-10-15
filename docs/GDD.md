# Gród — dokument projektowy gry dla Artura

Stan na 2026-10-12. Od momentu założenia repozytorium **ten plik jest źródłem prawdy**. Każda zmiana decyzji projektowej trafia tutaj.

Decyzje z M2 (budowanie i pierwsze łańcuchy):

- **Glinianka nie ma osobnego złoża na mapie.** Kopacz gliny pracuje na miejscu, przy samym budynku (jak sugeruje opis grafiki w `ASSETS.md`: „shallow clay pit”). Drwal i rybak nadal szukają najbliższego drzewa/wody.
- **Pula wolnych pracowników przed chatami (M3):** gra startuje z 3 wolnymi ludzikami stojącymi przy magazynie, żeby dało się budować i testować łańcuchy produkcji, zanim pojawią się domy i osadnicy. M3 zastąpi ten sztywny start prawdziwym przyrostem mieszkańców.
- **Koszt budynku jest pobierany z magazynu od razu przy stawianiu placu budowy**, nie stopniowo przy każdym kursie robotnika. Kursy robotnika tylko symulują czas i widoczność transportu.
- **Startowy zapas:** 6 drewna w magazynie, żeby dało się postawić pierwsze 1-2 budynki bez czekania na nic.

Decyzje z M3 (domy i osadnicy):

- **Pula startowa (3 ludziki) zostaje na stałe** jako załoga, która istnieje, zanim powstanie pierwsza ziemianka — inaczej nic nie dałoby się zbudować (ten sam paradoks jajka i kury, o którym mówi GDD). Ziemianka dokłada do puli kolejnych mieszkańców, nie zastępuje startowej załogi.
- **Ziemianka kosztuje 4 drewna**, daje 3 miejsca dla mieszkańców, cel „ryby" to 5.
- **Osadnik = zwykły ludzik z zadaniem „arriving".** Pojawia się od razu na kafelku brzegu mapy (musi być tam droga) i idzie do domu tą samą maszyną stanów co każdy inny ludzik — prościej niż osobny system.
- **Punkt wejścia na mapę:** gra szuka najbliższego (po linii prostej) kafelka brzegu mapy, z którego istnieje droga do domu; jeśli żaden nie jest połączony, osadnik po prostu nie przychodzi. Zachęca to do doprowadzenia drogi do brzegu mapy.
- **Głód:** gród ma głód, gdy jakikolwiek zamieszkały dom ma zero ryb. Blokuje to nowych osadników, ale nie zawraca tych już w drodze.
- **Limit zarezerwowanych zasobów:** przy przydzielaniu tragarza i osadnika liczę też tych już w drodze (nie tylko już dostarczone/zamieszkałe), żeby dom nigdy nie dostał więcej ryb niż potrzebuje ani więcej mieszkańców niż ma miejsc. Bez tego nadmiarowa ryba po prostu znikała z magazynu bez śladu — złapane w testach przed wydaniem.
- **Pierścień celu po stuknięciu.** Drwal/rybak liczy najbliższe drzewo/wodę osobno dla każdego budynku — dwa drwale blisko siebie często celują w RÓŻNE drzewa. Jeśli droga nie sięga do tego konkretnego drzewa, robotnik czeka w nieskończoność, a gracz nie miał jak się dowiedzieć, dokąd. Stuknięcie w budynek albo w zablokowanego robotnika pokazuje teraz żółty pierścień dokładnie na kafelku, do którego próbuje dojść.
- **Zasięg surowca przy stawianiu budynku:** drwal i rybak da się postawić tylko w promieniu 6 kafelków od najbliższego drzewa/wody (od 0.12.0 liczonych pieszo po ziemi). Bez tego dało się postawić drwala daleko od lasu i tak samo nosił drewno — ograniczenie robi z lokalizacji budynku prawdziwą decyzję.
- **Wstrzymanie budynku.** Stuknięcie w budynek produkcyjny pokazuje przycisk WSTRZYMAJ/WZNÓW. Wstrzymanie natychmiast zwalnia przypisanego pracownika (budynek stoi, ale nic nie ginie — zgodnie z zasadą lekkiej kary) i blokuje mu przydzielanie nowych zadań, dopóki gracz nie wznowi. Potrzebne, gdy kolejność budowy sprawia, że zabrakło rąk do pracy na nowy plac budowy — gracz może ręcznie zwolnić kogoś z istniejącego budynku.

Decyzje z M4 (chata i drugi łańcuch):

- **Pole prosa zajmuje 2×2 kafelki** i nie ma osobnej chaty rolnika. Rolnik sieje każdy kafelek osobno, proso rośnie samo (zaorane → kiełki → dojrzałe), rolnik żnie dojrzały kafelek (ścięte) i niesie 1 proso do magazynu. W M4 pole rodzi przez cały rok; siew wiosną i żniwa jesienią dochodzą w M5. Przez pole nie da się poprowadzić drogi ani postawić na nim budynku.
- **Żarna:** mielarz idzie do magazynu po 1 proso, miele je przy żarnach i odnosi 1 kaszę. Gdy w magazynie nie ma prosa, stoi przed żarnami z ikoną w kolorze prosa nad głową. Ikona „czeka” jest teraz zawsze w kolorze brakującego towaru, a czerwona oznacza brak drogi.
- **Studnia nie zajmuje pracownika.** To usługa: działa, gdy stoi i dotyka drogi. Zasięg to kwadrat 7×7 (3 kafelki w każdą stronę), widoczny po stuknięciu w studnię lub w dom, który obsługuje, oraz już przy stawianiu studni.
- **Ziemianka zbiera ryby (5) i kaszę (3).** Kasza to potrzeba następnego piętra, a licznik nad ziemianką pokazuje, czego trzeba, żeby urosła. Znaczek w rogu domu jest niebieski, gdy studnia jest w zasięgu.
- **Awans ziemianka → chata:** gdy ryby i kasza są pełne, studnia jest w zasięgu, a dom dotyka drogi, z magazynu od razu schodzi koszt (3 drewna i 2 gliny, tak jak przy placu budowy). Wolny ludzik przenosi materiały i przebudowuje dom. Chata ma 5 miejsc i dach.
- **Bez zużycia towarów w M4.** Liczniki nad domami nie spadają; zjadanie zapasów przychodzi razem z porami roku (M5). Awans nigdy się nie cofa.
- **Pierwsze liczby (do balansu):** pole 2 drewna, sianie i żniwa po 2 s, wzrost 30 s; żarna 2 drewna i 2 gliny, mielenie 4 s; studnia 1 drewno i 2 gliny.

Decyzje z M5 (pory roku):

- **Pora roku trwa 3 minuty przy x1** (30 „dni” po 6 s). Gra zaczyna się wiosną roku 1. Na pasku: ikona pory roku, nazwa, rok i pasek postępu pory.
- **Pole idzie za kalendarzem:** rolnik sieje tylko wiosną (kiełki), latem rosną łodygi, z początkiem jesieni pole dojrzewa i rolnik zbiera. Cztery widoczne stadia: zaorane → kiełki → łodygi → dojrzałe. Dojrzały kafelek daje 3 proso (jedno na kurs do magazynu, kłosów ubywa w oczach). Niezebrane proso czeka do skutku, także zimą — nic nie przepada.
- **Rolnik pracuje tylko przy siewie i żniwach.** Gdy na polu nie ma nic do zrobienia, wraca do puli wolnych. Pole bez pracy nie blokuje ludzika przez pół roku.
- **Domy jedzą:** zamieszkana ziemianka zjada 1 rybę co 30 s; chata 1 rybę co 30 s i 1 kaszę co 60 s. Kasza w ziemiance służy tylko do wzrostu. Jedno pole (12 prosa rocznie) wykarmia mniej więcej jedną chatę.
- **Opał:** od jesieni tragarze układają przy każdym domu stos drewna do 4, a zimą zamieszkany dom spala 1 drewno co 45 s. Licznik drewna pojawia się nad domem jesienią.
- **Głód i zimno:** dom bez ryb albo (zimą) bez drewna ma nad sobą dymek w kolorze brakującego towaru i wstrzymuje nowych osadników. Nikt się nie wyprowadza, dom nie spada piętro niżej.
- **Rybak zimą łowi 3 razy wolniej** (rzeka zamarza — widać to po kolorze wody).
- **Ostrzeżenie przed zimą:** przez całą jesień, jeśli zapas (magazyn + to, co już leży w domach) nie wystarczy na jedną zimę, na pasku pulsuje czerwony znaczek ze śnieżynką, liczbą dni do zimy i kolorami brakujących towarów.
- **Zegar pór roku** (prośba Grega po teście M5): okrągła tarcza na pasku z czterema kolorowymi ćwiartkami i wskazówką, która obiega ją raz na rok — widać, ile zostało do zimy.
- **Dom czekający na materiał** do przebudowy (ma towary i studnię, ale w magazynie brakuje np. gliny) pokazuje dymek w kolorze tego materiału z białą obwódką. Panel po stuknięciu wymienia brakujący materiał z nazwy.
- **Wygląd pór roku kodem:** wiosną jasna trawa, jesienią żółta trawa i kolorowe liście, zimą śnieg na ziemi, drzewach i dachach, zamarznięta rzeka i padające płatki. Ikony pór roku to na razie emoji, do podmiany na `ui/wiosna.png` itd.

Decyzje z M6 (zapisy i kronika):

- **Autozapis** do IndexedDB na początku każdej pory roku i gdy gra schodzi w tło (przycisk Home, przełączenie aplikacji, zamknięcie karty). Przy starcie gra prosi przeglądarkę o trwałe przechowywanie danych.
- **Zapisy nigdy nie są kasowane.** NOWA gra, wczytanie pliku albo zapis nie do przeniesienia przenoszą dotychczasowy zapis do archiwum w IndexedDB (klucz `archive-…`), a nie usuwają go. NOWA wymaga dwóch stuknięć (drugie na czerwonym „NA PEWNO?”).
- **Zapis z nowszej wersji gry** (np. gdy otworzy się stara wersja z pamięci podręcznej) nie jest ruszany: stara wersja gra wtedy bez zapisywania, a zapis czeka na nową.
- **Zapis nie do przeniesienia** trafia do archiwum, a nowy gród dostaje w kronice wpis o „dawnym grodzie” z jego nazwą (kurhan na mapie przyjdzie później).
- **Format:** `SAVE_VERSION = 2`. Wersja 1 to stan z M5, wersja 2 dodaje nazwę grodu — migracja v1 → v2 powstała celowo, żeby sprawdzić mechanizm. Przykładowe zapisy obu wersji leżą w `tests/fixtures/saves/`, a test wczytuje każdy plik z tego katalogu i gra nim dalej 2000 kroków.
- **Kronika** zapisuje: założenie grodu, nadanie nazwy, pierwszą ziemiankę, pierwszą chatę, pierwsze żniwa, osadników (podsumowanie na koniec każdej pory) i każdą zimę (czy brakło ryb lub opału). Wpisy to dane `{ year, season, kind, params }`, a zdania („Roku pierwszego, zimą, gród przetrwał zimę w cieple i sytości.”) powstają z szablonów w `strings.ts`.
- **Ekran kroniki** otwiera przycisk 📜 KRONIKA nad przyciskiem DROGA. Gra stoi, gdy kronika jest otwarta. Na ekranie: nazwa grodu i rok, pole do nadania nazwy, wpisy od najnowszego oraz przyciski ZAPISZ (plik przez arkusz udostępniania na iPadzie), WCZYTAJ, NOWA i ZAMKNIJ. Zdania w kronice są dla taty — to jedyne miejsce, gdzie gra używa całych zdań.

Decyzje z 0.9.0 (burzenie, prośba Grega 2026-10-14):

- **ZBURZ** jest w panelu po stuknięciu w budynek, plac budowy albo dom. Magazynu nie da się zburzyć. Burzenie wymaga dwóch stuknięć (drugie na czerwonym „NA PEWNO?”), tak jak NOWA w kronice.
- **Pełny zwrot, zgodnie z lekką karą:** koszt budynku wraca do magazynu w całości. Przy domu wraca koszt ziemianki, koszt każdej przebudowy i towary leżące w domu (ryby, kasza, opał). Plac budowy oddaje wszystko, także materiał już przyniesiony na miejsce.
- **Nic nie znika z rąk:** ludzik, który coś niesie, staje się wolny i odnosi to pieszo do magazynu. Ludzik stojący na zburzonym polu najpierw z niego schodzi.
- **Nikt się nie wyprowadza:** mieszkańcy zburzonego domu zostają w grodzie jako wolni ludzie, a osadnicy w drodze do niego dołączają do puli.
- Na razie bez zgliszczy i bez wpisu w kronice. Drogi usuwa GUMKA (od 0.15.1).

Decyzje z M8 (piętro 3: zagroda, 0.10.0):

- **Obora** (4 drewna, 1 glina) działa jak glinianka: krowy stoją w oborze, dojarz doi na miejscu (3 s) i nosi 1 mleko do magazynu. Zimą doi tak samo szybko.
- **Serowarnia** (2 drewna, 3 gliny) działa jak żarna: serowarz bierze z magazynu 1 mleko, robi ser (5 s) i odnosi 1 ser. Bez mleka stoi przed serowarnią z białym dymkiem.
- **Plac wiecowy** (3 drewna, 1 glina) to usługa jak studnia: bez pracownika, działa przy drodze, zasięg 7×7 (3 kafelki w każdą stronę). Na mapie podpis „WIEC”.
- **Chata zbiera ser (3)**, tak jak ziemianka zbiera kaszę: tylko do wzrostu, chata sera nie je. Znaczek w rogu chaty świeci na różowo, gdy plac wiecowy jest w zasięgu (u ziemianki na niebiesko, gdy studnia).
- **Awans chata → zagroda:** ryby, kasza i ser pełne, plac wiecowy w zasięgu, droga; koszt 4 drewna i 3 gliny, przebudowa 5 s. Zagroda ma 8 miejsc, wyższy drewniany dach i płot, na mapie podpis „ZAG”.
- **Zagroda je** 1 rybę co 30 s, 1 kaszę co 60 s i 1 ser co 60 s. Brak sera nie jest głodem (nie wstrzymuje osadników), zatrzymuje tylko dalszy wzrost — tak jak brak kaszy w chacie. Zagroda to na razie najwyższe piętro.
- Kronika zapisuje pierwszą zagrodę. Na pasku dochodzą MLEKO i SER.
- **Zapis:** `SAVE_VERSION = 5`. Kształt stanu się nie zmienił; podbicie chroni zapis przed starą wersją gry z pamięci podręcznej, która nie zna nowych budynków.

Decyzje z 0.11.0 (większa mapa i zima, prośba Grega i Artura 2026-10-15):

- **Mapa 36×26 zamiast 20×14** (ponad 3 razy więcej miejsca), zapisana w `src/data/map.ts` jako rysunek z kropek i znaczków. Stara mapa to jej lewy górny róg, kafelek w kafelek, więc stare grody stoją tam, gdzie stały. Rzeka płynie dalej na południe i skręca na wschód, do prawej krawędzi. Doszły dwa lasy: na drugim brzegu (północny wschód) i brzezina na południu.
- **Bród:** jedno płytkie miejsce na rzece (jasna woda z kamieniami), przez które można poprowadzić drogę. To pierwsza droga na drugi brzeg, zanim przyjdą mosty. Rybak nie łowi w brodzie, a budować na nim nie można.
- **Zimą ludziki chodzą 1,5 raza wolniej** (brną przez śnieg). Zauważył to Artur. Widać przyczynę: śnieg na mapie.
- **Zapis:** `SAVE_VERSION = 6`. Dawna dolna krawędź mapy jest teraz w środku. Jeśli osadnicy mogli wejść do grodu tylko drogą do tej krawędzi, migracja przedłuża tę drogę prosto na południe do nowej krawędzi, przez wolną łąkę.
- Z dłuższą drogą od krawędzi kilku osadników bywa w drodze naraz. Głód nie zawraca tych, którzy już idą (bez zmian).

Decyzje z 0.12.0 (prośba Grega 2026-10-15):

- **Drwal i rybak chodzą na przełaj** między swoim budynkiem a drzewem lub wodą. Droga musi dochodzić tylko do budynku, nie do lasu ani do wody. Z towarem wracają najpierw do budynku, a dalej do magazynu już po drodze (jak wszyscy), więc drogi dalej mają znaczenie.
- **Zasięg 6 kafelków liczy się pieszo po ziemi**, a nie w linii prostej. Drwal na drugim brzegu nie celuje w las za rzeką, tylko w najbliższe drzewo, do którego da się dojść.
- Na przełaj można przejść przez każdy kawałek lądu (także przez pola i budynki), ale nie przez rzekę. Bród liczy się jako ląd.

Poprawki z 0.12.1 (Greg, 2026-10-15):

- **Osadnicy idą do pierwszego domu z wolnym miejscem, do którego prowadzi droga od krawędzi mapy.** Wcześniej gra sprawdzała tylko pierwszy dom z wolnym miejscem, a gdy ten nie miał drogi, nikt nie przychodził do żadnego.
- **Wstrzymany budynek:** cały (także pole 2×2) wyszarzony w ciemne ukośne pasy, z czerwoną ramką i dużym czerwonym kołem z białym znakiem pauzy na górnej krawędzi. Litera budynku zostaje widoczna.
- **Górny pasek zawsze w jednej linijce** (na iPadzie przeskakiwał do drugiej przy dużych liczbach i mapa skakała). Cyfry mają stałą szerokość, a pora roku, LUDZIE i WOLNI są jak surowce: liczba (nazwa pory), pod nią mały podpis (ROK 12). Najgorszy przypadek (ostrzeżenie przed zimą, czterocyfrowe liczby) zajmuje ok. 950 px, mieści się na najmniejszym iPadzie w poziomie (1024 px).
- **Stuknięcie w budynek zawsze pokazuje budynek**, nawet gdy stoi w nim czekający ludzik (a panel mówi, na co czeka). Ludzika pokazuje stuknięcie w drogę lub trawę, na której stoi.

Decyzje z M9 (burza i pożar, 0.13.0, Greg 2026-10-15):

- **Burze przychodzą latem od roku 2, 2–3 na lato**, rozłożone po całej porze. Pierwszy rok jest spokojny.
- **Widać je zawczasu:** ciemna chmura z deszczem nadciąga z zachodniej krawędzi mapy i przez 5 dni (30 s przy x1) wisi nad jednym domem. Na pasku jest znaczek ⚡ z liczbą dni do pioruna: czerwony i pulsujący nad domem bez ochrony, spokojny szary nad domem chronionym przez kontynę (chmura jest wtedy też jaśniejsza).
- **Kontyna Peruna** (4 drewna, 2 gliny, bez pracownika, przy drodze, zasięg 9×9, czyli 4 kafelki w każdą stronę): piorun nad domem w jej zasięgu uderza w kontynę i nic się nie dzieje. W M10 ta sama kontyna będzie usługą dla dworu.
- **Pożar:** piorun bez kontyny podpala dom. Dom płonie 50 s, a żółte kółko nad nim pokazuje, ile czasu zostało. Jeśli w zasięgu jest studnia, do 3 wolnych ludzików biega z wiadrami (niebieski kwadrat w rękach) od studni do domu, a 3 wiadra gaszą ogień. Gaszenie ma pierwszeństwo przed każdą inną pracą, ale biorą się do niego tylko wolni ludzie.
- **Zgliszcza:** bez studni, albo gdy wiadra nie zdążą, dom zamienia się w zgliszcza (czarne belki, żarzące się węgielki, dym). Dom zachowuje piętro, mieszkańcy zostają w grodzie jako pracownicy, a towary leżące w domu czekają na odbudowę. W zgliszczach nikt nie je, nie przychodzą do nich osadnicy ani tragarze. Przebudowa w kolejne piętro, która trwała w chwili pożaru, zostaje odwołana z pełnym zwrotem materiałów.
- **ODBUDUJ** w panelu zgliszczy (koszt na przycisku: 4 drewna, szary, gdy brakuje): koszt schodzi z magazynu od razu, wolny ludzik nosi materiał i odbudowuje dom na tym samym piętrze. ZBURZ na zgliszczach oddaje tylko towary z domu, bo to, co spłonęło, przepadło.
- Burza nad domem, który zburzono albo który już się pali, przechodzi bokiem.
- Kronika zapisuje każdy pożar, każde ugaszenie, każdy piorun w kontynę i każdą odbudowę.
- **Zapis:** `SAVE_VERSION = 7` (w stanie burze, ostatni piorun, a w domach ogień i zgliszcza).

Decyzje z M10 (piętro 4: dwór, 0.14.0):

- **Owczarnia** (4 drewna, 1 glina) działa jak obora: owce stoją w owczarni, pasterz strzyże na miejscu (3 s) i nosi 1 wełnę do magazynu. Na mapie podpis „OWCE” i owieczka w rogu (litera O zderzałaby się z OBORĄ).
- **Tkalnia** (3 drewna, 3 gliny) działa jak serowarnia: tkaczka bierze z magazynu 1 wełnę, tka (6 s) i odnosi 1 ubranie. Bez wełny stoi przed tkalnią z dymkiem w kolorze wełny.
- **Kontyna Peruna** jest usługą dla zagrody, tak jak plac wiecowy dla chaty, w swoim zasięgu 9×9. Znaczek w rogu zagrody świeci na fioletowo, gdy kontyna jest w zasięgu. Ta sama kontyna dalej chroni przed piorunami.
- **Zagroda zbiera ubrania (3)**, tylko do wzrostu, tak jak chata ser.
- **Awans zagroda → dwór:** ryby, kasza, ser i ubrania pełne, kontyna w zasięgu, droga; koszt 5 drewna i 4 gliny, przebudowa 6 s. Dwór ma 12 miejsc, najwyższy ciemny dach z okienkiem, na mapie podpis „DWÓR”.
- **Dwór je** jak zagroda (ryba co 30 s, kasza i ser co 60 s) i zużywa 1 ubranie co 90 s (ubrania zdzierają się wolniej, niż się je). Brak ubrań nie jest głodem. Dwór to najwyższe piętro; dalej jest już tylko kopiec (M11, 0.15.0).
- **Cztery liczniki nad zagrodą i dworem** stoją dwa na dwa (ryby i kasza u góry, ser i ubrania pod spodem), bo w jednym rzędzie nie mieszczą się na kafelku.
- **Górny pasek:** dochodzą WEŁNA i UBRANIA. Żeby wszystko zmieściło się na iPadzie, kafelek towaru pojawia się na pasku dopiero wtedy, gdy gród go ma (w magazynie, w domu, w rękach) albo stoi budynek, który go robi. DREWNO, GLINA i RYBA są zawsze. Raz pokazany kafelek już nie znika. Do tego ciaśniejsze odstępy: pełny pasek z trzycyfrowymi liczbami i ostrzeżeniem przed zimą zajmuje ok. 990 px.
- **Dolny pasek budynków** (13 przycisków) jest szerszy niż iPad, więc do czasu przeprojektowania przesuwa się palcem w bok.
- Kronika zapisuje pierwszy dwór. **Zapis:** `SAVE_VERSION = 8`, kształt stanu bez zmian (podbicie chroni zapis przed starą wersją gry).

Decyzje z M11 (kopiec, 0.15.0, Greg 2026-10-15):

- **Kamień:** na drugim brzegu, na północ od brodu, leży skaliste wzgórze (szare głazy). **Kamieniarz** (3 drewna) chodzi do najbliższego głazu na przełaj, jak drwal do drzewa (zasięg 6 kafelków pieszo), łupie kamień (3 s) i nosi go do magazynu. Na głazach nie da się budować; głazy się nie kończą.
- **Bagno** na południowym zachodzie (ciemne kałuże, trzciny, rdzawe smugi rudy): po bagnie można chodzić, ale nie da się na nim budować ani prowadzić drogi. **Rudnik** (3 drewna) kopie rudę darniową na bagnie (3 s, zasięg 6 pieszo).
- **Dymarka** (2 drewna, 4 gliny) działa jak żarna: ruda → żelazo (6 s). **Kuźnia** (3 drewna, 2 gliny, 2 kamienia) — żelazo → łopaty (6 s). Na mapie podpisy KAM, RUDA, DYM, KUŹ (pierwsze litery zderzały się z innymi budynkami).
- **Kopiec** (3×3): przycisk KOPIEC (złoty) pojawia się na pasku, gdy w grodzie stoi pierwszy dwór. Kopiec jest jeden. Nic nie schodzi z magazynu przy stawianiu: potrzeba 30 drewna, 40 kamienia i 10 łopat, a do 4 wolnych ludzików nosi je po jednej sztuce, gdy magazyn je ma. To najniższy priorytet pracy (po gaszeniu, budowach, przebudowach, budynkach i tragarzach), a gdy w magazynie brakuje materiału, ludzie wracają do puli wolnych, zamiast czekać. Nad kopcem kółka w kolorze brakującego materiału i liczniki 12/30 itd.
- **Kopiec rośnie w 5 warstwach** z gołej ziemi; ostatnia warstwa to gotowy, zielony kopiec z palem i proporcem. ZBURZ działa tylko na niedokończonym kopcu i oddaje wszystko; gotowego nie da się zburzyć.
- **Ekran zwycięstwa** (wybór Grega): gdy ostatni materiał trafi na kopiec, gra staje i pokazuje ⛰️ KOPIEC!, nazwę grodu i rok, pole do nadania kopcowi nazwy (wymyśla Artur, nazwa trafia na mapę i do kroniki), całą kronikę oraz GRAJ DALEJ i NOWA (dwa stuknięcia, stary gród idzie do archiwum). Ekran pokazuje się raz; potem otwiera go przycisk ⛰️ KOPIEC w panelu po stuknięciu w kopiec.
- Kronika zapisuje rozpoczęcie kopca, jego usypanie i każdą nazwę.
- **Górny pasek:** dochodzą KAMIEŃ, RUDA, ŻELAZO i ŁOPATY (w całej grze jest teraz 13 towarów, jak zakładał GDD). Gdy pasek się nie mieści, sam zmniejsza czcionkę i odstępy (dwa stopnie), zamiast łamać się na dwie linijki.
- **Zapis:** `SAVE_VERSION = 9` (w stanie `mound`). Stare grody dostają `mound: null`. Bagno i głazy dorysowano na mapie; jeśli w starym grodzie coś już tam stoi, zostaje na miejscu.

Decyzje z 0.15.1 (burzenie dróg, prośba Grega 2026-10-15):

- **GUMKA** to przycisk obok DROGA (czerwony krzyżyk nad słowem). Gdy jest włączona, przeciągnięcie palcem po mapie usuwa drogę pod palcem, tak jak DROGA ją rysuje. Mapa się wtedy nie przesuwa, a stuknięcie nie otwiera paneli. DROGA, GUMKA i stawianie budynku wyłączają się nawzajem.
- **COFNIJ** cofa ostatnie pociągnięcie palcem, czy to rysowanie, czy gumkę. Usunięta droga wraca, chyba że w międzyczasie coś na jej miejscu postawiono.
- Bez potwierdzenia i bez kosztu: drogi nic nie kosztują, a pomyłkę naprawia COFNIJ.
- **Nikt nie utyka:** ludzik idący po usuniętym kafelku kończy krok i szuka nowej drogi. Ten, który stoi na trawie po usuniętej drodze, idzie przez trawę do najbliższej drogi. Budynek odcięty od drogi pokazuje znak „brak drogi”, tak jak dotąd.

Decyzje z 0.15.2 (droższe wyższe piętra, Greg 2026-10-15: „późniejsze budynki muszą mieć wyraźnie wyższy koszt, bo aktualnie to jest pomijalne”):

Te koszty zastępują liczby podane wyżej przy M4–M11. Pierwsze piętro zostaje tanie, a każde kolejne kosztuje wyraźnie więcej. Od łańcucha kopca budynki wymagają też kamienia.

| Piętro | Budynek / przebudowa | Było | Jest |
| --- | --- | --- | --- |
| 1 | drwal, rybak, glinianka, ziemianka | 3 / 3 / 2 / 4 drewna | bez zmian |
| 2 | pole | 2 drewna | 4 drewna |
| 2 | żarna | 2 drewna, 2 gliny | 5 drewna, 4 gliny |
| 2 | studnia | 1 drewno, 2 gliny | 3 drewna, 4 gliny |
| 2 | ziemianka → chata | 3 drewna, 2 gliny | 5 drewna, 3 gliny |
| 3 | obora | 4 drewna, 1 glina | 10 drewna, 6 gliny |
| 3 | serowarnia | 2 drewna, 3 gliny | 8 drewna, 8 gliny |
| 3 | plac wiecowy | 3 drewna, 1 glina | 8 drewna, 5 gliny |
| 3 | chata → zagroda | 4 drewna, 3 gliny | 10 drewna, 8 gliny |
| 4 | kontyna | 4 drewna, 2 gliny | 12 drewna, 8 gliny |
| 4 | owczarnia | 4 drewna, 1 glina | 14 drewna, 8 gliny |
| 4 | tkalnia | 3 drewna, 3 gliny | 12 drewna, 12 gliny |
| 4 | zagroda → dwór | 5 drewna, 4 gliny | 15 drewna, 12 gliny |
| 5 | kamieniarz, rudnik | 3 drewna | 10 drewna, 4 gliny |
| 5 | dymarka | 2 drewna, 4 gliny | 8 drewna, 10 gliny, 6 kamienia |
| 5 | kuźnia | 3 drewna, 2 gliny, 2 kamienia | 12 drewna, 8 gliny, 10 kamienia |
| 5 | kopiec | 30 drewna, 40 kamienia, 10 łopat | 80 drewna, 100 kamienia, 25 łopat |

- Odbudowa zgliszczy (4 drewna) zostaje tania, bo to kara za pożar, a nie postęp.
- Zasady bez zmian: koszt schodzi z magazynu przy stawianiu, burzenie oddaje wszystko.
- **Do obserwacji:** plac budowy nadal obsługuje jeden budowniczy, który nosi materiał po jednej sztuce. Przy drogich budynkach budowa trwa długo, szczególnie daleko od magazynu (kamieniarz za brodem: kilkanaście minut przy x1).

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
| 4 · uznanie | Dwór | ubrania | kontyna Peruna | owczarnia (wełna) → magazyn → tkalnia | od 0.14.0 |
| 5 · cel gry | Kopiec (nie jest domem) | wspólna budowa: drewno, kamień, łopaty | — | ruda darniowa (bagno) → dymarka → kuźnia (łopaty); kamieniarz przy skałach | od 0.15.0 |

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
- **Każdy budynek potrzebuje jednego pracownika.** Na górnym pasku widać licznik „Wolni: 3”. Obok licznik „LUDZIE” pokazuje wszystkich mieszkańców grodu: startową załogę i osadników, którzy już doszli do domu (idący z tobołkami liczą się dopiero po dojściu).
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
- **Prędkość gry** x1, x2 i x3 oraz pauza. Do testów dochodzą x5, x10, x20 i x60 (prośba Grega, 2026-10-14), żeby szybko przewinąć do zimy.

## Pory roku i zagrożenia

Rok ma cztery pory roku, każda trwa 3–4 minuty przy prędkości x1. Wszystko, co robi się latem, robi się z myślą o zimie.

| Pora roku | Zmiana zasad | Zagrożenie (po pierwszej wersji) |
| --- | --- | --- |
| Wiosna | Siew prosa | Roztopy zalewają budynki stojące tuż przy rzece |
| Lato | Pola rosną | Burza: piorun podpala dom; chroni kontyna Peruna, gasi studnia (od 0.13.0) |
| Jesień | Żniwa, szczyt produkcji | — |
| Zima | Pola nie rodzą, domy zużywają opał (drewno), rybak łowi wolniej, ludziki chodzą wolniej po śniegu | Śnieżyca spowalnia ludzików na drogach |

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

- **Menu nie zasłania mapy** (prośba Grega, 2026-10-14): górny pasek (zegar, surowce, ludzie) i dolne menu (budynki, DROGA, KRONIKA, prędkość, COFNIJ) mają własne, pełne pasy nad i pod mapą. Mapa zajmuje tylko przestrzeń między nimi, a kamera startuje nad magazynem.

Tekst dla Artura:

- W interfejsie są tylko pojedyncze słowa, wyraźną czcionką i zawsze z ikoną. Żadnych zdań.
- Zdania (kronika) czyta tata albo nagrany głos.
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
- ~~Pierwsza wiosna jako samouczek~~: usunięty w 0.8.2 (Greg, 2026-10-14: „ja mu to lepiej wytłumaczę”). Grę tłumaczy tata.


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
