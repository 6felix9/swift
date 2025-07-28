# Real-Time Conversation Effectiveness Scoring with Line Chart Implementation Plan

## Overview
- [x] Implement a real-time **Conversation Effectiveness Score** system that displays a line chart showing universal professional communication quality throughout the avatar interaction, updating after each conversation turn.

## Universal Scoring Approach
**"Conversation Effectiveness Score (0-100)"** - A universal metric that works across all scenarios:
- **Communication Quality** (25 points): Clarity, professionalism, appropriate tone
- **Rapport & Empathy** (25 points): Active listening, understanding client needs  
- **Progress & Direction** (25 points): Moving conversation toward objectives
- **Professional Competence** (25 points): Confidence, expertise demonstration

### Why Universal Scoring?
- ✅ **Consistent Scale**: Always 0-100 regardless of scenario type
- ✅ **Single Prompt**: One scoring prompt for all training domains
- ✅ **Universal Application**: Works across financial, healthcare, customer service
- ✅ **Real-time Friendly**: Can be evaluated quickly without scenario-specific complexity

---

## Implementation Tasks

### 1. New API Endpoint for Real-Time Scoring  
**File:** `app/api/score-turn/route.ts`
- [x] This endpoint will be called to run a `score-turn` service file under the `lib` folder.
- [x] The service file will contain the logic for a quick Gemini Flash evaluation using the universal effectiveness scoring system.
- [x] The scoring prompt will evaluate the 4 universal categories (Communication Quality, Rapport & Empathy, Progress & Direction, Professional Competence) for a total 0-100 score.
- [x] Ensure the Gemini model returns the correct output format (single numeric effectiveness score 0-100).

### 2. Score State Management  
**File:** `app/page.tsx`
- [x] Add conversationScores state:
  ```ts
  const [conversationScores, setConversationScores] = useState<Array<{
    turn: number;
    score: number; // Conversation Effectiveness Score (0-100)
    timestamp: number;
  }>>([]);
  ```
- [x] Initialize with score 0 at conversation start
- [x] Continuously update `conversationScores` as each score-turn API response returns, ensuring the line graph updates in real-time
- [x] Add error handling for score updates

### 3. Enhanced Chart Component  
**File:** `app/components/ui/chart-line-linear.tsx`
- [x] Modify to accept dynamic `data` prop instead of static chartData
- [x] Configure Y-axis for 0-100 effectiveness score range
- [x] Set up X-axis for conversation turn numbers
- [x] Update chart title to "Conversation Effectiveness"
- [x] Implement smooth animations for data updates
- [x] Add responsive design (50% width on desktop)
- [x] Configure tooltips to show effectiveness score for specific turns

### 4. Integration in Conversation Flow  
**File:** `app/page.tsx`
- [x] Modify `handleSubmit` to enqueue score API calls so multiple rapid submissions are queued
- [x] Implement a queue system to decouple API calls and chart updates, allowing the graph to update as each response returns without blocking
- [x] Use fire-and-forget pattern for scoring API calls and push results into the queue
- [x] Process the queue continuously, updating chart with new scores as responses arrive
- [x] Handle failed API calls by defaulting to no change in scoring (chart will display a horizontal line)

### 5. Universal Scoring Logic Design
- [x] Define initial effectiveness score (0) for conversation start
- [x] Design a universal scoring prompt that evaluates:
  - Communication Quality (0-25): Clarity, professionalism, appropriate tone
  - Rapport & Empathy (0-25): Active listening, understanding client needs
  - Progress & Direction (0-25): Moving conversation toward objectives  
  - Professional Competence (0-25): Confidence, expertise demonstration
- [x] Keep the prompt concise (under 200 tokens) to minimize processing time
- [x] Ensure model returns single numeric score (0-100) representing total effectiveness
- [x] Make scoring work universally across all training domains (financial, healthcare, customer service)

### 6. UI/UX Enhancements
- [x] Position chart at a fixed, visible location above the conversation pane so full data is always in view without scrolling; consider sizes of video and chat message elements
- [x] Ensure chart background, line color, and overall theme colors match the application’s UI style
- [x] Tooltips should reveal only the effectiveness score for the specific turn when hovered

---

## Technical Implementation Details

### API Performance
- [x] Use Gemini 2.5 Flash for fast responses
- [x] Optimize universal scoring prompt to under 200 tokens
- [x] Implement request timeout handling
- [x] Set up rate limiting if needed

### Error Handling
- [x] Implement graceful degradation if scoring fails
- [x] Add error logging
- [x] Ensure conversation continues even if scoring fails
- [x] Add retry mechanism for failed scoring attempts

### Data Structure
```ts
interface ConversationScore {
  turn: number;
  score: number; // Universal Conversation Effectiveness Score (0-100)
  timestamp: number;
}
```

---

## Files to Create / Modify
| Status | Action   | Path                                      | Purpose                                    |
|--------|----------|-------------------------------------------|--------------------------------------------|
| [x]    | Create   | `app/api/score-turn/route.ts`            | Universal effectiveness scoring API route  |
| [x]    | Modify   | `app/components/ui/chart-line-linear.tsx`| Dynamic chart component for effectiveness  |
| [x]    | Modify   | `app/page.tsx`                           | State & API integration for scoring       |
| [x]    | Create   | `app/lib/scoringService.ts`              | Universal scoring logic service           |

---

## Testing Checklist
- [x] Test universal effectiveness scoring API with various conversation lengths
- [x] Verify chart updates correctly after each turn across all training domains
- [x] Test error scenarios (API down, invalid responses)
- [x] Verify responsive design on different screen sizes
- [x] Test performance with rapid conversation turns
- [x] Verify consistency of 0-100 scoring across financial, healthcare, and customer service scenarios
- [x] Test chart display shows "Conversation Effectiveness" properly
