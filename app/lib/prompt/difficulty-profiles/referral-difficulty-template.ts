export const referralDifficultyProfileInstructions = `
  SYSTEM (Difficulty-Profile Builder)
  This is <<DIFFICULTY>> mode.
  ────────────────────────────────────
  Goal • Produce ONE JSON object describing a client profile, tuned to the requested difficulty:
    ▸ easy   – guarded but open; trust can be won
    ▸ medium – cautious, analytic; one slip ruins it
    ▸ hard   – ultra-guarded; referral is virtually impossible

  Variation • To avoid copy-paste feel:
    1. Each field below offers an **array** of allowed values.
    2. Shuffle mentally, then PICK ONE value per field.
    3. Numeric ranges: output any real number within the range (inclusive).

  Output rules
    • Exactly ONE valid JSON object, no markdown, no comments.
    • Preserve the root-level key order shown in the template.
    • Strings in double quotes; numbers as numbers.

  ──────────────── FIELDS & OPTION POOLS ────────────────
  (relationalDynamics)
    currentTrustLevel:
      easy   ["Quite confident—still verifies", "High but testing"]
      medium ["Measured", "Wary respect", "Trust on probation"]
      hard   ["Skeptical", "Fragile trust", "Recently shaken"]
    clientTenure:
      easy   ["≈3–4 years", "Several annual reviews"]
      medium ["1–2 years", "Early-stage relationship"]
      hard   ["< 1 year", "Newly onboarded"]

  (psychologicalState)
    communicationStyle:
      easy   ["Candid yet detail-seeking", "Open—wants specificity"]
      medium ["Guarded, asks for data", "Structured & critical"]
      hard   ["Brief, defensive", "Filters every statement"]
    financialStressLevel:
      easy   ["Moderate pressure", "Cash-flow watchful"]
      medium ["Elevated stress", "Revenue dip underway"]
      hard   ["Severe stress", "Dealing with major loss"]
    decisionMakingStyle:
      easy   ["Methodical, spouse nod required"]
      medium ["Consensus with spouse + accountant"]
      hard   ["Committee incl. spouse, attorney, CFO—slow"]

  (situationalContext)
    referralTriggers:
      easy ["Active—client just praised advisor","Friend already asked about advisor"]
      medium ["Dormant—no obvious trigger"]
      hard   ["None—network stable & private"]
    primaryMotivations:
      easy   ["Maintain reputation", "avoid mis-step"]
      medium ["Risk mitigation", "image control"]
      hard   ["Protect brand", "zero downside tolerance"]

  (coreVariables)
    baselineTrust:
      easy   ["Moderate–High", "Fairly trusting"]
      medium ["Moderate–Low", "Cautiously low"]
      hard   ["Low"]
    slipTolerance:           easy 2 | medium 1 | hard 0
    trustDecayRate:          easy 0.40–0.50 | medium 0.60–0.80 | hard 0.95–1.00
    requiredSpecificityOfValue:
      easy   ["Concrete example", "Clear scenario"]
      medium ["Data + case study", "Quantified comparison"]
      hard   ["Verified metrics + timeline", "Third-party-validated dataset"]
    privacySensitivity:
      easy   ["Normal"]
      medium ["High", "Standard"]
      hard   ["Very high", "Strict"]
    decisionComplexity:
      easy   ["Spouse check", "Partner sign-off"]
      medium ["Spouse + advisor review", "Dual-advisor approval"]
      hard   ["Full committee review"]
    outsideValidation:
      easy   ["Optional testimonial"]
      medium ["Named past client"]
      hard   ["Third-party audit", "Abrupt disengagement"]
    referralThresholdScore:  easy 13–16 | medium 17–19 | hard ≥20
    responseStyleToPressure:
      easy   ["Polite hesitation"]
      medium ["Cold deferral"]
      hard   ["Immediate withdrawal"]
    positiveSignalRequirement: easy 1 | medium 3 | hard 4
    networkAccessOpenness:
      easy   ["1 name after proof"]
      medium ["Will 'think about it'"]
      hard   ["No introductions promised"]
    followThroughRigidity:
      easy   ["Joint call preferred", "Co-ordinated email acceptable"]
      medium ["Formal deck required", "Proposal document needed"]
      hard   ["Detailed dossier before intro"]

  ──────────────── JSON TEMPLATE (key order) ────────────────
  {
    "difficulty": "<<DIFFICULTY>>",
    "relationalDynamics": { ... },
    "psychologicalState": { ... },
    "situationalContext": { ... },
    "coreVariables": { ... }
  }
`;