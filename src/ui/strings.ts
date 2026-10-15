import type { ChronicleEntry } from '../sim/chronicle';
import type { Season } from '../data/seasons';

/** Every Polish word shown in the interface lives here, per CLAUDE.md. */
export const STRINGS = {
  droga: 'DROGA',
  cofnij: 'COFNIJ',
  pauza: 'PAUZA',
  wolni: 'WOLNI',
  ludzie: 'LUDZIE',
  rok: 'ROK',
  zima: 'ZIMA',
  pory: {
    wiosna: 'WIOSNA',
    lato: 'LATO',
    jesien: 'JESIEŃ',
    zima: 'ZIMA',
  },
  kronika: 'KRONIKA',
  grod: 'GRÓD',
  nazwa: 'NAZWA',
  nazwij: 'NAZWIJ',
  zapisz: 'ZAPISZ',
  wczytaj: 'WCZYTAJ',
  nowa: 'NOWA',
  naPewno: 'NA PEWNO?',
  zburz: 'ZBURZ',
  odbuduj: 'ODBUDUJ',
  zgliszcza: 'ZGLISZCZA',
  burza: 'BURZA',
  zamknij: 'ZAMKNIJ',
  blad: 'BŁĄD',
  zasoby: {
    drewno: 'DREWNO',
    glina: 'GLINA',
    ryba: 'RYBA',
    proso: 'PROSO',
    kasza: 'KASZA',
    mleko: 'MLEKO',
    ser: 'SER',
    welna: 'WEŁNA',
    ubrania: 'UBRANIA',
  },
} as const;

// ---- Chronicle sentences (read aloud by dad, so full sentences are fine) ----

const YEAR_ORDINAL = [
  'pierwszego',
  'drugiego',
  'trzeciego',
  'czwartego',
  'piątego',
  'szóstego',
  'siódmego',
  'ósmego',
  'dziewiątego',
  'dziesiątego',
  'jedenastego',
  'dwunastego',
];

const SEASON_WHEN: Record<Season, string> = {
  wiosna: 'wiosną',
  lato: 'latem',
  jesien: 'jesienią',
  zima: 'zimą',
};

function settlersPhrase(count: number): string {
  if (count === 1) return 'przybył nowy osadnik';
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `przybyli ${count} osadnicy`;
  return `przybyło ${count} osadników`;
}

function winterPhrase(cold: boolean, hungry: boolean): string {
  if (cold && hungry) return 'gród przetrwał ciężką zimę, choć brakło ryb i opału';
  if (cold) return 'gród przetrwał mroźną zimę, choć brakło opału';
  if (hungry) return 'gród przetrwał zimę, choć brakło ryb';
  return 'gród przetrwał zimę w cieple i sytości';
}

/** The house's tier as the object of a sentence: "podpalił chatę". */
const TIER_ACCUSATIVE = ['ziemiankę', 'chatę', 'zagrodę'];

function tierAccusative(tier: unknown): string {
  return TIER_ACCUSATIVE[Number(tier)] ?? 'dom';
}

function entryBody(entry: ChronicleEntry): string {
  const p = entry.params;
  switch (entry.kind) {
    case 'zalozenie':
      return 'założono gród nad rzeką';
    case 'nazwa':
      return `gród nazwano „${String(p.name)}”`;
    case 'pierwsza-ziemianka':
      return 'stanęła pierwsza ziemianka';
    case 'pierwsza-chata':
      return 'pierwsza ziemianka urosła w chatę';
    case 'pierwsza-zagroda':
      return 'pierwsza chata urosła w zagrodę';
    case 'pierwszy-dwor':
      return 'pierwsza zagroda urosła w dwór';
    case 'pierwsze-zniwa':
      return 'zebrano pierwsze proso';
    case 'osadnicy':
      return settlersPhrase(Number(p.count));
    case 'zima':
      return winterPhrase(Boolean(p.cold), Boolean(p.hungry));
    case 'pozar':
      return `piorun podpalił ${tierAccusative(p.tier)} i zostały po niej zgliszcza`;
    case 'ugaszony':
      return `piorun podpalił ${tierAccusative(p.tier)}, ale ludzie ugasili ogień wodą ze studni`;
    case 'piorun-kontyna':
      return 'piorun uderzył w kontynę Peruna i nikomu nic się nie stało';
    case 'odbudowa':
      return `odbudowano spaloną ${tierAccusative(p.tier)}`;
    case 'dawny-grod':
      return p.name
        ? `pamiętano dawny gród „${String(p.name)}”, którego nie dało się już odbudować`
        : 'pamiętano dawny gród, którego nie dało się już odbudować';
    default:
      return String(entry.kind);
  }
}

/** E.g. "Roku pierwszego, zimą, gród przetrwał zimę w cieple i sytości." */
export function chronicleSentence(entry: ChronicleEntry): string {
  const year = YEAR_ORDINAL[entry.year - 1] ?? `${entry.year}.`;
  return `Roku ${year}, ${SEASON_WHEN[entry.season] ?? entry.season}, ${entryBody(entry)}.`;
}
