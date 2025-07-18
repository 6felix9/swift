export const trainingInsuranceRejectionEvaluationInstructions = `
### Scoring rules

1. Evaluate each criterion strictly from the transcript.  
2. Replace every "0", empty string, or “Undetermined” with the correct score (1-5) or text evidence.  
3. If a behaviour is not observed, keep score = 0 and set ""commentsAndExamples": "Not observed"".  
4. Compute all subtotals and totalScore.
5. Output only the completed JSON object.

{
  "evaluationSummary": {
    "totalScore": 0,
    "maxPossibleScore": 90,
    "keyStrengths": "",
    "keyAreasForImprovement": "",
    "domainSpecificOutcome": { 
      "question": "",
      "answer": "",
      "justification": ""
    }
  },
  "detailedEvaluation": [
    {
      "categoryName": "1. Empathy & Emotional Support",
      "subtotal": 0,
      "redFlagCheck": {
        "raised": false,
        "comment": null
      },
      "criteria": [
        {
          "criterionId": "1.1",
          "criterionText": "Acknowledged the client's distress and validated her feelings",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "1.2",
          "criterionText": "Used empathetic and comforting language throughout",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "1.3",
          "criterionText": "Maintained a calm, patient tone despite client's upset",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "1.4",
          "criterionText": "Built rapport before diving into policy details",
          "score": 0,
          "commentsAndExamples": ""
        }
      ]
    },
    {
      "categoryName": "2. Explanation & Clarity",
      "subtotal": 0,
      "redFlagCheck": {
        "raised": false,
        "comment": null
      },
      "criteria": [
        {
          "criterionId": "2.1",
          "criterionText": "Translated technical jargon into clear, layman’s terms",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "2.2",
          "criterionText": "Clearly explained the reasons for claim rejection",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "2.3",
          "criterionText": "Checked client understanding and invited questions",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "2.4",
          "criterionText": "Summarized key points before moving on",
          "score": 0,
          "commentsAndExamples": ""
        }
      ]
    },
    {
      "categoryName": "3. Technical Accuracy & Knowledge",
      "subtotal": 0,
      "redFlagCheck": {
        "raised": false,
        "comment": null
      },
      "criteria": [
        {
          "criterionId": "3.1",
          "criterionText": "Accurately referenced relevant policy terms and clauses",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "3.2",
          "criterionText": "Identified valid grounds for appeal or dispute",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "3.3",
          "criterionText": "Avoided providing any misinformation or speculation",
          "score": 0,
          "commentsAndExamples": ""
        }
      ]
    },
    {
      "categoryName": "4. Client Empowerment & Guidance",
      "subtotal": 0,
      "redFlagCheck": {
        "raised": false,
        "comment": null
      },
      "criteria": [
        {
          "criterionId": "4.1",
          "criterionText": "Offered clear, actionable next steps (e.g., appeal process, additional documentation)",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "4.2",
          "criterionText": "Provided relevant resources or contacts (e.g., adjuster, legal aid)",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "4.3",
          "criterionText": "Encouraged client's active participation and ownership of the process",
          "score": 0,
          "commentsAndExamples": ""
        }
      ]
    },
    {
      "categoryName": "5. Next Steps & Follow-through Facilitation",
      "subtotal": 0,
      "redFlagCheck": {
        "raised": false,
        "comment": null
      },
      "criteria": [
        {
          "criterionId": "5.1",
          "criterionText": "Proposed a clear follow-up plan with timeline",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "5.2",
          "criterionText": "Offered assistance in drafting appeal letters or forms",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "5.3",
          "criterionText": "Scheduled or offered to schedule a follow-up check-in",
          "score": 0,
          "commentsAndExamples": ""
        },
        {
          "criterionId": "5.4",
          "criterionText": "Reassured the client of continued support regardless of outcome",
          "score": 0,
          "commentsAndExamples": ""
        }
      ]
    }
  ]
}
`