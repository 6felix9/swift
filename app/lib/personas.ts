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
  avatarRole: string;
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
    elevenLabsVoiceId: 'ZyIwtt7dzBKVYuXxaRw7',
    avatarRole: ''
  },
  {
    id: 'CHLOE_ZHANG', 
    name: 'Chloe Zhang', 
    profileDetails:
`Age: 32
Occupation: Senior Marketing Manager.
Family: Single; recently moved to a new city.
Annual Income: ~$95K (stable salary).
Net Worth: Savings and investments (~$150K), renting an apartment.
Primary Goals: Saving for a down payment on a first home, maximizing long-term investment growth, building a robust emergency fund, understanding retirement planning options.
`,
    elevenLabsVoiceId: 'wrxvN1LZJIfL3HHvffqe',
    avatarRole: '20241014-people-bbox'
  },
  {
    id: 'SARAH_LEE', 
    name: 'Sarah Lee', 
    profileDetails:
`Age: 27
Occupation: Project Coordinator at a Tech Startup.
Family: Engaged, planning wedding next year.
Annual Income: ~$70K (stable salary).
Net Worth: Savings and investments (~$50K), potentially some student loan debt.
Primary Goals: Saving for wedding and honeymoon, paying off student loans, starting comprehensive retirement savings, budgeting for future travel.
`,
    elevenLabsVoiceId: 'ckdz71REaQKVx2gnOQjQ',
    avatarRole: '20241014-people-bbox'
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
    elevenLabsVoiceId: '7QwDAfHpHjPD14XYTSiq',
    avatarRole: ''
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
    elevenLabsVoiceId: 'ZyIwtt7dzBKVYuXxaRw7',
    avatarRole: ''
  },
];

export const getPersonaById = (id: string): Persona | null => {
  return personas.find(p => p.id === id) || null;
};
