import { DataSourceType, MatchClassification, RiskLevel } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSourcesService } from '../src/data-sources/data-sources.service';
import { MatchingService } from '../src/matching/matching.service';
import { MatchDecisionService } from '../src/scoring/match-decision.service';
import { ScoringService } from '../src/scoring/scoring.service';
import { ScreeningService } from '../src/screening/screening.service';

type Store = {
  dataSources: Array<{
    id: string;
    code: string;
    name: string;
    type: DataSourceType;
    country: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  versions: Array<{
    id: string;
    dataSourceId: string;
    versionLabel: string;
    fileHash: string | null;
    importedAt: Date;
    importedBy: string | null;
    recordCount: number;
    status: string;
  }>;
  records: Array<{
    id: string;
    dataSourceId: string;
    versionId: string;
    entityType: string;
    primaryName: string;
    normalizedName: string;
    aliases: string[];
    normalizedAliases?: string[];
    arabicNormalizedAliases?: string[];
    arabicNormalizedName?: string | null;
    latinTransliteratedName?: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    country: string | null;
    documentNumbers: string[];
    rawPayload: unknown;
  }>;
  ingestionReports: Array<{
    id: string;
    dataSourceId: string;
    versionId: string;
    sourceCode: string;
    totalRows: number;
    insertedRecords: number;
    rejectedRows: number;
    duplicateRows: number;
  }>;
  screeningQueries: Array<{
    id: string;
    createdAt: Date;
    tenantId: string;
  }>;
};

function createInMemoryPrisma() {
  const store: Store = {
    dataSources: [],
    versions: [],
    records: [],
    ingestionReports: [],
    screeningQueries: [],
  };

  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${++seq}`;

  const prisma = {
    dataSource: {
      upsert: jest.fn(async (args: any) => {
        const existing = store.dataSources.find((item) => item.code === args.where.code);
        if (existing) {
          existing.name = args.update.name;
          existing.type = args.update.type;
          existing.country = args.update.country ?? null;
          existing.updatedAt = new Date();
          return existing;
        }

        const created = {
          id: nextId('ds'),
          code: args.create.code,
          name: args.create.name,
          type: args.create.type,
          country: args.create.country ?? null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.dataSources.push(created);
        return created;
      }),
      create: jest.fn(async (args: any) => {
        const created = {
          id: nextId('ds'),
          code: args.data.code,
          name: args.data.name,
          type: args.data.type,
          country: args.data.country ?? null,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.dataSources.push(created);
        return created;
      }),
      findMany: jest.fn(async (args: any) => {
        let rows = [...store.dataSources];
        if (args?.where?.status) {
          rows = rows.filter((row) => row.status === args.where.status);
        }

        if (args?.where?.versions?.some) {
          rows = rows.filter((source) =>
            store.versions.some(
              (version) =>
                version.dataSourceId === source.id &&
                version.status === 'IMPORTED' &&
                version.recordCount > 0,
            ),
          );
        }

        if (args?.select?.code) {
          return rows.map((row) => ({ code: row.code }));
        }

        if (args?.include?.versions) {
          return rows.map((row) => ({
            ...row,
            versions: store.versions
              .filter((version) => version.dataSourceId === row.id)
              .sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime()),
          }));
        }

        return rows;
      }),
      findUnique: jest.fn(async (args: any) => {
        const source = store.dataSources.find((item) => item.code === args.where.code);
        if (!source) {
          return null;
        }

        if (args?.include?.versions) {
          const versionWhere = args.include.versions.where ?? {};
          const versions = store.versions
            .filter((version) => version.dataSourceId === source.id)
            .filter((version) => !versionWhere.status || version.status === versionWhere.status)
            .filter(
              (version) =>
                !versionWhere.recordCount?.gt || version.recordCount > versionWhere.recordCount.gt,
            )
            .sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime())
            .slice(0, args.include.versions.take ?? 1);

          return {
            ...source,
            versions,
          };
        }

        return source;
      }),
    },
    dataSourceVersion: {
      create: jest.fn(async (args: any) => {
        const created = {
          id: nextId('ver'),
          dataSourceId: args.data.dataSourceId,
          versionLabel: args.data.versionLabel,
          fileHash: args.data.fileHash ?? null,
          importedAt: new Date(),
          importedBy: args.data.importedBy ?? null,
          recordCount: args.data.recordCount,
          status: args.data.status,
        };
        store.versions.push(created);
        return created;
      }),
      count: jest.fn(async (args: any) => {
        return store.versions.filter(
          (item) =>
            item.dataSourceId === args.where.dataSourceId &&
            item.status === args.where.status,
        ).length;
      }),
      findMany: jest.fn(async (args: any) => {
        return store.versions.filter((item) => item.dataSourceId === args.where.dataSourceId);
      }),
      findFirst: jest.fn(async (args: any) => {
        return (
          store.versions
            .filter((item) => item.dataSourceId === args.where.dataSourceId)
            .filter((item) => !args.where.status || item.status === args.where.status)
            .filter((item) => !args.where.recordCount?.gt || item.recordCount > args.where.recordCount.gt)
            .sort((a, b) => b.importedAt.getTime() - a.importedAt.getTime())[0] ?? null
        );
      }),
    },
    watchlistRecord: {
      createMany: jest.fn(async (args: any) => {
        for (const row of args.data) {
          store.records.push({
            id: nextId('rec'),
            dataSourceId: row.dataSourceId,
            versionId: row.versionId,
            entityType: row.entityType,
            primaryName: row.primaryName,
            normalizedName: row.normalizedName,
            aliases: row.aliases ?? [],
            dateOfBirth: row.dateOfBirth ?? null,
            nationality: row.nationality ?? null,
            country: row.country ?? null,
            documentNumbers: row.documentNumbers ?? [],
            rawPayload: row.rawPayload,
          });
        }
        return { count: args.data.length };
      }),
      findMany: jest.fn(async (args: any) => {
        const versionIds = args.where.versionId.in as string[];
        return store.records
          .filter((row) => versionIds.includes(row.versionId))
          .map((row) => {
            const source = store.dataSources.find((entry) => entry.id === row.dataSourceId);
            const version = store.versions.find((entry) => entry.id === row.versionId);
            return {
              ...row,
              dataSource: source,
              version,
            };
          });
      }),
    },
    ingestionRunReport: {
      create: jest.fn(async (args: any) => {
        const created = {
          id: nextId('ing'),
          dataSourceId: args.data.dataSourceId,
          versionId: args.data.versionId,
          sourceCode: args.data.sourceCode,
          totalRows: args.data.totalRows,
          insertedRecords: args.data.insertedRecords,
          rejectedRows: args.data.rejectedRows,
          duplicateRows: args.data.duplicateRows,
        };
        store.ingestionReports.push(created);
        return created;
      }),
      findMany: jest.fn(async (args: any) => {
        return store.ingestionReports.filter((item) => item.dataSourceId === args.where.dataSourceId);
      }),
    },
    screeningQuery: {
      create: jest.fn(async (args: any) => {
        const created = {
          id: nextId('qry'),
          createdAt: new Date(),
          tenantId: args.data.tenantId,
        };
        store.screeningQueries.push(created);
        return created;
      }),
      findUnique: jest.fn(async () => null),
    },
    screeningMatch: {
      createMany: jest.fn(async () => ({ count: 1 })),
    },
    complianceCase: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async (args: any) => ({
        id: nextId('case'),
        status: args.data.status,
      })),
    },
    auditLog: {
      findMany: jest.fn(async () => []),
    },
  };

  return { prisma, store };
}

describe('Architecture local screening enforcement (e2e)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('OFAC_SDN sync inserts records', async () => {
    const { prisma } = createInMemoryPrisma();
    const auditLogsService = { log: jest.fn(async () => ({ id: 'a1' })) };
    const service = new DataSourcesService(prisma as never, auditLogsService as never);

    globalThis.fetch = jest.fn(async (url: any) => {
      if (String(url).includes('sdn.csv')) {
        const sdnCsv = 'uid,name,type,nationality,a,b,c,d,e,f,g,alias\n1,Mohammed Ali,Individual,LB,,,,,,,,Ali Mohammed';
        return new Response(sdnCsv, { status: 200, headers: { 'content-type': 'text/csv' } });
      }

      return new Response('fallback', { status: 404 });
    }) as typeof fetch;

    const result = await service.syncOfficialSources(['OFAC_SDN'], 'ten_1', 'usr_1');
    expect(result.results[0].ingestionResult.insertedRecords).toBeGreaterThan(0);
  });

  it('OFAC_CONSOLIDATED sync inserts records', async () => {
    const { prisma } = createInMemoryPrisma();
    const auditLogsService = { log: jest.fn(async () => ({ id: 'a1' })) };
    const service = new DataSourcesService(prisma as never, auditLogsService as never);

    globalThis.fetch = jest.fn(async (url: any) => {
      if (String(url).toLowerCase().includes('consolidated.xml')) {
        const xml = '<sdnList><sdnEntry><uid>10</uid><lastName>TEST ENTITY</lastName><sdnType>Entity</sdnType><programList><program>NS-CMIC</program></programList><idList><id><idNumber>DOC-10</idNumber></id></idList></sdnEntry></sdnList>';
        return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml' } });
      }

      return new Response('fallback', { status: 404 });
    }) as typeof fetch;

    const result = await service.syncOfficialSources(['OFAC_CONSOLIDATED'], 'ten_1', 'usr_1');
    expect(result.results[0].ingestionResult.insertedRecords).toBeGreaterThan(0);
  });

  it('UNSEC_CONSOLIDATED sync inserts records', async () => {
    const { prisma } = createInMemoryPrisma();
    const auditLogsService = { log: jest.fn(async () => ({ id: 'a1' })) };
    const service = new DataSourcesService(prisma as never, auditLogsService as never);

    globalThis.fetch = jest.fn(async (url: any) => {
      if (String(url).includes('scsanctions.un.org')) {
        const xml = '<CONSOLIDATED_LIST><INDIVIDUAL><FIRST_NAME>Mohammed</FIRST_NAME><SECOND_NAME>Ali</SECOND_NAME><NATIONALITY>LB</NATIONALITY><NUMBER>123456</NUMBER></INDIVIDUAL></CONSOLIDATED_LIST>';
        return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml' } });
      }

      return new Response('fallback', { status: 404 });
    }) as typeof fetch;

    const result = await service.syncOfficialSources(['UNSEC_CONSOLIDATED'], 'ten_1', 'usr_1');
    expect(result.results[0].ingestionResult.insertedRecords).toBeGreaterThan(0);
  });

  it('OFAC-only screening uses local version', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);
    const service = createScreeningService(prisma);

    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammed Ali',
      documentNumber: '123456',
      sources: ['OFAC'],
    });

    expect(response.searchedSources).toEqual(['OFAC_SDN']);
    expect(response.usedLocalVersions).toHaveLength(1);
  });

  it('UNSEC-only screening uses local version', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['UNSEC_CONSOLIDATED']);
    const service = createScreeningService(prisma);

    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammed Ali',
      documentNumber: '123456',
      sources: ['UNSEC'],
    });

    expect(response.searchedSources).toEqual(['UNSEC_CONSOLIDATED']);
    expect(response.usedLocalVersions).toHaveLength(1);
  });

  it('selected-source screening uses local versions', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN', 'UNSEC_CONSOLIDATED']);
    const service = createScreeningService(prisma);

    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammed Ali',
      documentNumber: '123456',
      sources: ['OFAC_SDN', 'UNSEC_CONSOLIDATED'],
    });

    expect(response.searchedSources).toEqual(['OFAC_SDN', 'UNSEC_CONSOLIDATED']);
    expect(response.usedLocalVersions).toHaveLength(2);
  });

  it('omitted sources = all imported sources', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN', 'OFAC_CONSOLIDATED', 'UNSEC_CONSOLIDATED']);
    const service = createScreeningService(prisma);

    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammed Ali',
      documentNumber: '123456',
    });

    expect([...response.searchedSources].sort((left, right) => left.localeCompare(right))).toEqual([
      'OFAC_CONSOLIDATED',
      'OFAC_SDN',
      'UNSEC_CONSOLIDATED',
    ]);
    expect(response.usedLocalVersions).toHaveLength(3);
  });

  it('unknown source rejected', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);
    const service = createScreeningService(prisma);

    await expect(
      service.screen('ten_1', 'usr_1', {
        fullName: 'Mohammed Ali',
        sources: ['UNKNOWN_SOURCE'],
      }),
    ).rejects.toThrow('Unknown source');
  });

  it('missing active version rejected', async () => {
    const { prisma, store } = createInMemoryPrisma();
    store.dataSources.push({
      id: 'ds_only',
      code: 'OFAC_SDN',
      name: 'OFAC SDN',
      type: DataSourceType.OFAC,
      country: 'US',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = createScreeningService(prisma);

    await expect(
      service.screen('ten_1', 'usr_1', {
        fullName: 'Mohammed Ali',
        sources: ['OFAC_SDN'],
      }),
    ).rejects.toThrow('No active version for source');
  });

  it('screening does not call global.fetch', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);
    const service = createScreeningService(prisma);

    const fetchSpy = jest.spyOn(global, 'fetch');

    await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammed Ali',
      documentNumber: '123456',
      sources: ['OFAC_SDN'],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('TRUE_MATCH creates a CRITICAL case routed to internal escalation', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);
    store.records[0]!.documentNumbers = ['123456'];

    const service = createDecisionAwareScreeningService(prisma);
    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammed Ali',
      documentNumber: '123456',
      sources: ['OFAC_SDN'],
    });

    expect(response.decision).toBe('TRUE_MATCH');
    expect(response.riskLevel).toBe(RiskLevel.CRITICAL);
    expect(response.caseStatus).toBe('ESCALATED_INTERNALLY');
    expect(response.caseId).toBeTruthy();
  });

  it('POSSIBLE_MATCH creates a HIGH case routed to review', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);

    const service = createDecisionAwareScreeningService(prisma);
    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammed Ali',
      sources: ['OFAC_SDN'],
    });

    expect(response.decision).toBe('POSSIBLE_MATCH');
    expect(response.riskLevel).toBe(RiskLevel.HIGH);
    expect(response.caseStatus).toBe('NEEDS_REVIEW');
    expect(response.caseId).toBeTruthy();
  });

  it('screening does not call syncOfficialSources', async () => {
    const screeningServicePath = resolve(process.cwd(), 'src', 'screening', 'screening.service.ts');
    const content = readFileSync(screeningServicePath, 'utf-8');
    expect(content).not.toMatch(/syncOfficialSources\s*\(/);
  });

  it('single-token Ahmad suppresses entity alias-only matches without primary-name support', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);

    store.records.push(
      {
        id: 'rec_ahmed_primary',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'PERSON',
        primaryName: 'DIRIYE, Ahmed',
        normalizedName: 'diriye ahmad',
        aliases: [],
        normalizedAliases: [],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
      {
        id: 'rec_alias_match',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'ENTITY',
        primaryName: 'Some Entity',
        normalizedName: 'some entity',
        aliases: ['Ahmad.'],
        normalizedAliases: ['ahmad'],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
      {
        id: 'rec_irrelevant_company',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'ENTITY',
        primaryName: 'ENTERPRISE COMERCIO DE MOVEIS E INTERMEDIACAO DE NEGOCIOS EIRELI',
        normalizedName: 'enterprise comercio de moveis e intermediacao de negocios eireli',
        aliases: ['Global Furniture Holdings'],
        normalizedAliases: ['global furniture holdings'],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
    );

    const service = createDecisionAwareScreeningService(prisma);
    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Ahmad',
      sources: ['OFAC_SDN'],
    });

    expect(response.matches.map((match) => match.matchedName)).toContain('DIRIYE, Ahmed');
    expect(response.matches.map((match) => match.matchedName)).not.toContain('Some Entity');
    expect(response.matches.map((match) => match.matchedName)).not.toContain(
      'ENTERPRISE COMERCIO DE MOVEIS E INTERMEDIACAO DE NEGOCIOS EIRELI',
    );
    expect(response.matches.every((match) => Boolean((match as any).matchedField && (match as any).matchEvidence))).toBe(true);
    expect(response.matches.every((match) => Boolean((match as any).matchedToken))).toBe(true);
    expect(response.matches.every((match) => typeof (match as any).sourceVersion === 'string')).toBe(true);
    expect(response.matches.every((match) => typeof (match as any).simplifiedArabicReason === 'string')).toBe(true);
  });

  it('Arabic Ahmad query still returns explainable Ahmad-family matches only', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);

    store.records.push(
      {
        id: 'rec_ahmad_arabic',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'PERSON',
        primaryName: 'أحمد ديرية',
        normalizedName: 'ahmad diriya',
        aliases: ['Ahmed Diriye'],
        normalizedAliases: ['ahmad diriye'],
        arabicNormalizedAliases: ['احمد ديريه'],
        arabicNormalizedName: 'احمد ديريه',
        latinTransliteratedName: 'ahmad diriya',
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
      {
        id: 'rec_irrelevant_company_2',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'ENTITY',
        primaryName: 'AFKAR SYSTEM YAZD COMPANY',
        normalizedName: 'afkar system yazd company',
        aliases: ['Industrial Systems'],
        normalizedAliases: ['industrial systems'],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
    );

    const service = createDecisionAwareScreeningService(prisma);
    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'أحمد',
      sources: ['OFAC_SDN'],
    });

    expect(response.matches.map((match) => match.matchedName)).toContain('أحمد ديرية');
    expect(response.matches.map((match) => match.matchedName)).not.toContain('AFKAR SYSTEM YAZD COMPANY');
    expect(response.matches.every((match) => Boolean((match as any).matchedToken))).toBe(true);
    expect(response.matches.every((match) => Boolean((match as any).simplifiedArabicReason))).toBe(true);
  });

  it('single-token Hassan only returns explainable Hassan-family candidates and exposes alias evidence', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);

    store.records.push(
      {
        id: 'rec_hassan_primary',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'PERSON',
        primaryName: 'HASSAN DARWISH',
        normalizedName: 'hassan darwish',
        aliases: [],
        normalizedAliases: [],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
      {
        id: 'rec_hassan_alias',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'PERSON',
        primaryName: 'Ali Kareem',
        normalizedName: 'ali kareem',
        aliases: ['Hasan Kareem'],
        normalizedAliases: ['hassan kareem'],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
      {
        id: 'rec_irrelevant_sias',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'ENTITY',
        primaryName: 'SIAS INVESTMENT PVT LTD',
        normalizedName: 'sias investment pvt ltd',
        aliases: ['Global Capital'],
        normalizedAliases: ['global capital'],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: null,
        nationality: null,
        country: null,
        documentNumbers: [],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
    );

    const service = createDecisionAwareScreeningService(prisma);
    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Hassan',
      sources: ['OFAC_SDN'],
    });

    expect(response.matches.map((match) => match.matchedName)).toContain('HASSAN DARWISH');
    expect(response.matches.map((match) => match.matchedName)).toContain('Ali Kareem');
    expect(response.matches.map((match) => match.matchedName)).not.toContain('SIAS INVESTMENT PVT LTD');

    const aliasMatch = response.matches.find((match) => match.matchedName === 'Ali Kareem') as any;
    expect(aliasMatch.matchedField).toBe('alias');
    expect(aliasMatch.matchedAlias).toBe('Hasan Kareem');
    expect(aliasMatch.matchedAliasScore).toBeGreaterThan(0);
    expect(aliasMatch.matchedToken).toBe('hassan');
  });

  it('multi-token Mohammad Ali excludes unrelated companies without visible evidence', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);

    store.records.push({
      id: 'rec_irrelevant_code_partnership',
      dataSourceId: 'seed_ds_0',
      versionId: 'seed_ver_0',
      entityType: 'ENTITY',
      primaryName: 'CODE A PARTNERSHIP',
      normalizedName: 'code a partnership',
      aliases: ['Strategic Ventures'],
      normalizedAliases: ['strategic ventures'],
      arabicNormalizedAliases: [],
      arabicNormalizedName: null,
      latinTransliteratedName: null,
      dateOfBirth: null,
      nationality: null,
      country: null,
      documentNumbers: [],
      rawPayload: { sourceCode: 'OFAC_SDN' },
    });

    const service = createDecisionAwareScreeningService(prisma);
    const response = await service.screen('ten_1', 'usr_1', {
      fullName: 'Mohammad Ali',
      sources: ['OFAC_SDN'],
    });

    expect(response.matches.map((match) => match.matchedName)).toContain('Mohammed Ali');
    expect(response.matches.map((match) => match.matchedName)).not.toContain('CODE A PARTNERSHIP');
    expect(
      response.matches.every((match: any) =>
        Number(match.nameScore ?? 0) > 0 || Boolean(match.matchedAlias) || Number(match.tokenOverlap ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it('identifier boosts only apply after the candidate passes the identity evidence gate', async () => {
    const { prisma, store } = createInMemoryPrisma();
    seedScreeningStore(store, ['OFAC_SDN']);

    store.records.push(
      {
        id: 'rec_ahmad_identified',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'PERSON',
        primaryName: 'DIRIYE, Ahmed',
        normalizedName: 'diriye ahmad',
        aliases: [],
        normalizedAliases: [],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: '1980-01-01',
        nationality: 'SO',
        country: 'SO',
        documentNumbers: ['DOC-77'],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
      {
        id: 'rec_doc_only_company',
        dataSourceId: 'seed_ds_0',
        versionId: 'seed_ver_0',
        entityType: 'ENTITY',
        primaryName: 'DHAWI PVT LTD',
        normalizedName: 'dhawi pvt ltd',
        aliases: ['Industrial Trading'],
        normalizedAliases: ['industrial trading'],
        arabicNormalizedAliases: [],
        arabicNormalizedName: null,
        latinTransliteratedName: null,
        dateOfBirth: '1980-01-01',
        nationality: 'SO',
        country: 'SO',
        documentNumbers: ['DOC-77'],
        rawPayload: { sourceCode: 'OFAC_SDN' },
      },
    );

    const service = createDecisionAwareScreeningService(prisma);
    const baseResponse = await service.screen('ten_1', 'usr_1', {
      fullName: 'Ahmad',
      sources: ['OFAC_SDN'],
    });
    const enrichedResponse = await service.screen('ten_1', 'usr_1', {
      fullName: 'Ahmad',
      dateOfBirth: '1980-01-01',
      nationality: 'SO',
      documentNumber: 'DOC-77',
      sources: ['OFAC_SDN'],
    });

    const basePersonMatch = baseResponse.matches.find((match) => match.matchedName === 'DIRIYE, Ahmed') as any;
    const enrichedPersonMatch = enrichedResponse.matches.find((match) => match.matchedName === 'DIRIYE, Ahmed') as any;

    expect(basePersonMatch).toBeTruthy();
    expect(enrichedPersonMatch).toBeTruthy();
    expect(enrichedPersonMatch.score).toBeGreaterThan(basePersonMatch.score);
    expect(enrichedResponse.matches.map((match) => match.matchedName)).not.toContain('DHAWI PVT LTD');
  });
});

function createScreeningService(prisma: any) {
  const matchingService = new MatchingService();

  const scoringService: Pick<ScoringService, 'classifyRisk' | 'classifyMatch' | 'buildExplanation'> = {
    classifyRisk: () => RiskLevel.LOW,
    classifyMatch: () => MatchClassification.STRONG_PROBABLE_MATCH,
    buildExplanation: () => 'Local-only screening match',
  };

  const auditLogsService = {
    log: jest.fn(async () => ({ id: 'audit_1' })),
  };

  return new ScreeningService(
    prisma as never,
    matchingService as never,
    scoringService as never,
    new MatchDecisionService(),
    auditLogsService as never,
  );
}

function createDecisionAwareScreeningService(prisma: any) {
  const matchingService = new MatchingService();
  const scoringService = new ScoringService();
  const auditLogsService = {
    log: jest.fn(async () => ({ id: 'audit_1' })),
  };

  return new ScreeningService(
    prisma as never,
    matchingService as never,
    scoringService as never,
    new MatchDecisionService(),
    auditLogsService as never,
  );
}

function seedScreeningStore(store: Store, sourceCodes: string[]) {
  sourceCodes.forEach((sourceCode, index) => {
    const sourceId = `seed_ds_${index}`;
    const versionId = `seed_ver_${index}`;

    store.dataSources.push({
      id: sourceId,
      code: sourceCode,
      name: sourceCode,
      type: sourceCode.includes('UNSEC') ? DataSourceType.UN : DataSourceType.OFAC,
      country: sourceCode.includes('UNSEC') ? 'UN' : 'US',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    store.versions.push({
      id: versionId,
      dataSourceId: sourceId,
      versionLabel: `${sourceCode}-v1`,
      fileHash: 'hash',
      importedAt: new Date(),
      importedBy: 'usr',
      recordCount: 1,
      status: 'ACTIVE',
    });

    store.records.push({
      id: `seed_rec_${index}`,
      dataSourceId: sourceId,
      versionId,
      entityType: 'PERSON',
      primaryName: 'Mohammed Ali',
      normalizedName: 'mohammed ali',
      aliases: [],
      dateOfBirth: null,
      nationality: 'LB',
      country: 'LB',
      documentNumbers: ['123456'],
      rawPayload: { sourceCode },
    });
  });
}
