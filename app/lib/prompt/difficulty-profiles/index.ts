import { referralDifficultyProfileInstructions } from './referral-difficulty-template';
import { insuranceRejectionDifficultyProfileInstructions } from './insurance-rejection-difficulty-template';

export interface DifficultyProfileTemplate {
  template: string;
  name: string;
  description: string;
}

export const DIFFICULTY_PROFILE_TEMPLATES: Record<string, DifficultyProfileTemplate> = {
  'REFERRAL_ANNUAL_REVIEW': {
    template: referralDifficultyProfileInstructions,
    name: 'Referral Asking Profile',
    description: 'Difficulty profile for referral-seeking scenarios'
  },
  'INSURANCE_REJECTION_HANDLING': {
    template: insuranceRejectionDifficultyProfileInstructions,
    name: 'Insurance Rejection Profile',
    description: 'Difficulty profile for handling insurance claim rejections'
  }
};

export function getDifficultyProfileTemplate(scenarioId: string): DifficultyProfileTemplate {
  return DIFFICULTY_PROFILE_TEMPLATES[scenarioId] || DIFFICULTY_PROFILE_TEMPLATES['REFERRAL_ANNUAL_REVIEW'];
}

export { referralDifficultyProfileInstructions, insuranceRejectionDifficultyProfileInstructions };