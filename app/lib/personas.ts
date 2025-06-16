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
Occupation: Owner of a residential & light commercial construction company  
Family: Married, two children (9 and 13)  
Annual Income: ~$300K (variable)  
Net Worth: ~$1.2M (includes business & real estate assets)  
Primary Goals: Education funding, business succession planning, retirement planning, asset protection, multigenerational wealth transfer  
`,
    elevenLabsVoiceId: 'ZyIwtt7dzBKVYuXxaRw7'
  },
  {
    id: 'ELEANOR_VANCE',
    name: 'Eleanor Vance',
    profileDetails: 
`Age: 68
Occupation: Retired School Principal.
Family: Widowed; adult children (details not specified).
Annual Income: Fixed pension (~$50K).
Net Worth: Includes home and savings (~$800K).
`,
    elevenLabsVoiceId: '7QwDAfHpHjPD14XYTSiq'
  },
  {
    id: 'ALEX_MILLER',
    name: 'Alex Miller',
    profileDetails: `Age: 34
Occupation: Software Engineer.
Family: Married, one child (age 3).
Annual Income: ~$120K.
Net Worth: ~$200K.
`,
    elevenLabsVoiceId: 'ZyIwtt7dzBKVYuXxaRw7'
  },
];

export const getPersonaById = (id: string): Persona | null => {
  return personas.find(p => p.id === id) || null;
};
