// Import individual prompt instruction strings so they are in scope
import { trainingReferralEvaluationInstructions } from './training-referral';
import { trainingInsuranceRejectionEvaluationInstructions } from './training-insurance-rejection';
import { trainingGoalPlanningEvaluationInstructions } from './training-goal-planning';
import { trainingGenericEvaluationInstructions } from './traininig-generic';

export const EVALUATION_PROMPTS: Record<string, string> = {
  'REFERRAL_ANNUAL_REVIEW': trainingReferralEvaluationInstructions,
  'INSURANCE_REJECTION_HANDLING': trainingInsuranceRejectionEvaluationInstructions,
  'GOAL_PLANNING': trainingGoalPlanningEvaluationInstructions,
  'GENERIC': trainingGenericEvaluationInstructions,
};