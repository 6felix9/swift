import { TrainingDomain } from '../types';

// Import individual prompt instruction strings so they are in scope
import { trainingReferralEvaluationInstructions } from './training-referral';
import { trainingInsuranceRejectionEvaluationInstructions } from './training-insurance-rejection';
import { trainingGoalPlanningEvaluationInstructions } from './training-goal-planning';

// Re-export them as well for external modules that might rely on direct imports
export * from './training-referral';
export * from './training-insurance-rejection';
export * from './training-goal-planning';

// Consolidated map of all evaluation instruction prompts for the financial-advisor domain.
// Phase-1: only the financial-advisor domain is supported, but this structure
// allows for easy expansion to additional domains in Phase-2.
const PROMPTS = {
  trainingReferralEvaluationInstructions,
  trainingInsuranceRejectionEvaluationInstructions,
  trainingGoalPlanningEvaluationInstructions,
} as const;

/**
 * Retrieve an evaluation prompt by its key and domain.
 *
 * Phase-1 implementation ignores the `domain` argument because only the
 * financial-advisor domain is currently implemented. In Phase-2 this function
 * will be extended to perform domain-specific prompt look-ups or template
 * rendering.
 */
export function getEvaluationPrompt(key: string, domain: TrainingDomain): string {
  const prompt = (PROMPTS as Record<string, string>)[key];
  return typeof prompt === 'string' ? prompt : '';
}