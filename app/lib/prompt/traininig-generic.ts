export const trainingGenericEvaluationInstructions = 
`
### Scoring rules (generic)

1. Judge each criterion strictly from the transcript—no assumptions.  
2. Replace every 0, empty string, or “Undetermined” with the correct score (1-5) and supporting evidence.  
3. If a behaviour is **not observed**, keep score = 0 and set 'commentsAndExamples': 'Not observed'.  
4. A category’s **subtotal** must not exceed its 'maxSubtotal'.  
5. 'totalScore' = sum of all subtotals; 'maxPossibleScore' = 100.  
6. Output only the completed JSON object (no markdown, no extra text).

{
  "domain": "",                    // e.g. "customer-service", "healthcare", "finance"
  "evaluationSummary": {
    "totalScore": 0,
    "maxPossibleScore": 100,
    "keyStrengths": "",
    "keyAreasForImprovement": "",
    "domainSpecificOutcome": {     // optional; use if the scenario defines one
      "question": "",
      "answer": "",
      "justification": ""
    }
  },
  "detailedEvaluation": [
    {
      "categoryName": "1. Rapport & Empathy",
      "maxSubtotal": 20,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "1.1", "criterionText": "Acknowledges feelings / concerns", "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "1.2", "criterionText": "Uses respectful, inclusive language",        "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "1.3", "criterionText": "Builds trust / positive rapport",            "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "1.4", "criterionText": "Maintains calm, patient tone",               "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "2. Problem Assessment & Clarity",
      "maxSubtotal": 20,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "2.1", "criterionText": "Asks effective clarifying questions",        "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "2.2", "criterionText": "Explains relevant information in lay terms", "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "2.3", "criterionText": "Summarises issue to confirm understanding",  "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "2.4", "criterionText": "Checks client understanding & invites Qs",   "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "3. Solution Quality & Value",
      "maxSubtotal": 20,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "3.1", "criterionText": "Provides actionable next steps",             "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "3.2", "criterionText": "Tailors advice to client context",           "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "3.3", "criterionText": "Clearly states benefits / risks",            "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "3.4", "criterionText": "Demonstrates domain knowledge accurately",   "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "4. Client Engagement & Empowerment",
      "maxSubtotal": 20,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "4.1", "criterionText": "Encourages client participation",            "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "4.2", "criterionText": "Respects client autonomy / decisions",       "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "4.3", "criterionText": "Builds client confidence to act",            "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "4.4", "criterionText": "Provides resources or self-help tools",      "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "5. Professionalism & Closure",
      "maxSubtotal": 20,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "5.1", "criterionText": "Maintains professional etiquette throughout", "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "5.2", "criterionText": "Sets clear follow-up plan / timeline",        "type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "5.3", "criterionText": "Ends conversation on positive, confident note","type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" },
        { "criterionId": "5.4", "criterionText": "Documents or summarises next steps for client","type": "numeric-scale", "score": 0, "maxScore": 5, "commentsAndExamples": "" }
      ]
    }
  ]
}

`