import { Injectable } from '@nestjs/common';
import { MatchDecision, MatchRecommendedAction } from '@prisma/client';

export type DecisionFactor = {
  factor: string;
  weight: number;
  score?: number;
  explanation: string;
};

export type MatchDecisionCandidate = {
  watchlistRecordId: string;
  sourceCode: string;
  matchedName: string;
  score: number;
  classification: string;
  nameScore: number;
  aliasScore: number;
  aliasMatched: boolean;
  exactAliasMatched: boolean;
  transliterationMatched: boolean;
  arabicExactMatch?: boolean;
  arabicNormalizedMatch?: boolean;
  arabicTransliterationMatch?: boolean;
  arabicTokenOverlap?: number;
  arabicFatherNameMatch?: boolean;
  arabicFamilyNameMatch?: boolean;
  nationalityMatched: boolean;
  nationalityMismatch: boolean;
  dobMatched: boolean;
  dobMismatch: boolean;
  docMatched: boolean;
  docMismatch: boolean;
  programOrCategory: string;
};

export type MatchDecisionInput = {
  fullName: string;
  dateOfBirth?: string;
  nationality?: string;
  documentNumber?: string;
  topCandidate?: MatchDecisionCandidate;
  totalMatches: number;
};

export type MatchDecisionOutput = {
  decision: MatchDecision;
  decisionConfidence: number;
  reasonSummary: string;
  recommendedAction: MatchRecommendedAction;
  supportingFactors: DecisionFactor[];
  weakeningFactors: DecisionFactor[];
};

type SourceSeverity = {
  weight: number;
  explanation: string;
};

const SOURCE_SEVERITY: Record<string, SourceSeverity> = {
  OFAC_SDN: {
    weight: 0.14,
    explanation: 'OFAC SDN is treated as the most severe source tier in KYDEX decisioning.',
  },
  OFAC_CONSOLIDATED: {
    weight: 0.12,
    explanation: 'OFAC consolidated records carry high regulatory severity.',
  },
  UNSEC_CONSOLIDATED: {
    weight: 0.11,
    explanation: 'UN Security Council consolidated records carry high regulatory severity.',
  },
};

const COMMON_NAME_TOKENS = new Set([
  'ali',
  'ahmad',
  'ahmed',
  'john',
  'mohamad',
  'mohamed',
  'mohammad',
  'mohammed',
  'muhammad',
  'omar',
  'smith',
]);

