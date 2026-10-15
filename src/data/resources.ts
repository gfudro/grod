export type ResourceType = 'drewno' | 'glina' | 'ryba' | 'proso' | 'kasza' | 'mleko' | 'ser' | 'welna' | 'ubrania' | 'kamien' | 'ruda' | 'zelazo' | 'lopaty';

export const RESOURCE_COLOR: Record<ResourceType, number> = {
  drewno: 0x8a5a2b,
  glina: 0xb5513f,
  ryba: 0x7fb6dc,
  proso: 0xe0b84a,
  kasza: 0xf0e2b6,
  mleko: 0xffffff,
  ser: 0xf5a623,
  welna: 0xcfc3ad,
  ubrania: 0x9b59b6,
  kamien: 0x9aa0a6,
  ruda: 0x6b2f1f,
  zelazo: 0x4a5560,
  lopaty: 0x3fa0a0,
};

/** Order of the resource chips on the top bar. */
export const RESOURCE_ORDER: ResourceType[] = ['drewno', 'glina', 'ryba', 'proso', 'kasza', 'mleko', 'ser', 'welna', 'ubrania', 'kamien', 'ruda', 'zelazo', 'lopaty'];

export type ResourceAmounts = Partial<Record<ResourceType, number>>;
