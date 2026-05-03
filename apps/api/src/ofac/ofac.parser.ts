import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { OfacEntityName, OfacParsedEntity } from './ofac.types';

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && '#text' in (value as Record<string, unknown>)) {
    return getText((value as Record<string, unknown>)['#text']);
  }
  return null;
}

function getAttr(value: unknown, attr: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return getText(record[`@_${attr}`] ?? record[attr]);
}

function isNonEmptyString(value: string | null): value is string {
  return Boolean(value);
}

function findNestedArrays(obj: unknown, key: string): unknown[] {
  const found: unknown[] = [];

  function visit(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;

    for (const [currentKey, currentValue] of Object.entries(record)) {
      if (currentKey === key) {
        found.push(...asArray(currentValue));
      } else if (typeof currentValue === 'object') {
        visit(currentValue);
      }
    }
  }

  visit(obj);
  return found;
}

@Injectable()
export class OfacParserService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
  });

  parseEntitiesXml(xml: string, fallbackListName?: string): OfacParsedEntity[] {
    const parsed = this.parser.parse(xml);

    if (this.isAdvancedXml(parsed)) {
      return this.parseAdvancedEntities(parsed, fallbackListName);
    }

    const entityNodes = findNestedArrays(parsed, 'entity');

    return entityNodes
      .map((entityNode) => this.mapEntityNode(entityNode, fallbackListName))
      .filter((entity): entity is OfacParsedEntity => Boolean(entity));
  }

  private isAdvancedXml(parsed: unknown): boolean {
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    const root = parsed as Record<string, unknown>;
    return 'Sanctions' in root || findNestedArrays(parsed, 'DistinctParty').length > 0;
  }

  private parseAdvancedEntities(parsed: unknown, fallbackListName?: string): OfacParsedEntity[] {
    const partyNodes = findNestedArrays(parsed, 'DistinctParty');

    return partyNodes
      .map((partyNode) => this.mapAdvancedPartyNode(partyNode, fallbackListName))
      .filter((entity): entity is OfacParsedEntity => Boolean(entity));
  }

  private mapEntityNode(entityNode: unknown, fallbackListName?: string): OfacParsedEntity | null {
    if (!entityNode || typeof entityNode !== 'object') return null;
    const entity = entityNode as Record<string, unknown>;

    const ofacEntityId =
      getAttr(entity, 'id') ??
      getText(entity.id) ??
      getText(entity.uid) ??
      getText(entity.entityId);

    if (!ofacEntityId) return null;

    const listNodes = findNestedArrays(entity, 'sanctionsList');
    const programNodes = findNestedArrays(entity, 'sanctionsProgram');
    const sanctionsTypeNodes = findNestedArrays(entity, 'sanctionsType');
    const legalAuthorityNodes = findNestedArrays(entity, 'legalAuthority');

    const names = this.extractNames(entity);
    const addresses = findNestedArrays(entity, 'address') as Array<Record<string, unknown>>;
    const features = findNestedArrays(entity, 'feature') as Array<Record<string, unknown>>;

    return {
      ofacEntityId,
      identityId: getText((entity.generalInfo as Record<string, unknown> | undefined)?.identityId),
      entityType:
        getText((entity.generalInfo as Record<string, unknown> | undefined)?.entityType) ??
        getText(entity.entityType) ??
        null,
      listName: getText(listNodes[0]) ?? fallbackListName ?? null,
      programs: Array.from(new Set(programNodes.map(getText).filter(isNonEmptyString))),
      sanctionsTypes: Array.from(new Set(sanctionsTypeNodes.map(getText).filter(isNonEmptyString))),
      legalAuthorities: Array.from(new Set(legalAuthorityNodes.map(getText).filter(isNonEmptyString))),
      names,
      addresses,
      features,
      raw: entity,
    };
  }

  private mapAdvancedPartyNode(partyNode: unknown, fallbackListName?: string): OfacParsedEntity | null {
    if (!partyNode || typeof partyNode !== 'object') return null;

    const party = partyNode as Record<string, unknown>;
    const profile = asArray(party.Profile)[0] as Record<string, unknown> | undefined;
    const identity = profile
      ? (asArray(profile.Identity)[0] as Record<string, unknown> | undefined)
      : undefined;

    const ofacEntityId =
      getAttr(profile, 'ID') ??
      getAttr(profile, 'FixedRef') ??
      getAttr(identity, 'ID') ??
      getAttr(identity, 'FixedRef') ??
      getAttr(party, 'FixedRef');

    if (!ofacEntityId) return null;

    const names = this.extractAdvancedNames(identity ?? profile ?? party);
    const primaryName = names.find((name) => name.isPrimary)?.fullName ?? names[0]?.fullName ?? null;

    return {
      ofacEntityId,
      identityId: getAttr(identity, 'ID') ?? null,
      entityType: getAttr(profile, 'PartySubTypeID') ?? null,
      listName: fallbackListName ?? null,
      programs: [],
      sanctionsTypes: [],
      legalAuthorities: [],
      names: primaryName ? names : [],
      addresses: [],
      features: [],
      raw: party,
    };
  }

  private extractNames(entity: Record<string, unknown>): OfacEntityName[] {
    const nameNodes = findNestedArrays(entity, 'name');
    const names: OfacEntityName[] = [];

    for (const nameNode of nameNodes) {
      if (!nameNode || typeof nameNode !== 'object') continue;
      const nameRecord = nameNode as Record<string, unknown>;

      const translationNodes = findNestedArrays(nameRecord, 'translation');
      const isPrimary = getText(nameRecord.isPrimary) === 'true';
      const isLowQuality = getText(nameRecord.isLowQuality) === 'true';
      const aliasType = getText(nameRecord.aliasType);

      for (const translation of translationNodes) {
        if (!translation || typeof translation !== 'object') continue;
        const translationRecord = translation as Record<string, unknown>;

        const fullName =
          getText(translationRecord.formattedFullName) ??
          [
            getText(translationRecord.formattedFirstName),
            getText(translationRecord.formattedMiddleName),
            getText(translationRecord.formattedLastName),
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (!fullName) continue;

        names.push({
          fullName,
          firstName: getText(translationRecord.formattedFirstName),
          middleName: getText(translationRecord.formattedMiddleName),
          lastName: getText(translationRecord.formattedLastName),
          isPrimary,
          isLowQuality,
          aliasType,
        });
      }
    }

    const unique = new Map<string, OfacEntityName>();
    for (const name of names) {
      unique.set(`${name.fullName}:${name.isPrimary}:${name.aliasType ?? ''}`, name);
    }

    return [...unique.values()];
  }

  private extractAdvancedNames(node: Record<string, unknown>): OfacEntityName[] {
    const aliasNodes = findNestedArrays(node, 'Alias');
    const names: OfacEntityName[] = [];

    for (const aliasNode of aliasNodes) {
      if (!aliasNode || typeof aliasNode !== 'object') continue;
      const aliasRecord = aliasNode as Record<string, unknown>;

      const documentedNames = findNestedArrays(aliasRecord, 'DocumentedName');
      const isPrimary = getAttr(aliasRecord, 'Primary') === 'true';
      const isLowQuality = getAttr(aliasRecord, 'LowQuality') === 'true';
      const aliasType = getAttr(aliasRecord, 'AliasTypeID');

      for (const documentedName of documentedNames) {
        if (!documentedName || typeof documentedName !== 'object') continue;
        const parts = findNestedArrays(documentedName, 'NamePartValue')
          .map(getText)
          .filter(isNonEmptyString);

        const fullName = parts.join(' ').trim();
        if (!fullName) continue;

        names.push({
          fullName,
          isPrimary,
          isLowQuality,
          aliasType,
        });
      }
    }

    const unique = new Map<string, OfacEntityName>();
    for (const name of names) {
      unique.set(`${name.fullName}:${name.isPrimary}:${name.aliasType ?? ''}`, name);
    }

    return [...unique.values()];
  }
}