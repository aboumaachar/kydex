export interface OfacEntityName {
  fullName: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  isPrimary: boolean;
  isLowQuality?: boolean;
  aliasType?: string | null;
}

export interface OfacParsedEntity {
  ofacEntityId: string;
  identityId?: string | null;
  entityType?: string | null;
  listName?: string | null;
  programs: string[];
  sanctionsTypes: string[];
  legalAuthorities: string[];
  names: OfacEntityName[];
  addresses: Array<Record<string, unknown>>;
  features: Array<Record<string, unknown>>;
  raw: unknown;
}