@Injectable()
export class MatchDecisionService {
  evaluate(input: MatchDecisionInput): MatchDecisionOutput {
    const topCandidate = input.topCandidate;
    const supportingFactors: DecisionFactor[] = [];
    const weakeningFactors: DecisionFactor[] = [];
    const useArabicCopy = this.containsArabicScript(input.fullName);

    if (!topCandidate) {
      const weakInput = this.isWeakInput(input);
      if (weakInput) {
        supportingFactors.push({
          factor: 'DATA_COMPLETENESS',
          weight: 0.18,
          score: this.computeCompletenessScore(input),
          explanation: this.copy(
            useArabicCopy,
            'The weak identifier set supports a request for more information instead of a definitive regulatory outcome.',
            'ضعف بيانات الهوية يدعم طلب معلومات إضافية بدل إصدار نتيجة تنظيمية حاسمة.',
          ),
        });
        weakeningFactors.push({
          factor: 'DATA_COMPLETENESS',
          weight: -0.25,
          explanation: this.copy(
            useArabicCopy,
            'Input contains too few identifiers to support a confident regulatory classification.',
            'المدخلات تحتوي على عدد قليل جدا من المؤشرات ولا تسمح بتصنيف تنظيمي واثق.',
          ),
        });

        return {
          decision: MatchDecision.INSUFFICIENT_DATA,
          decisionConfidence: 0.42,
          reasonSummary: this.copy(
            useArabicCopy,
            'Input is too weak to classify confidently because only limited identifiers were provided.',
            'المدخلات ضعيفة جدا للتصنيف بثقة لأن مؤشرات الهوية المقدمة محدودة.',
          ),
          recommendedAction: MatchRecommendedAction.REQUEST_MORE_INFORMATION,
          supportingFactors,
          weakeningFactors,
        };
      }

      supportingFactors.push({
        factor: 'DATA_COMPLETENESS',
        weight: 0.2,
        score: this.computeCompletenessScore(input),
        explanation: this.copy(
          useArabicCopy,
          'The submitted identifiers are sufficiently complete for a confident clean result.',
          'مؤشرات الهوية المقدمة كافية للوصول إلى نتيجة نظيفة بثقة.',
        ),
      });

      return {
        decision: MatchDecision.NO_MATCH,
        decisionConfidence: 0.9,
        reasonSummary: this.copy(
          useArabicCopy,
          'No material candidate requiring escalation was found for the submitted identifiers.',
          'لم يتم العثور على مرشح جوهري يستوجب التصعيد استنادا إلى مؤشرات الهوية المقدمة.',
        ),
        recommendedAction: MatchRecommendedAction.ALLOW,
        supportingFactors,
        weakeningFactors,
      };
    }

    this.addCoreFactors(input, topCandidate, supportingFactors, weakeningFactors, useArabicCopy);

    const exactName = topCandidate.nameScore >= 0.96;
    const strongName = topCandidate.nameScore >= 0.9;
    const highName = topCandidate.nameScore >= 0.78 || topCandidate.aliasScore >= 0.84;
    const supportingIdentifierCount = Number(topCandidate.dobMatched) + Number(topCandidate.nationalityMatched) + Number(topCandidate.docMatched);
    const strongConflict =
      (topCandidate.dobMismatch && topCandidate.docMismatch) ||
      (topCandidate.dobMismatch && topCandidate.nationalityMismatch) ||
      (topCandidate.docMismatch && topCandidate.nationalityMismatch);

    if (
      topCandidate.docMatched ||
      (strongName && supportingIdentifierCount >= 1 && !topCandidate.dobMismatch && !topCandidate.nationalityMismatch && !topCandidate.docMismatch) ||
      (topCandidate.exactAliasMatched && supportingIdentifierCount >= 1) ||
      (exactName && supportingIdentifierCount >= 1 && !topCandidate.dobMismatch && !topCandidate.nationalityMismatch && !topCandidate.docMismatch)
    ) {
      return {
        decision: MatchDecision.TRUE_MATCH,
        decisionConfidence: this.clamp(0.86 + topCandidate.score * 0.12 + supportingIdentifierCount * 0.03),
        reasonSummary: this.buildTrueMatchSummary(topCandidate, useArabicCopy),
        recommendedAction: MatchRecommendedAction.BLOCK_OR_ESCALATE,
        supportingFactors,
        weakeningFactors,
      };
    }

    if (highName && strongConflict) {
      return {
        decision: MatchDecision.FALSE_MATCH,
        decisionConfidence: this.clamp(0.74 + (topCandidate.nameScore - 0.75) * 0.4),
        reasonSummary: this.copy(
          useArabicCopy,
          'Name similarity exists, but strong identifiers conflict and materially weaken the match hypothesis.',
          'يوجد تشابه في الاسم، لكن مؤشرات الهوية الأساسية متعارضة وتضعف فرضية التطابق بشكل جوهري.',
        ),
        recommendedAction: MatchRecommendedAction.ALLOW_WITH_NOTE,
        supportingFactors,
        weakeningFactors,
      };
    }

    if (highName) {
      return {
        decision: MatchDecision.POSSIBLE_MATCH,
        decisionConfidence: this.clamp(0.62 + topCandidate.score * 0.18 - Number(strongConflict) * 0.08),
        reasonSummary: this.buildPossibleMatchSummary(topCandidate, input, useArabicCopy),
        recommendedAction: MatchRecommendedAction.ESCALATE_FOR_REVIEW,
        supportingFactors,
        weakeningFactors,
      };
    }

    if (this.isWeakInput(input)) {
      return {
        decision: MatchDecision.INSUFFICIENT_DATA,
        decisionConfidence: 0.45,
        reasonSummary: this.copy(
          useArabicCopy,
          'A low-confidence candidate exists, but the submitted identifiers are too weak to classify confidently.',
          'يوجد مرشح منخفض الثقة، لكن مؤشرات الهوية المقدمة ضعيفة جدا للتصنيف بثقة.',
        ),
        recommendedAction: MatchRecommendedAction.REQUEST_MORE_INFORMATION,
        supportingFactors,
        weakeningFactors,
      };
    }

    return {
      decision: MatchDecision.NO_MATCH,
      decisionConfidence: 0.82,
      reasonSummary: this.copy(
        useArabicCopy,
        'Candidate overlap was too weak to support a regulator-facing match decision.',
        'درجة التقاطع مع المرشح كانت ضعيفة جدا ولا تدعم قرارا تنظيميا بوجود تطابق.',
      ),
      recommendedAction: MatchRecommendedAction.ALLOW,
      supportingFactors,
      weakeningFactors,
    };
  }

