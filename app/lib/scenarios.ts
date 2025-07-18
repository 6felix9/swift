import { TrainingDomain } from './types';
import type { Difficulty } from './difficultyTypes';

export interface DifficultyDescription {
  id: Difficulty;
  title: string;
  description: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  domain: TrainingDomain;
  userRole: string;
  personaRole: string;
  scenarioContext: string;
  personas: string[]; // IDs of Personas from personas.ts
  personaOpeningLine: string; // Specific to this persona IN THIS SCENARIO
  evaluationPromptKey: string; // Key to retrieve evaluation prompt from PROMPTS object
  difficultyDescriptions?: DifficultyDescription[]; // Optional difficulty configurations
  difficultyProfileTemplateKey?: string; // Optional difficulty profile template key
  suggestionPromptKey?: string; // Optional suggestion prompt key
}

const REFERRAL_DIFFICULTY_DESCRIPTIONS: DifficultyDescription[] = [
  {
    id: 'easy',
    title: 'Easy ⭐',
    description: `Guarded but open. Moderate-high trust that can grow with a clear, data-driven win. Allows one minor slip; ask only after demonstrating tangible value.`
  },
  {
    id: 'medium',
    title: 'Medium ⭐⭐',
    description: `Cautious and analytical. Trust on probation—zero tolerance for mis-steps. Requires rigorous evidence, case studies, and low-pressure timing before any referral talk.`
  },
  {
    id: 'hard',
    title: 'Hard ⭐⭐⭐',
    description: `Ultra-guarded, deeply skeptical. Trust starts low and collapses at the first mistake. Formal audits, multi-gatekeeper approvals, and near-impossible referral access.`
  }
];

const INSURANCE_REJECTION_DIFFICULTY_DESCRIPTIONS: DifficultyDescription[] = [
  {
    id: 'easy',
    title: 'Easy ⭐',
    description: `Upset but cooperative. Willing to work through the appeals process with guidance. Trusts advisor's expertise and maintains hope for resolution.`
  },
  {
    id: 'medium',
    title: 'Medium ⭐⭐',
    description: `Frustrated and stressed. Requires careful emotional handling and frequent reassurance. May need convincing to pursue appeals, anxious about timelines and costs.`
  },
  {
    id: 'hard',
    title: 'Hard ⭐⭐⭐',
    description: `Extremely distressed and potentially hostile. May blame advisor, threaten legal action, or demand immediate solutions. Requires exceptional empathy and crisis management.`
  }
];

const HEALTHCARE_DIFFICULTY_DESCRIPTIONS: DifficultyDescription[] = [
  {
    id: 'easy',
    title: 'Easy ⭐',
    description: `Patient is calm, articulate, and trusts your expertise. They are seeking clear information and are open to your recommendations.`
  },
  {
    id: 'medium',
    title: 'Medium ⭐⭐',
    description: `Patient is anxious and has some misconceptions from online research. Requires empathy, patience, and clear, simple explanations to build trust.`
  },
  {
    id: 'hard',
    title: 'Hard ⭐⭐⭐',
    description: `Patient is distrustful, possibly confrontational, and has strong, misinformed opinions. Requires advanced de-escalation and rapport-building skills.`
  }
];

const CUSTOMER_SERVICE_DIFFICULTY_DESCRIPTIONS: DifficultyDescription[] = [
  {
    id: 'easy',
    title: 'Easy ⭐',
    description: `Customer is frustrated but polite. They clearly explain the issue and are willing to follow troubleshooting steps.`
  },
  {
    id: 'medium',
    title: 'Medium ⭐⭐',
    description: `Customer is angry and demanding an immediate fix or refund. They may interrupt frequently and express significant dissatisfaction with the company.`
  },
  {
    id: 'hard',
    title: 'Hard ⭐⭐⭐',
    description: `Customer is irate, threatening to escalate to social media or legal action. They are uncooperative and may use personal attacks.`
  }
];

