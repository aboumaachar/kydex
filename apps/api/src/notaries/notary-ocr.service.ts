import { Injectable } from '@nestjs/common';

export type NotaryOcrInput = {
  buffer: Buffer;
  mimeType: string;
  size: number;
};

export type NotaryOcrResult = {
  text: string;
  candidateName?: string;
  dateOfBirth?: string;
  nationality?: string;
  documentNumber?: string;
  confidence: number;
  reliableName: boolean;
};

@Injectable()
export class NotaryOcrService {
  private heicSupport: boolean | null = null;

  async supportsHeicRuntime() {
    if (this.heicSupport !== null) {
      return this.heicSupport;
    }

    this.heicSupport = process.env.KYDEX_ENABLE_HEIC === 'true';

    return this.heicSupport;
  }

  extract(input: NotaryOcrInput): NotaryOcrResult {
    const cleanedText = this.cleanText(input.buffer.toString('utf-8'));
    const lines = cleanedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const candidateName = this.extractName(lines);
    const dateOfBirth = this.extractDateOfBirth(lines);
    const nationality = this.extractValue(lines, ['nationality', 'citizenship']);
    const documentNumber = this.extractValue(lines, [
      'document number',
      'id number',
      'passport number',
      'passport no',
      'id no',
      'national id',
    ]);

    const extractedCount = [candidateName, dateOfBirth, nationality, documentNumber].filter((value) => Boolean(value)).length;
    const confidence = Math.min(0.98, Math.max(0, 0.12 + extractedCount * 0.2 + Math.min(cleanedText.length, 1200) / 15000));

    return {
      text: cleanedText,
      candidateName,
      dateOfBirth,
      nationality,
      documentNumber,
      confidence: Number(confidence.toFixed(2)),
      reliableName: this.isReliableName(candidateName),
    };
  }

  private cleanText(rawText: string) {
    return rawText
      .replace(/\u0000/g, '')
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/[ \t]*\r?\n[ \t]*/g, '\n')
      .trim()
      .slice(0, 8000);
  }

  private extractValue(lines: string[], labels: string[]): string | undefined {
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const label of labels) {
        const idx = lower.indexOf(label);
        if (idx < 0) {
          continue;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx >= 0) {
          const value = line.slice(colonIdx + 1).trim();
          if (value) {
            return value;
          }
        }

        const trailing = line.slice(idx + label.length).replace(/^\s*[-:]?\s*/, '').trim();
        if (trailing) {
          return trailing;
        }
      }
    }

    return undefined;
  }

  private extractDateOfBirth(lines: string[]) {
    const labeled = this.extractValue(lines, ['date of birth', 'dob', 'birth']);
    if (labeled) {
      return labeled;
    }

    const datePattern = /(\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b)|(\b\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}\b)/;
    for (const line of lines) {
      const match = line.match(datePattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  private extractName(lines: string[]) {
    const labeled = this.extractValue(lines, ['full name', 'name', 'holder', 'surname and given names']);
    if (labeled && this.isReliableName(labeled)) {
      return labeled;
    }

    for (const line of lines) {
      const cleaned = line.replace(/[^\p{L} .'-]/gu, ' ').replace(/\s+/g, ' ').trim();
      if (this.isReliableName(cleaned)) {
        return cleaned;
      }
    }

    return undefined;
  }

  private isReliableName(value: string | undefined): boolean {
    if (!value) {
      return false;
    }

    const normalized = value.trim();
    if (normalized.length < 4) {
      return false;
    }

    const tokens = normalized.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) {
      return false;
    }

    return /\p{L}/u.test(normalized);
  }
}
