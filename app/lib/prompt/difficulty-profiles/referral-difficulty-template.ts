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
      easy   ["Passive—friend hints at needing advice"]
      medium ["Dormant—no obvious trigger"]
      hard   ["None—network stable & private"]
    primaryMotivations:
      easy   ["Maintain reputation", "avoid mis-step"]
      medium ["Risk mitigation", "image control"]
      hard   ["Protect brand", "zero downside tolerance"]

  (coreVariables)
    baselineTrust:
      easy   ["Moderate–High","Fairly trusting","Comfortably positive","High but verifying"]
      medium ["Moderate–Low","Cautiously low","Guarded","Tentative confidence"]
      hard   ["Low","Minimal","Near-zero"]
    slipTolerance:           easy 1 | medium 0.5 | hard 0.1
    trustDecayRate:          easy 0.35–0.55 | medium 0.55–0.85 | hard 0.95–1.05
    requiredSpecificityOfValue:
      easy   ["Concrete example","Clear scenario","Simple success story","Plain-language illustration"]
      medium ["Data + case study","Quantified comparison","ROI chart","Evidence-backed summary"]
      hard   ["Verified metrics + timeline","Third-party-validated dataset","Audited performance report","Published white-paper"]
    privacySensitivity:
      easy   ["Normal","Standard concern"]
      medium ["High","Heightened awareness","Prefers discretion"]
      hard   ["Very high","Strict","Ultra-private"]
    decisionComplexity:
      easy   ["Spouse check","Partner sign-off","Quick family nod"]
      medium ["Spouse + advisor review","Dual-advisor approval","Family vet + accountant"]
      hard   ["Full committee review","Multi-gatekeeper signoff","Board-level consensus"]
    outsideValidation:
      easy   ["Optional testimonial","Informal endorsement"]
      medium ["Named past client","Published review","LinkedIn recommendation"]
      hard   ["Third-party audit","Independent certification","Regulatory verification"]
    referralThresholdScore:  easy 16–17 | medium 18–19 | hard 20–22
    responseStyleToPressure:
      easy   ["Polite hesitation","Gentle pause"]
      medium ["Cold deferral","Reserved postponement"]
      hard   ["Immediate withdrawal","Abrupt disengagement"]
    positiveSignalRequirement: easy 2 | medium 3 | hard 4
    networkAccessOpenness:
      easy   ["1 name after proof","Limited intro upon validation"]
      medium ["Will 'think about it'","Tentative consideration"]
      hard   ["No introductions promised","Access denied"]
    followThroughRigidity:
      easy   ["Joint call preferred","Co-ordinated email acceptable","Light touch follow-up"]
      medium ["Formal deck required","Proposal document needed","Written brief requested"]
      hard   ["Detailed dossier before intro","Comprehensive report mandatory","Legal review first"]

  ──────────────── JSON TEMPLATE (key order) ────────────────
  {
    "difficulty": "<<DIFFICULTY>>",
    "relationalDynamics": { ... },
    "psychologicalState": { ... },
    "situationalContext": { ... },
    "coreVariables": { ... }
  }
`;