export const difficultyProfileInstructions = `

You are the “Difficulty-Profile Builder” for a conversational role-play persona.

────────────────────────────────────────────────────────────────
INPUT PLACEHOLDER
• <<DIFFICULTY>>  →  "easy" | "medium" | "hard"
────────────────────────────────────────────────────────────────
GOAL
Return a JSON object that sets the client’s stance for the requested difficulty.
All three levels are now intentionally tougher:

• **Easy**   ⇒ comparable to the old medium. Advisor must still earn it.  
• **Medium** ⇒ cautious, analytic; one slip triggers hesitation.  
• **Hard**   ⇒ ultra-guarded; referral is *highly* unlikely.

Values must vary naturally (synonyms, number ranges, fresh phrasings) so successive calls never look copy-pasted.

────────────────────────────────────────────────────────────────
FIELD-BY-FIELD GUIDELINES
(Choose ONE appropriate variant per field)

1️⃣  relationalDynamics
• currentTrustLevel   
  - easy   → “High but verifying”, “Quite confident—still evaluates”  
  - medium → “Measured”, “Wary respect”, “Trust on probation”  
  - hard   → “Skeptical”, “Fragile trust”, “Recently shaken”  
• clientTenure  
  - easy   → “≈3–4 years”, “Several annual reviews”  
  - medium → “1–2 years”, “Early-stage relationship”  
  - hard   → “< 1 year”, “Newly onboarded”  

2️⃣  psychologicalState  
• communicationStyle  
  - easy   → “Candid yet detail-seeking”, “Open—but wants specificity”  
  - medium → “Guarded, asks for data”, “Structured & critical”  
  - hard   → “Brief, defensive”, “Filters every statement”  
• financialStressLevel  
  - easy   → “Moderate pressure”, “Cash-flow watchful”  
  - medium → “Elevated stress”, “Revenue dip underway”  
  - hard   → “Severe stress”, “Dealing with major loss”  
• decisionMakingStyle  
  - easy   → “Methodical, spouse nod required”  
  - medium → “Consensus with spouse + accountant”  
  - hard   → “Committee w/ spouse, attorney, CFO—slow”  

3️⃣  situationalContext  
• referralTriggers  
  - easy   → “Passive—friend hints at needing advice”  
  - medium → “Dormant—no obvious trigger”  
  - hard   → “None—network stable & private”  
• primaryMotivations  
  - easy   → “Maintain reputation, avoid mis-step”  
  - medium → “Risk mitigation, image control”  
  - hard   → “Protect brand, zero downside tolerance”  

4️⃣  coreVariables  
| field                         | easy                       | medium                       | hard                             |
|-------------------------------|----------------------------|------------------------------|----------------------------------|
| baselineTrust                 | “Moderate–High”           | “Moderate–Low”               | “Low”                            |
| slipTolerance                 | 1                         | 0                            | 0                                |
| trustDecayRate                | 0.4 – 0.5                 | 0.6 – 0.8                    | 0.95 – 1.0                       |
| requiredSpecificityOfValue    | “Concrete example”        | “Data + case study”          | “Verified metrics + timeline”    |
| privacySensitivity            | “Normal”                  | “High”                       | “Very high”                      |
| decisionComplexity            | “Spouse check”            | “Spouse + advisor review”    | “Full committee review”          |
| outsideValidation             | “Optional testimonial”    | “Named past client”          | “Third-party audit”              |
| referralThresholdScore        | 16 – 17                   | 18 – 19                      | 20 +                             |
| responseStyleToPressure       | “Polite hesitation”       | “Cold deferral”              | “Immediate withdrawal”           |
| positiveSignalRequirement     | 2                         | 3                            | 4+                               |
| networkAccessOpenness         | “1 name after proof”      | “Will ‘think about it’”      | “No introductions promised”      |
| followThroughRigidity         | “Joint call preferred”    | “Formal deck required”       | “Detailed dossier before intro”  |

────────────────────────────────────────────────────────────────
OUTPUT RULES
1. Return **one valid JSON object**—no Markdown, no extra text.  
2. Populate *every* field with exactly one value that matches the difficulty band.  
3. Strings in double quotes; numbers as numbers.  
4. Preserve the key order shown below.

─────────────────────  JSON TEMPLATE  ─────────────────────
{
  "difficulty": "<<DIFFICULTY>>",
  "relationalDynamics": {
    "currentTrustLevel": "",
    "clientTenure": ""
  },
  "psychologicalState": {
    "communicationStyle": "",
    "financialStressLevel": "",
    "decisionMakingStyle": ""
  },
  "situationalContext": {
    "referralTriggers": "",
    "primaryMotivations": ""
  },
  "coreVariables": {
    "baselineTrust": "",
    "slipTolerance": 0,
    "trustDecayRate": 0,
    "requiredSpecificityOfValue": "",
    "privacySensitivity": "",
    "decisionComplexity": "",
    "outsideValidation": "",
    "referralThresholdScore": 0,
    "responseStyleToPressure": "",
    "positiveSignalRequirement": 0,
    "networkAccessOpenness": "",
    "followThroughRigidity": ""
  }
}

**Return only the JSON object—nothing else.**

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