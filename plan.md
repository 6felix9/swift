# Real-Time Conversation Scoring with Line Chart Implementation Plan

## Overview
- [ ] Implement a real-time evaluation scoring system that displays a line chart showing conversation quality scores throughout the avatar interaction, updating after each conversation turn.

---

## Implementation Tasks

### 1. New API Endpoint for Real-Time Scoring  
**File:** `app/api/score-turn/route.ts`
- [ ] Create new API route file
- [ ] Implement lightweight scoring endpoint optimised for speed
- [ ] Integrate Gemini 2.5 Flash for fast evaluation (≈ 2-3 s response)
- [ ] Design simplified scoring prompt (0-100 scale)
- [ ] Set up request/response types for conversation history and score

### 2. Score State Management  
**File:** `app/page.tsx`
- [ ] Add conversationScores state:
  ```ts
  const [conversationScores, setConversationScores] = useState<Array<{
    turn: number;
    score: number;
    timestamp: number;
  }>>([]);
  ```
- [ ] Initialize with score 0 at conversation start
- [ ] Implement score update logic after each turn
- [ ] Add error handling for score updates

### 3. Enhanced Chart Component  
**File:** `app/components/ui/chart-line-linear.tsx`
- [ ] Modify to accept dynamic `data` prop
- [ ] Configure Y-axis for 0-100 score range
- [ ] Set up X-axis for turn numbers
- [ ] Implement smooth animations for data updates
- [ ] Add responsive design (50% width on desktop)

### 4. Integration in Conversation Flow  
**File:** `app/page.tsx`
- [ ] Modify `handleSubmit` to call score API after each exchange
- [ ] Implement fire-and-forget pattern for scoring API calls
- [ ] Update chart with new scores in real-time
- [ ] Add error boundaries and fallbacks

### 5. Scoring Logic Design
- [ ] Define initial score (0) for conversation start
- [ ] Implement turn-based scoring logic
- [ ] Design evaluation criteria (rapport, info gathering, etc.)
- [ ] Normalize scores to 0-100 range

### 6. UI/UX Enhancements
- [ ] Position chart at top of conversation interface
- [ ] Add visual indicators for score trends
- [ ] Implement smooth animations for score updates
- [ ] Add tooltips for score details on hover
- [ ] Make chart responsive for all screen sizes

---

## Technical Implementation Details

### API Performance
- [ ] Use Gemini 2.5 Flash for fast responses
- [ ] Optimize prompt to under 300 tokens
- [ ] Implement request timeout handling
- [ ] Set up rate limiting if needed

### Error Handling
- [ ] Implement graceful degradation if scoring fails
- [ ] Add error logging
- [ ] Ensure conversation continues even if scoring fails
- [ ] Add retry mechanism for failed scoring attempts

### Data Structure
```ts
interface ConversationScore {
  turn: number;
  score: number;
  timestamp: number;
}
```

---

## Files to Create / Modify
| Status | Action   | Path                                      | Purpose                           |
|--------|----------|-------------------------------------------|-----------------------------------|
| [ ]    | Create   | `app/api/score-turn/route.ts`            | Scoring API route                 |
| [ ]    | Modify   | `app/components/ui/chart-line-linear.tsx`| Dynamic chart component          |
| [ ]    | Modify   | `app/page.tsx`                           | State & API integration          |
| [ ]    | Create   | `app/lib/scoringService.ts`              | Central scoring logic             |

---

## Testing Checklist
- [ ] Test scoring API with various conversation lengths
- [ ] Verify chart updates correctly after each turn
- [ ] Test error scenarios (API down, invalid responses)
- [ ] Verify responsive design on different screen sizes
- [ ] Test performance with rapid conversation turns
