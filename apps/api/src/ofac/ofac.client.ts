import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { OFAC_BASE_URL, OFAC_HTTP_TIMEOUT_MS, SUPPORTED_OFAC_DOWNLOADS } from './ofac.constants';

@Injectable()
export class OfacClientService {
  private readonly logger = new Logger(OfacClientService.name);

  private async requestText(path: string, timeoutMs = OFAC_HTTP_TIMEOUT_MS): Promise<string> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${OFAC_BASE_URL}${normalizedPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: '*/*',
          'user-agent': 'KYDEX-OFAC-Sync/1.0',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OFAC request failed: ${response.status} ${response.statusText} for ${url}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestBuffer(path: string, timeoutMs = OFAC_HTTP_TIMEOUT_MS): Promise<Buffer> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${OFAC_BASE_URL}${normalizedPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: '*/*',
          'user-agent': 'KYDEX-OFAC-Sync/1.0',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OFAC request failed: ${response.status} ${response.statusText} for ${url}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async downloadXmlViaZip(xmlFilename: string): Promise<string> {
    const zipFilename = xmlFilename.replace(/\.XML$/i, '.ZIP').toUpperCase();
    const zipBuffer = await this.requestBuffer(
      `/api/download/${encodeURIComponent(zipFilename)}`,
      Math.max(OFAC_HTTP_TIMEOUT_MS, 180000),
    );

    const zip = new AdmZip(zipBuffer);
    const xmlEntry = zip
      .getEntries()
      .find((entry: AdmZip.IZipEntry) => entry.entryName.toUpperCase() === xmlFilename.toUpperCase());

    if (!xmlEntry) {
      throw new Error(`OFAC ZIP ${zipFilename} did not contain expected entry ${xmlFilename}`);
    }

    return zip.readAsText(xmlEntry, 'utf8');
  }

  private async requestJson<T>(path: string): Promise<T> {
    const text = await this.requestText(path);

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`OFAC response was not valid JSON for path ${path}`);
    }
  }

  async alive(): Promise<boolean> {
    try {
      await this.requestText('/alive');
      return true;
    } catch (error) {
      this.logger.warn(`OFAC alive check failed: ${(error as Error).message}`);
      return false;
    }
  }

  async getSanctionsLists(): Promise<string[]> {
    return this.requestJson<string[]>('/sanctions-lists');
  }

  async getSanctionsPrograms(): Promise<string[]> {
    return this.requestJson<string[]>('/sanctions-programs');
  }

  async getLatestChanges(): Promise<string> {
    return this.requestText('/changes/latest');
  }

  async getEntity(entityId: string): Promise<string> {
    return this.requestText(`/entities/${encodeURIComponent(entityId)}`);
  }

  async getEntitiesByList(listName: string): Promise<string> {
    return this.requestText(`/entities?list=${encodeURIComponent(listName)}`);
  }

  async getEntitiesByProgram(programName: string): Promise<string> {
    return this.requestText(`/entities?program=${encodeURIComponent(programName)}`);
  }

  async downloadFile(filename: string): Promise<string> {
    const normalized = filename.trim().toUpperCase();

    if (!SUPPORTED_OFAC_DOWNLOADS.includes(normalized as never)) {
      throw new Error(`Unsupported OFAC download filename: ${filename}`);
    }

    if (normalized.endsWith('.XML')) {
      const zipVariant = normalized.replace(/\.XML$/i, '.ZIP');
      if (SUPPORTED_OFAC_DOWNLOADS.includes(zipVariant as never)) {
        this.logger.log(`Downloading OFAC file ${normalized} via compressed archive ${zipVariant}`);
        return this.downloadXmlViaZip(normalized);
      }
    }

    return this.requestText(
      `/api/download/${encodeURIComponent(normalized)}`,
      Math.max(OFAC_HTTP_TIMEOUT_MS, 600000),
    );
  }
}