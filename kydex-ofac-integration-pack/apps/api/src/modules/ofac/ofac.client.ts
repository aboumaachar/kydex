import { Injectable, Logger } from '@nestjs/common';
import { OFAC_BASE_URL, OFAC_HTTP_TIMEOUT_MS, SUPPORTED_OFAC_DOWNLOADS } from './ofac.constants';

@Injectable()
export class OfacClientService {
  private readonly logger = new Logger(OfacClientService.name);

  private async requestText(path: string): Promise<string> {
    const url = `${OFAC_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OFAC_HTTP_TIMEOUT_MS);

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

    return this.requestText(`/api/download/${encodeURIComponent(normalized)}`);
  }
}
