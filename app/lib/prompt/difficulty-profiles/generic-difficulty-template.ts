export const genericDifficultyProfileInstructions = `
SYSTEM (Difficulty-Profile Builder)
This is <<DIFFICULTY>> mode.
────────────────────────────────────
Goal • Produce ONE JSON object that describes the client / user profile for **any scenario**, tuned to the requested difficulty:
  ▸ easy   – cooperative; requires modest effort  
  ▸ medium – cautious; one mis-step stalls progress  
  ▸ hard   – resistant; success is unlikely without perfect execution

Variation
1. Every field below must contain an **array** of 3-5 possible values.  
2. Shuffle mentally, then PICK ONE per field.  
3. Numeric ranges: output any real number within the stated bounds.

Output rules
• Exactly ONE valid JSON object, no markdown, no comments.  
• Preserve the root-level key order shown in the template.  
• Strings in double quotes; numbers as numbers.

────────────── FIELD GROUPS ──────────────
(relationalDynamics)           // how the user feels about the professional
  currentTrustLevel:           // e.g. "High but verifying"
  clientTenure:                // e.g. "Long-term client"

(psychologicalState)           // communication & emotional tone
  communicationStyle:          // e.g. "Direct but respectful"
  emotionalState:              // e.g. "Frustrated but hopeful"
  stressLevel:                 // financial, medical, or emotional—adapt to scenario
  decisionMakingStyle:         // e.g. "Spouse nod required"

(situationalContext)           // scenario-specific triggers & history
  primaryTrigger:              // what sparked today’s conversation
  priorExperience:             // past successes or conflicts in this domain
  urgency:                     // how time-sensitive the issue is

(coreVariables)                // knobs that control difficulty
  cooperationLevel:            // willingness to share info / do tasks
  understandingLevel:          // grasp of jargon & process
  expectationFlexibility:      // realism about timeline & outcome
  communicationFrequency:      // how often updates are demanded
  **OPTIONAL** scenario knobs: add any extra fields your scenario needs
    • For referrals: positiveSignalRequirement, networkAccessOpenness  
    • For insurance: claimComplexity, appealReadiness  
    • For healthcare: adherenceHistory, symptomSeverity

Difficulty guidance  
• EASY  → higher trust, low stress, generous slipTolerance (1–2), low threshold scores.  
• MEDIUM→ guarded trust, moderate stress, slipTolerance 0–1, mid-level thresholds.  
• HARD  → low trust, high stress, slipTolerance 0, high thresholds, more rigidity.

────────────── JSON TEMPLATE ──────────────
{
  "difficulty": "<<DIFFICULTY>>",
  "relationalDynamics": {
    "currentTrustLevel": "",
    "clientTenure": ""
  },
  "psychologicalState": {
    "communicationStyle": "",
    "emotionalState": "",
    "stressLevel": "",
    "decisionMakingStyle": ""
  },
  "situationalContext": {
    "primaryTrigger": "",
    "priorExperience": "",
    "urgency": ""
  },
  "coreVariables": {
    "cooperationLevel": "",
    "understandingLevel": "",
    "expectationFlexibility": "",
    "communicationFrequency": ""
    // add scenario-specific variables here
  }
}
`;
