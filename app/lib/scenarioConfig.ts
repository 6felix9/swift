import type { Difficulty } from "@/lib/difficultyTypes";

export interface DifficultyDescription {
  id: Difficulty;
  title: string;
  description: string;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  userRole: string;
  scenarioContext: string;
  personas: string[];
  personaOpeningLine: string;
  evaluationPromptKey: string;
  difficultyDescriptions: DifficultyDescription[];
  difficultyProfileTemplateKey: string;
  suggestionPromptKey: string;
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

export const SCENARIO_CONFIGS: Record<string, ScenarioConfig> = {
  'REFERRAL_ANNUAL_REVIEW': {
    id: 'REFERRAL_ANNUAL_REVIEW',
    name: 'Referral Skills: Annual Review Meeting',
    description: 'Practice seeking referrals during a routine annual review meeting.',
    userRole: 'Financial Advisor',
    scenarioContext: `You are in a scheduled annual review meeting with your client, reviewing portfolio performance and discussing future goals.`,
    personas: ['CHLOE_ZHANG', 'SARAH_LEE'],
    personaOpeningLine: "Alright, thanks for setting this up. So, what did you want to cover today?",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions',
    difficultyDescriptions: REFERRAL_DIFFICULTY_DESCRIPTIONS,
    difficultyProfileTemplateKey: 'REFERRAL_ANNUAL_REVIEW',
    suggestionPromptKey: 'REFERRAL_ANNUAL_REVIEW'
  },
  'INSURANCE_REJECTION_HANDLING': {
    id: 'INSURANCE_REJECTION_HANDLING',
    name: 'Claim Rejection: Home Insurance Issue',
    description: 'Practice handling a distressed client whose home insurance claim has been rejected.',
    userRole: 'Financial Advisor',
    scenarioContext: `You are preparing to speak with a client who has called unexpectedly. Their significant home insurance claim for water damage has just been rejected by "SecureHome Mutual". They received a letter with technical jargon and reasons for rejection they don't fully understand.`,
    personas: ['ELEANOR_VANCE', 'ALEX_MILLER'],
    personaOpeningLine: "Hello? I'm calling about an insurance matter. I've received a claim rejection letter from SecureHome Mutual regarding my recent water damage claim, and I need some assistance reviewing it.",
    evaluationPromptKey: 'trainingInsuranceRejectionEvaluationInstructions',
    difficultyDescriptions: INSURANCE_REJECTION_DIFFICULTY_DESCRIPTIONS,
    difficultyProfileTemplateKey: 'INSURANCE_REJECTION_HANDLING',
    suggestionPromptKey: 'INSURANCE_REJECTION_HANDLING'
  }
};

export function getScenarioConfig(scenarioId: string): ScenarioConfig {
  return SCENARIO_CONFIGS[scenarioId] || SCENARIO_CONFIGS['REFERRAL_ANNUAL_REVIEW'];
}

export function getAllScenarioConfigs(): ScenarioConfig[] {
  return Object.values(SCENARIO_CONFIGS);
}

export function getDifficultyDescriptions(scenarioId: string): DifficultyDescription[] {
  const config = getScenarioConfig(scenarioId);
  return config.difficultyDescriptions;
}