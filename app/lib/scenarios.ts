export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  userRole: string;
  scenarioContext: string;
  defaultPersonaId: string; // ID of a Persona from personas.ts
  personaOpeningLine: string; // Specific to this persona IN THIS SCENARIO
  evaluationPromptKey: string; // Key to retrieve evaluation prompt from PROMPTS object
  // scenarioSpecificBehavior?: string; // Optional: AI behavior notes for this scenario
}

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    id: 'REFERRAL_ANNUAL_REVIEW',
    name: 'Referral Skills: Annual Review Meeting',
    description: 'Practice seeking referrals during a positive annual review meeting.',
    userRole: 'Financial Advisor',
    scenarioContext: `You are in a scheduled annual review meeting with your client. The meeting has been positive so far. Your client has just shared some good news regarding the performance of their children's education funds, and you've briefly discussed the initial steps for business continuity planning, which they found helpful.`,
    defaultPersonaId: 'LIANG_CHEN',
    personaOpeningLine: "Thanks for walking me through that. It’s reassuring to see the education funds growing steadily. My wife, Mei, and I were just talking about how much clearer our financial picture has become since we started working with you. That past experience with the other advisor left me a bit wary, but you’ve really earned our trust.",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions'
  },
  {
    id: 'INSURANCE_REJECTION_HANDLING',
    name: 'Claim Rejection: Home Insurance Issue',
    description: 'Practice handling a distressed client whose home insurance claim has been rejected.',
    userRole: 'Financial Advisor',
    scenarioContext: `Your client, Mrs. Eleanor Vance, has called unexpectedly. She is very distressed because her significant home insurance claim for water damage has just been rejected by "SecureHome Mutual". She received a letter with technical jargon she doesn't fully understand, citing "neglect" or "lack of maintenance" regarding her roof, which she disputes.`,
    defaultPersonaId: 'ELEANOR_VANCE',
    personaOpeningLine: "Hello? It's Eleanor Vance. I'm so sorry to bother you out of the blue, but I'm quite upset. I've just received a letter from SecureHome Mutual about my water damage claim... they've rejected it! I simply don't understand it, something about the roof... Can you help me make sense of this?",
    evaluationPromptKey: 'trainingInsuranceRejectionEvaluationInstructions'
  },
  // Add other scenario definitions here
  {
    id: 'FIRST_HOME_PLANNING',
    name: 'Financial Planning: First-Time Homebuyer Consultation',
    description: 'Practice guiding a young couple preparing to buy their first home.',
    userRole: 'Financial Advisor',
    scenarioContext: `You're meeting with a couple looking to buy their first home within the next 12–18 months. They’re unsure how to balance their down payment savings with emergency funds, insurance, and long-term investing. They want clarity on trade-offs and timelines.`,
    defaultPersonaId: 'ALEX_MILLER',
    personaOpeningLine: "We’ve been talking about buying a place next year, but honestly, we’re not sure where to start. Do we just save everything for the down payment? What happens to everything else we’ve been planning?",
    evaluationPromptKey: 'trainingGoalPlanningEvaluationInstructions'
  }  
];

export const getScenarioDefinitionById = (id: string): ScenarioDefinition | undefined => {
  return scenarioDefinitions.find(s => s.id === id);
};
