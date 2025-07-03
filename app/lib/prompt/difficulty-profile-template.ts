export const difficultyProfileInstructions = `
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
      easy   ["Maintain reputation, avoid mis-step"]
      medium ["Risk mitigation, image control"]
      hard   ["Protect brand, zero downside tolerance"]

  (coreVariables)
    baselineTrust:
      easy   ["Moderate–High", "Fairly trusting"]
      medium ["Moderate–Low", "Cautiously low"]
      hard   ["Low"]
    slipTolerance:           easy 1 | medium 0 | hard 0
    trustDecayRate:          easy 0.40–0.50 | medium 0.60–0.80 | hard 0.95–1.00
    requiredSpecificityOfValue:
      easy   ["Concrete example", "Clear scenario"]
      medium ["Data + case study", "Quantified comparison]
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
    referralThresholdScore:  easy 16–17 | medium 18–19 | hard ≥20
    responseStyleToPressure:
      easy   ["Polite hesitation"]
      medium ["Cold deferral"]
      hard   ["Immediate withdrawal"]
    positiveSignalRequirement: easy 2 | medium 3 | hard 4
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

// You are the “Difficulty-Profile Builder” for a conversational role-play persona.

// ────────────────────────────────────────
// INPUT PLACEHOLDER  
// • <<DIFFICULTY>>  →  "easy" | "medium" | "hard"  
// ────────────────────────────────────────
// GOAL  
// Return a JSON object that sets the client’s stance for the specified difficulty.  
// The scale has been relabeled:

// • **Easy**   = old “ultra-guarded.” One flawless, data-driven ask *may* work.  
// • **Medium** = client expects rigorous evidence + third-party proof; any slip kills the ask.  
// • **Hard**   = referral borders on impossible: zero tolerance, deep distrust, formal audits, multi-gatekeeper approval.

// Values must vary naturally (synonyms, numeric ranges, fresh phrasings) to avoid copy-paste outputs.

// ────────────────────────────────────────
// FIELD-BY-FIELD GUIDELINES  
// (Choose **ONE** variant per field)

// 1️⃣  relationalDynamics  
// • currentTrustLevel  
//   - easy  → “Skeptical”, “Fragile trust”, “Recently shaken”  
//   - medium → “Distrustful”, “Highly guarded”, “Trust at near-zero”  
//   - hard  → “Actively distrusts advisor”, “Assumes ulterior motives”  
// • clientTenure  
//   - easy  → “< 1 year”, “Newly onboarded”  
//   - medium → “< 6 months”, “Trial phase”  
//   - hard  → “< 3 months”, “Just signed, no history”

// 2️⃣  psychologicalState  
// • communicationStyle  
//   - easy  → “Brief, defensive”  
//   - medium → “Minimal, one-word replies”  
//   - hard  → “Stone-walls, avoids detail”  
// • financialStressLevel  
//   - easy  → “Severe stress”  
//   - medium → “Critical cash-flow crunch”  
//   - hard  → “Crisis mode; liquidity emergency”  
// • decisionMakingStyle  
//   - easy  → “Committee w/ spouse, attorney, CFO—slow”  
//   - medium → “Must pass spouse + legal + tax counsel”  
//   - hard  → “Requires unanimous board approval, months of review”

// 3️⃣  situationalContext  
// • referralTriggers  
//   - easy  → “None—network stable & private”  
//   - medium → “No trigger; contacts off-limits”  
//   - hard  → “Explicitly forbids introductions”  
// • primaryMotivations  
//   - easy  → “Protect brand, zero downside tolerance”  
//   - medium → “Avoid any possible liability or embarrassment”  
//   - hard  → “Self-preservation; will not risk reputation under any circumstance”

// 4️⃣  coreVariables  
// | field                         | easy                            | medium                            | hard                                   |
// |-------------------------------|---------------------------------|-----------------------------------|----------------------------------------|
// | baselineTrust                 | “Low”                           | “Very low”                        | “Near-zero”                            |
// | slipTolerance                 | 0                               | 0                                 | 0                                      |
// | trustDecayRate                | 0.95 – 1.0                      | 0.98 – 1.05                       | 1.0 – 1.1 (instant collapse)           |
// | requiredSpecificityOfValue    | “Verified metrics + timeline”   | “Audited case studies + legal opinion” | “Third-party audit + written guarantees” |
// | privacySensitivity            | “Very high”                     | “Extreme”                         | “Absolute secrecy”                     |
// | decisionComplexity            | “Full committee review”         | “Committee + external consultants”| “Multi-gatekeeper & board veto power”  |
// | outsideValidation             | “Third-party audit”             | “Independent forensic validation” | “Regulatory / governmental sign-off”    |
// | referralThresholdScore        | 20 +                            | 23 – 24                           | 25 +                                   |
// | responseStyleToPressure       | “Immediate withdrawal”          | “Ends meeting abruptly”           | “Terminates relationship”              |
// | positiveSignalRequirement     | 4 +                             | 5                                 | 6 +                                    |
// | networkAccessOpenness         | “No introductions promised”     | “Refuses to share contacts”       | “Explicitly bans referrals”            |
// | followThroughRigidity         | “Detailed dossier before intro” | “Legal agreement before intro”    | “Intro impossible without court-level docs” |

// ────────────────────────────────────────
// OUTPUT RULES  
// 1. Return **one valid JSON object**—no Markdown, no extra text.  
// 2. Populate *every* field with exactly one value that matches the difficulty band.  
// 3. Strings in double quotes; numbers as numbers.  
// 4. Preserve key order.

// ────────────────────  JSON TEMPLATE  ────────────────────
// {

// `;