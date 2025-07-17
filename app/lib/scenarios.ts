import { TrainingDomain } from './types';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  domain: TrainingDomain;
  userRole: string;
  scenarioContext: string;
  personas: string[]; // IDs of Personas from personas.ts
  personaOpeningLine: string; // Specific to this persona IN THIS SCENARIO
  evaluationPromptKey: string; // Key to retrieve evaluation prompt from PROMPTS object
  // scenarioSpecificBehavior?: string; // Optional: AI behavior notes for this scenario
}

export const scenarioDefinitions: ScenarioDefinition[] = [
  // Financial Advisor Scenarios
  {
    id: 'REFERRAL_ANNUAL_REVIEW',
    name: 'Referral Skills: Annual Review Meeting',
    description: 'Practice seeking referrals during a routine annual review meeting.',
    domain: 'financial-advisor',
    userRole: 'Financial Advisor',
    scenarioContext: `You are in a scheduled annual review meeting with your client, reviewing portfolio performance and discussing future goals.`,
    personas: [
      // 'LIANG_CHEN', 
      'CHLOE_ZHANG', 
      'SARAH_LEE'],
    personaOpeningLine: "Alright, thanks for setting this up. So, what did you want to cover today?",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions'
  },
  {
    id: 'INSURANCE_REJECTION_HANDLING',
    name: 'Claim Rejection: Home Insurance Issue',
    description: 'Practice handling a distressed client whose home insurance claim has been rejected.',
    domain: 'financial-advisor',
    userRole: 'Financial Advisor',
    scenarioContext: `You are preparing to speak with a client who has called unexpectedly. Their significant home insurance claim for water damage has just been rejected by "SecureHome Mutual". They received a letter with technical jargon and reasons for rejection they don't fully understand.`,
    personas: ['ELEANOR_VANCE', 'ALEX_MILLER'],
    personaOpeningLine: "Hello? I'm calling about an insurance matter. I've received a claim rejection letter from SecureHome Mutual regarding my recent water damage claim, and I need some assistance reviewing it.",
    evaluationPromptKey: 'trainingInsuranceRejectionEvaluationInstructions'
  },

  // Healthcare Scenarios (Placeholders)
  {
    id: 'PATIENT_CONSULTATION',
    name: 'Patient Consultation: Medication Concerns',
    description: 'Practice discussing medication side effects and compliance with a concerned patient.',
    domain: 'healthcare',
    userRole: 'Healthcare Professional',
    scenarioContext: `You are speaking with a patient who has been experiencing side effects from their prescribed medication and is considering stopping it without consulting their doctor.`,
    personas: ['CHLOE_ZHANG'], // Using existing persona as placeholder
    personaOpeningLine: "I've been having some issues with the medication you prescribed last month, and I'm thinking about stopping it.",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions' // Using existing prompt as placeholder
  },
  {
    id: 'EMERGENCY_RESPONSE',
    name: 'Emergency Response: Anxious Family Member',
    description: 'Practice communicating with worried family members during a medical emergency.',
    domain: 'healthcare',
    userRole: 'Healthcare Professional',
    scenarioContext: `A family member is extremely worried about their loved one who was just admitted to the emergency department. They need clear communication and reassurance.`,
    personas: ['SARAH_LEE'], // Using existing persona as placeholder
    personaOpeningLine: "Please, can you tell me what's happening with my mother? No one has told us anything and we're really scared.",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions' // Using existing prompt as placeholder
  },

  // Customer Service Scenarios (Placeholders)
  {
    id: 'COMPLAINT_HANDLING',
    name: 'Customer Complaint: Product Defect',
    description: 'Practice handling an upset customer whose product has malfunctioned multiple times.',
    domain: 'customer-service',
    userRole: 'Customer Service Representative',
    scenarioContext: `A customer is calling about a product they purchased that has broken down three times in the past month. They are frustrated and demanding a full refund.`,
    personas: ['ELEANOR_VANCE'], // Using existing persona as placeholder
    personaOpeningLine: "This is ridiculous! I've had this product for a month and it's broken three times already. I want my money back!",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions' // Using existing prompt as placeholder
  },
  {
    id: 'PRODUCT_SUPPORT',
    name: 'Technical Support: Setup Assistance',
    description: 'Practice helping a customer who is struggling to set up their new product.',
    domain: 'customer-service',
    userRole: 'Customer Service Representative',
    scenarioContext: `A customer has purchased a complex product and is having difficulty with the initial setup. They are becoming increasingly frustrated with the process.`,
    personas: ['ALEX_MILLER'], // Using existing persona as placeholder
    personaOpeningLine: "I've been trying to set this up for two hours and nothing is working. The instructions don't make any sense to me.",
    evaluationPromptKey: 'trainingReferralEvaluationInstructions' // Using existing prompt as placeholder
  },  
];

export const getScenarioDefinitionById = (id: string): ScenarioDefinition | undefined => {
  return scenarioDefinitions.find(s => s.id === id);
};
