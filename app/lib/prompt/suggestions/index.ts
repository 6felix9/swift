import { referralSuggestionPrompt } from './referral-suggestions';
import { insuranceRejectionSuggestionPrompt } from './insurance-rejection-suggestions';

export const SUGGESTION_PROMPTS: Record<string, string> = {
  'REFERRAL_ANNUAL_REVIEW': referralSuggestionPrompt,
  'INSURANCE_REJECTION_HANDLING': insuranceRejectionSuggestionPrompt,
};