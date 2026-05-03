"use client";

import { FormEvent, useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/i18n-provider';
import { confirmDocumentExtraction, extractDocument } from '../../../lib/api';

type EditableFields = {
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  documentNumber: string;
  issuingCountry: string;
  expiryDate: string;
};

export default function DocumentExtractionPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('PASSPORT');
  const [sources, setSources] = useState('OFAC,UNSEC');
  const [redactAfterExtract, setRedactAfterExtract] = useState(true);
  const [clientReference, setClientReference] = useState('DOC-DEMO-0001');

  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [extractionId, setExtractionId] = useState('');
  const [extractionMeta, setExtractionMeta] = useState<Record<string, unknown> | null>(null);
  const [screeningResult, setScreeningResult] = useState<Record<string, unknown> | null>(null);

  const [fields, setFields] = useState<EditableFields>({
    fullName: '',
    dateOfBirth: '',
    nationality: '',
    documentNumber: '',
    issuingCountry: '',
    expiryDate: '',
  });

  const canConfirm = useMemo(() => extractionId.length > 0 && fields.fullName.trim().length > 0, [extractionId, fields.fullName]);

  const runExtract = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError(t('screening.chooseDocument'));
      return;
    }

    setError('');
    setExtracting(true);
    setScreeningResult(null);

    try {
      const response = await extractDocument(file, documentType, redactAfterExtract);
      setExtractionId(String(response.extractionId ?? ''));
      setExtractionMeta(response as unknown as Record<string, unknown>);

      const extracted = response.extractedFields ?? {};
      setFields({
        fullName: asText(extracted.fullName),
        dateOfBirth: asText(extracted.dateOfBirth),
        nationality: asText(extracted.nationality),
        documentNumber: asText(extracted.documentNumber),
        issuingCountry: asText(extracted.issuingCountry),
        expiryDate: asText(extracted.expiryDate),
      });
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : t('screening.extractionFailed'));
    } finally {
      setExtracting(false);
    }
  };

  const runConfirm = async () => {
    if (!canConfirm) {
      setError(t('screening.confirmationRequirements'));
      return;
    }

    setError('');
    setConfirming(true);

    try {
      const response = await confirmDocumentExtraction(extractionId, {
        fullName: fields.fullName.trim(),
        dateOfBirth: fields.dateOfBirth.trim() || undefined,
        nationality: fields.nationality.trim() || undefined,
        documentNumber: fields.documentNumber.trim() || undefined,
        issuingCountry: fields.issuingCountry.trim() || undefined,
        expiryDate: fields.expiryDate.trim() || undefined,
        sources: sources
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        clientReference,
        transactionType: 'DOCUMENT_SCREENING',
        redactAfterExtract,
      });

      setScreeningResult(response);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t('screening.confirmationFailed'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t('screening.documentTitle')}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {t('screening.documentDescription')}
      </p>

      <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={runExtract}>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={documentType}
          onChange={(event) => setDocumentType(event.target.value)}
        >
          <option value="PASSPORT">{t('screening.passport')}</option>
          <option value="NATIONAL_ID">{t('screening.nationalId')}</option>
          <option value="ID_DOCUMENT">{t('screening.idDocument')}</option>
        </select>

        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={sources}
          onChange={(event) => setSources(event.target.value)}
          placeholder={t('screening.sources')}
        />

        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,.txt"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={redactAfterExtract}
            onChange={(event) => setRedactAfterExtract(event.target.checked)}
          />
          <span>{t('screening.redact')}</span>
        </label>

        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={clientReference}
          onChange={(event) => setClientReference(event.target.value)}
          placeholder={t('screening.clientReference')}
        />

        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-70 md:col-span-2"
          disabled={extracting}
        >
          {extracting ? t('screening.extracting') : t('screening.extract')}
        </button>
      </form>

      {extractionMeta ? (
        <div className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold">{t('screening.reviewFields')}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={fields.fullName}
              onChange={(event) => setFields((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder={t('screening.fullName')}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={fields.dateOfBirth}
              onChange={(event) => setFields((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              placeholder={t('screening.dateOfBirth')}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={fields.nationality}
              onChange={(event) => setFields((prev) => ({ ...prev, nationality: event.target.value }))}
              placeholder={t('screening.nationality')}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={fields.documentNumber}
              onChange={(event) => setFields((prev) => ({ ...prev, documentNumber: event.target.value }))}
              placeholder={t('screening.documentNumber')}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={fields.issuingCountry}
              onChange={(event) => setFields((prev) => ({ ...prev, issuingCountry: event.target.value }))}
              placeholder={t('screening.issuingCountry')}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={fields.expiryDate}
              onChange={(event) => setFields((prev) => ({ ...prev, expiryDate: event.target.value }))}
              placeholder={t('screening.expiryDate')}
            />
          </div>

          <button
            onClick={() => void runConfirm()}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-70"
            disabled={!canConfirm || confirming}
          >
            {confirming ? t('screening.confirming') : t('screening.confirm')}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
      {screeningResult ? (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(screeningResult, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}

function asText(value: unknown) {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  return '';
}