export const scenarioDefinitions: ScenarioDefinition[] = [
  // Financial Advisor Scenarios
  {
    id: 'REFERRAL_ANNUAL_REVIEW',
    name: 'Referral Skills: Annual Review Meeting',
    description: 'Practice seeking referrals during a routine annual review meeting.',
    domain: 'financial-advisor',
    userRole: 'Financial Advisor',
    personaRole: 'Client',
    scenarioContext: `You are in a scheduled annual review meeting with your client, reviewing portfolio performance and discussing future goals.`,
    personas: [
      'CHLOE_ZHANG', 
      'SARAH_LEE'
    ],
    personaOpeningLine: "Alright, thanks for setting this up. So, what did you want to cover today?",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions',
    difficultyDescriptions: REFERRAL_DIFFICULTY_DESCRIPTIONS,
    difficultyProfileTemplateKey: 'REFERRAL_ANNUAL_REVIEW',
    suggestionPromptKey: 'REFERRAL_ANNUAL_REVIEW'
  },
  {
    id: 'INSURANCE_REJECTION_HANDLING',
    name: 'Claim Rejection: Home Insurance Issue',
    description: 'Practice handling a distressed client whose home insurance claim has been rejected.',
    domain: 'financial-advisor',
    userRole: 'Financial Advisor',
    personaRole: 'Client',
    scenarioContext: `You are preparing to speak with a client who has called unexpectedly. Their significant home insurance claim for water damage has just been rejected by "SecureHome Mutual". They received a letter with technical jargon and reasons for rejection they don't fully understand.`,
    personas: ['ELEANOR_VANCE'],
    personaOpeningLine: "Hello? I'm calling about an insurance matter. I've received a claim rejection letter from SecureHome Mutual regarding my recent water damage claim, and I need some assistance reviewing it.",
    evaluationPromptKey: 'trainingInsuranceRejectionEvaluationInstructions',
    difficultyDescriptions: INSURANCE_REJECTION_DIFFICULTY_DESCRIPTIONS,
    difficultyProfileTemplateKey: 'INSURANCE_REJECTION_HANDLING',
    suggestionPromptKey: 'INSURANCE_REJECTION_HANDLING'
  },

  // Healthcare Scenarios (Placeholders)
  {
    id: 'PATIENT_CONSULTATION',
    name: 'Patient Consultation: Medication Concerns',
    description: 'Practice discussing medication side effects and compliance with a concerned patient.',
    domain: 'healthcare',
    userRole: 'Healthcare Professional',
    personaRole: 'Patient',
    scenarioContext: `You are speaking with a patient who has been experiencing side effects from their prescribed medication and is considering stopping it without consulting their doctor.`,
    personas: ['MARIA_GOMEZ'], 
    personaOpeningLine: "I've been having some issues with the medication you prescribed last month, and I'm thinking about stopping it.",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions', // Using existing prompt as placeholder
    difficultyDescriptions: HEALTHCARE_DIFFICULTY_DESCRIPTIONS,
    difficultyProfileTemplateKey: 'PATIENT_CONSULTATION',
    suggestionPromptKey: '',
  },

  // Customer Service Scenarios (Placeholders)
  {
    id: 'COMPLAINT_HANDLING',
    name: 'Customer Complaint: Product Defect',
    description: 'Practice handling an upset customer whose product has malfunctioned multiple times.',
    domain: 'customer-service',
    userRole: 'Customer Service Representative',
    personaRole: 'Customer',
    scenarioContext: `A customer is calling about a product they purchased that has broken down three times in the past month. They are frustrated and demanding a full refund.`,
    personas: ['ANGELA_BROWN'],
    personaOpeningLine: "This is ridiculous! I've had this product for a month and it's broken three times already. I want my money back!",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions', // Using existing prompt as placeholder
    difficultyDescriptions: CUSTOMER_SERVICE_DIFFICULTY_DESCRIPTIONS,
    difficultyProfileTemplateKey: 'COMPLAINT_HANDLING',
    suggestionPromptKey: '',
  },
];

export const getScenarioDefinitionById = (id: string): ScenarioDefinition | undefined => {
  return scenarioDefinitions.find(s => s.id === id);
};

export const getDifficultyDescriptions = (scenarioId: string): DifficultyDescription[] => {
  const scenario = getScenarioDefinitionById(scenarioId);
  return scenario?.difficultyDescriptions || [];
};