  private addCoreFactors(
    input: MatchDecisionInput,
    candidate: MatchDecisionCandidate,
    supportingFactors: DecisionFactor[],
    weakeningFactors: DecisionFactor[],
    useArabicCopy: boolean,
  ) {
    if (candidate.nameScore > 0) {
      supportingFactors.push({
        factor: 'NAME_SIMILARITY',
        weight: 0.34,
        score: this.clamp(candidate.nameScore),
        explanation: this.copy(
          useArabicCopy,
          'Input name is highly similar to the listed primary name.',
          'الاسم المدخل شديد التشابه مع الاسم الأساسي المدرج.',
        ),
      });
    }

    if (candidate.arabicExactMatch) {
      supportingFactors.push({
        factor: 'ARABIC_EXACT_MATCH',
        weight: 0.18,
        score: 1,
        explanation: this.copy(
          useArabicCopy,
          'Arabic-script input exactly matches the listed Arabic form.',
          'المدخل العربي يطابق تماما الصيغة العربية المدرجة.',
        ),
      });
    }

    if (candidate.arabicNormalizedMatch) {
      supportingFactors.push({
        factor: 'ARABIC_NORMALIZED_MATCH',
        weight: 0.16,
        score: 1,
        explanation: this.copy(
          useArabicCopy,
          'Arabic normalization removes script variance and still yields the same name.',
          'تطبيع الاسم العربي يزيل اختلافات الرسم ويؤدي إلى نفس الاسم.',
        ),
      });
    }

    if (candidate.arabicTransliterationMatch) {
      supportingFactors.push({
        factor: 'ARABIC_TRANSLITERATION_MATCH',
        weight: 0.15,
        score: this.clamp(candidate.nameScore),
        explanation: this.copy(
          useArabicCopy,
          'Arabic and Latin variants converge after transliteration-aware normalization.',
          'النسختان العربية واللاتينية تتقاربان بعد التطبيع المراعي للنقل الصوتي.',
        ),
      });
    }

    if ((candidate.arabicTokenOverlap ?? 0) > 0) {
      supportingFactors.push({
        factor: 'ARABIC_TOKEN_OVERLAP',
        weight: 0.1,
        score: this.clamp((candidate.arabicTokenOverlap ?? 0) / 4),
        explanation: this.copy(
          useArabicCopy,
          'Arabic token overlap strengthens the identity hypothesis across script variants.',
          'تداخل المقاطع الاسمية العربية يعزز فرضية الهوية عبر اختلافات الكتابة.',
        ),
      });
    }

    if (candidate.arabicFatherNameMatch) {
      supportingFactors.push({
        factor: 'ARABIC_FATHER_NAME_MATCH',
        weight: 0.07,
        score: 1,
        explanation: this.copy(
          useArabicCopy,
          'Father-name alignment increases confidence in Arabic naming structures.',
          'تطابق اسم الأب يرفع الثقة ضمن البنية الاسمية العربية.',
        ),
      });
    }

    if (candidate.arabicFamilyNameMatch) {
      supportingFactors.push({
        factor: 'ARABIC_FAMILY_NAME_MATCH',
        weight: 0.09,
        score: 1,
        explanation: this.copy(
          useArabicCopy,
          'Family-name alignment supports the Arabic full-name match hypothesis.',
          'تطابق اسم العائلة يدعم فرضية تطابق الاسم العربي الكامل.',
        ),
      });
    }

    if (candidate.aliasMatched) {
      supportingFactors.push({
        factor: 'ALIAS_SIMILARITY',
        weight: 0.2,
        score: this.clamp(candidate.aliasScore),
        explanation: candidate.exactAliasMatched
          ? this.copy(useArabicCopy, 'Input exactly matches a listed alias.', 'المدخل يطابق تماما اسما مستعارا مدرجا.')
          : this.copy(useArabicCopy, 'Input is highly similar to a listed alias.', 'المدخل شديد التشابه مع اسم مستعار مدرج.'),
      });
    }

    if (candidate.transliterationMatched) {
      supportingFactors.push({
        factor: 'TRANSLITERATION_MATCH',
        weight: 0.14,
        score: this.clamp(candidate.nameScore),
        explanation: this.copy(
          useArabicCopy,
          'Arabic and Latin-script variants align after transliteration normalization.',
          'تتطابق الصيغ العربية واللاتينية بعد تطبيع النقل الصوتي.',
        ),
      });
    }

    if (candidate.dobMatched) {
      supportingFactors.push({
        factor: 'DOB_MATCH',
        weight: 0.18,
        score: 1,
        explanation: this.copy(useArabicCopy, 'Date of birth matches the listed record.', 'تاريخ الميلاد يطابق السجل المدرج.'),
      });
    } else if (input.dateOfBirth && candidate.dobMismatch) {
      weakeningFactors.push({
        factor: 'DOB_MISMATCH',
        weight: -0.2,
        score: 1,
        explanation: this.copy(useArabicCopy, 'Date of birth conflicts with the listed record.', 'تاريخ الميلاد يتعارض مع السجل المدرج.'),
      });
    } else if (!input.dateOfBirth) {
      weakeningFactors.push({
        factor: 'MISSING_DOB',
        weight: -0.1,
        explanation: this.copy(useArabicCopy, 'Date of birth was not provided, reducing certainty.', 'لم يتم تقديم تاريخ الميلاد مما يقلل مستوى اليقين.'),
      });
    }

    if (candidate.nationalityMatched) {
      supportingFactors.push({
        factor: 'NATIONALITY_MATCH',
        weight: 0.12,
        score: 1,
        explanation: this.copy(useArabicCopy, 'Nationality aligns with the listed record.', 'الجنسية تتوافق مع السجل المدرج.'),
      });
    } else if (input.nationality && candidate.nationalityMismatch) {
      weakeningFactors.push({
        factor: 'NATIONALITY_MISMATCH',
        weight: -0.12,
        score: 1,
        explanation: this.copy(useArabicCopy, 'Nationality conflicts with the listed record.', 'الجنسية تتعارض مع السجل المدرج.'),
      });
    }

    if (candidate.docMatched) {
      supportingFactors.push({
        factor: 'DOCUMENT_NUMBER_MATCH',
        weight: 0.32,
        score: 1,
        explanation: this.copy(
          useArabicCopy,
          'Document number matches exactly, which is treated as decisive evidence.',
          'رقم الوثيقة يطابق تماما ويعد دليلا حاسما.',
        ),
      });
    } else if (input.documentNumber && candidate.docMismatch) {
      weakeningFactors.push({
        factor: 'DOCUMENT_NUMBER_MISMATCH',
        weight: -0.24,
        score: 1,
        explanation: this.copy(useArabicCopy, 'Document number does not match the candidate record.', 'رقم الوثيقة لا يطابق سجل المرشح.'),
      });
    }

    const severity = SOURCE_SEVERITY[candidate.sourceCode] ?? {
      weight: 0.06,
      explanation: 'The matched source contributes regulatory significance to the screening decision.',
    };
    supportingFactors.push({
      factor: 'SOURCE_SEVERITY',
      weight: severity.weight,
      explanation: useArabicCopy ? this.translateSourceSeverity(candidate.sourceCode) : severity.explanation,
    });

    if (candidate.programOrCategory.trim().length > 0) {
      supportingFactors.push({
        factor: 'PROGRAM_CATEGORY',
        weight: 0.06,
        explanation: this.copy(
          useArabicCopy,
          `Program or list type present: ${candidate.programOrCategory}.`,
          `توجد فئة برنامج أو قائمة: ${candidate.programOrCategory}.`,
        ),
      });
      supportingFactors.push({
        factor: 'LIST_TYPE',
        weight: 0.05,
        explanation: this.copy(
          useArabicCopy,
          'List metadata is populated and available for reviewer interpretation.',
          'بيانات القائمة الوصفية متوفرة وقابلة لتفسير المراجع.',
        ),
      });
    }

    const completenessScore = this.computeCompletenessScore(input);
    if (completenessScore >= 0.6) {
      supportingFactors.push({
        factor: 'DATA_COMPLETENESS',
        weight: 0.08,
        score: completenessScore,
        explanation: this.copy(
          useArabicCopy,
          'The input includes enough identifying fields to support a stronger decision.',
          'المدخلات تتضمن مؤشرات هوية كافية لدعم قرار أقوى.',
        ),
      });
    } else {
      weakeningFactors.push({
        factor: 'DATA_COMPLETENESS',
        weight: -0.16,
        score: completenessScore,
        explanation: this.copy(
          useArabicCopy,
          'The input is missing too many identifiers to support a confident decision.',
          'المدخلات تفتقد إلى مؤشرات هوية كثيرة ولا تدعم قرارا واثقا.',
        ),
      });
    }
  }

