export const OFAC_BASE_URL =
  process.env.OFAC_BASE_URL ?? 'https://sanctionslistservice.ofac.treas.gov';

export const OFAC_SYNC_TOKEN =
  process.env.OFAC_SYNC_TOKEN ?? 'change-this-admin-sync-token';

export const OFAC_HTTP_TIMEOUT_MS = Number(process.env.OFAC_HTTP_TIMEOUT_MS ?? 30000);

export const OFAC_SYNC_FILES = (process.env.OFAC_SYNC_FILES ?? 'SDN_ADVANCED.XML,CONS_ADVANCED.XML')
  .split(',')
  .map((file) => file.trim())
  .filter(Boolean);

export const SUPPORTED_OFAC_DOWNLOADS = [
  'SDN_ENHANCED.ZIP',
  'CONS_ENHANCED.ZIP',
  'SDN_ENHANCED.XML',
  'CONS_ADVANCED.ZIP',
  'SDN_ADVANCED.XML',
  'CONS_ENHANCED.XML',
  'SDN_ADVANCED.ZIP',
  'CONS_ADVANCED.XML',
  'SDN.XML.ZIP',
  'CONSOLIDATED.XML',
  'SDN.XML',
  'CONSOLIDATED.ZIP',
  'SDN.CSV',
  'CONS_PRIM.CSV',
  'ADD.CSV',
  'CONS_ADD.CSV',
  'ALT.CSV',
  'CONS_ALT.CSV',
  'SDN_COMMENTS.CSV',
  'CONS_COMMENTS.CSV',
] as const;

export type SupportedOfacDownload = (typeof SUPPORTED_OFAC_DOWNLOADS)[number];