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
    const entityNodes = findNestedArrays(parsed, 'entity');

    return entityNodes
      .map((entityNode) => this.mapEntityNode(entityNode, fallbackListName))
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
      programs: Array.from(new Set(programNodes.map(getText).filter(Boolean) as string[])),
      sanctionsTypes: Array.from(new Set(sanctionsTypeNodes.map(getText).filter(Boolean) as string[])),
      legalAuthorities: Array.from(new Set(legalAuthorityNodes.map(getText).filter(Boolean) as string[])),
      names,
      addresses,
      features,
      raw: entity,
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
}