  private buildTrueMatchSummary(candidate: MatchDecisionCandidate, useArabicCopy: boolean) {
    if (candidate.docMatched) {
      return this.copy(
        useArabicCopy,
        'Exact document-number evidence supports a true match and requires regulator-facing escalation.',
        'التطابق الدقيق في رقم الوثيقة يدعم وجود تطابق حقيقي ويتطلب تصعيدا تنظيميا.',
      );
    }

    if (candidate.exactAliasMatched) {
      return this.copy(
        useArabicCopy,
        'A listed alias matched exactly and supporting identifiers strengthen the conclusion to a true match.',
        'تمت مطابقة اسم مستعار مدرج بشكل دقيق، كما أن مؤشرات الهوية الداعمة تعزز نتيجة التطابق الحقيقي.',
      );
    }

    return this.copy(
      useArabicCopy,
      'Very high name similarity supported by corroborating identifiers strengthens this result to a true match.',
      'تشابه الاسم المرتفع جدا والمدعوم بمؤشرات هوية مؤيدة يعزز هذه النتيجة كتطابق حقيقي.',
    );
  }

  private buildPossibleMatchSummary(candidate: MatchDecisionCandidate, input: MatchDecisionInput, useArabicCopy: boolean) {
    if (!input.dateOfBirth && !input.documentNumber) {
      return this.copy(
        useArabicCopy,
        'High name similarity exists, but missing date of birth and document number keep the result in possible-match review.',
        'يوجد تشابه مرتفع في الاسم، لكن غياب تاريخ الميلاد ورقم الوثيقة يبقي النتيجة ضمن مراجعة التطابق المحتمل.',
      );
    }

    if (candidate.dobMismatch || candidate.nationalityMismatch || candidate.docMismatch) {
      return this.copy(
        useArabicCopy,
        'Name similarity is high, but conflicting identifiers prevent a true-match conclusion and require governed review.',
        'تشابه الاسم مرتفع، لكن تعارض مؤشرات الهوية يمنع اعتماد تطابق حقيقي ويتطلب مراجعة محكومة.',
      );
    }

    return this.copy(
      useArabicCopy,
      'High name or alias similarity exists, but supporting identifiers are missing or inconclusive.',
      'يوجد تشابه مرتفع في الاسم أو الاسم المستعار، لكن مؤشرات الهوية الداعمة مفقودة أو غير حاسمة.',
    );
  }

