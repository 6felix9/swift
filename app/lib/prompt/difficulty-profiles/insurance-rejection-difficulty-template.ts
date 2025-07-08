export const insuranceRejectionDifficultyProfileInstructions = `
  SYSTEM (Difficulty-Profile Builder)
  This is <<DIFFICULTY>> mode.
  ────────────────────────────────────
  Goal • Produce ONE JSON object describing a client profile for insurance rejection handling, tuned to the requested difficulty:
    ▸ easy   – upset but cooperative; willing to work through the process
    ▸ medium – frustrated and stressed; requires careful handling
    ▸ hard   – extremely distressed; may be hostile or distrustful

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
    easy   ["Trusting advisor to help","Confident in advisor's guidance","Feels supported by advisor","Believes advisor has their back"]
    medium ["Cautious optimism","Testing advisor's consistency","Neutral but attentive","Open yet reserved"]
    hard   ["Skeptical but listening","Guarded distrust","Questioning process","Needs convincing evidence"]
  clientTenure:
    easy   ["Long-term client","3+ years relationship","Regular annual reviews","Long-standing partnership"]
    medium ["Around 2 years","Recently onboarded after referral","12–18 months working together","New but multiple interactions"]
    hard   ["< 6 months","Initial onboarding phase","First formal review","Exploratory engagement"]

(psychologicalState)
  communicationStyle:
    easy   ["Direct but respectful","Asking clear questions","Calm, solution-focused","Willing to listen"]
    medium ["Concerned but polite","Detailed inquiries","Seeks reassurance","Measured tone with occasional frustration"]
    hard   ["Blunt and terse","Defensive clarifications","Short responses","Speaks in clipped phrases"]
  emotionalState:
    easy   ["Disappointed but hopeful","Frustrated but manageable","Mildly upset","Optimistic after guidance"]
    medium ["Stressed yet cooperative","Worried about outcome","Anxious but composed","Tense"]
    hard   ["Frustrated and wary","Discouraged","Guarded disappointment","Skeptical frustration"]
  financialStressLevel:
    easy   ["Concerned about costs","Manageable financial impact","Tight but workable budget","Watching expenses closely"]
    medium ["Feeling financial pinch","Budget tightening","Rearranging finances","Delayed discretionary spending"]
    hard   ["High financial pressure","Cash-flow squeeze","Concerned about mounting costs","Juggling multiple obligations"]

(situationalContext)
  claimComplexity:
    easy   ["Straightforward rejection","Clear policy exclusion","Simple documentation gap","Missing receipt only"]
    medium ["Some unclear wording","Minor discrepancy in reports","Additional documentation needed","Adjuster dispute"]
    hard   ["Multiple coverage clauses","Extended investigation","Third-party involvement","Inconsistent assessments"]
  priorExperience:
    easy   ["First major claim","Limited insurance experience","Never appealed before","Only minor claims previously"]
    medium ["Handled small claims before","Mixed prior outcomes","One delayed payout","Limited appeal experience"]
    hard   ["A prior frustrating claim","Delayed resolution history","Previously escalated complaint","Few successful claims"]
  urgency:
    easy   ["No immediate deadline","Can wait for resolution","Flexible schedule","Comfortable buffer"]
    medium ["Repairs scheduled next month","Upcoming payment deadline","Wants resolution in weeks","Time-sensitive but not critical"]
    hard   ["Bills due soon","Repairs disrupting daily life","Health procedure within weeks","Short grace period"]

(coreVariables)
  cooperationLevel:
    easy   ["Proactively shares documents","Offers extra details unprompted","Uploads files the same day"]
    medium ["Shares docs after reminders","Provides info with delay","Needs clear checklists"]
    hard   ["Selective with info","Requires reason for each request","Occasional pushback"]

  understandingLevel:
    easy   ["Restates policy in own words","Quickly grasps explanations","Uses correct terminology"]
    medium ["Grasps basics with help","Needs plain-language examples","Occasional confusion"]
    hard   ["Struggles with nuances","Needs step-by-step breakdown","Frequently asks to re-explain"]

  expectationManagement:
    easy   ["Understands appeals take months","Open to partial approval","Accepts uncertainty"]
    medium ["Hopes for quick turnaround","Wants full payout but open to evidence","May be disappointed by delays"]
    hard   ["Expects fair reimbursement soon","Questions timeline estimates","Concerned about appeal length"]

  communicationFrequency:
    easy   ["Weekly email sufficient","Patient between calls","Trusts advisor cadence"]
    medium ["Weekly check-ins requested","Prefers progress emails","Follows up after deadlines"]
    hard   ["Frequent status requests","Wants update after each step","Calls weekly"]

  appealReadiness:
    easy   ["Collecting evidence already","Agrees to draft letters","Eager to appeal"]
    medium ["Open to appeal with guidance","Willing to gather documents","Needs motivation"]
    hard   ["Cautiously considering appeal","Wants effort clarified","Seeks cost-benefit certainty"]

  advisorDependence:
    easy   ["Completes tasks independently","Uses advisor for checkpoints","Takes initiative"]
    medium ["Relies on templates","Needs periodic coaching","Prefers annotated documents"]
    hard   ["Needs detailed guidance","Requests sample letters","Depends on advisor for direction"]

  guidanceVersusQuestionRatio:
    easy   ["1:1 – ask then guide","Comfortable dialogue"]
    medium ["2:1 – guide twice for every question","Limit probing"]
    hard   ["3:1 – deliver three actionable statements for every question","Only one clarifier allowed"]


  ──────────────── JSON TEMPLATE (key order) ────────────────
  {
    "difficulty": "<<DIFFICULTY>>",
    "relationalDynamics": { ... },
    "psychologicalState": { ... },
    "situationalContext": { ... },
    "coreVariables": { ... }
  }
`;