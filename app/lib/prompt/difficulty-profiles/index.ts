import { referralDifficultyProfileInstructions } from './referral-difficulty-template';
import { insuranceRejectionDifficultyProfileInstructions } from './insurance-rejection-difficulty-template';
import { genericDifficultyProfileInstructions } from './generic-difficulty-template';

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
  },
  'GENERIC': {
    template: genericDifficultyProfileInstructions,
    name: 'Generic Profile',
    description: 'Difficulty profile for generic scenarios'
  }
};