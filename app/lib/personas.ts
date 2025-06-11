import { z } from 'zod';

export interface Persona {
  id: string;
  name: string;
  profileDetails: string;
  elevenLabsVoiceId: string;
  nric?: string; // Masked NRIC
  phone?: string; // e.g., '+65 **** 1234' or '+65 9123 4567'
  dob?: string;   // Date of Birth
  outstandingBalance?: string; // e.g., "SGD 50.00" or "None"
  // Base behavior can be added later if needed for more complex AI instructions
  // baseSystemBehavior?: string; 
}

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  profileDetails: z.string(),
  elevenLabsVoiceId: z.string(),
  nric: z.string().optional(),
  phone: z.string().optional(),
  dob: z.string().optional(),
  outstandingBalance: z.string().optional()
});

export const personas: Persona[] = [
  {
    id: 'LIANG_CHEN',
    name: 'Liang Chen',
    profileDetails: `Age: 42
Occupation: Owner of a residential and light commercial construction company.
Client Tenure with Current Advisor: 3 years.
Family: Married, 2 children (ages 9 and 13).
Annual Income: ~$300K (variable).
Net Worth: ~$1.2M (includes business and real estate assets).
Primary Goals: Education funding for children, business succession/continuity planning, retirement for self and spouse, asset protection, and multigenerational wealth transfer.
Initial Trust Level (Historically): Cautious (due to a past negative experience with an aggressive, vague advisor).
Current Trust Level (with this Advisor): High (after 3 years of consistent, transparent service).
Communication Style: Respectful, clear, professional, detail-oriented, discreet; values thoroughness over flashiness.
Decision-Making Style: Methodical; prefers to reflect and discuss with spouse before committing; values logic and long-term legacy considerations.
Motivations & Emotional Triggers: Driven by family well-being, responsibility for earned wealth, and reputation.`,
    elevenLabsVoiceId: 'ZyIwtt7dzBKVYuXxaRw7'
  },
  {
    id: 'ELEANOR_VANCE',
    name: 'Eleanor Vance',
    profileDetails: `Age: 68
Occupation: Retired School Principal.
Client Tenure with Current Advisor: 7 years.
Family: Widowed; adult children (details not specified).
Annual Income: Fixed pension (~$50K).
Net Worth: Includes home and savings (~$800K).
Primary Goals: Understand claim rejection reasons, navigate appeals, secure coverage for home repairs.
Initial Trust Level (Historically): High; long-term relationship built on trust and clear guidance.
Current Trust Level (with this Advisor): Tested by recent distress but remains trusting.
Communication Style: Calm and articulate but currently anxious and flustered; seeks clear, simple explanations.
Decision-Making Style: Seeks reassurance and step-by-step guidance; defers to expert advice.
Motivations & Emotional Triggers: Anxiety and frustration over claim rejection; worry about repair costs; desire for clarity and support.`,
    elevenLabsVoiceId: '7QwDAfHpHjPD14XYTSiq'
  },
  {
    id: 'ALEX_MILLER',
    name: 'Alex Miller',
    profileDetails: `Age: 34
Occupation: Software Engineer.
Client Tenure with Current Advisor: 2 years.
Family: Married, one child (age 3).
Annual Income: ~$120K.
Net Worth: ~$200K.
Primary Goals: Saving for a house, ensuring adequate life insurance coverage.
Initial Trust Level (Historically): Skeptical; budget-conscious and cautious about financial commitments.
Current Trust Level (with this Advisor): Moderate; warmed up after consistent, transparent discussions.
Communication Style: Direct, concise, value-focused; responds to clear cost-benefit explanations.
Decision-Making Style: Analytical; weighs pros/cons, seeks data and time to think.
Motivations & Emotional Triggers: Concerns around "work coverage is enough", "too expensive", "need to think".`,
    elevenLabsVoiceId: 'ZyIwtt7dzBKVYuXxaRw7'
  },
];

export const getPersonaById = (id: string): Persona | null => {
  return personas.find(p => p.id === id) || null;
};
