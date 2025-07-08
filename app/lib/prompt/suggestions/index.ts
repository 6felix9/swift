import { buildReferralSuggestionPrompt } from './referral-suggestions';
import { buildInsuranceRejectionSuggestionPrompt } from './insurance-rejection-suggestions';
import type { Message } from "@/lib/suggestionService";

export interface SuggestionPromptBuilder {
  buildPrompt: (messages: Message[], aiLastResponse: string) => string;
  name: string;
  description: string;
}

export const SUGGESTION_PROMPT_BUILDERS: Record<string, SuggestionPromptBuilder> = {
  'REFERRAL_ANNUAL_REVIEW': {
    buildPrompt: buildReferralSuggestionPrompt,
    name: 'Referral Suggestions',
    description: 'Suggestions for referral-seeking conversations'
  },
  'INSURANCE_REJECTION_HANDLING': {
    buildPrompt: buildInsuranceRejectionSuggestionPrompt,
    name: 'Insurance Rejection Suggestions',
    description: 'Suggestions for handling insurance claim rejections'
  }
};

export function getSuggestionPromptBuilder(scenarioId: string): SuggestionPromptBuilder {
  return SUGGESTION_PROMPT_BUILDERS[scenarioId] || SUGGESTION_PROMPT_BUILDERS['REFERRAL_ANNUAL_REVIEW'];
}

export { buildReferralSuggestionPrompt, buildInsuranceRejectionSuggestionPrompt };