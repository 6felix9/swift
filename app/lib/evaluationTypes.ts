import { TrainingDomain } from './types';

export type CriterionType = 'numeric-scale' | 'pass-fail' | 'qualitative';

export interface CriterionEvaluation {
  criterionId: string;
  criterionText: string;
  type: CriterionType;
  score: number;
  maxScore?: number;
  commentsAndExamples: string;
}

export interface RedFlagCheck {
  raised: boolean;
  comment: string | null;
}

export interface DetailedEvaluationCategory {
  categoryName: string;
  subtotal: number;
  redFlagCheck: RedFlagCheck;
  criteria: CriterionEvaluation[];
  domain?: TrainingDomain;
}

export interface DomainSpecificOutcome {
  question: string;
  answer: string; // "Partially", "Yes", "No", etc.
  justification: string;
}

export interface EvaluationSummary {
  totalScore: number;
  maxPossibleScore: number;
  keyStrengths: string;
  keyAreasForImprovement: string;
  whereYouCouldHaveSaidBetter: string;
  domainSpecificOutcome?: DomainSpecificOutcome;
}

export interface EvaluationResponse {
  domain: TrainingDomain;
  evaluationSummary: EvaluationSummary;
  detailedEvaluation: DetailedEvaluationCategory[];
}