  private computeCompletenessScore(input: MatchDecisionInput) {
    const provided = [input.fullName.trim().length > 0, !!input.dateOfBirth, !!input.nationality, !!input.documentNumber]
      .filter(Boolean).length;

    return this.clamp(provided / 4);
  }

  private isWeakInput(input: MatchDecisionInput) {
    const normalized = input.fullName.trim();
    const tokens = normalized
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const tokenCount = tokens.length;
    const hasOnlyWeakNameTokens = tokenCount > 0 && tokens.every((token) => COMMON_NAME_TOKENS.has(token));
    return tokenCount <= 2 && !input.dateOfBirth && !input.documentNumber && !input.nationality && hasOnlyWeakNameTokens;
  }

  private clamp(value: number) {
    return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
  }

  private containsArabicScript(value: string) {
    return /[\u0600-\u06FF]/.test(value);
  }

  private copy(useArabicCopy: boolean, english: string, arabic: string) {
    return useArabicCopy ? arabic : english;
  }

  private translateSourceSeverity(sourceCode: string) {
    switch (sourceCode) {
      case 'OFAC_SDN':
        return 'يتم التعامل مع قائمة OFAC SDN كأعلى مستوى خطورة مصدرية في قرار KYDEX.';
      case 'OFAC_CONSOLIDATED':
        return 'سجلات OFAC الموحدة تحمل أهمية تنظيمية مرتفعة.';
      case 'UNSEC_CONSOLIDATED':
        return 'سجلات قائمة مجلس الأمن الموحدة تحمل أهمية تنظيمية مرتفعة.';
      default:
        return 'المصدر المطابق يضيف وزنا تنظيميا إلى قرار الفحص.';
    }
  }
}