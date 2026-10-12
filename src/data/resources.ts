export type ResourceType = 'drewno' | 'glina' | 'ryba';

export const RESOURCE_COLOR: Record<ResourceType, number> = {
  drewno: 0x8a5a2b,
  glina: 0xb5513f,
  ryba: 0x5f8fae,
};

export type ResourceAmounts = Partial<Record<ResourceType, number>>;
