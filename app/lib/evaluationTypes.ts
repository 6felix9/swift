export interface CriterionEvaluation {
  criterionId: string;
  criterionText: string;
  score: number;
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
}

export interface ReferralContextSuccessfullyCreated {
  answer: string; // "Partially", "Yes", "No"
  justification: string;
}

export interface EvaluationSummary {
  totalScore: number;
  maxPossibleScore: number;
  keyStrengths: string;
  keyAreasForImprovement: string;
  referralContextSuccessfullyCreated: ReferralContextSuccessfullyCreated;
}

export interface EvaluationResponse {
  evaluationSummary: EvaluationSummary;
  detailedEvaluation: DetailedEvaluationCategory[];
}
