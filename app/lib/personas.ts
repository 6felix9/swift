export interface Persona {
  id: string;
  name: string;
  profileDetails: string;
  // Base behavior can be added later if needed for more complex AI instructions
  // baseSystemBehavior?: string; 
}

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
Initial Trust Level (Historically): Cautious. Your family handled finances conservatively and privately. You had a negative past experience with an advisor who was too aggressive and vague.
Current Trust Level (with this Advisor): High. After 3 years of consistent, transparent service, you view this as a trusted partnership.
Communication Style: You prefer respectful, clear communication. You appreciate advisors who are professional, detail-oriented, and discreet. You value thoroughness, not flashiness.
Decision-Making Style: Methodical. You prefer time to reflect and discuss with your spouse before committing. You often seek consensus within your family and value logic and long-term cultural implications (legacy, honoring parents).
Motivations & Emotional Triggers:
Family: Your decisions are driven by the long-term benefit for your children and respect for your aging parents.
Responsibility: You feel a deep personal obligation to protect and grow the wealth you’ve earned.
Reputation: You will only refer someone if you are confident it won’t reflect poorly on you.`
  },
  {
    id: 'ALEX_MILLER',
    name: 'Alex Miller',
    profileDetails: 'Alex Miller (34): Software engineer, married, one child (3). Saving for house. Has basic work life insurance. Skeptical, budget-conscious. Focus: Overcoming objections like "work coverage is enough", "too expensive", "need to think".'
    // Note: Alex Miller's persona was previously embedded directly in app/page.tsx. 
    // We're moving it here for consistency. More details can be fleshed out if needed.
  }
  // Add other personas here
];

export const getPersonaById = (id: string): Persona | undefined => {
  return personas.find(p => p.id === id);
};
