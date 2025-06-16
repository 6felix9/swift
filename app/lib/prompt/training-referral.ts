export const trainingReferralEvaluationInstructions = `
### Scoring rules

1. Evaluate each criterion strictly from the transcript.  
2. Replace every "0", empty string, or “Undetermined” with the correct score (1–5) and evidence.  
3. If a behaviour is not observed, keep score = 0 and set "commentsAndExamples": "Not observed".  
4. Subtotals must not exceed each category’s maxSubtotal.  
5. totalScore = sum of subtotals, maxPossibleScore = 85.  
6. Output only the completed JSON object.

{
  "evaluationSummary": {
    "totalScore": 0,
    "maxPossibleScore": 85,
    "keyStrengths": "",
    "keyAreasForImprovement": "",
    "whereYouCouldHaveSaidBetter": "",
    "referralContextSuccessfullyCreated": {
      "answer": "",
      "justification": ""
    }
  },
  "detailedEvaluation": [
    {
      "categoryName": "1. Relationship Quality & Trust",
      "maxSubtotal": 15,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "1.1", "criterionText": "Advisor references shared history or client progress", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "1.2", "criterionText": "Tone reflects genuine rapport and emotional connection", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "1.3", "criterionText": "Client expresses appreciation or confidence in the advisor", "score": 0, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "2. Timing & Context",
      "maxSubtotal": 15,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "2.1", "criterionText": "Referral ask is well-timed (e.g., after a milestone, compliment, etc.)", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "2.2", "criterionText": "Not rushed or inserted awkwardly", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "2.3", "criterionText": "Client appears emotionally available and focused", "score": 0, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "3. Language & Framing",
      "maxSubtotal": 15,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "3.1", "criterionText": "Asks for referral using respectful, soft language", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "3.2", "criterionText": "Positions referral as an offer to help, not a sales pitch", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "3.3", "criterionText": "Avoids pressure or self-centered language", "score": 0, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "4. Value Articulation",
      "maxSubtotal": 15,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "4.1", "criterionText": "Clearly explains who would benefit from a referral", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "4.2", "criterionText": "Describes what the initial conversation would look like", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "4.3", "criterionText": "Connects referral to the value the client has experienced", "score": 0, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "5. Client Comfort & Response",
      "maxSubtotal": 15,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "5.1", "criterionText": "Client shows verbal/non-verbal comfort or interest", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "5.2", "criterionText": "Advisor responds appropriately to hesitation or resistance", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "5.3", "criterionText": "Conversation ends on a positive, professional note", "score": 0, "commentsAndExamples": "" }
      ]
    },
    {
      "categoryName": "6. Follow-Through Facilitation",
      "maxSubtotal": 10,
      "subtotal": 0,
      "redFlagCheck": { "raised": false, "comment": null },
      "criteria": [
        { "criterionId": "6.1", "criterionText": "Advisor offers options for easy referral (email, intro, etc.)", "score": 0, "commentsAndExamples": "" },
        { "criterionId": "6.2", "criterionText": "Reiterates no pressure or obligation for the referred person", "score": 0, "commentsAndExamples": "" }
      ]
    }
  ]
}
`;