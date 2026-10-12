# Grafiki do Nano Banana

Na pierwszą wersję potrzeba 42 grafik. Gra działa bez nich na zastępnikach, więc możesz je dorabiać stopniowo, w dowolnej kolejności.

## Jak generować

1. **Prompt = opis stylu + opis obiektu.** Opis stylu wklejasz zawsze ten sam, opis obiektu bierzesz z tabeli.
2. **Pierwszą udaną grafikę z kategorii dawaj jako obraz referencyjny** do kolejnych z dopiskiem `Match the style of the reference image exactly.` Bez tego każda wyjdzie w innym stylu.
3. **Jeden obiekt na obrazek.** Kwadratowy format, obiekt zajmuje mniej więcej 80% kadru.
4. **Zapisujesz jako PNG** w `assets/raw/sprites/<kategoria>/` dokładnie pod nazwą z tabeli. Rozmiar nie ma znaczenia, skrypt przeskaluje.
5. **Tło magenta zostaw.** Skrypt je wytnie. Jeśli Nano Banana doda cień albo podłoże na tle, wygeneruj jeszcze raz.

## Opis stylu: budynki, teren, ludziki, towary

```
Game sprite for a 1990s-style strategy game like Warcraft 2. Top-down three-quarter view. Early medieval Slavic village, 8th century. Hand-painted pixel-art look, warm natural colours, light from the top-left, clear readable silhouette, friendly and suitable for a young child. Single object, centered, no text, on a plain flat magenta background (#FF00FF), no ground shadow on the background.
```

## Opis stylu: ikony interfejsu

```
Game UI icon for a children's strategy game. Bold simple shapes, thick dark outline, flat warm colours, readable at very small size, no text, no letters, no numbers. Single icon, centered, on a plain flat magenta background (#FF00FF).
```

## Teren · `assets/raw/sprites/teren/`

Kafelki trawy, wody i brzegu muszą łączyć się bez szwów, a modele graficzne rzadko to potrafią. Jeśli nie wyjdą, zostajemy przy terenie rysowanym kodem i nic się nie dzieje.

| Plik | Opis obiektu (doklej do opisu stylu) |
| --- | --- |
| `trawa.png` | Seamless square ground tile of short meadow grass, viewed straight from above, tileable on all sides. |
| `woda.png` | Seamless square tile of calm river water, viewed straight from above, tileable on all sides. |
| `brzeg.png` | Square tile of a river bank: grass on the left half, sandy edge, water on the right half. |
| `drzewo-sosna.png` | A single tall pine tree. |
| `drzewo-brzoza.png` | A single birch tree with white bark. |
| `drzewo-dab.png` | A single wide old oak tree. |
| `pole-1-zaorane.png` | A small square patch of freshly ploughed brown soil with furrows. |
| `pole-2-kielki.png` | The same square patch of soil with rows of small green millet sprouts. |
| `pole-3-dojrzale.png` | The same square patch full of ripe golden millet. |
| `pole-4-sciete.png` | The same square patch after harvest: short stubble and a few small sheaves. |

## Budynki · `assets/raw/sprites/budynki/`

| Plik | Opis obiektu |
| --- | --- |
| `ziemianka.png` | A small early-medieval Slavic pit-house: a dugout sunk into the ground with a low thatched roof reaching the ground and a small wooden door. |
| `chata.png` | A small log cabin with a steep thatched roof, a wooden door and a little smoke from a hole in the roof. |
| `magazyn.png` | A large wooden log storehouse on short stilts, thatched roof, open door, barrels and sacks in front. |
| `chata-rybaka.png` | A small log hut by the water with a short wooden pier and fishing nets drying on poles. |
| `chata-drwala.png` | A small log hut with a chopping block, an axe stuck in it and a neat pile of logs beside. |
| `glinianka.png` | A shallow clay pit with reddish clay, a simple wooden frame, wicker baskets and a wooden spade. |
| `zarna.png` | A rotary stone hand quern (two round millstones) under a small open wooden shed with a thatched roof. |
| `studnia.png` | A wooden well with a log frame and a long well sweep (a pole on a forked post) with a bucket. |
| `plac-budowy.png` | A construction site: a wooden frame of a small hut, stacked logs, a ladder and a few tools. |
| `zgliszcza.png` | Burned ruins of a small hut: charred black beams, ash and a few wisps of smoke, not scary. |

## Ludziki · `assets/raw/sprites/ludziki/`

Jeden obrazek na postać. Animację robi kod. Wszystkie postacie mają patrzeć w prawo, żeby kod mógł je odbijać.

Do każdego opisu doklej: `Full-body small character standing, facing right, early medieval Slavic clothing (linen tunic, belt, leg wraps), friendly face.`

| Plik | Opis obiektu |
| --- | --- |
| `osadnik.png` | A settler carrying a big cloth bundle on the back and a walking stick. |
| `tragarz.png` | A porter carrying an empty wicker basket on the back. |
| `rybak.png` | A fisherman holding a fishing net over the shoulder. |
| `drwal.png` | A woodcutter holding an axe. |
| `kopacz-gliny.png` | A clay digger holding a wooden spade. |
| `rolnik.png` | A farmer holding a sickle. |
| `mielacy.png` | A woman miller with a small sack of grain under her arm. |
| `budowniczy.png` | A builder holding a wooden mallet. |

## Towary · `assets/raw/sprites/towary/`

Te same grafiki służą jako ikony na pasku i jako to, co ludziki niosą w rękach.

| Plik | Opis obiektu |
| --- | --- |
| `ryba.png` | One fresh fish. |
| `drewno.png` | A small bundle of three logs tied with rope. |
| `glina.png` | A lump of reddish clay in a small wicker basket. |
| `snop-prosa.png` | A sheaf of golden millet tied in the middle. |
| `kasza.png` | A small clay pot full of millet porridge. |

## Ikony interfejsu · `assets/raw/sprites/ui/`

Te ikony używają opisu stylu dla ikon interfejsu.

| Plik | Opis obiektu |
| --- | --- |
| `dymek-potrzeby.png` | An empty rounded speech bubble with a small tail at the bottom. |
| `brak-drogi.png` | A short dirt path crossed out with a big red X. |
| `wolni.png` | Three small simple people standing together. |
| `wiosna.png` | A green sprout with two leaves. |
| `lato.png` | A bright smiling sun. |
| `jesien.png` | An orange falling leaf. |
| `zima.png` | A white snowflake. |
| `cofnij.png` | A thick curved arrow pointing back to the left. |
| `tryb-drog.png` | A short winding dirt path seen from above. |

## Później, przy kolejnych piętrach

Budynki: obora, serowarnia, owczarnia, tkalnia, plac wiecowy, kontyna Peruna, bagno z rudą, dymarka, kuźnia, kopiec, kurhan. Zwierzęta: krowa, owca. Towary: mleko, ser, wełna, ubrania, ruda, żelazo, łopata, kamień. Ludziki: pasterz, serowar, tkaczka, hutnik, kowal. Opisy dopiszemy, gdy przyjdzie pora.
