"use client";

import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/i18n-provider';
import { CaseDetailResponse, DecisionFactor, downloadComplianceTimeline, getCase, reviewMatchDecision } from '../../../lib/api';

type Props = {
  params: { id: string };
};

export default function CaseDetailPage({ params }: Readonly<Props>) {
  const { formatNumber, t, tEnum } = useI18n();
  const [caseDetail, setCaseDetail] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'error'>('idle');
  const [reviewerDecision, setReviewerDecision] = useState('');
  const [reviewerJustification, setReviewerJustification] = useState('');
  const [reviewState, setReviewState] = useState<'idle' | 'saving' | 'error'>('idle');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getCase(params.id);
        if (!active) {
          return;
        }
        setCaseDetail(response);
        setReviewerDecision(String(response.reviewerDecision ?? response.originalDecision ?? response.screeningQuery.matchDecision ?? ''));
        setReviewerJustification(response.reviewerJustification ?? '');
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load case');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const handleDownload = async () => {
    setDownloadState('downloading');
    try {
      const blob = await downloadComplianceTimeline(params.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `case-${params.id}-timeline.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDownloadState('idle');
    } catch {
      setDownloadState('error');
    }
  };

  const handleReviewDecision = async () => {
    if (!caseDetail) {
      return;
    }

    setReviewState('saving');
    setError('');
    try {
      const updated = await reviewMatchDecision(params.id, {
        reviewerDecision,
        reviewerJustification: reviewerJustification.trim() || undefined,
      });
      setCaseDetail(updated);
      setReviewerDecision(String(updated.reviewerDecision ?? updated.originalDecision ?? updated.screeningQuery.matchDecision ?? ''));
      setReviewerJustification(updated.reviewerJustification ?? '');
      setReviewState('idle');
    } catch (reviewError) {
      setReviewState('error');
      setError(reviewError instanceof Error ? reviewError.message : 'Failed to save reviewer decision');
    }
  };

  const originalDecision = caseDetail?.originalDecision ?? caseDetail?.screeningQuery.matchDecision ?? '-';
  const currentDecision = caseDetail?.reviewerDecision ?? originalDecision;
  const reviewButtonLabel = getReviewButtonLabel(reviewState, reviewerDecision, originalDecision, t);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{t('caseDetail.title')} {params.id}</h1>
      <p className="text-sm text-slate-600">{t('caseDetail.description')}</p>
      {loading ? <p className="text-sm text-slate-600">{t('caseDetail.loading')}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      {caseDetail ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {tEnum('enums.decision', originalDecision)}
            </span>
            <span>{t('caseDetail.confidence')}: <span className="font-semibold">{formatNumber(Math.round((caseDetail.screeningQuery.decisionConfidence ?? 0) * 100))}%</span></span>
            <span>{t('caseDetail.recommendedAction')}: <span className="font-semibold">{tEnum('enums.recommendedAction', caseDetail.screeningQuery.recommendedAction ?? '-')}</span></span>
          </div>
          <p className="text-sm text-slate-700">{caseDetail.screeningQuery.reasonSummary ?? t('caseDetail.noSummary')}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FactorList title={t('caseDetail.supportingFactors')} factors={caseDetail.screeningQuery.supportingFactors ?? []} tone="support" />
            <FactorList title={t('caseDetail.weakeningFactors')} factors={caseDetail.screeningQuery.weakeningFactors ?? []} tone="warning" />
          </div>
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="mb-1 block font-medium">{t('caseDetail.reviewerDecision')}</span>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={reviewerDecision}
                onChange={(event) => setReviewerDecision(event.target.value)}
              >
                {['TRUE_MATCH', 'POSSIBLE_MATCH', 'FALSE_MATCH', 'NO_MATCH', 'INSUFFICIENT_DATA'].map((option) => (
                  <option key={option} value={option}>{tEnum('enums.decision', option)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700 md:col-span-2">
              <span className="mb-1 block font-medium">{t('caseDetail.justification')}</span>
              <textarea
                className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={reviewerJustification}
                onChange={(event) => setReviewerJustification(event.target.value)}
                placeholder={t('caseDetail.justificationPlaceholder')}
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void handleReviewDecision()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-white"
                disabled={reviewState === 'saving'}
              >
                {reviewButtonLabel}
              </button>
              <p className="text-sm text-slate-600">{t('common.currentFinalDecision')}: <span className="font-semibold">{tEnum('enums.decision', currentDecision)}</span></p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-emerald-700 px-4 py-2 text-white">{t('caseDetail.clear')}</button>
        <button className="rounded-lg bg-amber-700 px-4 py-2 text-white">{t('caseDetail.requestInfo')}</button>
        <button className="rounded-lg bg-rose-700 px-4 py-2 text-white">{t('caseDetail.escalate')}</button>
        <button
          onClick={() => void handleDownload()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          disabled={downloadState === 'downloading'}
        >
          {downloadState === 'downloading' ? t('caseDetail.downloadingTimeline') : t('caseDetail.downloadTimeline')}
        </button>
      </div>
      {downloadState === 'error' ? (
        <p className="text-sm text-rose-700">{t('caseDetail.downloadError')}</p>
      ) : null}
    </section>
  );
}

function FactorList(props: Readonly<{
  title: string;
  factors: DecisionFactor[];
  tone: 'support' | 'warning';
}>) {
  const { title, factors, tone } = props;
  const toneClass = tone === 'support' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50';

  return (
    <section className={`rounded-lg border p-3 ${toneClass}`}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {factors.length === 0 ? <p className="mt-2 text-sm text-slate-600">None.</p> : null}
      <div className="mt-2 space-y-2 text-sm text-slate-700">
        {factors.map((factor) => (
          <div key={`${title}-${factor.factor}`}>
            <p className="font-medium">{factor.factor}</p>
            <p>{factor.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getReviewButtonLabel(
  reviewState: 'idle' | 'saving' | 'error',
  reviewerDecision: string,
  originalDecision: string,
  t: (key: string) => string,
) {
  if (reviewState === 'saving') {
    return t('caseDetail.saving');
  }

  if (reviewerDecision === originalDecision) {
    return t('caseDetail.confirmDecision');
  }

  return t('caseDetail.saveOverride');
}
