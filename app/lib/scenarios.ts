export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  userRole: string;
  scenarioContext: string;
  personas: string[]; // IDs of Personas from personas.ts
  personaOpeningLine: string; // Specific to this persona IN THIS SCENARIO
  evaluationPromptKey: string; // Key to retrieve evaluation prompt from PROMPTS object
  // scenarioSpecificBehavior?: string; // Optional: AI behavior notes for this scenario
}

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    id: 'REFERRAL_ANNUAL_REVIEW',
    name: 'Referral Skills: Annual Review Meeting',
    description: 'Practice seeking referrals during a routine annual review meeting.',
    userRole: 'Financial Advisor',
    scenarioContext: `You are in a scheduled annual review meeting with your client, reviewing portfolio performance and discussing future goals.`,
    personas: ['LIANG_CHEN', 'CHLOE_ZHANG', 'SARAH_LEE'],
    personaOpeningLine: "Alright, thanks for setting this up. So, what did you want to cover today?",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions'
  },
  {
    id: 'INSURANCE_REJECTION_HANDLING',
    name: 'Claim Rejection: Home Insurance Issue',
    description: 'Practice handling a distressed client whose home insurance claim has been rejected.',
    userRole: 'Financial Advisor',
    scenarioContext: `You are preparing to speak with a client who has called unexpectedly. Their significant home insurance claim for water damage has just been rejected by "SecureHome Mutual". They received a letter with technical jargon and reasons for rejection they don't fully understand.`,
    personas: ['ELEANOR_VANCE', 'ALEX_MILLER'],
    personaOpeningLine: "Hello? I'm calling about an insurance matter. I've received a claim rejection letter from SecureHome Mutual regarding my recent water damage claim, and I need some assistance reviewing it.",
    evaluationPromptKey: 'trainingInsuranceRejectionEvaluationInstructions'
  },
  
  // {
  //   id: 'FIRST_HOME_PLANNING',
  //   name: 'Financial Planning: First-Time Homebuyer Consultation',
  //   description: 'Practice guiding a young couple preparing to buy their first home.',
  //   userRole: 'Financial Advisor',
  //   scenarioContext: `You're meeting with a couple looking to buy their first home within the next 12–18 months. They’re unsure how to balance their down payment savings with emergency funds, insurance, and long-term investing. They want clarity on trade-offs and timelines.`,
  //   defaultPersonaId: 'ALEX_MILLER',
  //   personaOpeningLine: "We’ve been talking about buying a place next year, but honestly, we’re not sure where to start. Do we just save everything for the down payment? What happens to everything else we’ve been planning?",
  //   evaluationPromptKey: 'trainingGoalPlanningEvaluationInstructions'
  // }  
];

export const getScenarioDefinitionById = (id: string): ScenarioDefinition | undefined => {
  return scenarioDefinitions.find(s => s.id === id);
};
