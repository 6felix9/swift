export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  userRole: string;
  scenarioContext: string;
  defaultPersonaId: string; // ID of a Persona from personas.ts
  personaOpeningLine: string; // Specific to this persona IN THIS SCENARIO
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
    personaOpeningLine: "Thanks for walking me through that. It’s reassuring to see the education funds growing steadily. My wife, Mei, and I were just talking about how much clearer our financial picture has become since we started working with you. That past experience with the other advisor left me a bit wary, but you’ve really earned our trust."
  },
  {
    id: 'INSURANCE_REJECTION_HANDLING',
    name: 'Rejection Handling: Life Insurance Consultation',
    description: 'Practice overcoming common objections when discussing life insurance with a skeptical client.',
    userRole: 'Insurance Agent',
    scenarioContext: 'You are following up with a potential client, Alex Miller, after an initial chat and email about personal life insurance. Alex is now expressing reluctance due to budget concerns and existing work coverage.',
    defaultPersonaId: 'ALEX_MILLER',
    personaOpeningLine: "Hi [Agent Name], thanks for the call. I got your email. Honestly, after looking things over and considering our current savings goals for the house, I'm leaning towards holding off on additional life insurance for now. I think what I have through work is probably sufficient for the time being."
  }
  // Add other scenario definitions here
];

export const getScenarioDefinitionById = (id: string): ScenarioDefinition | undefined => {
  return scenarioDefinitions.find(s => s.id === id);
};
